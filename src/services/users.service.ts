import { User } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase/client';
import { profileToUser, userToProfile, ProfileRow } from '../lib/supabase/types';
import { SUPER_ADMIN_USER } from './auth.service';

const LOCAL_USERS_KEY = 'salesflow_users';

function getStoredLocalUsers(): User[] {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    if (raw) {
      const parsed: User[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        if (!parsed.some(u => u.email?.toLowerCase() === SUPER_ADMIN_USER.email?.toLowerCase() || u.id === SUPER_ADMIN_USER.id)) {
          parsed.unshift(SUPER_ADMIN_USER);
        }
        return parsed;
      }
    }
  } catch {}

  const initial = [SUPER_ADMIN_USER];
  try {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(initial));
  } catch {}
  return initial;
}

function saveStoredLocalUsers(users: User[]): void {
  try {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch {}
}

/**
 * Users Service
 *
 * Persists and queries user profiles directly from the Supabase `profiles` table
 * with seamless local persistence fallback.
 */
export class UsersService {
  /**
   * Retrieves all users.
   */
  async getUsers(): Promise<User[]> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        const { data, error } = await client
          .from('profiles')
          .select('*')
          .order('name', { ascending: true });

        if (error) {
          console.error('Erro ao pesquisar perfis no Supabase:', error.message);
          return getStoredLocalUsers();
        }

        if (data && data.length > 0) {
          const mapped = (data as ProfileRow[]).map(r => profileToUser(r));
          if (!mapped.some(u => u.email?.toLowerCase() === SUPER_ADMIN_USER.email?.toLowerCase() || u.id === SUPER_ADMIN_USER.id)) {
            mapped.unshift(SUPER_ADMIN_USER);
          }
          saveStoredLocalUsers(mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('Falha na consulta ao Supabase:', err);
      }
    }

    return getStoredLocalUsers();
  }

  /**
   * Retrieves a single user by ID.
   */
  async getUserById(id: string): Promise<User | null> {
    if (id === SUPER_ADMIN_USER.id || id === 'nanopaniago1') {
      return SUPER_ADMIN_USER;
    }

    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        const { data, error } = await client
          .from('profiles')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) {
          console.error(`Erro ao pesquisar utilizador ${id} no Supabase:`, error.message);
        }

        if (data) {
          return profileToUser(data as ProfileRow);
        }
      } catch (err) {
        console.error(`Erro ao obter utilizador ${id}:`, err);
      }
    }

    const localUsers = getStoredLocalUsers();
    return localUsers.find(u => u.id === id) || null;
  }

  /**
   * Saves or synchronizes users.
   */
  async saveUsers(users: User[]): Promise<void> {
    saveStoredLocalUsers(users);
  }

  /**
   * Creates a new user profile.
   */
  async createUser(newUser: User): Promise<User> {
    // Always persist to local store
    const local = getStoredLocalUsers();
    if (!local.some(u => u.id === newUser.id)) {
      local.push(newUser);
      saveStoredLocalUsers(local);
    }

    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        const profileInsert = userToProfile(newUser);
        const { data, error } = await client
          .from('profiles')
          .insert(profileInsert as any)
          .select()
          .single();

        if (error) {
          console.error('Erro ao criar perfil no Supabase:', error.message);
          return newUser;
        }

        if (data) {
          return profileToUser(data as ProfileRow);
        }
      } catch (err) {
        console.error('Erro na criação de utilizador no Supabase:', err);
        return newUser;
      }
    }

    return newUser;
  }

  /**
   * Updates an existing user profile.
   */
  async updateUser(updatedUser: User): Promise<User> {
    const local = getStoredLocalUsers();
    const idx = local.findIndex(u => u.id === updatedUser.id);
    if (idx >= 0) {
      local[idx] = updatedUser;
    } else {
      local.push(updatedUser);
    }
    saveStoredLocalUsers(local);

    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        const profileUpdate = userToProfile(updatedUser);
        const { data, error } = await (client.from('profiles') as any)
          .update(profileUpdate)
          .eq('id', updatedUser.id)
          .select()
          .single();

        if (error) {
          console.error(`Erro ao atualizar perfil ${updatedUser.id} no Supabase:`, error.message);
          return updatedUser;
        }

        if (data) {
          return profileToUser(data as ProfileRow);
        }
      } catch (err) {
        console.error('Erro na atualização de utilizador no Supabase:', err);
        return updatedUser;
      }
    }

    return updatedUser;
  }

  /**
   * Deletes a user profile.
   */
  async deleteUser(userId: string): Promise<boolean> {
    if (userId === SUPER_ADMIN_USER.id) {
      throw new Error('Não é permitido eliminar o Super Administrador principal.');
    }

    const local = getStoredLocalUsers().filter(u => u.id !== userId);
    saveStoredLocalUsers(local);

    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        const { error } = await client
          .from('profiles')
          .delete()
          .eq('id', userId);

        if (error) {
          console.error(`Erro ao eliminar perfil ${userId} no Supabase:`, error.message);
        }
      } catch (err) {
        console.error('Erro ao eliminar utilizador no Supabase:', err);
      }
    }

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
