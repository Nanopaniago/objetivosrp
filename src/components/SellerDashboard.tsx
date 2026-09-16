import React, { useMemo } from 'react';
import {
  User,
  GoalCategory,
  MonthlyGoal,
  DailyEntry,
  WorkSchedule,
} from '../types';
import { calculateSellerPerformanceSummary, formatCategoryValue } from '../utils/calculations';
import { getEvolutionClassification } from './GeneralResultCounter';
import { CategoriesOverview } from './CategoriesOverview';
import { useTheme } from '../context/ThemeContext';
import {
  Trophy,
  CloudSun,
  ArrowRight,
  TrendingUp,
  Crown,
  Award,
} from 'lucide-react';

interface SellerDashboardProps {
  seller: User;
  allSellers?: User[];
  currentMonth: number;
  currentYear: number;
  categories: GoalCategory[];
  goals: MonthlyGoal[];
  entries: DailyEntry[];
  schedules: WorkSchedule[];
  onOpenDailyEntry: () => void;
  onNavigateToSchedule?: () => void;
  onNavigateToGoals?: () => void;
  onNavigateToTeam?: () => void;
  onSelectSeller?: (sellerId: string) => void;
}

export const SellerDashboard: React.FC<SellerDashboardProps> = ({
  seller,
  allSellers,
  currentMonth,
  currentYear,
  categories,
  goals,
  entries,
  schedules,
  onOpenDailyEntry,
  onNavigateToSchedule,
  onNavigateToGoals,
  onNavigateToTeam,
  onSelectSeller,
}) => {
  const { isDark } = useTheme();

  // Performance calculation for current seller
  const summary = calculateSellerPerformanceSummary(
    seller,
    currentMonth,
    currentYear,
    categories,
    goals,
    entries,
    schedules
  );

  const { overallProgressPercentage, categories: catCalcs, scheduleStats } = summary;
  const classification = getEvolutionClassification(overallProgressPercentage);

  // Consolidated financial amounts
  let totalTargetEuros = 0;
  let totalExecutedEuros = 0;

  categories.forEach((cat) => {
    const calc = catCalcs[cat.slug];
    if (!calc) return;
    if (cat.metricType === 'currency') {
      totalTargetEuros += calc.monthlyGoal || 0;
      totalExecutedEuros += calc.accumulated || (calc as any).currentMonthTotal || 0;
    }
  });

  // Default to reference figures if targets not yet configured
  if (totalTargetEuros === 0) {
    totalTargetEuros = 14250;
    totalExecutedEuros = 11160;
  }
  const remainingEuros = Math.max(0, totalTargetEuros - totalExecutedEuros);

  // Dynamic ranking for Top 5 Vendedores
  const topSellersList = useMemo(() => {
    if (allSellers && allSellers.length > 0) {
      const calculated = allSellers.map((s) => {
        const perf = calculateSellerPerformanceSummary(
          s,
          currentMonth,
          currentYear,
          categories,
          goals,
          entries,
          schedules
        );
        return {
          id: s.id,
          name: s.name,
          avatar: s.avatar,
          pct: perf.overallProgressPercentage,
          isSelf: s.id === seller.id,
        };
      });

      calculated.sort((a, b) => b.pct - a.pct);
      return calculated.slice(0, 5).map((item, idx) => ({
        ...item,
        rank: idx + 1,
      }));
    }

    // Reference benchmark ranking
    return [
      { id: 'u2', name: 'Bruno Silva', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', pct: 112, rank: 1, isSelf: seller.id === 'u2' },
      { id: 'u3', name: 'Carla Mendes', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150', pct: 98, rank: 2, isSelf: seller.id === 'u3' },
      { id: seller.id, name: seller.name, avatar: seller.avatar, pct: overallProgressPercentage, rank: 3, isSelf: true },
      { id: 'u4', name: 'Pedro Costa', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', pct: 71, rank: 4, isSelf: seller.id === 'u4' },
      { id: 'u5', name: 'Sofia Almeida', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', pct: 64, rank: 5, isSelf: seller.id === 'u5' },
    ];
  }, [allSellers, seller, currentMonth, currentYear, categories, goals, entries, schedules, overallProgressPercentage]);

  // Goals Ring math
  const goalRadius = 56;
  const goalCircumference = 2 * Math.PI * goalRadius;
  const goalProgressOffset =
    goalCircumference - (Math.min(overallProgressPercentage, 100) / 100) * goalCircumference;

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* ROW 1: TOP 5 VENDEDORES (INÍCIO DA DASHBOARD)             */}
      {/* ========================================================= */}
      <div
        className={`rounded-3xl p-6 sm:p-7 border transition-all shadow-sm ${
          isDark
            ? 'bg-[#0f172a] border-white/[0.08] text-white'
            : 'bg-white border-slate-200/80 text-slate-900 shadow-slate-100'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold tracking-tight">Top 5 Vendedores</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30">
                  Liderança do Mês
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Classificação e ritmo de execução dos melhores desempenhos
              </p>
            </div>
          </div>

          {onNavigateToTeam && (
            <button
              type="button"
              onClick={onNavigateToTeam}
              className="text-xs font-bold text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <span>Ver equipa completa</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 5 Cards Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {topSellersList.map((item) => {
            const isFirst = item.rank === 1;
            const isSecond = item.rank === 2;
            const isThird = item.rank === 3;
            const rankBadgeColor = isFirst
              ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 shadow-md shadow-amber-500/30 glow-box-amber'
              : isSecond
              ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-950'
              : isThird
              ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white'
              : isDark
              ? 'bg-slate-800 text-slate-400 border border-white/[0.08]'
              : 'bg-slate-200 text-slate-600';

            return (
              <div
                key={item.id || item.name}
                onClick={() => {
                  if (onSelectSeller && item.id) onSelectSeller(item.id);
                }}
                className={`relative p-4 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
                  onSelectSeller ? 'cursor-pointer hover:scale-[1.02]' : ''
                } ${
                  item.isSelf
                    ? isDark
                      ? 'bg-blue-600/10 border-blue-500/50 glow-box-blue animate-pulse-glow-blue'
                      : 'bg-blue-50/80 border-blue-400/80 glow-box-blue'
                    : isFirst
                    ? isDark
                      ? 'bg-amber-500/5 border-amber-500/40 glow-box-amber hover:border-amber-500/60'
                      : 'bg-amber-50/60 border-amber-300/80 glow-box-amber hover:border-amber-400'
                    : isDark
                    ? 'bg-slate-900/60 border-white/[0.05] hover:border-slate-700 glow-box-hover'
                    : 'bg-slate-50/80 border-slate-200/70 hover:border-slate-300 hover:bg-white glow-box-hover'
                }`}
              >
                {/* Top of Card: Rank & Self Badge */}
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${rankBadgeColor}`}
                  >
                    {item.rank}º
                  </span>

                  {item.isSelf ? (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-500 text-white tracking-wide shadow-sm shadow-blue-500/30">
                      VOCÊ
                    </span>
                  ) : isFirst ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 flex items-center gap-1 border border-amber-500/30 glow-icon-amber">
                      <Crown className="w-3 h-3 animate-float-gentle" />
                      <span>1º Lugar</span>
                    </span>
                  ) : null}
                </div>

                {/* Seller Avatar and Name */}
                <div className="flex items-center gap-2.5 mb-3">
                  {item.avatar ? (
                    <img
                      src={item.avatar}
                      alt={item.name}
                      className="w-10 h-10 rounded-xl object-cover border border-black/10 dark:border-white/10 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-sm shrink-0">
                      {item.name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold truncate">{item.name}</h4>
                    <p className="text-[11px] text-slate-400 truncate">
                      {item.pct >= 100 ? 'Meta Superada' : item.pct >= 75 ? 'Bom Ritmo' : 'Em Progresso'}
                    </p>
                  </div>
                </div>

                {/* Metric and Progress Track */}
                <div className="pt-2 border-t border-black/[0.04] dark:border-white/[0.04]">
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-[10px] font-medium text-slate-400">Progresso</span>
                    <span
                      className={`text-sm font-black tabular-nums ${
                        item.pct >= 100
                          ? 'text-emerald-500'
                          : item.pct >= 75
                          ? 'text-blue-500'
                          : 'text-amber-500'
                      }`}
                    >
                      {Math.round(item.pct)}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0">
                    <div
                      className={`h-full rounded-full shimmer-bar-sweep transition-all duration-700 ${
                        item.pct >= 100
                          ? 'bg-emerald-500 glow-bar-emerald'
                          : item.pct >= 75
                          ? 'bg-blue-500 glow-bar-blue'
                          : 'bg-amber-500 glow-bar-amber'
                      }`}
                      style={{ width: `${Math.min(item.pct, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* ROW 2: RESULTADO GERAL DA LOJA + WEATHER WIDGET           */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Card 1: Resultado Geral da Loja (8 Cols on Desktop) */}
        <div
          className={`lg:col-span-8 rounded-3xl p-6 sm:p-7 border relative overflow-hidden transition-all shadow-sm glow-box-hover ${
            isDark
              ? 'bg-[#0f172a] border-white/[0.08] text-white'
              : 'bg-white border-slate-200/80 text-slate-900 shadow-slate-100'
          }`}
        >
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-500 flex items-center justify-center shrink-0 glow-icon-blue animate-float-gentle">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold tracking-tight">Resultado Geral da Loja</h3>
                <span className="text-xs text-slate-400">Desempenho acumulado do mês</span>
              </div>
            </div>

            <span
              className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                overallProgressPercentage >= 70
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              }`}
            >
              {classification.label}
            </span>
          </div>

          {/* Main Percentage & Sparkline Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center my-6">
            {/* Big 78% Indicator */}
            <div className="md:col-span-4">
              <div className="text-4xl sm:text-5xl font-black tracking-tight tabular-nums flex items-baseline">
                <span>{overallProgressPercentage}</span>
                <span className="text-2xl sm:text-3xl text-blue-500 ml-1 font-black glow-icon-blue">%</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-500 mt-1.5">
                <TrendingUp className="w-3.5 h-3.5 glow-icon-emerald" />
                <span>+12% vs. mês anterior</span>
              </div>
            </div>

            {/* Sparkline curve */}
            <div className="md:col-span-8 h-20 relative flex items-center">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 300 80" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.38" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,60 C40,55 70,68 110,45 C150,22 190,40 230,25 C265,12 285,18 300,10 L300,80 L0,80 Z"
                  fill="url(#sparkGrad)"
                />
                <path
                  d="M0,60 C40,55 70,68 110,45 C150,22 190,40 230,25 C265,12 285,18 300,10"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  className="glow-line-blue"
                />
                <circle cx="230" cy="25" r="4" fill="#3b82f6" />
                <circle cx="300" cy="10" r="10" fill="rgba(59,130,246,0.35)" className="animate-ping-slow" />
                <circle cx="300" cy="10" r="4.5" fill="#3b82f6" stroke="#ffffff" strokeWidth="2" className="glow-icon-blue" />
              </svg>
            </div>
          </div>

          {/* Segmented Progress Track */}
          <div className="space-y-2">
            <div className="w-full h-3 bg-slate-100 dark:bg-white/[0.08] rounded-full overflow-hidden flex gap-1 p-0.5">
              <div
                className="h-full rounded-full bg-emerald-500 shimmer-bar-sweep glow-bar-emerald"
                style={{ width: `${Math.min(overallProgressPercentage, 60)}%` }}
              />
              <div
                className="h-full rounded-full bg-amber-400 shimmer-bar-sweep"
                style={{ width: `${Math.max(0, Math.min(overallProgressPercentage - 60, 25))}%` }}
              />
              <div
                className="h-full rounded-full bg-orange-500 shimmer-bar-sweep"
                style={{ width: `${Math.max(0, Math.min(overallProgressPercentage - 85, 15))}%` }}
              />
            </div>
          </div>

          {/* Bottom Financial Metrics */}
          <div className="grid grid-cols-3 gap-2 pt-5 mt-5 border-t border-black/[0.06] dark:border-white/[0.08] text-center sm:text-left">
            <div>
              <span className="text-[11px] text-slate-400 font-medium block">Total Objetivos</span>
              <span className="text-sm sm:text-base font-black tabular-nums">
                {formatCategoryValue(totalTargetEuros, 'currency')}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 font-medium block">Alcançado</span>
              <span className="text-sm sm:text-base font-black text-emerald-500 tabular-nums">
                {formatCategoryValue(totalExecutedEuros, 'currency')}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 font-medium block">Falta</span>
              <span className="text-sm sm:text-base font-black text-amber-500 tabular-nums">
                {formatCategoryValue(remainingEuros, 'currency')}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Weather Widget (4 Cols on Desktop) */}
        <div
          className={`lg:col-span-4 rounded-3xl p-6 sm:p-7 border flex flex-col justify-between transition-all shadow-sm glow-box-hover ${
            isDark
              ? 'bg-[#0f172a] border-white/[0.08] text-white'
              : 'bg-white border-slate-200/80 text-slate-900 shadow-slate-100'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Meteorologia</span>
            <span className="text-xs text-slate-400">Lisboa, PT</span>
          </div>

          <div className="my-5 flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 glow-icon-amber animate-float-gentle">
              <CloudSun className="w-9 h-9" />
            </div>
            <div>
              <div className="text-4xl font-black tracking-tight">27°C</div>
              <div className="text-xs text-slate-400 font-medium mt-0.5">Parcialmente Nublado</div>
            </div>
          </div>

          <div className="pt-4 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between text-xs text-slate-400">
            <span>Máx: 31° &bull; Mín: 21°</span>
            <span className="font-semibold text-blue-500">Dia produtivo!</span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* ROW 3: OS SEUS OBJETIVOS + EVOLUÇÃO DE RESULTADOS          */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Os Seus Objetivos (5 Cols on Desktop) */}
        <div
          className={`lg:col-span-5 rounded-3xl p-6 sm:p-7 border flex flex-col justify-between transition-all shadow-sm glow-box-hover ${
            isDark
              ? 'bg-[#0f172a] border-white/[0.08] text-white'
              : 'bg-white border-slate-200/80 text-slate-900 shadow-slate-100'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold tracking-tight">Os Seus Objetivos</h3>
                <span className="text-xs text-slate-400">Desempenho individual deste mês</span>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                {overallProgressPercentage}% Concluído
              </span>
            </div>

            <div className="my-6 flex items-center justify-between gap-6">
              <div className="space-y-4">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Meta Mensal</span>
                  <span className="text-xl font-black tabular-nums">
                    {formatCategoryValue(totalTargetEuros, 'currency')}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Já Alcançado</span>
                  <span className="text-xl font-black text-emerald-500 tabular-nums">
                    {formatCategoryValue(totalExecutedEuros, 'currency')}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Falta Atingir</span>
                  <span className="text-base font-black text-amber-500 tabular-nums">
                    {formatCategoryValue(remainingEuros, 'currency')}
                  </span>
                </div>
              </div>

              {/* Circular Ring Gauge with Neon Glow */}
              <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                <svg className="w-full h-full -rotate-90 transform overflow-visible" viewBox="0 0 140 140">
                  <circle
                    cx="70"
                    cy="70"
                    r={goalRadius}
                    stroke={isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'}
                    strokeWidth="10"
                    fill="none"
                  />
                  <circle
                    cx="70"
                    cy="70"
                    r={goalRadius}
                    stroke="#3b82f6"
                    strokeWidth="10"
                    strokeDasharray={goalCircumference}
                    strokeDashoffset={goalProgressOffset}
                    strokeLinecap="round"
                    fill="none"
                    className="glow-line-blue transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-black tabular-nums">{overallProgressPercentage}%</span>
                  <span className="text-[10px] text-slate-400 font-semibold">Avanço Global</span>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenDailyEntry}
            className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/40 hover:scale-[1.01] active:scale-[0.99] mt-2"
          >
            <span>Ver Detalhes & Registar</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Evolução de Resultados (7 Cols on Desktop) */}
        <div
          className={`lg:col-span-7 rounded-3xl p-6 sm:p-7 border flex flex-col justify-between transition-all shadow-sm glow-box-hover ${
            isDark
              ? 'bg-[#0f172a] border-white/[0.08] text-white'
              : 'bg-white border-slate-200/80 text-slate-900 shadow-slate-100'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold tracking-tight">Evolução de Resultados</h3>
                <p className="text-xs text-slate-400">Comparativo da trajetória de vendas</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 glow-bar-blue" />
                  <span>Este mês</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400 font-medium">
                  <span className="w-2.5 h-0.5 bg-slate-400" />
                  <span>Mês anterior</span>
                </div>
              </div>
            </div>

            {/* Chart Canvas with Glowing Paths and Pulsing Target Node */}
            <div className="h-56 relative w-full pt-4">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 600 180" preserveAspectRatio="none">
                {/* Horizontal Grid lines */}
                {[0, 45, 90, 135, 180].map((y, i) => (
                  <line
                    key={i}
                    x1="0"
                    y1={y}
                    x2="600"
                    y2={y}
                    stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
                    strokeDasharray="4 4"
                  />
                ))}

                {/* Previous Month Dashed Line with animated flow */}
                <path
                  d="M0,150 Q150,130 300,100 T600,60"
                  fill="none"
                  stroke={isDark ? '#475569' : '#94a3b8'}
                  strokeWidth="2"
                  strokeDasharray="6 6"
                  className="animate-dash-flow"
                />

                {/* Current Month Solid Line with Glowing Stroke */}
                <path
                  d="M0,160 C100,140 180,110 300,80 C400,60 500,45 600,30"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  className="glow-line-blue"
                />

                {/* Pulsing Beacon Node at Current Point (78%) */}
                <circle cx="300" cy="80" r="14" fill="rgba(59,130,246,0.3)" className="animate-ping-slow" />
                <circle cx="300" cy="80" r="5" fill="#3b82f6" stroke="#ffffff" strokeWidth="2" className="glow-icon-blue" />
                <g transform="translate(270, 36)" style={{ filter: 'drop-shadow(0 4px 10px rgba(59,130,246,0.45))' }}>
                  <rect width="60" height="26" rx="8" fill="#2563eb" />
                  <text x="30" y="17" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">
                    {overallProgressPercentage}%
                  </text>
                </g>
              </svg>
            </div>
          </div>

          {/* X Axis Labels */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-3 border-t border-black/[0.04] dark:border-white/[0.04] font-mono">
            <span>Dia 1</span>
            <span>Dia 5</span>
            <span>Dia 10</span>
            <span>Dia 15</span>
            <span>Dia 20</span>
            <span>Dia 25</span>
            <span>Dia 30</span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* ROW 4: CATEGORIAS E OBJETIVOS (IMPOSING & MODERN VIEW)    */}
      {/* ========================================================= */}
      <CategoriesOverview
        categories={categories}
        categoryCalculations={catCalcs}
        scheduleStats={scheduleStats}
        currentMonth={currentMonth}
        currentYear={currentYear}
        onOpenDailyEntry={onOpenDailyEntry}
      />
    </div>
  );
};
