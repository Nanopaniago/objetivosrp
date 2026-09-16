import React, { useState, useEffect, useCallback } from 'react';
import {
  User,
  GoalCategory,
  MonthlyGoal,
  DailyEntry,
  WorkSchedule,
  BrandConfig,
} from './types';
import { DEFAULT_BRAND_CONFIG } from './utils/brand';
import {
  authService,
  usersService,
  categoriesService,
  goalsService,
  resultsService,
  schedulesService,
  settingsService,
} from './services';
import { isSupabaseConfigured } from './lib/supabase/client';
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
import { Cloud, CloudOff, AlertCircle, RefreshCw, X, Loader2 } from 'lucide-react';
import { useTheme } from './context/ThemeContext';

export default function App() {
  const { isDark } = useTheme();
  const currentDate = new Date();
  const [currentMonth, setCurrentMonth] = useState<number>(currentDate.getMonth() + 1);
  const [currentYear, setCurrentYear] = useState<number>(currentDate.getFullYear());

  // Brand Configuration State (via settingsService)
  const [brand, setBrand] = useState<BrandConfig>(DEFAULT_BRAND_CONFIG);
  const [isBrandCustomizerOpen, setIsBrandCustomizerOpen] = useState(false);

  // Sync document title to brand name
  useEffect(() => {
    document.title = `${brand.name} - Gestão de Metas & Desempenho`;
  }, [brand.name]);

  // Loading and Error States
  const [isAuthInitializing, setIsAuthInitializing] = useState<boolean>(true);
  const [isDataLoading, setIsDataLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Users State (via usersService, starts empty until loaded)
  const [users, setUsers] = useState<User[]>([]);

  // Authentication State (via authService)
  const [authenticatedUserId, setAuthenticatedUserId] = useState<string | null>(() => {
    return authService.getSessionUserId();
  });

  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    return authService.getCurrentUserId();
  });

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Categories (via categoriesService, starts empty)
  const [categories, setCategories] = useState<GoalCategory[]>([]);

  // Goals State (via goalsService, starts empty)
  const [goals, setGoals] = useState<MonthlyGoal[]>([]);

  // Daily Entries State (via resultsService, starts empty)
  const [entries, setEntries] = useState<DailyEntry[]>([]);

  // Schedules State (via schedulesService, starts empty)
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'team' | 'goals' | 'schedule' | 'users'>('dashboard');
  const [isResultUpdateModalOpen, setIsResultUpdateModalOpen] = useState(false);

  // 1. Initial Session Restoration via authService
  useEffect(() => {
    let isMounted = true;

    async function initSessionAndUsers() {
      try {
        const sessionUser = await authService.getCurrentSessionUser();
        if (!isMounted) return;

        if (sessionUser) {
          setAuthenticatedUserId(sessionUser.id);
          setCurrentUserId(sessionUser.id);
        } else {
          setAuthenticatedUserId(null);
          // Pre-load available users and brand configuration for the login screen
          try {
            const [fetchedUsers, fetchedBrand] = await Promise.all([
              usersService.getUsers(),
              settingsService.getBrandSettings(),
            ]);
            if (isMounted) {
              setUsers(fetchedUsers);
              setBrand(fetchedBrand);
            }
          } catch (loadErr: any) {
            console.error('Erro ao carregar dados prévios de autenticação:', loadErr);
            if (isMounted && isSupabaseConfigured()) {
              setErrorMessage(loadErr.message || 'Falha ao ligar ao Supabase.');
            }
          }
        }
      } catch (err: any) {
        console.error('Erro ao verificar sessão inicial:', err);
        if (isMounted && isSupabaseConfigured()) {
          setErrorMessage(err.message || 'Falha na autenticação inicial com o Supabase.');
        }
      } finally {
        if (isMounted) {
          setIsAuthInitializing(false);
        }
      }
    }

    initSessionAndUsers();

    // Listen to Auth state changes
    const unsubscribe = authService.onAuthStateChange(user => {
      if (!isMounted) return;
      if (user) {
        setAuthenticatedUserId(user.id);
        setCurrentUserId(user.id);
      } else {
        setAuthenticatedUserId(null);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // 2. Fetch operational data from Supabase whenever authenticated or month/year changes
  const loadSupabaseData = useCallback(async (month: number, year: number) => {
    setIsDataLoading(true);
    setErrorMessage(null);

    try {
      const [
        fetchedUsers,
        fetchedCategories,
        fetchedGoals,
        fetchedEntries,
        fetchedSchedules,
        fetchedBrand,
      ] = await Promise.all([
        usersService.getUsers(),
        categoriesService.getCategories(),
        goalsService.getGoals(month, year),
        resultsService.getDailyResults(month, year),
        schedulesService.getSchedules(month, year),
        settingsService.getBrandSettings(),
      ]);

      setUsers(fetchedUsers);
      setCategories(fetchedCategories);
      setGoals(fetchedGoals);
      setEntries(fetchedEntries);
      setSchedules(fetchedSchedules);
      setBrand(fetchedBrand);

      // Verify or assign active seller
      setCurrentUserId(prevId => {
        if (prevId && fetchedUsers.some(u => u.id === prevId)) return prevId;
        const firstSeller = fetchedUsers.find(u => u.role === 'seller');
        return firstSeller ? firstSeller.id : (fetchedUsers[0]?.id || null);
      });
    } catch (err: any) {
      console.error('Falha ao carregar dados operacionais:', err);
      setErrorMessage(err.message || 'Não foi possível carregar os dados do Supabase. Verifique a ligação.');
    } finally {
      setIsDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authenticatedUserId) {
      loadSupabaseData(currentMonth, currentYear);
    }
  }, [authenticatedUserId, currentMonth, currentYear, loadSupabaseData]);

  // Handle Login & Logout via authService
  const handleLogin = (user: User) => {
  authService.setCurrentUserId(user.id);
  setAuthenticatedUserId(user.id);
  setCurrentUserId(user.id);
};
  const handleLogout = async () => {
    await authService.logout();
    setAuthenticatedUserId(null);
  };

  // Current active user
  const effectiveUserId = authenticatedUserId || currentUserId;
  const currentUser = users.find(u => u.id === effectiveUserId) || users[0];

  // If active user is not a seller (e.g. Gerente/Admin), we pick the first seller for the dashboard view
  const displaySeller = currentUser
    ? (currentUser.role === 'seller' ? currentUser : users.find(u => u.role === 'seller') || currentUser)
    : undefined;
  const isSuperAdmin = currentUser?.role === 'super_admin';

  const handleSaveBrand = async (newBrand: BrandConfig) => {
    if (!isSuperAdmin) {
      alert('Apenas o Super Administrador tem permissão para alterar a marca e identidade visual.');
      return;
    }
    setBrand(newBrand);
    try {
      await settingsService.saveBrandSettings(newBrand);
    } catch (err: any) {
      setErrorMessage(`Erro ao guardar identidade visual no Supabase: ${err.message || err}`);
    }
  };

  // When a new result update is saved, delegates to resultsService
  const handleSaveResultUpdate = async (newUpdate: DailyEntry) => {
    try {
      const updatedEntries = await resultsService.saveDailyResult(newUpdate, entries);
      setEntries(updatedEntries);
    } catch (err: any) {
      setErrorMessage(`Erro ao guardar lançamento no Supabase: ${err.message || err}`);
    }
  };

  const handleSaveGoals = async (updatedGoals: MonthlyGoal[]) => {
    try {
      setGoals(updatedGoals);
      await goalsService.saveGoals(updatedGoals);
    } catch (err: any) {
      setErrorMessage(`Erro ao guardar metas no Supabase: ${err.message || err}`);
    }
  };

  const handleUpdateSchedule = async (updatedSchedules: WorkSchedule[]) => {
    try {
      setSchedules(updatedSchedules);
      await schedulesService.saveSchedules(updatedSchedules);
    } catch (err: any) {
      setErrorMessage(`Erro ao guardar escalas no Supabase: ${err.message || err}`);
    }
  };

  const handleSelectSellerFromTeam = (sellerId: string) => {
    setCurrentUserId(sellerId);
    authService.setCurrentUserId(sellerId);
    setActiveTab('dashboard');
  };

  // User management handlers via usersService
  const handleUpdateUser = async (updatedUser: User) => {
    try {
      setUsers(prev => prev.map(u => (u.id === updatedUser.id ? updatedUser : u)));
      await usersService.updateUser(updatedUser);
    } catch (err: any) {
      setErrorMessage(`Erro ao atualizar perfil no Supabase: ${err.message || err}`);
    }
  };

  const handleCreateUser = async (newUser: User) => {
    try {
      setUsers(prev => [...prev, newUser]);
      await usersService.createUser(newUser);
    } catch (err: any) {
      setErrorMessage(`Erro ao criar utilizador no Supabase: ${err.message || err}`);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
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
    } catch (err: any) {
      setErrorMessage(`Erro ao eliminar utilizador no Supabase: ${err.message || err}`);
    }
  };

  const sellersList = users.filter(u => u.role === 'seller' && u.active !== false);
  const supabaseConnected = isSupabaseConfigured();

  // Initial authentication loading state (Apple Minimalist Splash)
  if (isAuthInitializing || (authenticatedUserId && isDataLoading && users.length === 0 && !errorMessage)) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-6 transition-colors duration-200 ${
        isDark ? 'bg-[#070b13] text-slate-100' : 'bg-[#f5f5f7] text-slate-900'
      }`}>
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
          <div className={`w-12 h-12 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] border flex items-center justify-center ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-black/[0.05]'
          }`}>
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
          <p className={`text-xs font-semibold tracking-tight ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}>
            {isAuthInitializing ? 'A verificar autenticação...' : 'A sincronizar dados com Supabase...'}
          </p>
        </div>
      </div>
    );
  }

  // If user is authenticated but loading completely failed and no users could be retrieved
  if (authenticatedUserId && users.length === 0 && errorMessage) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-6 transition-colors duration-200 ${
        isDark ? 'bg-[#070b13] text-slate-100' : 'bg-[#f5f5f7] text-slate-900'
      }`}>
        <div className={`max-w-md w-full rounded-3xl p-8 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] border text-center space-y-4 ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-rose-200 text-slate-900'
        }`}>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Erro de Comunicação com Supabase</h2>
          <p className="text-xs text-rose-700 font-medium bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300 p-3 rounded-xl">{errorMessage}</p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => loadSupabaseData(currentMonth, currentYear)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-xs hover:bg-blue-700 transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Tentar Novamente
            </button>
            <button
              onClick={handleLogout}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Terminar Sessão
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If user is not authenticated, show initial Login Screen
  if (!authenticatedUserId || !currentUser) {
    return (
      <LoginScreen
        users={users}
        brand={brand}
        onLogin={handleLogin}
      />
    );
  }

  return (
    <div className={`min-h-screen font-sans antialiased flex flex-col transition-colors duration-200 ${
      isDark
        ? 'bg-[#070b13] text-white selection:bg-blue-600 selection:text-white'
        : 'bg-[#f5f5f7] text-black selection:bg-slate-900 selection:text-white'
    }`}>
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        allUsers={users}
        brand={brand}
        onOpenBrandCustomizer={isSuperAdmin ? () => setIsBrandCustomizerOpen(true) : undefined}
        onSwitchUser={(newId) => {
  setCurrentUserId(newId);
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

      {/* Global Error Banner if any operation failed */}
      {errorMessage && (
        <div className="bg-rose-50 border-b border-rose-200 text-rose-800 px-4 py-2.5 flex items-center justify-between text-xs transition">
          <div className="flex items-center gap-2 max-w-5xl mx-auto w-full">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => loadSupabaseData(currentMonth, currentYear)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 hover:bg-rose-200 font-semibold cursor-pointer text-[11px]"
            >
              <RefreshCw className="w-3 h-3" />
              Recarregar Dados
            </button>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="p-1 text-rose-500 hover:text-rose-800 rounded-md cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Data loading subtle progress bar */}
      {isDataLoading && (
        <div className="w-full bg-blue-100 h-1 overflow-hidden">
          <div className="bg-blue-600 h-full w-1/3 animate-pulse" />
        </div>
      )}

      {/* Main Content Area - Optimized for mobile viewports and bottom dock */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 pt-3 sm:pt-7 pb-24 md:pb-8">
        {activeTab === 'dashboard' && displaySeller && (
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

      {/* Result Update Modal */}
      {displaySeller && (
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
      )}

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

      {/* Dark High-Contrast Minimalist Footer (Desktop) */}
      <footer className="hidden md:block border-t border-slate-800/80 bg-slate-950 text-slate-200 py-5 mt-auto shadow-inner">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap justify-center sm:justify-start">
            <span className="font-bold text-white tracking-tight text-[13px]">{brand.name}</span>
            <span className="text-slate-600">&bull;</span>
            {supabaseConnected ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border border-emerald-500/30 shadow-xs">
                <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                Supabase Sincronizado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-slate-200 bg-slate-800/90 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border border-slate-700/80">
                <CloudOff className="w-3.5 h-3.5 text-slate-400" />
                Modo Local (Supabase Desconectado)
              </span>
            )}
          </div>
          <div className="text-[12px] text-slate-300 font-medium tracking-wide">
            {brand.tagline || 'Gestão de Metas e Atualização de Resultados'} <span className="text-slate-600">&bull;</span> <span className="text-slate-400 font-semibold">{currentYear}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
