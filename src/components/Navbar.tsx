import React from 'react';
import { User, UserRole } from '../types';
import {
  TrendingUp,
  RefreshCw,
  Users,
  Target,
  Calendar,
  LayoutDashboard,
  UserCog,
  Shield,
  UserCheck,
  Store,
} from 'lucide-react';

interface NavbarProps {
  currentUser: User;
  allUsers: User[];
  onSwitchUser: (userId: string) => void;
  currentMonth: number;
  currentYear: number;
  onChangeMonth: (month: number, year: number) => void;
  activeTab: 'dashboard' | 'team' | 'goals' | 'schedule' | 'users';
  onSelectTab: (tab: 'dashboard' | 'team' | 'goals' | 'schedule' | 'users') => void;
  onOpenDailyEntry: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  allUsers,
  onSwitchUser,
  currentMonth,
  currentYear,
  onChangeMonth,
  activeTab,
  onSelectTab,
  onOpenDailyEntry,
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

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top bar: Brand + User switch & Month */}
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-slate-900">
                  Sales<span className="text-blue-600">Flow</span>
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                  v2.0
                </span>
              </div>
              <span className="text-[11px] text-slate-500 hidden md:block">
                Gestão de Metas & Resultados
              </span>
            </div>
          </div>

          {/* Controls Right */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Month Picker */}
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700">
              <Calendar className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
              <select
                value={currentMonth}
                onChange={e => onChangeMonth(Number(e.target.value), currentYear)}
                className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                {months.map(m => (
                  <option key={m.num} value={m.num}>
                    {m.name} / {currentYear}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Result Update Action */}
            <button
              id="btn-atualizar-resultado"
              onClick={onOpenDailyEntry}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 text-xs font-bold text-white shadow-sm hover:bg-blue-700 active:scale-95 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Atualizar Resultado</span>
              <span className="sm:hidden">Resultado</span>
            </button>

            {/* Profile Switcher & User Management shortcut */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full object-cover border border-slate-200 hidden sm:block"
              />
              <div className="flex flex-col items-end">
                <select
                  value={currentUser.id}
                  onChange={e => onSwitchUser(e.target.value)}
                  className="text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg border border-slate-200 focus:outline-none cursor-pointer max-w-[140px] sm:max-w-[180px] truncate"
                  title="Alterne o utilizador ativo para testar a visão de Vendedor, Gerente ou Administrador"
                >
                  <optgroup label={`Vendedores (${activeSellersCount})`}>
                    {allUsers
                      .filter(u => u.role === 'seller')
                      .map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} (Vendedor)
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Gestão">
                    {allUsers
                      .filter(u => u.role !== 'seller')
                      .map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({getRoleLabel(u.role)})
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto py-2 scrollbar-none border-t border-slate-100">
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
              activeTab === 'dashboard'
                ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            O Meu Desempenho
          </button>

          <button
            onClick={() => onSelectTab('team')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
              activeTab === 'team'
                ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            Equipa da Loja ({activeSellersCount})
          </button>

          <button
            onClick={() => onSelectTab('schedule')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
              activeTab === 'schedule'
                ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Escala & Folgas
          </button>

          <button
            onClick={() => onSelectTab('goals')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
              activeTab === 'goals'
                ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Target className="w-4 h-4" />
            Gestão de Metas
          </button>

          <button
            onClick={() => onSelectTab('users')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
              activeTab === 'users'
                ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <UserCog className="w-4 h-4" />
            Utilizadores
          </button>
        </div>
      </div>
    </header>
  );
};
