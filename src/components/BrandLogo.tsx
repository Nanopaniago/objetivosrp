import React from 'react';
import { BrandConfig, LogoPreset } from '../types';
import {
  Leaf,
  Sparkles,
  Activity,
  Waves,
  Diamond,
  Target,
  Layers,
  TrendingUp,
  Flame,
} from 'lucide-react';
import { getAccentClasses } from '../utils/brand';

interface BrandLogoProps {
  brand: BrandConfig;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
  textColor?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  brand,
  size = 'md',
  className = '',
  showText = false,
  textColor = 'text-slate-900',
}) => {
  const accentClasses = getAccentClasses(brand.accent);

  const sizeDimensions = {
    sm: { box: 'w-8 h-8 rounded-xl', icon: 'w-4 h-4', text: 'text-base', sub: 'text-[10px]' },
    md: { box: 'w-10 h-10 rounded-2xl', icon: 'w-5 h-5', text: 'text-xl', sub: 'text-xs' },
    lg: { box: 'w-14 h-14 rounded-2xl', icon: 'w-7 h-7', text: 'text-2xl', sub: 'text-xs' },
    xl: { box: 'w-20 h-20 rounded-3xl', icon: 'w-10 h-10', text: 'text-3xl', sub: 'text-sm' },
  }[size];

  const renderIcon = (preset: LogoPreset) => {
    switch (preset) {
      case 'leaf':
        return <Leaf className={sizeDimensions.icon} strokeWidth={2.2} />;
      case 'sparkle':
        return <Sparkles className={sizeDimensions.icon} strokeWidth={2.2} />;
      case 'pulse':
        return <Activity className={sizeDimensions.icon} strokeWidth={2.2} />;
      case 'wave':
        return <Waves className={sizeDimensions.icon} strokeWidth={2.2} />;
      case 'gem':
        return <Diamond className={sizeDimensions.icon} strokeWidth={2.2} />;
      case 'target':
        return <Target className={sizeDimensions.icon} strokeWidth={2.2} />;
      case 'flow':
      default:
        return <Layers className={sizeDimensions.icon} strokeWidth={2.2} />;
    }
  };

  const getContainerGlow = () => {
    switch (brand.accent) {
      case 'graphite':
        return 'bg-gradient-to-br from-zinc-900 via-zinc-800 to-black text-white shadow-md shadow-zinc-900/25 ring-1 ring-white/10';
      case 'emerald':
        return 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25 ring-1 ring-white/20';
      case 'indigo':
        return 'bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25 ring-1 ring-white/20';
      case 'amber':
        return 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/25 ring-1 ring-white/20';
      case 'apple_blue':
      default:
        return 'bg-gradient-to-br from-[#0071e3] to-[#005bb5] text-white shadow-md shadow-blue-500/25 ring-1 ring-white/20';
    }
  };

  // Split name to highlight the second part if applicable
  const renderFormattedName = () => {
    const rawName = brand.name || 'SalesFlow';
    const highlight = brand.highlightWord?.trim();

    if (highlight && rawName.toLowerCase().includes(highlight.toLowerCase())) {
      const idx = rawName.toLowerCase().indexOf(highlight.toLowerCase());
      const before = rawName.substring(0, idx);
      const match = rawName.substring(idx, idx + highlight.length);
      const after = rawName.substring(idx + highlight.length);

      return (
        <span>
          {before}
          <span className={accentClasses.highlightText}>{match}</span>
          {after}
        </span>
      );
    }

    return <span>{rawName}</span>;
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Icon or Image container */}
      <div
        className={`${sizeDimensions.box} flex items-center justify-center overflow-hidden shrink-0 transition-transform duration-300 group-hover:scale-105 ${
          brand.logoType === 'custom_image' && brand.customLogoUrl
            ? 'bg-white p-1 border border-slate-200/80 shadow-xs'
            : getContainerGlow()
        }`}
      >
        {brand.logoType === 'custom_image' && brand.customLogoUrl ? (
          <img
            src={brand.customLogoUrl}
            alt={brand.name}
            className="w-full h-full object-contain rounded-xl"
            onError={e => {
              // Fallback to preset if image fails
              const target = e.currentTarget;
              target.style.display = 'none';
            }}
          />
        ) : (
          renderIcon(brand.logoPreset)
        )}
      </div>

      {showText && (
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-2">
            <h1 className={`${sizeDimensions.text} font-black tracking-tight ${textColor} leading-tight`}>
              {renderFormattedName()}
            </h1>
          </div>
          {brand.tagline && (
            <span className={`${sizeDimensions.sub} font-medium text-slate-500 line-clamp-1`}>
              {brand.tagline}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
