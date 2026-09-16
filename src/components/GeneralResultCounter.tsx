import React from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp,
  Award,
  Clock,
  Briefcase,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Target,
  ArrowUpRight,
  Info,
} from 'lucide-react';
import { GoalCategory, MonthlyGoal, DailyEntry, WorkSchedule, User, CategoryCalculation } from '../types';
import { SellerPerformanceSummary } from '../types';
import { formatCategoryValue } from '../utils/calculations';
import { useTheme } from '../context/ThemeContext';

interface GeneralResultCounterProps {
  summary: SellerPerformanceSummary;
  categories: GoalCategory[];
  currentMonth: number;
  currentYear: number;
  seller: User;
  onOpenDailyEntry?: () => void;
}

export type PerformanceClassification = 'below' | 'average' | 'above';

export function getEvolutionClassification(percentage: number): {
  key: PerformanceClassification;
  label: string;
  badgeClass: string;
  dotColor: string;
  barColor: string;
  description: string;
  glowColor: string;
} {
  if (percentage >= 100) {
    return {
      key: 'above',
      label: 'Acima da Média',
      badgeClass: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]',
      dotColor: 'bg-emerald-400',
      barColor: 'from-emerald-500 to-teal-400',
      glowColor: '#10b981',
      description: 'Desempenho de excelência! Metas globais superadas com folga.',
    };
  }
  if (percentage >= 70) {
    return {
      key: 'average',
      label: 'Na Média',
      badgeClass: 'bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-[0_0_15px_rgba(56,189,248,0.2)]',
      dotColor: 'bg-sky-400',
      barColor: 'from-blue-600 via-sky-500 to-cyan-400',
      glowColor: '#0284c7',
      description: 'Ritmo consistente alinhado com o esperado para os dias trabalhados.',
    };
  }
  return {
    key: 'below',
    label: 'Abaixo da Média',
    badgeClass: 'bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.2)]',
    dotColor: 'bg-rose-400',
    barColor: 'from-rose-500 to-amber-500',
    glowColor: '#f43f5e',
    description: 'Abaixo da média esperada. Necessário acelerar o ritmo nos dias restantes.',
  };
}

export const GeneralResultCounter: React.FC<GeneralResultCounterProps> = ({
  summary,
  categories,
  currentMonth,
  currentYear,
  seller,
  onOpenDailyEntry,
}) => {
  const { isDark } = useTheme();
  const { overallProgressPercentage, categories: catCalcs, scheduleStats } = summary;
  const classification = getEvolutionClassification(overallProgressPercentage);

  const reachedCount = Object.values(catCalcs).filter((c: CategoryCalculation) => c?.isGoalReached).length;
  const totalCategories = categories.length;

  // Calculate consolidated financial target & executed for currency categories
  let totalCurrencyTarget = 0;
  let totalCurrencyExecuted = 0;
  let totalUnitTarget = 0;
  let totalUnitExecuted = 0;

  categories.forEach(cat => {
    const calc = catCalcs[cat.slug];
    if (!calc) return;
    if (cat.metricType === 'currency') {
      totalCurrencyTarget += calc.monthlyGoal || 0;
      totalCurrencyExecuted += calc.currentMonthTotal || 0;
    } else {
      totalUnitTarget += calc.monthlyGoal || 0;
      totalUnitExecuted += calc.currentMonthTotal || 0;
    }
  });

  // Circular progress calculations (Radius 64 -> circumference = 2 * PI * 64 ≈ 402.12)
  const radius = 64;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const boundedPercent = Math.min(Math.max(overallProgressPercentage, 0), 100);
  const strokeDashoffset = circumference - (boundedPercent / 100) * circumference;

  return (
    <div
      id="general-result-counter-panel"
      className={`rounded-3xl p-6 sm:p-8 transition-all relative overflow-hidden border backdrop-blur-xl ${
        isDark
          ? 'bg-[#0b1222]/90 border-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.5)] text-white'
          : 'bg-white/95 border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] text-slate-900'
      }`}
    >
      {/* Background ambient neon glow in dark mode */}
      {isDark && (
        <>
          <div
            className="absolute -top-24 -left-24 w-72 h-72 rounded-full blur-[100px] pointer-events-none opacity-25"
            style={{ backgroundColor: classification.glowColor }}
          />
          <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full blur-[120px] pointer-events-none opacity-20 bg-blue-600" />
        </>
      )}

      {/* Header bar of the Hero Counter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-black/[0.05] dark:border-white/[0.06] relative z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={seller.avatar}
              alt={seller.name}
              className="w-13 h-13 rounded-2xl object-cover border border-black/[0.08] dark:border-white/[0.15] shadow-xs"
            />
            <span
              className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 ${
                isDark ? 'border-[#0b1222]' : 'border-white'
              } ${classification.dotColor} animate-pulse`}
            />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black tracking-tight">{seller.name}</h2>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  isDark ? 'bg-white/[0.06] text-slate-300 border-white/[0.08]' : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {seller.storeName || 'Loja Centro - 01'}
              </span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5">
              Quadro Geral de Resultados &bull; {currentMonth.toString().padStart(2, '0')}/{currentYear}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${classification.badgeClass}`}>
            <span className={`w-2 h-2 rounded-full ${classification.dotColor} animate-ping`} />
            {classification.label}
          </span>
          {onOpenDailyEntry && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onOpenDailyEntry}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm transition cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              Lançar Resultado
            </motion.button>
          )}
        </div>
      </div>

      {/* Main Highlights Grid: Circular Ring Counter + Metric Tiles */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 pt-6 relative z-10 items-center">
        {/* Left: Prominent Glowing Ring Counter (Inspired by reference visual) */}
        <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col items-center justify-center gap-5 p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.04]">
          <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 160 160">
              {/* Background track */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                stroke={isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'}
                strokeWidth={strokeWidth}
                fill="none"
              />
              {/* Animated Progress circle */}
              <motion.circle
                cx="80"
                cy="80"
                r={radius}
                stroke="url(#counterGrad)"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                strokeLinecap="round"
                fill="none"
              />
              <defs>
                <linearGradient id="counterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#38bdf8" />
                  <stop offset="60%" stop-color="#0071e3" />
                  <stop offset="100%" stop-color={classification.glowColor} />
                </linearGradient>
              </defs>
            </svg>

            {/* Inner Ring Center Information */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Resultado Geral</span>
              <div className="text-3xl font-black tracking-tight tabular-nums flex items-baseline justify-center">
                <span>{overallProgressPercentage}</span>
                <span className="text-base font-bold text-sky-400 ml-0.5">%</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 mt-0.5">
                {reachedCount}/{totalCategories} Metas
              </span>
            </div>
          </div>

          <div className="text-center sm:text-left lg:text-center">
            <div className="text-xs font-bold text-slate-400">Classificação Atual:</div>
            <div className={`text-sm font-extrabold mt-0.5 ${
              classification.key === 'above' ? 'text-emerald-400' :
              classification.key === 'average' ? 'text-sky-400' : 'text-rose-400'
            }`}>
              {classification.label}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 max-w-[220px]">
              {classification.description}
            </p>
          </div>
        </div>

        {/* Right: Key Performance Metric Cards & Highlights */}
        <div className="lg:col-span-8 space-y-5">
          {/* Bento Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Metas Atingidas */}
            <motion.div
              whileHover={{ y: -2 }}
              className={`p-3.5 rounded-2xl border transition ${
                isDark ? 'bg-[#0f172a]/70 border-white/[0.06]' : 'bg-slate-50 border-slate-200/60'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Metas Atingidas</span>
              <div className="text-base sm:text-lg font-black mt-1 flex items-center gap-1.5 tabular-nums">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{reachedCount} <span className="text-xs font-normal text-slate-400">de {totalCategories}</span></span>
              </div>
            </motion.div>

            {/* Dias de Trabalho */}
            <motion.div
              whileHover={{ y: -2 }}
              className={`p-3.5 rounded-2xl border transition ${
                isDark ? 'bg-[#0f172a]/70 border-white/[0.06]' : 'bg-slate-50 border-slate-200/60'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Escala do Mês</span>
              <div className="text-base sm:text-lg font-black mt-1 flex items-center gap-1.5 tabular-nums">
                <Briefcase className="w-4 h-4 text-sky-400 shrink-0" />
                <span>{scheduleStats.hasSchedule ? `${scheduleStats.totalMonthWorkDays} dias` : '22 dias'}</span>
              </div>
            </motion.div>

            {/* Dias Restantes */}
            <motion.div
              whileHover={{ y: -2 }}
              className={`p-3.5 rounded-2xl border transition ${
                isDark ? 'bg-[#0f172a]/70 border-white/[0.06]' : 'bg-slate-50 border-slate-200/60'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Dias Restantes</span>
              <div className="text-base sm:text-lg font-black mt-1 flex items-center gap-1.5 tabular-nums">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{scheduleStats.hasSchedule ? `${scheduleStats.remainingWorkDays} dias` : '--'}</span>
              </div>
            </motion.div>

            {/* Ritmo Comercial */}
            <motion.div
              whileHover={{ y: -2 }}
              className={`p-3.5 rounded-2xl border transition ${
                isDark ? 'bg-[#0f172a]/70 border-white/[0.06]' : 'bg-slate-50 border-slate-200/60'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Ritmo Médio</span>
              <div className="text-base sm:text-lg font-black mt-1 flex items-center gap-1.5 tabular-nums">
                <TrendingUp className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>{overallProgressPercentage >= 100 ? 'Superado' : `${Math.round(overallProgressPercentage)}%`}</span>
              </div>
            </motion.div>
          </div>

          {/* Categorized Evolution Bar (Barra de Evolução com Classificações) */}
          <div
            className={`p-4 sm:p-5 rounded-2xl border ${
              isDark ? 'bg-[#0d1424]/80 border-white/[0.06]' : 'bg-slate-50 border-slate-200/70'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold">Barra de Evolução do Objetivo RP</span>
              </div>
              <div className="text-xs font-black tabular-nums flex items-center gap-2">
                <span className="text-slate-400">Progresso Consolidado:</span>
                <span
                  className={
                    classification.key === 'above' ? 'text-emerald-400' :
                    classification.key === 'average' ? 'text-sky-400' : 'text-rose-400'
                  }
                >
                  {overallProgressPercentage}%
                </span>
              </div>
            </div>

            {/* Segmented Evolution Track with Classification zones */}
            <div className="space-y-1.5">
              <div className="relative w-full h-4 bg-black/10 dark:bg-white/[0.06] rounded-full overflow-hidden p-[2px]">
                {/* Visual zone dividers */}
                <div className="absolute inset-0 grid grid-cols-10 pointer-events-none opacity-20">
                  <div className="col-span-7 border-r border-dashed border-white" />
                  <div className="col-span-3 border-r border-dashed border-white" />
                </div>

                {/* Animated active bar */}
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(overallProgressPercentage, 100)}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className={`h-full rounded-full bg-gradient-to-r ${classification.barColor} shadow-[0_0_12px_rgba(56,189,248,0.4)]`}
                />
              </div>

              {/* Classification Markers / Legend below track */}
              <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 pt-1">
                <div className="flex items-center gap-1 text-rose-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  <span>0% - 69%: Abaixo da Média</span>
                </div>
                <div className="flex items-center gap-1 text-sky-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  <span>70% - 99%: Na Média</span>
                </div>
                <div className="flex items-center gap-1 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>100%+: Acima da Média</span>
                </div>
              </div>
            </div>

            {/* Financial Summary Snippet */}
            {totalCurrencyTarget > 0 && (
              <div className="mt-4 pt-3 border-t border-black/[0.04] dark:border-white/[0.04] flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-slate-400 font-medium">Faturamento Monetário Acumulado:</span>
                <div className="font-extrabold tabular-nums flex items-center gap-2">
                  <span className="text-emerald-400">{formatCategoryValue(totalCurrencyExecuted, 'currency')}</span>
                  <span className="text-slate-400 font-normal">de {formatCategoryValue(totalCurrencyTarget, 'currency')}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
