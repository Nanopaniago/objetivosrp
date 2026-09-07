import { User } from '../types';

export const AUTH_SESSION_KEY = 'salesflow_session_user_id';
export const CURRENT_USER_KEY = 'salesflow_current_user_id_v3';

/**
 * Authentication Service
 *
 * Encapsulates session management and login/logout workflows.
 * Currently uses localStorage for local persistence.
 * Prepared for future migration to Supabase Auth (supabase.auth.*).
 */
export class AuthService {
  /**
   * Retrieves the currently logged in user ID from session storage.
   */
  getSessionUserId(): string | null {
    try {
      return localStorage.getItem(AUTH_SESSION_KEY) || null;
    } catch (e) {
      console.error('Error accessing session storage', e);
      return null;
    }
  }

  /**
   * Saves the authenticated user ID into session storage.
   */
  setSessionUserId(userId: string): void {
    try {
      localStorage.setItem(AUTH_SESSION_KEY, userId);
    } catch (e) {
      console.error('Error setting session user ID', e);
    }
  }

  /**
   * Clears the current session.
   */
  clearSession(): void {
    try {
      localStorage.removeItem(AUTH_SESSION_KEY);
    } catch (e) {
      console.error('Error clearing session', e);
    }
  }

  /**
   * Retrieves the active selected user ID for the dashboard view.
   */
  getCurrentUserId(): string | null {
    try {
      return localStorage.getItem(CURRENT_USER_KEY) || null;
    } catch (e) {
      console.error('Error getting current user ID', e);
      return null;
    }
  }

  /**
   * Saves the active selected user ID for the dashboard view.
   */
  setCurrentUserId(userId: string): void {
    try {
      localStorage.setItem(CURRENT_USER_KEY, userId);
    } catch (e) {
      console.error('Error setting current user ID', e);
    }
  }

  /**
   * Checks if there is an active session.
   */
  isAuthenticated(): boolean {
    return Boolean(this.getSessionUserId());
  }

  /**
   * Logs in a user by matching username/email and password against existing users.
   * Future: Will call supabase.auth.signInWithPassword({ email, password }).
   */
  async login(
    identifier: string,
    password?: string,
    usersPool: User[] = []
  ): Promise<{ user: User | null; error?: string }> {
    const cleanId = identifier.trim().toLowerCase();
    const foundUser = usersPool.find(u => {
      const uUsername = (u.username || '').toLowerCase();
      const uEmail = (u.email || '').toLowerCase();
      const uName = u.name.toLowerCase().replace(/\s+/g, '.');
      return uUsername === cleanId || uEmail === cleanId || uName === cleanId;
    });

    if (!foundUser) {
      return { user: null, error: 'Utilizador não encontrado.' };
    }

    if (!foundUser.active) {
      return { user: null, error: 'Esta conta está inativa. Contacte o administrador.' };
    }

    // Check password if set
    if (foundUser.password && password && foundUser.password !== password) {
      return { user: null, error: 'Senha incorreta.' };
    }

    // Persist session
    this.setSessionUserId(foundUser.id);
    this.setCurrentUserId(foundUser.id);

    return { user: foundUser };
  }

  /**
   * Logs out the current user and clears session storage.
   * Future: Will call await supabase.auth.signOut().
   */
  async logout(): Promise<void> {
    this.clearSession();
  }
}

export const authService = new AuthService();
