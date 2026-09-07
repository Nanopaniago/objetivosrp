import { useState, useCallback, useEffect } from 'react';
import { User } from '../types';
import { usersService } from '../services/users.service';

/**
 * Custom hook for User state management and operations.
 * Communicates strictly with usersService.
 */
export function useUsers() {
  const [users, setUsers] = useState<User[]>(() => usersService.getInitialUsers());

  // Keep storage in sync whenever users state changes
  useEffect(() => {
    usersService.saveUsers(users);
  }, [users]);

  const createUser = useCallback(async (newUser: User) => {
    setUsers(prev => [...prev, newUser]);
    await usersService.createUser(newUser);
  }, []);

  const updateUser = useCallback(async (updatedUser: User) => {
    setUsers(prev => prev.map(u => (u.id === updatedUser.id ? updatedUser : u)));
    await usersService.updateUser(updatedUser);
  }, []);

  const deleteUser = useCallback(async (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    await usersService.deleteUser(userId);
  }, []);

  return {
    users,
    setUsers,
    createUser,
    updateUser,
    deleteUser,
  };
}
