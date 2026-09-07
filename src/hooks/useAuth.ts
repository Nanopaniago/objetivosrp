import { useState, useCallback } from 'react';
import { User } from '../types';
import { authService } from '../services/auth.service';

/**
 * Custom hook for authentication and session management.
 * Connects React components to the auth service.
 */
export function useAuth() {
  const [sessionUserId, setSessionUserIdState] = useState<string | null>(() => {
    return authService.getSessionUserId();
  });

  const [currentUserId, setCurrentUserIdState] = useState<string | null>(() => {
    return authService.getCurrentUserId();
  });

  const login = useCallback(async (user: User) => {
    authService.setSessionUserId(user.id);
    authService.setCurrentUserId(user.id);
    setSessionUserIdState(user.id);
    setCurrentUserIdState(user.id);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setSessionUserIdState(null);
  }, []);

  const switchUser = useCallback((userId: string) => {
    authService.setCurrentUserId(userId);
    authService.setSessionUserId(userId);
    setCurrentUserIdState(userId);
    setSessionUserIdState(userId);
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
