import React from 'react';
import { motion } from 'motion/react';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Target,
  UserCog,
  RefreshCw,
  Plus,
  Sparkles,
} from 'lucide-react';
import { User, BrandConfig } from '../types';
import { getAccentClasses } from '../utils/brand';

interface MobileBottomNavProps {
  activeTab: 'dashboard' | 'team' | 'goals' | 'schedule' | 'users';
  onSelectTab: (tab: 'dashboard' | 'team' | 'goals' | 'schedule' | 'users') => void;
  onOpenDailyEntry: () => void;
  currentUser: User;
  brand: BrandConfig;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenDailyEntry,
  currentUser,
  brand,
}) => {
  const accentClasses = getAccentClasses(brand.accent);
  const isSuperOrAdmin = currentUser.role === 'super_admin' || currentUser.role === 'admin' || currentUser.role === 'manager';

  const navItems = [
    {
      id: 'dashboard' as const,
      label: 'Desempenho',
      icon: LayoutDashboard,
    },
    {
      id: 'team' as const,
      label: 'Equipa',
      icon: Users,
    },
    {
      id: 'schedule' as const,
      label: 'Escalas',
      icon: Calendar,
    },
    {
      id: 'goals' as const,
      label: 'Metas',
      icon: Target,
    },
    ...(isSuperOrAdmin
      ? [
          {
            id: 'users' as const,
            label: 'Membros',
            icon: UserCog,
          },
        ]
      : []),
  ];

  return (
    <nav
      aria-label="Navegação Móvel"
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/85 backdrop-blur-2xl border-t border-black/[0.08] shadow-[0_-8px_32px_rgba(0,0,0,0.06)]"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom, 8px), 8px)',
      }}
    >
      <div className="flex items-center justify-around px-2 pt-1.5 pb-1">
        {/* First 2 tabs */}
        {navItems.slice(0, 2).map(item => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <motion.button
              key={item.id}
              type="button"
              whileTap={{ scale: 0.85 }}
              onClick={() => onSelectTab(item.id)}
              className="relative flex flex-col items-center justify-center min-w-[58px] py-1 px-1 rounded-2xl transition cursor-pointer select-none"
            >
              {isActive && (
                <motion.div
                  layoutId="mobileActivePill"
                  className="absolute inset-0 bg-black/[0.05] rounded-2xl"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <motion.div
                animate={isActive ? { scale: [1, 1.2, 1], y: [0, -2, 0] } : { scale: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="relative z-10"
              >
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    isActive ? 'text-[#0071e3] stroke-[2.4]' : 'text-slate-500 stroke-[1.8]'
                  }`}
                />
              </motion.div>
              <span
                className={`relative z-10 text-[10px] mt-0.5 tracking-tight truncate max-w-[62px] ${
                  isActive ? 'font-bold text-slate-900' : 'font-medium text-slate-500'
                }`}
              >
                {item.label}
              </span>
            </motion.button>
          );
        })}

        {/* Center Primary Action: Quick Result Update Elevated Button */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.88, rotate: 180 }}
          onClick={onOpenDailyEntry}
          className={`relative -top-2 flex flex-col items-center justify-center w-12 h-12 rounded-full shadow-[0_4px_20px_rgba(0,113,227,0.35)] text-white cursor-pointer select-none shrink-0 ${accentClasses.primary}`}
          title="Fazer Nova Atualização do Resultado"
        >
          <RefreshCw className="w-5 h-5 transition-transform" />
          <span className="sr-only">Atualizar Resultado</span>
        </motion.button>

        {/* Remaining tabs */}
        {navItems.slice(2).map(item => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <motion.button
              key={item.id}
              type="button"
              whileTap={{ scale: 0.85 }}
              onClick={() => onSelectTab(item.id)}
              className="relative flex flex-col items-center justify-center min-w-[58px] py-1 px-1 rounded-2xl transition cursor-pointer select-none"
            >
              {isActive && (
                <motion.div
                  layoutId="mobileActivePill"
                  className="absolute inset-0 bg-black/[0.05] rounded-2xl"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <motion.div
                animate={isActive ? { scale: [1, 1.2, 1], y: [0, -2, 0] } : { scale: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="relative z-10"
              >
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    isActive ? 'text-[#0071e3] stroke-[2.4]' : 'text-slate-500 stroke-[1.8]'
                  }`}
                />
              </motion.div>
              <span
                className={`relative z-10 text-[10px] mt-0.5 tracking-tight truncate max-w-[62px] ${
                  isActive ? 'font-bold text-slate-900' : 'font-medium text-slate-500'
                }`}
              >
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};
