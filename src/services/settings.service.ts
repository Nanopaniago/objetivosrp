import { BrandConfig } from '../types';
import { DEFAULT_BRAND_CONFIG } from '../utils/brand';

export const BRAND_STORAGE_KEY = 'salesflow_brand_settings_v1';

/**
 * Settings Service
 *
 * Encapsulates application preferences, brand identity, logos, and custom store settings.
 * Backed by localStorage.
 * Future: Will query and mutate Supabase `store_settings` table.
 */
export class SettingsService {
  /**
   * Loads initial brand configuration synchronously from storage.
   */
  getInitialBrandSettings(): BrandConfig {
    try {
      const saved = localStorage.getItem(BRAND_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_BRAND_CONFIG, ...parsed };
      }
    } catch (e) {
      console.warn('Error loading brand settings from storage', e);
    }
    return DEFAULT_BRAND_CONFIG;
  }

  /**
   * Asynchronously retrieves brand configuration.
   */
  async getBrandSettings(): Promise<BrandConfig> {
    return this.getInitialBrandSettings();
  }

  /**
   * Saves brand configuration.
   */
  async saveBrandSettings(config: BrandConfig): Promise<BrandConfig> {
    try {
      localStorage.setItem(BRAND_STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
      console.error('Error saving brand settings to storage', e);
    }
    return config;
  }
}

export const settingsService = new SettingsService();
