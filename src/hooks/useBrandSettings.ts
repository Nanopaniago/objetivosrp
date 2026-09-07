import { useState, useCallback, useEffect } from 'react';
import { BrandConfig } from '../types';
import { settingsService } from '../services/settings.service';
import { DEFAULT_BRAND_CONFIG } from '../utils/brand';

/**
 * Custom hook for Brand and Store Settings.
 * Communicates strictly with settingsService.
 */
export function useBrandSettings() {
  const [brand, setBrand] = useState<BrandConfig>(DEFAULT_BRAND_CONFIG);

  useEffect(() => {
    let isMounted = true;
    settingsService.getBrandSettings().then(loaded => {
      if (isMounted && loaded) {
        setBrand(loaded);
      }
    }).catch(err => {
      console.error('Erro ao carregar configurações de marca:', err);
    });

    return () => {
      isMounted = false;
    };
  }, []);

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
