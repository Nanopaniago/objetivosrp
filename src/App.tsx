import React, { useState, useEffect } from 'react';
import {
  User,
  GoalCategory,
  MonthlyGoal,
  DailyEntry,
  WorkSchedule,
  BrandConfig,
} from './types';
import { INITIAL_USERS } from './data/initialData';
import {
  authService,
  usersService,
  categoriesService,
  goalsService,
  resultsService,
  schedulesService,
  settingsService,
} from './services';
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

export default function App() {
  const currentDate = new Date();
  const [currentMonth, setCurrentMonth] = useState<number>(currentDate.getMonth() + 1);
  const [currentYear, setCurrentYear] = useState<number>(currentDate.getFullYear());

  // Brand Configuration State (via settingsService)
  const [brand, setBrand] = useState<BrandConfig>(() => settingsService.getInitialBrandSettings());
  const [isBrandCustomizerOpen, setIsBrandCustomizerOpen] = useState(false);

  // Sync document title to brand name
  useEffect(() => {
    document.title = `${brand.name} - Gestão de Metas & Desempenho`;
  }, [brand.name]);

  // Users State (via usersService)
  const [users, setUsers] = useState<User[]>(() => usersService.getInitialUsers());

  // Authentication State (via authService)
  const [authenticatedUserId, setAuthenticatedUserId] = useState<string | null>(() => {
    return authService.getSessionUserId();
  });

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    const saved = authService.getCurrentUserId();
    return saved || (users[0] ? users[0].id : INITIAL_USERS[0].id);
  });

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Categories (via categoriesService)
  const [categories] = useState<GoalCategory[]>(() => categoriesService.getInitialCategories());

  // Goals State (via goalsService)
  const [goals, setGoals] = useState<MonthlyGoal[]>(() => {
    return goalsService.getInitialGoals(currentMonth, currentYear);
  });

  // Daily Entries State (via resultsService)
  const [entries, setEntries] = useState<DailyEntry[]>(() => {
    return resultsService.getInitialDailyResults(currentMonth, currentYear);
  });

  // Schedules State (via schedulesService)
  const [schedules, setSchedules] = useState<WorkSchedule[]>(() => {
    return schedulesService.getInitialSchedules(currentMonth, currentYear);
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'team' | 'goals' | 'schedule' | 'users'>('dashboard');
  const [isResultUpdateModalOpen, setIsResultUpdateModalOpen] = useState(false);

  // Sync state changes through services (persists to localStorage / future Supabase)
  useEffect(() => {
    usersService.saveUsers(users);
  }, [users]);

  useEffect(() => {
    authService.setCurrentUserId(currentUserId);
  }, [currentUserId]);

  useEffect(() => {
    goalsService.saveGoals(goals);
  }, [goals]);

  useEffect(() => {
    resultsService.saveDailyResults(entries);
  }, [entries]);

  useEffect(() => {
    schedulesService.saveSchedules(schedules);
  }, [schedules]);

  // Handle Login & Logout via authService
  const handleLogin = (user: User) => {
    authService.setSessionUserId(user.id);
    authService.setCurrentUserId(user.id);
    setAuthenticatedUserId(user.id);
    setCurrentUserId(user.id);
  };

  const handleLogout = () => {
    authService.clearSession();
    setAuthenticatedUserId(null);
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
    settingsService.saveBrandSettings(newBrand);
  };

  // When a new result update is saved, delegates to resultsService
  const handleSaveResultUpdate = async (newUpdate: DailyEntry) => {
    const updatedEntries = await resultsService.saveDailyResult(newUpdate, entries);
    setEntries(updatedEntries);
  };

  const handleSaveGoals = async (updatedGoals: MonthlyGoal[]) => {
    setGoals(updatedGoals);
    await goalsService.saveGoals(updatedGoals);
  };

  const handleUpdateSchedule = async (updatedSchedules: WorkSchedule[]) => {
    setSchedules(updatedSchedules);
    await schedulesService.saveSchedules(updatedSchedules);
  };

  const handleSelectSellerFromTeam = (sellerId: string) => {
    setCurrentUserId(sellerId);
    authService.setCurrentUserId(sellerId);
    setActiveTab('dashboard');
  };

  // User management handlers via usersService
  const handleUpdateUser = async (updatedUser: User) => {
    setUsers(prev => prev.map(u => (u.id === updatedUser.id ? updatedUser : u)));
    await usersService.updateUser(updatedUser);
  };

  const handleCreateUser = async (newUser: User) => {
    setUsers(prev => [...prev, newUser]);
    await usersService.createUser(newUser);
  };

  const handleDeleteUser = async (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    await usersService.deleteUser(userId);
    if (authenticatedUserId === userId) {
      handleLogout();
    } else if (currentUserId === userId) {
      const remaining = users.filter(u => u.id !== userId);
      if (remaining.length > 0) {
        setCurrentUserId(remaining[0].id);
        authService.setCurrentUserId(remaining[0].id);
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
          authService.setSessionUserId(newId);
          authService.setCurrentUserId(newId);
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
