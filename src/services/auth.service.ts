import { User } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase/client';
import { profileToUser, ProfileRow } from '../lib/supabase/types';

const DEMO_SESSION_KEY = 'salesflow_demo_session_user_id';
const ACTIVE_USER_KEY = 'salesflow_active_user_id';

function translateAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return 'Credenciais inválidas. Verifique o utilizador/e-mail e a palavra-passe.';
  }
  if (lower.includes('email not confirmed')) {
    return 'O e-mail ainda não foi confirmado no Supabase Auth.';
  }
  if (lower.includes('user not found')) {
    return 'Utilizador não encontrado no sistema.';
  }
  if (lower.includes('too many requests') || lower.includes('rate limit')) {
    return 'Demasiadas tentativas consecutivas. Aguarde alguns instantes e tente novamente.';
  }
  return `Erro de autenticação: ${message}`;
}

/**
 * Authentication Service
 *
 * Exclusively uses Supabase Auth when Supabase is configured:
 * - signInWithPassword
 * - signOut
 * - getSession
 * - onAuthStateChange
 *
 * Never stores passwords or user databases in localStorage.
 * No hardcoded credentials.
 */
export class AuthService {
  /**
   * Returns the session user ID stored in temporary sessionStorage.
   */
  getSessionUserId(): string | null {
    try {
      return sessionStorage.getItem(DEMO_SESSION_KEY);
    } catch {
      return null;
    }
  }

  /**
   * Sets or clears the session user ID in temporary sessionStorage.
   */
  setSessionUserId(userId: string | null): void {
    try {
      if (userId) {
        sessionStorage.setItem(DEMO_SESSION_KEY, userId);
      } else {
        sessionStorage.removeItem(DEMO_SESSION_KEY);
      }
    } catch {
      // Ignored
    }
  }

  /**
   * Returns the currently active selected user ID.
   */
  getCurrentUserId(): string | null {
    try {
      return sessionStorage.getItem(ACTIVE_USER_KEY);
    } catch {
      return null;
    }
  }

  /**
   * Sets or clears the active selected user ID.
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
   * Checks if there is an active session in Supabase or temporary demo session.
   */
  async isAuthenticated(): Promise<boolean> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        const { data } = await client.auth.getSession();
        return Boolean(data?.session?.user);
      } catch {
        return false;
      }
    }
    // Demo fallback only
    try {
      return Boolean(sessionStorage.getItem(DEMO_SESSION_KEY));
    } catch {
      return false;
    }
  }

  /**
   * Gets the currently authenticated user with their profile from Supabase.
   */
  async getCurrentSessionUser(): Promise<User | null> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        const { data: { session }, error: sessionError } = await client.auth.getSession();
        if (sessionError || !session || !session.user) {
          return null;
        }

        const { data: profile, error: profileError } = await client
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Erro ao obter perfil do utilizador no Supabase:', profileError);
        }

        if (profile) {
          return profileToUser(profile as ProfileRow);
        }

        // Profile row fallback if profile trigger is still executing
        const fallbackUser: User = {
          id: session.user.id,
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Utilizador',
          username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'utilizador',
          email: session.user.email || undefined,
          role: (session.user.user_metadata?.role as any) || 'seller',
          avatar: session.user.user_metadata?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          active: true,
          storeName: 'Loja Principal',
          createdAt: session.user.created_at,
          updatedAt: session.user.updated_at || session.user.created_at,
        };
        return fallbackUser;
      } catch (e) {
        console.error('Erro ao verificar sessão Supabase:', e);
        return null;
      }
    }

    return null;
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
      return { user: null, error: 'Por favor, introduza o seu nome de utilizador ou e-mail.' };
    }
    if (!password) {
      return { user: null, error: 'Por favor, introduza a sua palavra-passe.' };
    }

    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) {
      return {
        user: null,
        error: 'O Supabase não está configurado. Configure as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.',
      };
    }

    try {
      let loginEmail = cleanId;

      // If username was provided instead of email, lookup associated email in profiles
      if (!cleanId.includes('@')) {
        const { data: profileLookup, error: lookupError } = await client
          .from('profiles')
          .select('*')
          .ilike('username', cleanId)
          .maybeSingle();

        if (lookupError) {
          console.warn('Aviso na pesquisa de username no Supabase:', lookupError.message);
        }

        const profileByUsername = profileLookup as ProfileRow | null;
        if (!profileByUsername) {
          return { user: null, error: 'Utilizador não encontrado no sistema.' };
        }

        if (profileByUsername.active === false) {
          return { user: null, error: 'Esta conta está inativa. Contacte o administrador.' };
        }

        if (profileByUsername.email) {
          loginEmail = profileByUsername.email;
        } else {
          return { user: null, error: 'Este perfil não tem um endereço de e-mail associado para autenticação.' };
        }
      }

      // Authenticate via Supabase Auth
      const { data, error } = await client.auth.signInWithPassword({
        email: loginEmail,
        password: password,
      });

      if (error) {
        return { user: null, error: translateAuthError(error.message) };
      }

      if (!data.user) {
        return { user: null, error: 'Erro ao autenticar. Nenhuma sessão devolvida pelo Supabase.' };
      }

      // Fetch user profile from Supabase
      const { data: profile, error: profileErr } = await client
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profileErr) {
        console.error('Erro ao carregar perfil do utilizador:', profileErr);
      }

      if (profile) {
        return { user: profileToUser(profile as ProfileRow) };
      }

      const authenticatedUser: User = {
        id: data.user.id,
        name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Utilizador',
        username: data.user.user_metadata?.username || cleanId.toLowerCase(),
        email: data.user.email || undefined,
        role: (data.user.user_metadata?.role as any) || 'seller',
        avatar: data.user.user_metadata?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        active: true,
        storeName: 'Loja Principal',
        createdAt: data.user.created_at,
        updatedAt: data.user.updated_at || data.user.created_at,
      };

      return { user: authenticatedUser };
    } catch (err: any) {
      return { user: null, error: `Falha na conexão com Supabase Auth: ${err.message || err}` };
    }
  }

  /**
   * Signs out the current user via Supabase and clears session storage.
   */
  async logout(): Promise<void> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        await client.auth.signOut();
      } catch (err) {
        console.warn('Aviso ao efetuar logout no Supabase:', err);
      }
    }
    try {
      sessionStorage.removeItem(DEMO_SESSION_KEY);
    } catch {
      // Ignored
    }
  }

  /**
   * Subscribes to Supabase Auth state changes.
   */
  onAuthStateChange(callback: (user: User | null) => void): () => void {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      const { data: { subscription } } = client.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          try {
            sessionStorage.removeItem(DEMO_SESSION_KEY);
          } catch {
            // Ignored
          }
          callback(null);
        } else if (session.user) {
          const { data: profile } = await client
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profile) {
            callback(profileToUser(profile as ProfileRow));
          }
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
    return () => {};
  }
}

export const authService = new AuthService();
