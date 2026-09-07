import { User } from '../types';
import { INITIAL_USERS } from '../data/initialData';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase/client';
import { profileToUser, userToProfile, ProfileRow } from '../lib/supabase/types';

/**
 * Users Service
 *
 * Persists and queries user profiles directly from the Supabase `profiles` table.
 * Does NOT use localStorage as database.
 * Does NOT keep hardcoded credentials or super_admin bypasses.
 */
export class UsersService {
  private inMemoryCache: User[] = INITIAL_USERS;

  /**
   * Retrieves all users from Supabase `profiles` table.
   * Throws if Supabase returns an error so the UI can display it clearly.
   */
  async getUsers(): Promise<User[]> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Erro ao pesquisar perfis no Supabase:', error.message);
        throw new Error(`Falha ao carregar utilizadores do Supabase: ${error.message}`);
      }

      if (data && data.length > 0) {
        const mapped = (data as ProfileRow[]).map(r => profileToUser(r));
        this.inMemoryCache = mapped;
        return mapped;
      }

      // If database has 0 profiles yet
      return [];
    }

    // Unconfigured demo mode only
    return this.inMemoryCache;
  }

  /**
   * Retrieves a single user by ID.
   */
  async getUserById(id: string): Promise<User | null> {
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

    return this.inMemoryCache.find(u => u.id === id) || null;
  }

  /**
   * Saves or synchronizes users in memory and Supabase.
   */
  async saveUsers(users: User[]): Promise<void> {
    this.inMemoryCache = users;
    // Real persistence is handled atomically via createUser, updateUser, deleteUser
  }

  /**
   * Creates a new user profile in Supabase.
   */
  async createUser(newUser: User): Promise<User> {
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
          throw new Error(`Falha ao criar utilizador no Supabase: ${error.message}`);
        }

        if (data) {
          const created = profileToUser(data as ProfileRow);
          this.inMemoryCache = [...this.inMemoryCache.filter(u => u.id !== created.id), created];
          return created;
        }
      } catch (err) {
        console.error('Erro na criação de utilizador:', err);
        throw err;
      }
    }

    this.inMemoryCache = [...this.inMemoryCache.filter(u => u.id !== newUser.id), newUser];
    return newUser;
  }

  /**
   * Updates an existing user profile in Supabase.
   */
  async updateUser(updatedUser: User): Promise<User> {
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
          throw new Error(`Falha ao atualizar utilizador: ${error.message}`);
        }

        if (data) {
          const updated = profileToUser(data as ProfileRow);
          this.inMemoryCache = this.inMemoryCache.map(u => (u.id === updated.id ? updated : u));
          return updated;
        }
      } catch (err) {
        console.error('Erro na atualização de utilizador:', err);
        throw err;
      }
    }

    this.inMemoryCache = this.inMemoryCache.map(u => (u.id === updatedUser.id ? updatedUser : u));
    return updatedUser;
  }

  /**
   * Deletes a user profile from Supabase.
   */
  async deleteUser(userId: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        const { error } = await client
          .from('profiles')
          .delete()
          .eq('id', userId);

        if (error) {
          console.error(`Erro ao eliminar perfil ${userId} no Supabase:`, error.message);
          throw new Error(`Falha ao eliminar utilizador: ${error.message}`);
        }
      } catch (err) {
        console.error('Erro ao eliminar utilizador:', err);
        throw err;
      }
    }

    this.inMemoryCache = this.inMemoryCache.filter(u => u.id !== userId);
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
