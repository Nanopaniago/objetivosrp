import React, { useState } from 'react';
import { User, BrandConfig } from '../types';
import {
  Calendar as CalendarIcon,
  ChevronDown,
  User as UserIcon,
  LogOut,
  Sparkles,
  Palette,
  Check,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface TopHeaderProps {
  currentUser: User;
  allUsers: User[];
  currentMonth: number;
  currentYear: number;
  onChangeMonth: (month: number, year: number) => void;
  onSwitchUser?: (userId: string) => void;
  onOpenProfile?: () => void;
  onLogout?: () => void;
  brand: BrandConfig;
  onOpenBrandCustomizer?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentUser,
  allUsers,
  currentMonth,
  currentYear,
  onChangeMonth,
  onSwitchUser,
  onOpenProfile,
  onLogout,
  brand,
  onOpenBrandCustomizer,
}) => {
  const { isDark } = useTheme();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);

  // Dynamic greeting based on current hour
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12 ? 'Bom dia' : currentHour < 19 ? 'Boa tarde' : 'Boa noite';

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

  const currentMonthObj = months.find((m) => m.num === currentMonth) || months[4];
  const currentDate = new Date();
  const dayOfWeek = currentDate.toLocaleDateString('pt-PT', { weekday: 'long' });
  const capitalizedDayOfWeek = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1);

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'seller':
        return 'Vendedor';
      case 'manager':
        return 'Gerente de Loja';
      case 'admin':
        return 'Administrador';
      case 'super_admin':
        return 'Super Admin';
      default:
        return 'Colaborador';
    }
  };

  return (
    <header className="w-full pb-6 pt-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Greeting matching the reference image */}
        <div>
          <h1
            className={`text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            {greeting}, {currentUser.name.split(' ')[0]} 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-normal">
            Foco hoje, grandes resultados amanhã.
          </p>
        </div>

        {/* Right: Date Pill and User Profile Pill */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          {/* Date Selector Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDateMenuOpen(!isDateMenuOpen)}
              className={`flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border text-left transition cursor-pointer ${
                isDark
                  ? 'bg-[#0f172a] border-white/[0.08] text-white hover:bg-slate-800'
                  : 'bg-white border-slate-200/80 text-slate-900 hover:bg-slate-50 shadow-xs'
              }`}
            >
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                <CalendarIcon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold leading-tight">
                  {currentDate.getDate()} de {currentMonthObj.name} de {currentYear}
                </div>
                <div className="text-[10px] text-slate-400 leading-tight">
                  {capitalizedDayOfWeek}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
            </button>

            {/* Date Dropdown */}
            {isDateMenuOpen && (
              <div
                className={`absolute right-0 mt-2 w-56 rounded-2xl border shadow-xl p-2 z-50 animate-in fade-in ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-white shadow-black/80'
                    : 'bg-white border-slate-200 text-slate-900 shadow-slate-200'
                }`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1.5">
                  Selecionar Mês de Referência
                </div>
                <div className="grid grid-cols-2 gap-1 mt-1 max-h-56 overflow-y-auto">
                  {months.map((m) => (
                    <button
                      key={m.num}
                      type="button"
                      onClick={() => {
                        onChangeMonth(m.num, currentYear);
                        setIsDateMenuOpen(false);
                      }}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold text-left transition cursor-pointer ${
                        currentMonth === m.num
                          ? 'bg-blue-600 text-white'
                          : isDark
                          ? 'hover:bg-slate-800 text-slate-300'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Pill matching the reference image */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className={`flex items-center gap-2.5 p-1.5 pr-3 rounded-2xl border transition cursor-pointer ${
                isDark
                  ? 'bg-[#0f172a] border-white/[0.08] text-white hover:bg-slate-800'
                  : 'bg-white border-slate-200/80 text-slate-900 hover:bg-slate-50 shadow-xs'
              }`}
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-8 h-8 rounded-xl object-cover"
              />
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold leading-tight">{currentUser.name}</div>
                <div className="text-[10px] text-slate-400 leading-tight">
                  {getRoleLabel(currentUser.role)}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Profile Dropdown */}
            {isUserMenuOpen && (
              <div
                className={`absolute right-0 mt-2 w-64 rounded-2xl border shadow-xl p-2 z-50 animate-in fade-in ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-white shadow-black/80'
                    : 'bg-white border-slate-200 text-slate-900 shadow-slate-200'
                }`}
              >
                <div className="p-2 border-b border-black/[0.06] dark:border-white/[0.08] mb-1">
                  <div className="text-xs font-bold">{currentUser.name}</div>
                  <div className="text-[11px] text-slate-400 truncate">{currentUser.email}</div>
                  <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                    {getRoleLabel(currentUser.role)}
                  </span>
                </div>

                {onOpenProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenProfile();
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-left transition cursor-pointer ${
                      isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <UserIcon className="w-3.5 h-3.5 text-blue-500" />
                    Editar Perfil & Foto
                  </button>
                )}

                {currentUser.role === 'super_admin' && onOpenBrandCustomizer && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenBrandCustomizer();
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-left transition cursor-pointer ${
                      isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <Palette className="w-3.5 h-3.5 text-sky-400" />
                    Personalizar Logótipo & Marca
                  </button>
                )}

                {/* Switch User for testing */}
                {allUsers.length > 1 && onSwitchUser && (
                  <div className="mt-1 pt-1 border-t border-black/[0.06] dark:border-white/[0.08]">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1">
                      Alternar Utilizador:
                    </div>
                    <div className="max-h-36 overflow-y-auto space-y-0.5">
                      {allUsers.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            onSwitchUser(u.id);
                            setIsUserMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-medium text-left transition cursor-pointer ${
                            u.id === currentUser.id
                              ? 'bg-blue-600/15 text-blue-500 font-bold'
                              : isDark
                              ? 'hover:bg-slate-800 text-slate-300'
                              : 'hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <img
                              src={u.avatar}
                              alt={u.name}
                              className="w-5 h-5 rounded-full object-cover"
                            />
                            <span className="truncate">{u.name}</span>
                          </div>
                          {u.id === currentUser.id && <Check className="w-3.5 h-3.5 text-blue-500" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {onLogout && (
                  <div className="mt-1 pt-1 border-t border-black/[0.06] dark:border-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 text-left transition cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Terminar Sessão
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
