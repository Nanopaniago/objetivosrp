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
  private inMemoryBrand: BrandConfig = { ...DEFAULT_BRAND_CONFIG };

  getInitialBrandSettings(): BrandConfig {
    return this.inMemoryBrand;
  }

  async getBrandSettings(): Promise<BrandConfig> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        const { data, error } = await client
          .from('store_settings')
          .select('*')
          .eq('key', 'brand_config')
          .maybeSingle();

        if (error) {
          console.error('Erro ao pesquisar configurações da marca no Supabase:', error.message);
          throw error;
        }

        if (data) {
          const mapped = storeSettingRowToBrandConfig(data as StoreSettingRow);
          this.inMemoryBrand = mapped;
          return mapped;
        }

        // Auto-seed default brand configuration in Supabase
        console.info('Configuração da marca inexistente no Supabase. A inicializar...');
        const initialRow = brandConfigToStoreSettingRow(DEFAULT_BRAND_CONFIG);
        const { data: inserted, error: insertErr } = await client
          .from('store_settings')
          .insert(initialRow as any)
          .select()
          .single();

        if (!insertErr && inserted) {
          const mapped = storeSettingRowToBrandConfig(inserted as StoreSettingRow);
          this.inMemoryBrand = mapped;
          return mapped;
        }
      } catch (err) {
        console.error('Falha ao comunicar com Supabase store_settings:', err);
      }
    }

    return this.inMemoryBrand;
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
          const mapped = storeSettingRowToBrandConfig(data as StoreSettingRow);
          this.inMemoryBrand = mapped;
          return mapped;
        }
      } catch (err) {
        console.error('Erro na gravação da configuração da marca:', err);
        throw err;
      }
    }

    this.inMemoryBrand = config;
    return config;
  }
}

export const settingsService = new SettingsService();
