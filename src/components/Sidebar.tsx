import React from 'react';
import {
  LayoutDashboard,
  Target,
  BarChart3,
  Calendar,
  Layers,
  FileText,
  Users,
  Settings,
  Sun,
  Moon,
  Store,
  ChevronRight,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { BrandConfig, User } from '../types';

export type AppTab =
  | 'dashboard'
  | 'goals'
  | 'team'
  | 'schedule'
  | 'catalogs'
  | 'reports'
  | 'users'
  | 'settings';

interface SidebarProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  brand: BrandConfig;
  currentUser: User;
  onOpenSettings?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  brand,
  currentUser,
  onOpenSettings,
}) => {
  const { isDark, toggleTheme } = useTheme();

  const navItems = [
    { id: 'dashboard' as AppTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'goals' as AppTab, label: 'Meus Objetivos', icon: Target },
    { id: 'team' as AppTab, label: 'Resultados', icon: BarChart3 },
    { id: 'schedule' as AppTab, label: 'Calendário', icon: Calendar },
    { id: 'catalogs' as AppTab, label: 'Catálogos', icon: Layers },
    { id: 'reports' as AppTab, label: 'Relatórios', icon: FileText },
    { id: 'users' as AppTab, label: 'Utilizadores', icon: Users },
    { id: 'settings' as AppTab, label: 'Configurações', icon: Settings },
  ];

  return (
    <aside
      className={`hidden lg:flex flex-col w-64 shrink-0 fixed inset-y-0 left-0 z-30 transition-colors duration-200 border-r ${
        isDark
          ? 'bg-[#0a0f1d] border-white/[0.08] text-white'
          : 'bg-white border-slate-200/80 text-black'
      }`}
    >
      {/* Brand Logo Header */}
      <div className="h-20 flex items-center px-6 gap-3 border-b border-transparent">
        <div className="flex items-center gap-2.5">
          {/* Authentic RP Monogram from the image */}
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xl tracking-tighter shadow-md shadow-blue-500/25">
            <span className="translate-x-[-1px]">RP</span>
          </div>
          <span
            className={`font-black text-lg tracking-tight ${
              isDark ? 'text-white' : 'text-black'
            }`}
          >
            {brand.name || 'Objetivos RP'}
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3.5 py-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (item.id === 'settings' && onOpenSettings) {
                  onOpenSettings();
                } else {
                  onSelectTab(item.id);
                }
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                isActive
                  ? isDark
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'bg-blue-50 text-blue-600 font-extrabold'
                  : isDark
                  ? 'text-white/90 hover:text-white hover:bg-white/[0.06]'
                  : 'text-black hover:text-black hover:bg-slate-100/70'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isActive
                    ? isDark
                      ? 'text-white'
                      : 'text-blue-600'
                    : isDark
                    ? 'text-slate-300'
                    : 'text-slate-700'
                }`}
              />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Area: Theme Switcher, Store Badge, Version */}
      <div className={`p-4 border-t space-y-3 ${isDark ? 'border-white/[0.08]' : 'border-slate-200/80'}`}>
        {/* Theme Toggle Pill identical to the image */}
        <button
          type="button"
          onClick={toggleTheme}
          className={`w-full flex items-center justify-between p-2 rounded-2xl border text-xs font-semibold transition cursor-pointer ${
            isDark
              ? 'bg-slate-900/80 border-slate-800 text-white hover:bg-slate-800'
              : 'bg-slate-100/90 border-slate-200 text-black hover:bg-slate-200/70'
          }`}
        >
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                isDark ? 'bg-blue-600 text-white' : 'bg-amber-400 text-black'
              }`}
            >
              {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </div>
            <span>{isDark ? 'Modo Escuro' : 'Modo Claro'}</span>
          </div>
          <ChevronRight className="w-4 h-4 opacity-50" />
        </button>

        {/* Store Pill */}
        <div
          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium ${
            isDark
              ? 'bg-white/[0.03] text-white border border-white/[0.05]'
              : 'bg-slate-50 text-black border border-slate-200/60'
          }`}
        >
          <Store className="w-4 h-4 text-blue-500 shrink-0" />
          <span className="truncate">Loja Principal</span>
        </div>

        {/* Version */}
        <div className="text-[11px] text-center text-slate-500 dark:text-slate-400 font-mono">
          v2.3.0
        </div>
      </div>
    </aside>
  );
};
