import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './types';

/**
 * Supabase Client Module
 *
 * Provides a real, functional client using @supabase/supabase-js.
 * Reads VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY / VITE_SUPABASE_ANON_KEY.
 * Never exposes service-role keys or sensitive server credentials.
 */

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

/**
 * Returns whether Supabase credentials have been configured in the environment.
 */
export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
    key &&
    url.trim().length > 0 &&
    key.trim().length > 0 &&
    !url.includes('your-project.supabase.co') &&
    url.startsWith('http')
  );
}

/**
 * Retrieves the current Supabase configuration if present.
 */
export function getSupabaseConfig(): SupabaseConfig | null {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (url && key && url.trim().length > 0 && key.trim().length > 0) {
    return {
      url: url.trim(),
      anonKey: key.trim(),
    };
  }

  return null;
}

let supabaseInstance: SupabaseClient<Database> | null = null;

/**
 * Instantiates and returns the Supabase Client singleton.
 * Returns null if Supabase environment variables are not yet configured.
 */
export function getSupabaseClient(): SupabaseClient<Database> | null {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const config = getSupabaseConfig();
  if (!config || !isSupabaseConfigured()) {
    return null;
  }

  try {
    supabaseInstance = createClient<Database>(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
    });
    return supabaseInstance;
  } catch (err) {
    console.error('Falha ao inicializar o cliente Supabase:', err);
    return null;
  }
}

/**
 * Default exportable singleton instance (can be null if unconfigured).
 */
export const supabase = getSupabaseClient();
