import { User } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase/client';
import { profileToUser, ProfileRow } from '../lib/supabase/types';

const ACTIVE_USER_KEY = 'salesflow_active_user_id';

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
  /**
   * Returns the ID of the currently authenticated Supabase user.
   */
  getSessionUserId(): string | null {
    // The synchronous method cannot reliably read Supabase's async session.
    // App initialization obtains the real authenticated user through
    // getCurrentSessionUser().
    return null;
  }

  /**
   * Kept for compatibility with existing code.
   *
   * Authentication is managed exclusively by Supabase Auth.
   */
  setSessionUserId(_userId: string | null): void {
    // Intentionally empty.
    // Never manually create or overwrite the authenticated session.
  }

  /**
   * Returns the currently selected user ID.
   *
   * This is only a UI selection and is NOT an authentication credential.
   */
  getCurrentUserId(): string | null {
    try {
      return sessionStorage.getItem(ACTIVE_USER_KEY);
    } catch {
      return null;
    }
  }

  /**
   * Sets or clears the currently selected user.
   *
   * IMPORTANT:
   * This does not affect Supabase authentication.
   */
  setCurrentUserId(userId: string | null): void {
    try {
      if (userId) {
        sessionStorage.setItem(ACTIVE_USER_KEY, userId);
      } else {
        sessionStorage.removeItem(ACTIVE_USER_KEY);
      }
    } catch {
      // Ignored
    }
  }

  /**
   * Checks whether a real Supabase Auth session exists.
   */
  async isAuthenticated(): Promise<boolean> {
    const client = getSupabaseClient();

    if (!client || !isSupabaseConfigured()) {
      return false;
    }

    try {
      const { data, error } = await client.auth.getSession();

      if (error) {
        console.error('Erro ao verificar sessão Supabase:', error);
        return false;
      }

      return Boolean(data.session?.user);
    } catch (error) {
      console.error('Erro ao verificar sessão Supabase:', error);
      return false;
    }
  }

  /**
   * Gets the currently authenticated user and their profile.
   *
   * A valid Supabase Auth session MUST have a corresponding profile.
   * We do not create synthetic/fallback users.
   */
  async getCurrentSessionUser(): Promise<User | null> {
    const client = getSupabaseClient();

    if (!client || !isSupabaseConfigured()) {
      return null;
    }

    try {
      const {
        data: { session },
        error: sessionError,
      } = await client.auth.getSession();

      if (sessionError) {
        console.error(
          'Erro ao obter sessão do Supabase:',
          sessionError
        );
        return null;
      }

      if (!session?.user) {
        return null;
      }

      const {
        data: profile,
        error: profileError,
      } = await client
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profileError) {
        console.error(
          'Erro ao obter perfil do utilizador no Supabase:',
          profileError
        );
        return null;
      }

      if (!profile) {
        console.error(
          'Utilizador autenticado no Supabase sem perfil correspondente.'
        );
        return null;
      }

      return profileToUser(profile as ProfileRow);
    } catch (error) {
      console.error(
        'Erro ao verificar sessão Supabase:',
        error
      );
      return null;
    }
  }

  /**
   * Logs in a user using Supabase Auth.
   */
  async login(
    identifier: string,
    password?: string
  ): Promise<{ user: User | null; error?: string }> {
    const cleanId = identifier.trim();

    if (!cleanId) {
      return {
        user: null,
        error: 'Por favor, introduza o seu nome de utilizador ou e-mail.',
      };
    }

    if (!password) {
      return {
        user: null,
        error: 'Por favor, introduza a sua palavra-passe.',
      };
    }

    const client = getSupabaseClient();

    if (!client || !isSupabaseConfigured()) {
      return {
        user: null,
        error:
          'O Supabase não está configurado. Configure as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.',
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
        password,
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

      // Load the real profile associated with the authenticated
      // Supabase Auth user.
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
   * Signs out the current Supabase Auth user.
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
  }

  /**
   * Subscribes to Supabase Auth state changes.
   */
  onAuthStateChange(
    callback: (user: User | null) => void
  ): () => void {
    const client = getSupabaseClient();

    if (!client || !isSupabaseConfigured()) {
      return () => {};
    }

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        this.setCurrentUserId(null);
        callback(null);
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

        callback(null);
        return;
      }

      const user = profileToUser(profile as ProfileRow);

      if (user.active === false) {
        callback(null);
        return;
      }

      callback(user);
    });

    return () => {
      subscription.unsubscribe();
    };
  }
}

export const authService = new AuthService();