import { useState, useCallback, useEffect } from 'react';
import { BrandConfig } from '../types';
import { settingsService } from '../services/settings.service';

/**
 * Custom hook for Brand and Store Settings.
 * Communicates strictly with settingsService.
 */
export function useBrandSettings() {
  const [brand, setBrand] = useState<BrandConfig>(() => {
    return settingsService.getInitialBrandSettings();
  });

  useEffect(() => {
    document.title = `${brand.name} - Gestão de Metas & Desempenho`;
  }, [brand.name]);

  const saveBrand = useCallback(async (newBrand: BrandConfig) => {
    setBrand(newBrand);
    await settingsService.saveBrandSettings(newBrand);
  }, []);

  return {
    brand,
    setBrand,
    saveBrand,
  };
}
