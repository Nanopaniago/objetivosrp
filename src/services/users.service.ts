import { User } from '../types';
import { INITIAL_USERS } from '../data/initialData';

export const USERS_STORAGE_KEY = 'salesflow_users_v3';

/**
 * Normalizes user records loaded from storage to ensure backwards compatibility
 * and presence of mandatory attributes (username, password, super_admin credentials).
 */
function normalizeUsersList(users: User[]): User[] {
  const defaultSuperAdmin = INITIAL_USERS.find(u => u.role === 'super_admin')!;
  const hasSuperAdmin = users.some(
    u => u.role === 'super_admin' || u.id === 'user-super-admin' || u.username === 'nanopaniagopt' || u.username === 'paniago26'
  );

  let normalized: User[] = users.map(u => {
    if (u.role === 'super_admin' || u.id === 'user-super-admin' || u.username === 'paniago26' || u.username === 'nanopaniagopt') {
      return {
        ...u,
        id: 'user-super-admin',
        name: u.name && u.name !== 'Super Administrador' && u.name !== 'Super Admin (paniago26)' ? u.name : 'Super Admin (nanopaniagopt)',
        username: 'nanopaniagopt',
        email: u.email && !u.email.includes('superadmin') && !u.email.includes('paniago26') ? u.email : 'nanopaniagopt@salesflow.pt',
        password: '96171990',
        role: 'super_admin' as const,
      };
    }
    return {
      ...u,
      username: u.username || (u.email ? u.email.split('@')[0].toLowerCase() : u.name.toLowerCase().replace(/\s+/g, '.')),
      password: u.password || '123',
    };
  });

  if (!hasSuperAdmin) {
    normalized = [defaultSuperAdmin, ...normalized];
  }

  return normalized;
}

/**
 * Users Service
 *
 * Encapsulates user queries and mutations.
 * Backed by localStorage and INITIAL_USERS fallback.
 * Future: Will query Supabase `profiles` table.
 */
export class UsersService {
  /**
   * Synchronously loads users from storage (useful for initial React state).
   */
  getInitialUsers(): User[] {
    try {
      const saved = localStorage.getItem(USERS_STORAGE_KEY);
      if (saved) {
        const parsed: User[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return normalizeUsersList(parsed);
        }
      }
    } catch (e) {
      console.error('Error loading initial users from storage', e);
    }
    return INITIAL_USERS;
  }

  /**
   * Retrieves all users (async interface for future Supabase compatibility).
   */
  async getUsers(): Promise<User[]> {
    return this.getInitialUsers();
  }

  /**
   * Retrieves a single user by ID.
   */
  async getUserById(id: string): Promise<User | null> {
    const users = await this.getUsers();
    return users.find(u => u.id === id) || null;
  }

  /**
   * Saves the entire list of users to storage.
   */
  async saveUsers(users: User[]): Promise<void> {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch (e) {
      console.error('Error saving users to storage', e);
    }
  }

  /**
   * Creates a new user and appends to storage.
   * Future: Will execute `supabase.from('profiles').insert(userToProfile(user))`.
   */
  async createUser(newUser: User): Promise<User> {
    const current = await this.getUsers();
    const updated = [...current, newUser];
    await this.saveUsers(updated);
    return newUser;
  }

  /**
   * Updates an existing user record.
   * Future: Will execute `supabase.from('profiles').update(userToProfile(user)).eq('id', user.id)`.
   */
  async updateUser(updatedUser: User): Promise<User> {
    const current = await this.getUsers();
    const updated = current.map(u => (u.id === updatedUser.id ? updatedUser : u));
    await this.saveUsers(updated);
    return updatedUser;
  }

  /**
   * Deletes a user by ID.
   * Future: Will execute `supabase.from('profiles').delete().eq('id', userId)`.
   */
  async deleteUser(userId: string): Promise<boolean> {
    const current = await this.getUsers();
    const filtered = current.filter(u => u.id !== userId);
    await this.saveUsers(filtered);
    return true;
  }

  /**
   * Helper to retrieve only active sellers.
   */
  async getSellers(): Promise<User[]> {
    const users = await this.getUsers();
    return users.filter(u => u.role === 'seller' && u.active !== false);
  }
}

export const usersService = new UsersService();
