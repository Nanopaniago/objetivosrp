import React from 'react';
import { User, UserRole, BrandConfig } from '../types';
import { BrandLogo } from './BrandLogo';
import {
  TrendingUp,
  RefreshCw,
  Users,
  Target,
  Calendar,
  LayoutDashboard,
  UserCog,
  LogOut,
  Edit,
  Palette,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { getAccentClasses } from '../utils/brand';

interface NavbarProps {
  currentUser: User;
  allUsers: User[];
  brand: BrandConfig;
  onOpenBrandCustomizer?: () => void;
  onSwitchUser?: (userId: string) => void;
  currentMonth: number;
  currentYear: number;
  onChangeMonth: (month: number, year: number) => void;
  activeTab: 'dashboard' | 'team' | 'goals' | 'schedule' | 'users';
  onSelectTab: (tab: 'dashboard' | 'team' | 'goals' | 'schedule' | 'users') => void;
  onOpenDailyEntry: () => void;
  onOpenProfile?: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  allUsers,
  brand,
  onOpenBrandCustomizer,
  onSwitchUser,
  currentMonth,
  currentYear,
  onChangeMonth,
  activeTab,
  onSelectTab,
  onOpenDailyEntry,
  onOpenProfile,
  onLogout,
}) => {
  const months = [
    { num: 1, name: 'Janeiro' },
    { num: 2, name: 'Fevereiro' },
    { num: 3, name: 'Março' },
    { num: 4, name: 'Abril' },
    { num: 5, name: 'Maio' },
    { num: 6, name: 'Junho' },
    { num: 7, name: 'Julho' },
    { num: 8, name: 'Agosto' },
    { num: 9, name: 'Setembro' },
    { num: 10, name: 'Outubro' },
    { num: 11, name: 'Novembro' },
    { num: 12, name: 'Dezembro' },
  ];

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'seller':
        return 'Vendedor';
      case 'manager':
        return 'Gerente / Gestor';
      case 'admin':
        return 'Administrador';
      case 'super_admin':
        return 'Super Admin';
    }
  };

  const activeSellersCount = allUsers.filter(u => u.role === 'seller' && u.active !== false).length;
  const accentClasses = getAccentClasses(brand.accent);
  const isSuperAdmin = currentUser.role === 'super_admin';

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-2xl border-b border-black/[0.05] shadow-[0_2px_16px_rgba(0,0,0,0.02)] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top bar: Brand + Controls & Profile */}
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Brand Name (Clickable to customize) */}
          <div
            onClick={onOpenBrandCustomizer}
            className="flex items-center gap-2 group cursor-pointer py-1.5 px-2 -ml-2 rounded-2xl hover:bg-black/[0.03] transition duration-200"
            title="Clique para personalizar o logótipo e a marca da ferramenta"
          >
            <BrandLogo brand={brand} size="md" showText={true} />
            
            {/* Subtle customize indicator pill on hover / for Super Admin */}
            <span className="hidden xl:inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 group-hover:text-slate-800 bg-black/[0.03] group-hover:bg-white px-2 py-0.5 rounded-full border border-black/[0.04] transition ml-1">
              <Palette className="w-3 h-3 text-slate-500 group-hover:text-slate-900" />
              <span>Mudar Logo</span>
            </span>
          </div>

          {/* Controls Right */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Super Admin Brand Quick Button (mobile/tablet friendly) */}
            {isSuperAdmin && onOpenBrandCustomizer && (
              <button
                type="button"
                onClick={onOpenBrandCustomizer}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-black/[0.06] bg-white/70 hover:bg-white text-slate-700 hover:text-slate-900 text-xs font-semibold shadow-2xs hover:shadow-xs transition cursor-pointer"
                title="Personalizar Logótipo, Nome e Cores da Plataforma"
              >
                <Palette className="w-3.5 h-3.5 text-slate-600" />
                <span>Marca & Logo</span>
              </button>
            )}

            {/* Month Picker - Apple Minimalist Style */}
            <div className="relative flex items-center rounded-2xl border border-black/[0.06] bg-black/[0.03] hover:bg-black/[0.05] px-3 py-1.5 text-xs font-semibold text-slate-800 transition">
              <Calendar className="w-3.5 h-3.5 mr-2 text-slate-600 shrink-0" />
              <select
                value={currentMonth}
                onChange={e => onChangeMonth(Number(e.target.value), currentYear)}
                className="bg-transparent font-semibold text-slate-900 focus:outline-none cursor-pointer pr-4 appearance-none"
              >
                {months.map(m => (
                  <option key={m.num} value={m.num}>
                    {m.name} {currentYear}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 pointer-events-none" />
            </div>

            {/* Quick Result Update Action (Apple Pill) */}
            <button
              id="btn-atualizar-resultado"
              onClick={onOpenDailyEntry}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold text-white shadow-[0_2px_8px_rgba(0,113,227,0.25)] hover:opacity-95 active:scale-95 transition cursor-pointer ${accentClasses.primary}`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Atualizar Resultado</span>
              <span className="sm:hidden">Resultado</span>
            </button>

            {/* Logged in User Profile & Actions */}
            <div className="flex items-center gap-2 pl-2 border-l border-black/[0.06]">
              <div
                onClick={onOpenProfile}
                className="flex items-center gap-2.5 px-2 py-1 rounded-2xl hover:bg-black/[0.04] transition cursor-pointer group"
                title="Clique para editar as suas informações pessoais"
              >
                <div className="relative">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-8 h-8 rounded-full object-cover border border-black/[0.08] shadow-2xs group-hover:scale-105 transition duration-200"
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
                </div>
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[130px]">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] font-medium text-slate-500 leading-tight">
                    {getRoleLabel(currentUser.role)}
                  </span>
                </div>
              </div>

              {/* Edit Profile Button */}
              {onOpenProfile && (
                <button
                  type="button"
                  onClick={onOpenProfile}
                  className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-black/[0.06] bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-700 transition shadow-2xs cursor-pointer"
                  title="Editar as suas informações"
                >
                  <Edit className="w-3 h-3 text-slate-600" />
                  <span>Perfil</span>
                </button>
              )}

              {/* Logout Button */}
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-rose-200/60 bg-rose-50/50 hover:bg-rose-100/70 text-rose-700 text-xs font-bold transition shadow-2xs cursor-pointer"
                  title="Terminar Sessão e voltar ao Ecrã de Login"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-600" />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs - Apple macOS / iOS Segmented Control Bar */}
        <div className="py-2.5 border-t border-black/[0.04]">
          <div className="inline-flex items-center p-1 bg-black/[0.04] rounded-2xl gap-1 overflow-x-auto max-w-full scrollbar-none">
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-white text-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>O Meu Desempenho</span>
            </button>

            <button
              onClick={() => onSelectTab('team')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                activeTab === 'team'
                  ? 'bg-white text-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Equipa ({activeSellersCount})</span>
            </button>

            <button
              onClick={() => onSelectTab('schedule')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                activeTab === 'schedule'
                  ? 'bg-white text-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Escala & Folgas</span>
            </button>

            <button
              onClick={() => onSelectTab('goals')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                activeTab === 'goals'
                  ? 'bg-white text-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Gestão de Metas</span>
            </button>

            <button
              onClick={() => onSelectTab('users')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-white text-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
              }`}
            >
              <UserCog className="w-3.5 h-3.5" />
              <span>Utilizadores</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
