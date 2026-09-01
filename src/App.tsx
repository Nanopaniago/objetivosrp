import React, { useState, useEffect } from 'react';
import {
  User,
  GoalCategory,
  MonthlyGoal,
  DailyEntry,
  WorkSchedule,
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

export default function App() {
  const currentDate = new Date();
  const [currentMonth, setCurrentMonth] = useState<number>(currentDate.getMonth() + 1);
  const [currentYear, setCurrentYear] = useState<number>(currentDate.getFullYear());

  // Users State with LocalStorage
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('salesflow_users_v3');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    const saved = localStorage.getItem('salesflow_current_user_id_v3');
    return saved || (users[0] ? users[0].id : INITIAL_USERS[0].id);
  });

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

  // Current active user
  const currentUser = users.find(u => u.id === currentUserId) || users[0] || INITIAL_USERS[0];

  // If active user is not a seller (e.g. Gerente), we pick the first seller for the dashboard view or selected seller
  const displaySeller = currentUser.role === 'seller' ? currentUser : users.find(u => u.role === 'seller') || users[0] || INITIAL_USERS[0];

  // When a new result update is saved, it replaces previous result updates for this seller in this month
  const handleSaveResultUpdate = (newUpdate: DailyEntry) => {
    setEntries(prev => {
      // Filter out previous result updates for the same seller and month so the new update takes precedence
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
    if (currentUserId === userId) {
      const remaining = users.filter(u => u.id !== userId);
      if (remaining.length > 0) {
        setCurrentUserId(remaining[0].id);
      }
    }
  };

  const sellersList = users.filter(u => u.role === 'seller' && u.active !== false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        allUsers={users}
        onSwitchUser={setCurrentUserId}
        currentMonth={currentMonth}
        currentYear={currentYear}
        onChangeMonth={(m, y) => {
          setCurrentMonth(m);
          setCurrentYear(y);
        }}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenDailyEntry={() => setIsResultUpdateModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
          />
        )}
      </main>

      {/* Result Update Modal (Substitui o antigo modal de lançamentos) */}
      <ResultUpdateModal
        isOpen={isResultUpdateModalOpen}
        onClose={() => setIsResultUpdateModalOpen(false)}
        sellerId={displaySeller.id}
        sellerName={displaySeller.name}
        categories={categories}
        goals={goals}
        existingEntries={entries}
        currentMonth={currentMonth}
        currentYear={currentYear}
        onSaveResultUpdate={handleSaveResultUpdate}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-400">
          SalesFlow &copy; {currentYear} &bull; Plataforma de Gestão de Metas e Atualização de Resultados de Vendas
        </div>
      </footer>
    </div>
  );
}
