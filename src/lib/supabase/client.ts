/**
 * Supabase Client Module (Preparation Layer)
 *
 * NOTE: Supabase connection is NOT active yet.
 * This module prepares the architectural integration points so that when
 * `@supabase/supabase-js` is added and environment variables are supplied,
 * switching data layers requires zero UI changes.
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
  return Boolean(url && key && url.trim().length > 0 && key.trim().length > 0);
}

/**
 * Retrieves the current Supabase configuration if present.
 */
export function getSupabaseConfig(): SupabaseConfig | null {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (url && key) {
    return {
      url: url.trim(),
      anonKey: key.trim(),
    };
  }

  return null;
}

/**
 * Placeholder for future Supabase client instance.
 * When `@supabase/supabase-js` is installed and connected, this function
 * will instantiate and return `createClient<Database>(url, key)`.
 */
export function getSupabaseClient(): unknown | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  // Future integration point:
  // import { createClient } from '@supabase/supabase-js';
  // return createClient<Database>(config.url, config.anonKey);
  return null;
}
