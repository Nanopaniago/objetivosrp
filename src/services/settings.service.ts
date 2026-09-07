import { BrandConfig } from '../types';
import { DEFAULT_BRAND_CONFIG } from '../utils/brand';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase/client';
import {
  storeSettingRowToBrandConfig,
  brandConfigToStoreSettingRow,
  StoreSettingRow,
} from '../lib/supabase/types';

/**
 * Settings Service
 *
 * Persists and retrieves brand identity, store settings and customization from Supabase `store_settings` table.
 * Does NOT rely on localStorage.
 */
export class SettingsService {
  async getBrandSettings(): Promise<BrandConfig> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      const { data, error } = await client
        .from('store_settings')
        .select('*')
        .eq('key', 'brand_config')
        .maybeSingle();

      if (error) {
        console.error('Erro ao pesquisar configurações da marca no Supabase:', error.message);
        throw new Error(`Falha ao carregar configurações: ${error.message}`);
      }

      if (data) {
        return storeSettingRowToBrandConfig(data as StoreSettingRow);
      }

      // Return default config if no custom store setting is saved yet
      return DEFAULT_BRAND_CONFIG;
    }

    return DEFAULT_BRAND_CONFIG;
  }

  async saveBrandSettings(config: BrandConfig): Promise<BrandConfig> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        const row = brandConfigToStoreSettingRow(config);
        const { data, error } = await client
          .from('store_settings')
          .upsert(row as any, { onConflict: 'key' })
          .select()
          .single();

        if (error) {
          console.error('Erro ao guardar configurações da marca no Supabase:', error.message);
          throw new Error(`Falha ao guardar configurações: ${error.message}`);
        }

        if (data) {
          return storeSettingRowToBrandConfig(data as StoreSettingRow);
        }
      } catch (err) {
        console.error('Erro na gravação da configuração da marca:', err);
        throw err;
      }
    }

    return config;
  }
}

export const settingsService = new SettingsService();
