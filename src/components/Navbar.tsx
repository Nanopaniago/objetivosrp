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
  Sun,
  Moon,
} from 'lucide-react';
import { getAccentClasses } from '../utils/brand';
import { useTheme } from '../context/ThemeContext';

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
  const { isDark, toggleTheme } = useTheme();

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
    <header
      className={`sticky top-0 z-40 backdrop-blur-2xl border-b transition-all ${
        isDark
          ? 'bg-[#070d19]/90 border-white/[0.08] text-white shadow-[0_4px_24px_rgba(0,0,0,0.5)]'
          : 'bg-white/90 border-black/[0.08] text-black shadow-[0_2px_16px_rgba(0,0,0,0.04)]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top bar: Brand + Controls & Profile */}
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Brand Name */}
          <div
            onClick={isSuperAdmin ? onOpenBrandCustomizer : undefined}
            className={`flex items-center gap-2 py-1.5 px-2 -ml-2 rounded-2xl transition duration-200 ${
              isSuperAdmin && onOpenBrandCustomizer
                ? isDark
                  ? 'group cursor-pointer hover:bg-white/[0.05]'
                  : 'group cursor-pointer hover:bg-black/[0.03]'
                : 'cursor-default select-none'
            }`}
            title={
              isSuperAdmin && onOpenBrandCustomizer
                ? 'Clique para personalizar o logótipo e a identidade visual (Exclusivo Super Usuário)'
                : undefined
            }
          >
            <BrandLogo brand={brand} size="md" showText={true} />

            {/* Subtle customize indicator pill on hover - only for Super Admin */}
            {isSuperAdmin && onOpenBrandCustomizer && (
              <span
                className={`hidden xl:inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border transition ml-1 ${
                  isDark
                    ? 'text-slate-300 bg-white/[0.05] group-hover:bg-white/[0.1] border-white/[0.08]'
                    : 'text-slate-700 group-hover:text-black bg-black/[0.03] group-hover:bg-white border-black/[0.08]'
                }`}
              >
                <Palette className="w-3 h-3 text-sky-400" />
                <span>Mudar Logo</span>
              </span>
            )}
          </div>

          {/* Controls Right */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Theme Toggle: Clara / Escura */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                isDark
                  ? 'bg-white/[0.08] hover:bg-white/[0.15] border-white/[0.12] text-amber-300'
                  : 'bg-black/[0.04] hover:bg-black/[0.08] border-black/[0.1] text-black'
              }`}
              title={isDark ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline text-white">Tema Claro</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-black" />
                  <span className="hidden sm:inline text-black">Tema Escuro</span>
                </>
              )}
            </button>

            {/* Super Admin Brand Quick Button */}
            {isSuperAdmin && onOpenBrandCustomizer && (
              <button
                type="button"
                onClick={onOpenBrandCustomizer}
                className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-2xs transition cursor-pointer ${
                  isDark
                    ? 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08] text-white'
                    : 'bg-white border-black/[0.08] hover:bg-slate-50 text-black'
                }`}
                title="Personalizar Logótipo, Nome e Cores da Plataforma (Exclusivo Super Usuário)"
              >
                <Palette className="w-3.5 h-3.5 text-sky-400" />
                <span>Marca</span>
              </button>
            )}

            {/* Month Picker */}
            <div
              className={`relative flex items-center rounded-2xl border px-3 py-1.5 text-xs font-semibold transition ${
                isDark
                  ? 'border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.08] text-white'
                  : 'border-black/[0.1] bg-black/[0.03] hover:bg-black/[0.06] text-black'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 mr-2 text-sky-400 shrink-0" />
              <select
                value={currentMonth}
                onChange={e => onChangeMonth(Number(e.target.value), currentYear)}
                className={`bg-transparent font-bold focus:outline-none cursor-pointer pr-4 appearance-none ${
                  isDark ? 'text-white' : 'text-black'
                }`}
              >
                {months.map(m => (
                  <option key={m.num} value={m.num} className={isDark ? 'bg-[#0b1222] text-white' : 'bg-white text-black'}>
                    {m.name} {currentYear}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 pointer-events-none" />
            </div>

            {/* Quick Result Update Action */}
            <button
              id="btn-atualizar-resultado"
              onClick={onOpenDailyEntry}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl text-xs font-bold text-white shadow-md hover:opacity-95 active:scale-95 transition cursor-pointer ${accentClasses.primary}`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Atualizar Resultado</span>
              <span className="sm:hidden">Atualizar</span>
            </button>

            {/* Logged in User Profile & Actions */}
            <div className={`flex items-center gap-2 pl-2 border-l ${isDark ? 'border-white/[0.08]' : 'border-black/[0.06]'}`}>
              <div
                onClick={onOpenProfile}
                className={`flex items-center gap-2.5 px-2 py-1 rounded-2xl transition cursor-pointer group ${
                  isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-black/[0.04]'
                }`}
                title="Ver e Editar o Meu Perfil"
              >
                <div className="relative">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-8 h-8 rounded-full object-cover border border-white/10"
                  />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white" />
                </div>
                <div className="hidden lg:block text-left">
                  <span className={`text-xs font-black block leading-none ${isDark ? 'text-white' : 'text-black'}`}>
                    {currentUser.name}
                  </span>
                  <span className={`text-[10px] block mt-0.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {getRoleLabel(currentUser.role)}
                  </span>
                </div>
              </div>

              {/* Fast User Switcher for Admin/SuperAdmin/Manager testing */}
              {onSwitchUser && allUsers.length > 1 && (
                <div className="hidden xl:block">
                  <select
                    value={currentUser.id}
                    onChange={e => onSwitchUser(e.target.value)}
                    className={`rounded-xl border px-2 py-1 text-[11px] font-semibold focus:outline-none cursor-pointer ${
                      isDark
                        ? 'border-white/[0.12] bg-[#0b1222] text-white'
                        : 'border-black/[0.1] bg-white text-black'
                    }`}
                    title="Alternar utilizador ativo"
                  >
                    {allUsers.map(u => (
                      <option key={u.id} value={u.id} className={isDark ? 'bg-[#0b1222] text-white' : 'bg-white text-black'}>
                        {u.name} ({getRoleLabel(u.role)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Logout Button */}
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    isDark
                      ? 'border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400'
                      : 'border-rose-100 bg-rose-50/70 hover:bg-rose-100 text-rose-700'
                  }`}
                  title="Terminar Sessão e voltar ao Ecrã de Login"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-500" />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs - Apple macOS / iOS Segmented Control Bar */}
        <div className={`hidden sm:block py-2.5 border-t ${isDark ? 'border-white/[0.06]' : 'border-black/[0.04]'}`}>
          <div
            className={`inline-flex items-center p-1 rounded-2xl gap-1 overflow-x-auto max-w-full scrollbar-none ${
              isDark ? 'bg-black/30' : 'bg-black/[0.04]'
            }`}
          >
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === 'dashboard'
                  ? isDark
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-black shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-black/10'
                  : isDark
                  ? 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                  : 'text-slate-700 hover:text-black hover:bg-white/60'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>O Meu Desempenho</span>
            </button>

            <button
              onClick={() => onSelectTab('team')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === 'team'
                  ? isDark
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-black shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-black/10'
                  : isDark
                  ? 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                  : 'text-slate-700 hover:text-black hover:bg-white/60'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Equipa ({activeSellersCount})</span>
            </button>

            <button
              onClick={() => onSelectTab('schedule')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === 'schedule'
                  ? isDark
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-black shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-black/10'
                  : isDark
                  ? 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                  : 'text-slate-700 hover:text-black hover:bg-white/60'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Escala & Folgas</span>
            </button>

            <button
              onClick={() => onSelectTab('goals')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === 'goals'
                  ? isDark
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-black shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-black/10'
                  : isDark
                  ? 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                  : 'text-slate-700 hover:text-black hover:bg-white/60'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Gestão de Metas</span>
            </button>

            <button
              onClick={() => onSelectTab('users')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === 'users'
                  ? isDark
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-black shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-black/10'
                  : isDark
                  ? 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                  : 'text-slate-700 hover:text-black hover:bg-white/60'
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
