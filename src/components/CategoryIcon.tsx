import React from 'react';
import {
  PackageCheck,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  Coffee,
  Smartphone,
  Tag,
} from 'lucide-react';

interface CategoryIconProps {
  slug: string;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ slug, className = 'w-5 h-5' }) => {
  switch (slug) {
    case 'plus_master':
      return <PackageCheck className={className} />;
    case 'plus':
      return <Sparkles className={className} />;
    case 'megas_total':
      return <ShieldAlert className={className} />;
    case 'dm_classicas':
      return <ShieldCheck className={className} />;
    case 'dimobilli':
      return <Coffee className={className} />;
    case 'peliculas':
      return <Smartphone className={className} />;
    default:
      return <Tag className={className} />;
  }
};
