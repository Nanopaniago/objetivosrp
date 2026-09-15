import { useState, useCallback } from 'react';
import { User } from '../types';
import { authService } from '../services/auth.service';

/**
 * Custom hook for authentication and user selection.
 *
 * IMPORTANT:
 * - sessionUserId = the user actually authenticated by Supabase.
 * - currentUserId = the user currently being viewed/managed in the UI.
 *
 * Switching users must NEVER change the authenticated session.
 */
export function useAuth() {
  const [sessionUserId, setSessionUserIdState] = useState<string | null>(() => {
    return authService.getSessionUserId();
  });

  const [currentUserId, setCurrentUserIdState] = useState<string | null>(() => {
    return authService.getCurrentUserId();
  });

  const login = useCallback(async (user: User) => {
    // The real authentication is handled by Supabase/authService.
    // This only synchronizes the UI with the authenticated profile.
    setSessionUserIdState(user.id);
    setCurrentUserIdState(user.id);
    authService.setCurrentUserId(user.id);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();

    setSessionUserIdState(null);
    setCurrentUserIdState(null);
  }, []);

  const switchUser = useCallback((userId: string) => {
    // IMPORTANT:
    // Changing the selected user must NOT change the authenticated user.
    authService.setCurrentUserId(userId);
    setCurrentUserIdState(userId);
  }, []);

  return {
    sessionUserId,
    currentUserId,
    isAuthenticated: Boolean(sessionUserId),
    login,
    logout,
    switchUser,
  };
}