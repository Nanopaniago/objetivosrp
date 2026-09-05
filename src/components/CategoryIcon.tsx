import React from 'react';
import { motion } from 'motion/react';
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
  animate?: boolean;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  slug,
  className = 'w-5 h-5',
  animate = true,
}) => {
  const renderIcon = () => {
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

  if (!animate) {
    return <>{renderIcon()}</>;
  }

  return (
    <motion.span
      className="inline-flex items-center justify-center shrink-0"
      whileHover={{ scale: 1.18, rotate: [-2, 4, -2, 0] }}
      whileTap={{ scale: 0.88 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    >
      {renderIcon()}
    </motion.span>
  );
};
