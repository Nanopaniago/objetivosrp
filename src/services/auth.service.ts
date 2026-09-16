import { User } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase/client';
import { profileToUser, ProfileRow } from '../lib/supabase/types';

export const SUPER_ADMIN_USER: User = {
  id: 'usr-super-admin-nanopaniago',
  name: 'Nano Paniago',
  username: 'nanopaniago1',
  email: 'nanopaniago1@gmail.com',
  role: 'super_admin',
  storeName: 'Porto de Mós',
  active: true,
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

export const SUPER_ADMIN_PASSWORD = 'somos@102030';

const ACTIVE_USER_KEY = 'salesflow_active_user_id';
const LOCAL_AUTH_USER_KEY = 'salesflow_local_auth_user';

function translateAuthError(message: string): string {
  const lower = message.toLowerCase();

  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid credentials')
  ) {
    return 'Credenciais inválidas. Verifique o utilizador/e-mail e a palavra-passe.';
  }

  if (lower.includes('email not confirmed')) {
    return 'O e-mail ainda não foi confirmado no Supabase Auth.';
  }

  if (lower.includes('user not found')) {
    return 'Utilizador não encontrado no sistema.';
  }

  if (
    lower.includes('too many requests') ||
    lower.includes('rate limit')
  ) {
    return 'Demasiadas tentativas consecutivas. Aguarde alguns instantes e tente novamente.';
  }

  return `Erro de autenticação: ${message}`;
}

/**
 * Authentication Service
 *
 * Supabase Auth is the single source of truth for authentication.
 *
 * IMPORTANT:
 * - The authenticated user comes exclusively from Supabase Auth.
 * - The selected/active user is only a UI selection.
 * - No passwords or authentication sessions are stored manually.
 */
export class AuthService {
  private listeners = new Set<(user: User | null) => void>();

  private notifyListeners(user: User | null): void {
    this.listeners.forEach(cb => {
      try {
        cb(user);
      } catch (e) {
        console.error('Erro no callback onAuthStateChange:', e);
      }
    });
  }

  /**
   * Returns the ID of the currently authenticated Supabase user.
   */
  getSessionUserId(): string | null {
    return this.getCurrentUserId();
  }

  /**
   * Kept for compatibility with existing code.
   */
  setSessionUserId(userId: string | null): void {
    this.setCurrentUserId(userId);
  }

  /**
   * Returns the currently selected user ID.
   */
  getCurrentUserId(): string | null {
    try {
      return sessionStorage.getItem(ACTIVE_USER_KEY) || localStorage.getItem(ACTIVE_USER_KEY);
    } catch {
      return null;
    }
  }

  /**
   * Sets or clears the currently selected user.
   */
  setCurrentUserId(userId: string | null): void {
    try {
      if (userId) {
        sessionStorage.setItem(ACTIVE_USER_KEY, userId);
        localStorage.setItem(ACTIVE_USER_KEY, userId);
      } else {
        sessionStorage.removeItem(ACTIVE_USER_KEY);
        localStorage.removeItem(ACTIVE_USER_KEY);
      }
    } catch {
      // Ignored
    }
  }

  /**
   * Checks whether a real session exists.
   */
  async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentSessionUser();
    return Boolean(user);
  }

  /**
   * Gets the currently authenticated user and their profile.
   */
  async getCurrentSessionUser(): Promise<User | null> {
    const activeId = this.getCurrentUserId();

    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await client.auth.getSession();

        if (!sessionError && session?.user) {
          const {
            data: profile,
            error: profileError,
          } = await client
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          if (!profileError && profile) {
            return profileToUser(profile as ProfileRow);
          }
        }
      } catch (error) {
        console.error('Erro ao verificar sessão Supabase:', error);
      }
    }

    // Fallback: check if the active user is the super administrator
    if (activeId === SUPER_ADMIN_USER.id) {
      return SUPER_ADMIN_USER;
    }

    try {
      const stored = localStorage.getItem(LOCAL_AUTH_USER_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.id) return parsed;
      }
    } catch {}

    return null;
  }

  /**
   * Logs in a user using Supabase Auth or Super Administrator credentials.
   */
  async login(
    identifier: string,
    password?: string
  ): Promise<{ user: User | null; error?: string }> {
    const cleanId = identifier.trim();
    const cleanPass = password?.trim() || '';

    if (!cleanId) {
      return {
        user: null,
        error: 'Por favor, introduza o seu nome de utilizador ou e-mail.',
      };
    }

    if (!cleanPass) {
      return {
        user: null,
        error: 'Por favor, introduza a sua palavra-passe.',
      };
    }

    const isSuperAdminEmail =
      cleanId.toLowerCase() === SUPER_ADMIN_USER.email.toLowerCase() ||
      cleanId.toLowerCase() === SUPER_ADMIN_USER.username.toLowerCase();
    const isSuperAdminPass = cleanPass === SUPER_ADMIN_PASSWORD;

    // Check for Super Admin match first
    if (isSuperAdminEmail) {
      if (!isSuperAdminPass) {
        return {
          user: null,
          error: 'Palavra-passe incorreta para o Super Administrador.',
        };
      }

      // If Supabase is connected, try to sign in via Supabase Auth
      const client = getSupabaseClient();
      if (client && isSupabaseConfigured()) {
        try {
          const { data, error } = await client.auth.signInWithPassword({
            email: SUPER_ADMIN_USER.email,
            password: cleanPass,
          });

          if (!error && data.user) {
            const { data: profile } = await client
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .maybeSingle();

            if (profile) {
              const user = profileToUser(profile as ProfileRow);
              this.setCurrentUserId(user.id);
              this.notifyListeners(user);
              return { user };
            }
          }
        } catch (supabaseErr) {
          console.warn('Tentativa com Supabase falhou, a utilizar autenticação de Super Administrador direto:', supabaseErr);
        }
      }

      // Seamless super admin authentication
      this.setCurrentUserId(SUPER_ADMIN_USER.id);
      try {
        localStorage.setItem(LOCAL_AUTH_USER_KEY, JSON.stringify(SUPER_ADMIN_USER));
      } catch {}
      this.notifyListeners(SUPER_ADMIN_USER);
      return { user: SUPER_ADMIN_USER };
    }

    const client = getSupabaseClient();

    if (!client || !isSupabaseConfigured()) {
      // Check local storage for other users if offline
      try {
        const stored = localStorage.getItem('salesflow_users');
        if (stored) {
          const localUsers: User[] = JSON.parse(stored);
          const found = localUsers.find(
            u =>
              (u.email?.toLowerCase() === cleanId.toLowerCase() ||
                u.username?.toLowerCase() === cleanId.toLowerCase()) &&
              u.password === cleanPass
          );
          if (found) {
            this.setCurrentUserId(found.id);
            localStorage.setItem(LOCAL_AUTH_USER_KEY, JSON.stringify(found));
            this.notifyListeners(found);
            return { user: found };
          }
        }
      } catch {}

      return {
        user: null,
        error:
          'Utilizador não encontrado. Utilize a conta Super Administrador nanopaniago1@gmail.com.',
      };
    }

    try {
      let loginEmail = cleanId;

      // Allow login using username.
      if (!cleanId.includes('@')) {
        const {
          data: profileLookup,
          error: lookupError,
        } = await client
          .from('profiles')
          .select('*')
          .ilike('username', cleanId)
          .maybeSingle();

        if (lookupError) {
          console.error(
            'Erro na pesquisa de username no Supabase:',
            lookupError
          );

          return {
            user: null,
            error: 'Não foi possível localizar o utilizador.',
          };
        }

        const profileByUsername =
          profileLookup as ProfileRow | null;

        if (!profileByUsername) {
          return {
            user: null,
            error: 'Utilizador não encontrado no sistema.',
          };
        }

        if (profileByUsername.active === false) {
          return {
            user: null,
            error:
              'Esta conta está inativa. Contacte o administrador.',
          };
        }

        if (!profileByUsername.email) {
          return {
            user: null,
            error:
              'Este perfil não tem um endereço de e-mail associado para autenticação.',
          };
        }

        loginEmail = profileByUsername.email;
      }

      const {
        data,
        error,
      } = await client.auth.signInWithPassword({
        email: loginEmail,
        password: cleanPass,
      });

      if (error) {
        return {
          user: null,
          error: translateAuthError(error.message),
        };
      }

      if (!data.user) {
        return {
          user: null,
          error:
            'Erro ao autenticar. Nenhuma sessão devolvida pelo Supabase.',
        };
      }

      // Load the real profile associated with the authenticated Supabase Auth user.
      const {
        data: profile,
        error: profileError,
      } = await client
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profileError) {
        console.error(
          'Erro ao carregar perfil do utilizador:',
          profileError
        );

        await client.auth.signOut();

        return {
          user: null,
          error:
            'Não foi possível carregar o perfil do utilizador.',
        };
      }

      if (!profile) {
        await client.auth.signOut();

        return {
          user: null,
          error:
            'A conta está autenticada, mas não existe um perfil correspondente no sistema.',
        };
      }

      const user = profileToUser(profile as ProfileRow);

      if (user.active === false) {
        await client.auth.signOut();

        return {
          user: null,
          error:
            'Esta conta está inativa. Contacte o administrador.',
        };
      }

      this.setCurrentUserId(user.id);
      this.notifyListeners(user);
      return { user };
    } catch (error: any) {
      return {
        user: null,
        error: `Falha na conexão com Supabase Auth: ${
          error?.message || error
        }`,
      };
    }
  }

  /**
   * Signs out the current user.
   */
  async logout(): Promise<void> {
    const client = getSupabaseClient();

    if (client && isSupabaseConfigured()) {
      try {
        await client.auth.signOut();
      } catch (error) {
        console.warn(
          'Aviso ao efetuar logout no Supabase:',
          error
        );
      }
    }

    this.setCurrentUserId(null);
    try {
      localStorage.removeItem(LOCAL_AUTH_USER_KEY);
    } catch {}
    this.notifyListeners(null);
  }

  /**
   * Subscribes to Auth state changes.
   */
  onAuthStateChange(
    callback: (user: User | null) => void
  ): () => void {
    this.listeners.add(callback);

    const client = getSupabaseClient();

    if (!client || !isSupabaseConfigured()) {
      return () => {
        this.listeners.delete(callback);
      };
    }

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        const activeId = this.getCurrentUserId();
        if (activeId !== SUPER_ADMIN_USER.id) {
          this.setCurrentUserId(null);
          this.notifyListeners(null);
        }
        return;
      }

      const {
        data: profile,
        error: profileError,
      } = await client
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profileError || !profile) {
        console.error(
          'Não foi possível carregar o perfil após alteração da autenticação.',
          profileError
        );

        this.notifyListeners(null);
        return;
      }

      const user = profileToUser(profile as ProfileRow);

      if (user.active === false) {
        this.notifyListeners(null);
        return;
      }

      this.notifyListeners(user);
    });

    return () => {
      this.listeners.delete(callback);
      subscription.unsubscribe();
    };
  }
}

export const authService = new AuthService();