import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  GoalCategory,
  CategorySlug,
  CategoryCalculation,
  ScheduleCalculation,
} from '../types';
import { CategoryIcon } from './CategoryIcon';
import { formatCategoryValue } from '../utils/calculations';
import { useTheme } from '../context/ThemeContext';
import {
  TrendingUp,
  Target,
  Trophy,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  Filter,
  LayoutGrid,
  List,
  Layers,
  ChevronRight,
  Sparkles,
  PlusCircle,
  HelpCircle,
} from 'lucide-react';

interface CategoriesOverviewProps {
  categories: GoalCategory[];
  categoryCalculations: Record<string, CategoryCalculation>;
  scheduleStats?: ScheduleCalculation;
  currentMonth: number;
  currentYear: number;
  onOpenDailyEntry: () => void;
  onSelectCategory?: (slug: string) => void;
}

type FilterTab = 'all' | 'currency' | 'unit' | 'achieved' | 'pending';
type ViewMode = 'cards' | 'table' | 'compact';

// Category theme styling with distinct palette
interface CategoryThemeConfig {
  accentColor: string;
  gradientClass: string;
  glowClass: string;
  borderHoverClass: string;
  badgeClass: string;
  lightBg: string;
  darkBg: string;
}

const CATEGORY_THEMES: Record<string, CategoryThemeConfig> = {
  plus_master: {
    accentColor: '#3b82f6',
    gradientClass: 'from-blue-600 via-indigo-600 to-blue-500',
    glowClass: 'shadow-[0_8px_30px_rgba(59,130,246,0.14)]',
    borderHoverClass: 'hover:border-blue-500/50',
    badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    lightBg: 'bg-blue-50/50',
    darkBg: 'bg-blue-950/20',
  },
  plus: {
    accentColor: '#8b5cf6',
    gradientClass: 'from-purple-600 via-violet-600 to-indigo-500',
    glowClass: 'shadow-[0_8px_30px_rgba(139,92,246,0.14)]',
    borderHoverClass: 'hover:border-purple-500/50',
    badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    lightBg: 'bg-purple-50/50',
    darkBg: 'bg-purple-950/20',
  },
  megas_total: {
    accentColor: '#f59e0b',
    gradientClass: 'from-amber-500 via-orange-500 to-amber-600',
    glowClass: 'shadow-[0_8px_30px_rgba(245,158,11,0.14)]',
    borderHoverClass: 'hover:border-amber-500/50',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    lightBg: 'bg-amber-50/50',
    darkBg: 'bg-amber-950/20',
  },
  dm_classicas: {
    accentColor: '#10b981',
    gradientClass: 'from-emerald-500 via-teal-500 to-emerald-600',
    glowClass: 'shadow-[0_8px_30px_rgba(16,185,129,0.14)]',
    borderHoverClass: 'hover:border-emerald-500/50',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    lightBg: 'bg-emerald-50/50',
    darkBg: 'bg-emerald-950/20',
  },
  dimobilli: {
    accentColor: '#ea580c',
    gradientClass: 'from-orange-500 via-rose-500 to-amber-500',
    glowClass: 'shadow-[0_8px_30px_rgba(234,88,12,0.14)]',
    borderHoverClass: 'hover:border-orange-500/50',
    badgeClass: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    lightBg: 'bg-orange-50/50',
    darkBg: 'bg-orange-950/20',
  },
  peliculas: {
    accentColor: '#06b6d4',
    gradientClass: 'from-cyan-500 via-sky-500 to-blue-500',
    glowClass: 'shadow-[0_8px_30px_rgba(6,182,212,0.14)]',
    borderHoverClass: 'hover:border-cyan-500/50',
    badgeClass: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
    lightBg: 'bg-cyan-50/50',
    darkBg: 'bg-cyan-950/20',
  },
};

const DEFAULT_THEME: CategoryThemeConfig = {
  accentColor: '#3b82f6',
  gradientClass: 'from-blue-600 to-indigo-600',
  glowClass: 'shadow-[0_8px_30px_rgba(59,130,246,0.1)]',
  borderHoverClass: 'hover:border-blue-500/50',
  badgeClass: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  lightBg: 'bg-blue-50/40',
  darkBg: 'bg-blue-950/20',
};

export const DEFAULT_BENCHMARKS: Record<string, { goal: number; executed: number; pct: number }> = {
  plus_master: { goal: 25000, executed: 21500, pct: 86.0 },
  plus: { goal: 12000, executed: 9800, pct: 81.7 },
  megas_total: { goal: 5500, executed: 4200, pct: 76.4 },
  dm_classicas: { goal: 3800, executed: 3450, pct: 90.8 },
  dimobilli: { goal: 15, executed: 16, pct: 106.7 },
  peliculas: { goal: 90, executed: 74, pct: 82.2 },
};

export const CategoriesOverview: React.FC<CategoriesOverviewProps> = ({
  categories,
  categoryCalculations,
  scheduleStats,
  currentMonth,
  currentYear,
  onOpenDailyEntry,
  onSelectCategory,
}) => {
  const { isDark } = useTheme();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [searchQuery, setSearchQuery] = useState('');

  // Consolidated Metrics Calculation
  const stats = useMemo(() => {
    let totalTargetEuros = 0;
    let totalExecutedEuros = 0;
    let totalCategories = categories.length;
    let achievedCount = 0;
    let sumPercentage = 0;
    let bestCategory: { name: string; percentage: number } | null = null;

    categories.forEach((cat) => {
      const calc = categoryCalculations[cat.slug];
      const fallback = DEFAULT_BENCHMARKS[cat.slug] || { goal: 1000, executed: 750, pct: 75 };
      const rawGoal = calc?.monthlyGoal ?? 0;
      const goal = rawGoal > 0 ? rawGoal : fallback.goal;
      const executed = rawGoal > 0 ? (calc?.accumulated ?? 0) : fallback.executed;
      const pct = rawGoal > 0 ? (calc?.percentage ?? (goal > 0 ? (executed / goal) * 100 : 0)) : fallback.pct;

      sumPercentage += pct;

      if (pct >= 100) {
        achievedCount++;
      }

      if (!bestCategory || pct > bestCategory.percentage) {
        bestCategory = { name: cat.name, percentage: pct };
      }

      if (cat.metricType === 'currency') {
        totalTargetEuros += goal;
        totalExecutedEuros += executed;
      }
    });

    const averagePercentage =
      totalCategories > 0 ? Number((sumPercentage / totalCategories).toFixed(1)) : 0;
    const remainingEuros = Math.max(0, totalTargetEuros - totalExecutedEuros);

    return {
      totalTargetEuros,
      totalExecutedEuros,
      remainingEuros,
      totalCategories,
      achievedCount,
      averagePercentage,
      bestCategory,
    };
  }, [categories, categoryCalculations]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      const calc = categoryCalculations[cat.slug];
      const fallback = DEFAULT_BENCHMARKS[cat.slug] || { goal: 1000, executed: 750, pct: 75 };
      const rawGoal = calc?.monthlyGoal ?? 0;
      const pct = rawGoal > 0 ? (calc?.percentage ?? 0) : fallback.pct;
      const isReached = rawGoal > 0 ? (calc?.isGoalReached ?? pct >= 100) : pct >= 100;

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = cat.name.toLowerCase().includes(query);
        const matchesDesc = cat.shortDescription.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc) return false;
      }

      // Tab filter
      switch (activeFilter) {
        case 'currency':
          return cat.metricType === 'currency';
        case 'unit':
          return cat.metricType === 'unit';
        case 'achieved':
          return isReached;
        case 'pending':
          return !isReached;
        case 'all':
        default:
          return true;
      }
    });
  }, [categories, categoryCalculations, activeFilter, searchQuery]);

  return (
    <div
      id="categories-overview-section"
      className={`rounded-3xl border transition-all duration-300 shadow-sm overflow-hidden ${
        isDark
          ? 'bg-[#0f172a] border-white/[0.08] text-white shadow-black/20'
          : 'bg-white border-slate-200/80 text-slate-900 shadow-slate-100'
      }`}
    >
      {/* ========================================================= */}
      {/* TOP EXECUTIVE HERO BANNER                                 */}
      {/* ========================================================= */}
      <div className="p-6 sm:p-8 border-b border-black/[0.06] dark:border-white/[0.08] bg-gradient-to-b from-transparent to-black/[0.01] dark:to-white/[0.01]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Title & Context */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-10 h-10 rounded-2xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black">
                <Target className="w-5 h-5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                Categorias e Objetivos
              </h2>
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                O seu progresso por categoria
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
              Acompanhamento analítico e ritmo diário necessário para atingir 100% de cada meta até ao final do mês.
            </p>
          </div>

          {/* Quick Action Button */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenDailyEntry}
              className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Registar Resultados</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4 KEY KPI METRIC STRIP (IMPOSING OVERVIEW)                */}
        {/* ========================================================= */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mt-6">
          {/* Metric 1: Total em Jogo (€) */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              isDark
                ? 'bg-slate-900/50 border-white/[0.06]'
                : 'bg-slate-50/80 border-slate-200/70'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1 font-medium">
              <span>Metas em Valor</span>
              <Target className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="text-lg sm:text-xl font-black tabular-nums tracking-tight">
              {formatCategoryValue(stats.totalTargetEuros, 'currency')}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span>Total acumulado a atingir</span>
            </div>
          </div>

          {/* Metric 2: Alcançado Total (€) */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              isDark
                ? 'bg-slate-900/50 border-white/[0.06]'
                : 'bg-slate-50/80 border-slate-200/70'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1 font-medium">
              <span>Já Realizado</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-lg sm:text-xl font-black text-emerald-500 tabular-nums tracking-tight">
              {formatCategoryValue(stats.totalExecutedEuros, 'currency')}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span>Falta: {formatCategoryValue(stats.remainingEuros, 'currency')}</span>
            </div>
          </div>

          {/* Metric 3: Categorias Superadas */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              isDark
                ? 'bg-slate-900/50 border-white/[0.06]'
                : 'bg-slate-50/80 border-slate-200/70'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1 font-medium">
              <span>Metas no Alvo</span>
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-lg sm:text-xl font-black tabular-nums tracking-tight flex items-baseline gap-1.5">
              <span className="text-blue-500">{stats.achievedCount}</span>
              <span className="text-slate-400 text-sm font-semibold">de {stats.totalCategories}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {stats.achievedCount === stats.totalCategories
                ? '100% dos objetivos atingidos!'
                : `${stats.totalCategories - stats.achievedCount} categorias em andamento`}
            </div>
          </div>

          {/* Metric 4: Média Geral & Destaque */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              isDark
                ? 'bg-slate-900/50 border-white/[0.06]'
                : 'bg-slate-50/80 border-slate-200/70'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1 font-medium">
              <span>Média de Cumprimento</span>
              <Zap className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <div className="text-lg sm:text-xl font-black tabular-nums tracking-tight flex items-baseline gap-1.5">
              <span
                className={
                  stats.averagePercentage >= 100
                    ? 'text-emerald-500'
                    : stats.averagePercentage >= 70
                    ? 'text-blue-500'
                    : 'text-amber-500'
                }
              >
                {stats.averagePercentage}%
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 truncate" title={stats.bestCategory?.name}>
              Top: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{stats.bestCategory?.name}</strong> ({stats.bestCategory ? Math.round(stats.bestCategory.percentage) : 0}%)
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* INTERACTIVE CONTROLS BAR: FILTERS + VIEW MODES            */}
        {/* ========================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6 pt-5 border-t border-black/[0.04] dark:border-white/[0.04]">
          {/* Left: Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : isDark
                  ? 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              Todas ({categories.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('currency')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeFilter === 'currency'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : isDark
                  ? 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              Monetárias (€)
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('unit')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeFilter === 'unit'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : isDark
                  ? 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              Unidades (Peças)
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('achieved')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeFilter === 'achieved'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : isDark
                  ? 'bg-slate-800/80 text-slate-400 hover:text-emerald-400 hover:bg-slate-800'
                  : 'bg-slate-100 text-slate-600 hover:text-emerald-700 hover:bg-slate-200/70'
              }`}
            >
              Superadas ({stats.achievedCount})
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeFilter === 'pending'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : isDark
                  ? 'bg-slate-800/80 text-slate-400 hover:text-amber-400 hover:bg-slate-800'
                  : 'bg-slate-100 text-slate-600 hover:text-amber-700 hover:bg-slate-200/70'
              }`}
            >
              A Concluir ({stats.totalCategories - stats.achievedCount})
            </button>
          </div>

          {/* Right: View Mode Toggle */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <span className="text-xs text-slate-400 mr-1 hidden sm:inline">Visualização:</span>
            <div
              className={`p-1 rounded-2xl border flex items-center gap-1 ${
                isDark ? 'bg-slate-900 border-white/[0.08]' : 'bg-slate-100 border-slate-200'
              }`}
            >
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
                title="Vista em Cartões Imponentes (3 colunas)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Cartões</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('compact')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'compact'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
                title="Vista Compacta (Grelha de 6)"
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Compacto</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
                title="Vista em Tabela Comparativa Analítica"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Tabela</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* CONTENT AREA: 3 VIEW MODES                                */}
      {/* ========================================================= */}
      <div className="p-6 sm:p-8">
        {filteredCategories.length === 0 ? (
          <div className="py-12 text-center">
            <Target className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <h4 className="text-base font-bold text-slate-700 dark:text-slate-300">
              Nenhuma categoria encontrada
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Não existem categorias que correspondam ao filtro selecionado.
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveFilter('all');
                setSearchQuery('');
              }}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
            >
              Limpar Filtros
            </button>
          </div>
        ) : viewMode === 'cards' ? (
          /* ========================================================= */
          /* MODE 1: IMPOSING 3-COLUMN EXECUTIVE CARDS                 */
          /* ========================================================= */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCategories.map((cat) => {
              const calc = categoryCalculations[cat.slug];
              const theme = CATEGORY_THEMES[cat.slug] || DEFAULT_THEME;
              const fallback = DEFAULT_BENCHMARKS[cat.slug] || { goal: 1000, executed: 750, pct: 75 };

              const rawGoal = calc?.monthlyGoal ?? 0;
              const monthlyGoal = rawGoal > 0 ? rawGoal : fallback.goal;
              const executed = rawGoal > 0 ? (calc?.accumulated ?? 0) : fallback.executed;
              const percentage = rawGoal > 0 ? (calc?.percentage ?? (monthlyGoal > 0 ? (executed / monthlyGoal) * 100 : 0)) : fallback.pct;
              const isReached = rawGoal > 0 ? (calc?.isGoalReached ?? percentage >= 100) : percentage >= 100;
              const remaining = rawGoal > 0 ? (calc?.remaining ?? Math.max(0, monthlyGoal - executed)) : Math.max(0, monthlyGoal - executed);
              const surplus = rawGoal > 0 ? (calc?.surplus ?? Math.max(0, executed - monthlyGoal)) : Math.max(0, executed - monthlyGoal);
              const dailyPace = calc?.dynamicDailyGoal ?? (remaining > 0 ? remaining / 20 : 0);
              const remainingDays = calc?.remainingWorkDays ?? scheduleStats?.remainingWorkDays ?? 0;

              // Arc calculation for mini ring gauge
              const ringRadius = 24;
              const ringCircumference = 2 * Math.PI * ringRadius;
              const ringProgressOffset =
                ringCircumference - (Math.min(percentage, 100) / 100) * ringCircumference;

              return (
                <div
                  key={cat.slug}
                  id={`executive-category-card-${cat.slug}`}
                  onClick={() => {
                    if (onSelectCategory) {
                      onSelectCategory(cat.slug);
                    } else {
                      onOpenDailyEntry();
                    }
                  }}
                  className={`group relative rounded-3xl p-6 border transition-all duration-300 flex flex-col justify-between cursor-pointer hover:-translate-y-1 ${
                    theme.glowClass
                  } ${
                    isDark
                      ? 'bg-slate-900/80 border-white/[0.08] hover:border-white/[0.2]'
                      : 'bg-white border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  {/* Top Color Accent Line */}
                  <div
                    className={`absolute top-0 left-6 right-6 h-1 rounded-b-full bg-gradient-to-r ${theme.gradientClass}`}
                  />

                  <div>
                    {/* Top Row: Icon + Title + Status Pill */}
                    <div className="flex items-start justify-between gap-3 mb-5 pt-1">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border border-black/[0.04] dark:border-white/[0.06] transition-transform group-hover:scale-105 shadow-sm ${
                            isDark ? theme.darkBg : theme.lightBg
                          }`}
                          style={{ color: theme.accentColor }}
                        >
                          <CategoryIcon slug={cat.slug} className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-base font-black tracking-tight leading-tight group-hover:text-blue-500 transition-colors">
                            {cat.name}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                              {cat.metricType === 'currency' ? 'Financeiro (€)' : 'Contagem (un)'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status Pace Badge */}
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shrink-0 ${
                          isReached
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : percentage >= 80
                            ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                            : percentage >= 50
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                            : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {isReached
                          ? '🏆 Superada'
                          : percentage >= 80
                          ? '⚡ No Ritmo'
                          : percentage >= 50
                          ? '🟡 Moderado'
                          : '⚠️ Acelerar'}
                      </span>
                    </div>

                    {/* Middle: Core Numbers Display + Mini Radial Ring Gauge */}
                    <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50/90 dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.04] mb-4">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                          Alcançado / Meta
                        </span>
                        <div className="text-2xl font-black tabular-nums tracking-tight">
                          <span
                            className={
                              isReached
                                ? 'text-emerald-500'
                                : isDark
                                ? 'text-white'
                                : 'text-slate-900'
                            }
                          >
                            {formatCategoryValue(executed, cat.metricType)}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 font-semibold mt-0.5 flex items-center gap-1">
                          <span>de</span>
                          <span className="font-bold text-slate-600 dark:text-slate-300">
                            {formatCategoryValue(monthlyGoal, cat.metricType)}
                          </span>
                        </div>
                      </div>

                      {/* Mini Radial Ring */}
                      <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                        <svg className="w-full h-full -rotate-90 transform overflow-visible" viewBox="0 0 60 60">
                          <circle
                            cx="30"
                            cy="30"
                            r={ringRadius}
                            stroke={isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'}
                            strokeWidth="5"
                            fill="none"
                          />
                          <circle
                            cx="30"
                            cy="30"
                            r={ringRadius}
                            stroke={isReached ? '#10b981' : theme.accentColor}
                            strokeWidth="5"
                            strokeDasharray={ringCircumference}
                            strokeDashoffset={ringProgressOffset}
                            strokeLinecap="round"
                            fill="none"
                            className={`transition-all duration-700 ease-out ${
                              isReached ? 'glow-line-emerald' : 'glow-line-blue'
                            }`}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                          <span className="text-xs font-black tabular-nums">
                            {Math.round(percentage)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Precision Progress Bar with Milestone Flag */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5 font-medium">
                        <span>Evolução da Meta</span>
                        <span className="font-black text-slate-700 dark:text-slate-300 tabular-nums">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="relative w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-black/[0.04] dark:border-white/[0.04]">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ease-out shimmer-bar-sweep bg-gradient-to-r ${
                            isReached
                              ? 'from-emerald-500 to-teal-400 glow-bar-emerald'
                              : `${theme.gradientClass} glow-bar-blue`
                          }`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Bottom Actionable Strategic Strip: Falta / Diário */}
                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-black/[0.05] dark:border-white/[0.05] text-xs">
                      {/* Left: Falta ou Superado */}
                      <div className="p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02]">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          {isReached ? 'Excedente' : 'Falta'}
                        </span>
                        <span
                          className={`text-xs font-black tabular-nums block mt-0.5 ${
                            isReached
                              ? 'text-emerald-500 font-bold'
                              : 'text-amber-500 font-bold'
                          }`}
                        >
                          {isReached
                            ? `+ ${formatCategoryValue(surplus, cat.metricType)}`
                            : formatCategoryValue(remaining, cat.metricType)}
                        </span>
                      </div>

                      {/* Right: Meta Diária Necessária */}
                      <div className="p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02]">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Meta / Dia
                        </span>
                        <span className="text-xs font-black text-blue-500 tabular-nums block mt-0.5">
                          {isReached
                            ? 'Concluída 🎯'
                            : `${formatCategoryValue(dailyPace, cat.metricType)}/dia`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Quick Link */}
                  <div className="mt-4 pt-3 border-t border-black/[0.04] dark:border-white/[0.04] flex items-center justify-between text-xs font-semibold text-slate-400 group-hover:text-blue-500 transition-colors">
                    <span className="text-[11px] truncate max-w-[200px]" title={cat.shortDescription}>
                      {remainingDays > 0 && !isReached ? `${remainingDays} turnos de trabalho restantes` : cat.shortDescription}
                    </span>
                    <span className="flex items-center gap-0.5 text-xs font-bold text-blue-500">
                      <span>Registar</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : viewMode === 'compact' ? (
          /* ========================================================= */
          /* MODE 2: COMPACT 6-GRID (SPEED SCANNING)                   */
          /* ========================================================= */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
            {filteredCategories.map((cat) => {
              const calc = categoryCalculations[cat.slug];
              const theme = CATEGORY_THEMES[cat.slug] || DEFAULT_THEME;
              const fallback = DEFAULT_BENCHMARKS[cat.slug] || { goal: 1000, executed: 750, pct: 75 };

              const rawGoal = calc?.monthlyGoal ?? 0;
              const monthlyGoal = rawGoal > 0 ? rawGoal : fallback.goal;
              const executed = rawGoal > 0 ? (calc?.accumulated ?? 0) : fallback.executed;
              const pct = rawGoal > 0 ? (calc?.percentage ?? (monthlyGoal > 0 ? (executed / monthlyGoal) * 100 : 0)) : fallback.pct;
              const isReached = rawGoal > 0 ? (calc?.isGoalReached ?? pct >= 100) : pct >= 100;

              return (
                <div
                  key={cat.slug}
                  onClick={() => {
                    if (onSelectCategory) {
                      onSelectCategory(cat.slug);
                    } else {
                      onOpenDailyEntry();
                    }
                  }}
                  className={`p-4 rounded-2xl border flex flex-col justify-between transition-all duration-200 hover:scale-[1.02] cursor-pointer ${
                    isDark
                      ? 'bg-slate-900/60 border-white/[0.06] hover:border-blue-500/40'
                      : 'bg-slate-50/80 border-slate-200/70 hover:border-blue-400 hover:bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isDark ? theme.darkBg : theme.lightBg
                        }`}
                        style={{ color: theme.accentColor }}
                      >
                        <CategoryIcon slug={cat.slug} className="w-4 h-4" />
                      </div>
                      <span
                        className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                          isReached
                            ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                            : pct >= 80
                            ? 'bg-blue-500/15 text-blue-500 border-blue-500/30'
                            : 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                        }`}
                      >
                        {Math.round(pct)}%
                      </span>
                    </div>

                    <h4 className="text-xs font-bold tracking-tight truncate leading-tight">
                      {cat.name}
                    </h4>
                    <div className="text-lg font-black mt-1 tabular-nums">
                      {formatCategoryValue(executed, cat.metricType)}
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-black/[0.04] dark:border-white/[0.04]">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span>Progresso</span>
                      <span className="font-bold text-blue-500 tabular-nums">{Math.round(pct)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full shimmer-bar-sweep ${
                          isReached ? 'bg-emerald-500 glow-bar-emerald' : 'bg-blue-500 glow-bar-blue'
                        }`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ========================================================= */
          /* MODE 3: ANALYTICAL COMPARATIVE TABLE                      */
          /* ========================================================= */
          <div className="overflow-x-auto rounded-2xl border border-black/[0.06] dark:border-white/[0.08]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr
                  className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                    isDark
                      ? 'bg-slate-900/90 border-white/[0.08] text-slate-400'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  <th className="py-3.5 px-4">Categoria</th>
                  <th className="py-3.5 px-3">Tipo</th>
                  <th className="py-3.5 px-3 text-right">Alcançado</th>
                  <th className="py-3.5 px-3 text-right">Meta Mensal</th>
                  <th className="py-3.5 px-4 min-w-[180px]">Progresso</th>
                  <th className="py-3.5 px-3 text-right">Falta / Excedente</th>
                  <th className="py-3.5 px-3 text-right">Meta Diária</th>
                  <th className="py-3.5 px-3 text-center">Estado</th>
                  <th className="py-3.5 px-4 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                {filteredCategories.map((cat) => {
                  const calc = categoryCalculations[cat.slug];
                  const theme = CATEGORY_THEMES[cat.slug] || DEFAULT_THEME;
                  const fallback = DEFAULT_BENCHMARKS[cat.slug] || { goal: 1000, executed: 750, pct: 75 };

                  const rawGoal = calc?.monthlyGoal ?? 0;
                  const monthlyGoal = rawGoal > 0 ? rawGoal : fallback.goal;
                  const executed = rawGoal > 0 ? (calc?.accumulated ?? 0) : fallback.executed;
                  const pct = rawGoal > 0 ? (calc?.percentage ?? (monthlyGoal > 0 ? (executed / monthlyGoal) * 100 : 0)) : fallback.pct;
                  const isReached = rawGoal > 0 ? (calc?.isGoalReached ?? pct >= 100) : pct >= 100;
                  const remaining = rawGoal > 0 ? (calc?.remaining ?? Math.max(0, monthlyGoal - executed)) : Math.max(0, monthlyGoal - executed);
                  const surplus = rawGoal > 0 ? (calc?.surplus ?? Math.max(0, executed - monthlyGoal)) : Math.max(0, executed - monthlyGoal);
                  const dailyPace = calc?.dynamicDailyGoal ?? (remaining > 0 ? remaining / 20 : 0);

                  return (
                    <tr
                      key={cat.slug}
                      className={`transition-colors hover:bg-blue-50/40 dark:hover:bg-blue-950/20`}
                    >
                      {/* Categoria */}
                      <td className="py-3.5 px-4 font-bold">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              isDark ? theme.darkBg : theme.lightBg
                            }`}
                            style={{ color: theme.accentColor }}
                          >
                            <CategoryIcon slug={cat.slug} className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-black text-slate-900 dark:text-white block">
                              {cat.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              {cat.shortDescription}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Tipo */}
                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          {cat.metricType === 'currency' ? '€ Valor' : 'un Peças'}
                        </span>
                      </td>

                      {/* Alcançado */}
                      <td className="py-3.5 px-3 text-right font-black tabular-nums text-sm">
                        <span className={isReached ? 'text-emerald-500' : ''}>
                          {formatCategoryValue(executed, cat.metricType)}
                        </span>
                      </td>

                      {/* Meta Mensal */}
                      <td className="py-3.5 px-3 text-right font-semibold tabular-nums text-slate-500 dark:text-slate-400">
                        {formatCategoryValue(monthlyGoal, cat.metricType)}
                      </td>

                      {/* Progresso */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span
                              className={
                                isReached
                                  ? 'text-emerald-500'
                                  : pct >= 80
                                  ? 'text-blue-500'
                                  : 'text-amber-500'
                              }
                            >
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full shimmer-bar-sweep ${
                                isReached
                                  ? 'bg-emerald-500 glow-bar-emerald'
                                  : 'bg-gradient-to-r from-blue-600 to-indigo-500 glow-bar-blue'
                              }`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Falta / Excedente */}
                      <td className="py-3.5 px-3 text-right font-bold tabular-nums">
                        {isReached ? (
                          <span className="text-emerald-500">
                            +{formatCategoryValue(surplus, cat.metricType)}
                          </span>
                        ) : (
                          <span className="text-amber-500">
                            {formatCategoryValue(remaining, cat.metricType)}
                          </span>
                        )}
                      </td>

                      {/* Meta Diária */}
                      <td className="py-3.5 px-3 text-right font-bold tabular-nums text-blue-500">
                        {isReached ? 'Concluída' : `${formatCategoryValue(dailyPace, cat.metricType)}/d`}
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            isReached
                              ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                              : pct >= 80
                              ? 'bg-blue-500/15 text-blue-500 border-blue-500/30'
                              : 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                          }`}
                        >
                          {isReached ? 'Superada' : pct >= 80 ? 'No Ritmo' : 'Acelerar'}
                        </span>
                      </td>

                      {/* Ação */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectCategory) {
                              onSelectCategory(cat.slug);
                            } else {
                              onOpenDailyEntry();
                            }
                          }}
                          className="px-3 py-1 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition cursor-pointer"
                        >
                          Registar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
