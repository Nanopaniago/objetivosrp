import { BrandConfig, BrandAccent } from '../types';

export const DEFAULT_BRAND_CONFIG: BrandConfig = {
  name: 'SalesFlow',
  highlightWord: 'Flow',
  tagline: 'Plataforma de Gestão de Metas & Desempenho Comercial',
  logoType: 'preset',
  logoPreset: 'leaf',
  accent: 'apple_blue',
};

export function loadBrandConfig(): BrandConfig {
  return DEFAULT_BRAND_CONFIG;
}

export function getAccentClasses(accent: BrandAccent) {
  switch (accent) {
    case 'graphite':
      return {
        primary: 'bg-zinc-900 text-white hover:bg-black',
        primaryText: 'text-zinc-900',
        lightBg: 'bg-zinc-100 text-zinc-900 border-zinc-200',
        ring: 'ring-zinc-900/20 focus:border-zinc-900',
        glow: 'from-zinc-900 to-zinc-700',
        pillActive: 'bg-zinc-900 text-white',
        highlightText: 'text-zinc-900',
      };
    case 'emerald':
      return {
        primary: 'bg-emerald-600 text-white hover:bg-emerald-700',
        primaryText: 'text-emerald-600',
        lightBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        ring: 'ring-emerald-500/20 focus:border-emerald-600',
        glow: 'from-emerald-600 to-teal-600',
        pillActive: 'bg-emerald-600 text-white',
        highlightText: 'text-emerald-600',
      };
    case 'indigo':
      return {
        primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
        primaryText: 'text-indigo-600',
        lightBg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        ring: 'ring-indigo-500/20 focus:border-indigo-600',
        glow: 'from-indigo-600 to-purple-600',
        pillActive: 'bg-indigo-600 text-white',
        highlightText: 'text-indigo-600',
      };
    case 'amber':
      return {
        primary: 'bg-amber-600 text-white hover:bg-amber-700',
        primaryText: 'text-amber-600',
        lightBg: 'bg-amber-50 text-amber-800 border-amber-200',
        ring: 'ring-amber-500/20 focus:border-amber-600',
        glow: 'from-amber-600 to-orange-600',
        pillActive: 'bg-amber-600 text-white',
        highlightText: 'text-amber-600',
      };
    case 'apple_blue':
    default:
      return {
        primary: 'bg-[#0071e3] text-white hover:bg-[#0077ed]',
        primaryText: 'text-[#0071e3]',
        lightBg: 'bg-blue-50 text-blue-800 border-blue-200',
        ring: 'ring-blue-500/20 focus:border-[#0071e3]',
        glow: 'from-[#0071e3] to-sky-600',
        pillActive: 'bg-[#0071e3] text-white',
        highlightText: 'text-[#0071e3]',
      };
  }
}
