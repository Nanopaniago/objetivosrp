import React, { useState, useEffect } from 'react';
import {
  User,
  GoalCategory,
  MonthlyGoal,
  DailyEntry,
  WorkSchedule,
  BrandConfig,
} from './types';
import {
  DEFAULT_CATEGORIES,
  INITIAL_USERS,
  generateInitialGoals,
  generateInitialEntries,
  generateInitialSchedules,
} from './data/initialData';
import { Navbar } from './components/Navbar';
import { SellerDashboard } from './components/SellerDashboard';
import { TeamOverview } from './components/TeamOverview';
import { GoalsManager } from './components/GoalsManager';
import { ScheduleManager } from './components/ScheduleManager';
import { UserManager } from './components/UserManager';
import { ResultUpdateModal } from './components/ResultUpdateModal';
import { LoginScreen } from './components/LoginScreen';
import { ProfileModal } from './components/ProfileModal';
import { BrandCustomizerModal } from './components/BrandCustomizerModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { loadBrandConfig, saveBrandConfig } from './utils/brand';

export default function App() {
  const currentDate = new Date();
  const [currentMonth, setCurrentMonth] = useState<number>(currentDate.getMonth() + 1);
  const [currentYear, setCurrentYear] = useState<number>(currentDate.getFullYear());

  // Brand Configuration State (Apple style customizable logo, name, colors)
  const [brand, setBrand] = useState<BrandConfig>(() => loadBrandConfig());
  const [isBrandCustomizerOpen, setIsBrandCustomizerOpen] = useState(false);

  // Sync document title to brand name
  useEffect(() => {
    document.title = `${brand.name} - Gestão de Metas & Desempenho`;
  }, [brand.name]);

  // Users State with LocalStorage
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('salesflow_users_v3');
    const defaultSuperAdmin = INITIAL_USERS.find(u => u.role === 'super_admin')!;
    if (saved) {
      try {
        const parsed: User[] = JSON.parse(saved);
        const hasSuperAdmin = parsed.some(u => u.role === 'super_admin' || u.id === 'user-super-admin' || u.username === 'paniago26');
        let list: User[] = parsed.map(u => {
          if (u.role === 'super_admin' || u.id === 'user-super-admin') {
            return {
              ...u,
              id: 'user-super-admin',
              name: u.name && u.name !== 'Super Administrador' ? u.name : 'Super Admin (paniago26)',
              username: 'paniago26',
              email: u.email && !u.email.includes('superadmin') ? u.email : 'paniago26@salesflow.pt',
              password: 'portodemos2026',
              role: 'super_admin' as const,
            };
          }
          return {
            ...u,
            username: u.username || (u.email ? u.email.split('@')[0].toLowerCase() : u.name.toLowerCase().replace(/\s+/g, '.')),
            password: u.password || '123',
          };
        });

        if (!hasSuperAdmin) {
          list = [defaultSuperAdmin, ...list];
        }
        return list;
      } catch (e) {
        console.error('Error loading users', e);
      }
    }
    return INITIAL_USERS;
  });

  // Authentication State
  const [authenticatedUserId, setAuthenticatedUserId] = useState<string | null>(() => {
    return localStorage.getItem('salesflow_session_user_id') || null;
  });

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    const saved = localStorage.getItem('salesflow_current_user_id_v3');
    return saved || (users[0] ? users[0].id : INITIAL_USERS[0].id);
  });

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const [categories] = useState<GoalCategory[]>(DEFAULT_CATEGORIES);

  const [goals, setGoals] = useState<MonthlyGoal[]>(() => {
    const saved = localStorage.getItem('salesflow_goals_v3');
    return saved ? JSON.parse(saved) : generateInitialGoals(currentMonth, currentYear);
  });

  const [entries, setEntries] = useState<DailyEntry[]>(() => {
    const saved = localStorage.getItem('salesflow_entries_v3');
    return saved ? JSON.parse(saved) : generateInitialEntries(currentMonth, currentYear);
  });

  const [schedules, setSchedules] = useState<WorkSchedule[]>(() => {
    const saved = localStorage.getItem('salesflow_schedules_v3');
    return saved ? JSON.parse(saved) : generateInitialSchedules(currentMonth, currentYear);
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'team' | 'goals' | 'schedule' | 'users'>('dashboard');
  const [isResultUpdateModalOpen, setIsResultUpdateModalOpen] = useState(false);

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem('salesflow_users_v3', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('salesflow_current_user_id_v3', currentUserId);
  }, [currentUserId]);

  useEffect(() => {
    localStorage.setItem('salesflow_goals_v3', JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem('salesflow_entries_v3', JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    localStorage.setItem('salesflow_schedules_v3', JSON.stringify(schedules));
  }, [schedules]);

  // Handle Login & Logout
  const handleLogin = (user: User) => {
    setAuthenticatedUserId(user.id);
    setCurrentUserId(user.id);
    localStorage.setItem('salesflow_session_user_id', user.id);
  };

  const handleLogout = () => {
    setAuthenticatedUserId(null);
    localStorage.removeItem('salesflow_session_user_id');
  };

  // Current active user
  const effectiveUserId = authenticatedUserId || currentUserId;
  const currentUser = users.find(u => u.id === effectiveUserId) || users[0] || INITIAL_USERS[0];

  // If active user is not a seller (e.g. Gerente/Admin), we pick the first seller for the dashboard view
  const displaySeller = currentUser.role === 'seller' ? currentUser : users.find(u => u.role === 'seller') || users[0] || INITIAL_USERS[0];
  const isSuperAdmin = currentUser.role === 'super_admin';

  const handleSaveBrand = (newBrand: BrandConfig) => {
    if (!isSuperAdmin) {
      alert('Apenas o Super Administrador tem permissão para alterar a marca e identidade visual.');
      return;
    }
    setBrand(newBrand);
    saveBrandConfig(newBrand);
  };

  // When a new result update is saved, it replaces previous result updates for this seller in this month
  const handleSaveResultUpdate = (newUpdate: DailyEntry) => {
    setEntries(prev => {
      const [uYear, uMonth] = newUpdate.date.split('-').map(Number);
      const otherEntries = prev.filter(e => {
        if (e.sellerId !== newUpdate.sellerId) return true;
        const [eYear, eMonth] = e.date.split('-').map(Number);
        return !(eYear === uYear && eMonth === uMonth);
      });
      return [newUpdate, ...otherEntries];
    });
  };

  const handleSaveGoals = (updatedGoals: MonthlyGoal[]) => {
    setGoals(updatedGoals);
  };

  const handleUpdateSchedule = (updatedSchedules: WorkSchedule[]) => {
    setSchedules(updatedSchedules);
  };

  const handleSelectSellerFromTeam = (sellerId: string) => {
    setCurrentUserId(sellerId);
    setActiveTab('dashboard');
  };

  // User management handlers
  const handleUpdateUser = (updatedUser: User) => {
    setUsers(prev => prev.map(u => (u.id === updatedUser.id ? updatedUser : u)));
  };

  const handleCreateUser = (newUser: User) => {
    setUsers(prev => [...prev, newUser]);
  };

  const handleDeleteUser = (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    if (authenticatedUserId === userId) {
      handleLogout();
    } else if (currentUserId === userId) {
      const remaining = users.filter(u => u.id !== userId);
      if (remaining.length > 0) {
        setCurrentUserId(remaining[0].id);
      }
    }
  };

  const sellersList = users.filter(u => u.role === 'seller' && u.active !== false);

  // If user is not authenticated, show initial Login Screen
  if (!authenticatedUserId) {
    return (
      <LoginScreen
        users={users}
        brand={brand}
        onLogin={handleLogin}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] font-sans antialiased flex flex-col selection:bg-slate-900 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        allUsers={users}
        brand={brand}
        onOpenBrandCustomizer={isSuperAdmin ? () => setIsBrandCustomizerOpen(true) : undefined}
        onSwitchUser={(newId) => {
          setCurrentUserId(newId);
          setAuthenticatedUserId(newId);
          localStorage.setItem('salesflow_session_user_id', newId);
        }}
        currentMonth={currentMonth}
        currentYear={currentYear}
        onChangeMonth={(m, y) => {
          setCurrentMonth(m);
          setCurrentYear(y);
        }}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenDailyEntry={() => setIsResultUpdateModalOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area - Optimized for mobile viewports and bottom dock */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 pt-3 sm:pt-7 pb-24 md:pb-8">
        {activeTab === 'dashboard' && (
          <SellerDashboard
            seller={displaySeller}
            currentMonth={currentMonth}
            currentYear={currentYear}
            categories={categories}
            goals={goals}
            entries={entries}
            schedules={schedules}
            onOpenDailyEntry={() => setIsResultUpdateModalOpen(true)}
          />
        )}

        {activeTab === 'team' && (
          <TeamOverview
            sellers={sellersList.length > 0 ? sellersList : users}
            currentMonth={currentMonth}
            currentYear={currentYear}
            categories={categories}
            goals={goals}
            entries={entries}
            schedules={schedules}
            onSelectSeller={handleSelectSellerFromTeam}
          />
        )}

        {activeTab === 'schedule' && (
          <ScheduleManager
            sellers={sellersList.length > 0 ? sellersList : users}
            currentMonth={currentMonth}
            currentYear={currentYear}
            schedules={schedules}
            currentUserRole={currentUser.role}
            currentUser={currentUser}
            onUpdateSchedule={handleUpdateSchedule}
          />
        )}

        {activeTab === 'goals' && (
          <GoalsManager
            sellers={sellersList.length > 0 ? sellersList : users}
            categories={categories}
            currentMonth={currentMonth}
            currentYear={currentYear}
            goals={goals}
            schedules={schedules}
            onSaveGoals={handleSaveGoals}
          />
        )}

        {activeTab === 'users' && (
          <UserManager
            users={users}
            currentUser={currentUser}
            onUpdateUser={handleUpdateUser}
            onCreateUser={handleCreateUser}
            onDeleteUser={handleDeleteUser}
            onOpenBrandCustomizer={isSuperAdmin ? () => setIsBrandCustomizerOpen(true) : undefined}
          />
        )}
      </main>

      {/* Result Update Modal (Substitui o antigo modal de lançamentos) */}
      <ResultUpdateModal
        isOpen={isResultUpdateModalOpen}
        onClose={() => setIsResultUpdateModalOpen(false)}
        sellerId={displaySeller.id}
        sellerName={displaySeller.name}
        allSellers={sellersList.length > 0 ? sellersList : users.filter(u => u.role === 'seller')}
        categories={categories}
        goals={goals}
        existingEntries={entries}
        currentMonth={currentMonth}
        currentYear={currentYear}
        onSaveResultUpdate={handleSaveResultUpdate}
      />

      {/* Profile Edit Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        onUpdateUser={handleUpdateUser}
      />

      {/* Brand & Logo Customizer Modal (Exclusivo Super Usuário) */}
      {isSuperAdmin && (
        <BrandCustomizerModal
          isOpen={isBrandCustomizerOpen}
          onClose={() => setIsBrandCustomizerOpen(false)}
          brand={brand}
          onSaveBrand={handleSaveBrand}
          currentUser={currentUser}
        />
      )}

      {/* Modern Native-like Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenDailyEntry={() => setIsResultUpdateModalOpen(true)}
        currentUser={currentUser}
        brand={brand}
      />

      {/* Apple-styled Minimalist Footer (Desktop) */}
      <footer className="hidden md:block border-t border-black/[0.05] bg-white/70 backdrop-blur-md py-5 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span className="font-semibold text-slate-600">{brand.name}</span> &bull; Design Orgânico de Alta Performance
          </div>
          <div className="text-[11px] text-slate-400">
            {brand.tagline || 'Gestão de Metas e Atualização de Resultados'} &bull; {currentYear}
          </div>
        </div>
      </footer>
    </div>
  );
}
