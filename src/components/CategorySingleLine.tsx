import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CategoryPerformanceCalculation, GoalCategory, WorkSchedule } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { formatCategoryValue } from '../utils/calculations';
import { getEvolutionClassification } from './GeneralResultCounter';
import {
  CheckCircle2,
  Clock,
  Briefcase,
  TrendingUp,
  Info,
  Calendar,
  Sparkles,
  ChevronRight,
  Calculator,
  ArrowUpRight,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface CategorySingleLineProps {
  calc: CategoryPerformanceCalculation;
  workDaysCount: number;
  remainingWorkDays: number;
}

export const CategorySingleLine: React.FC<CategorySingleLineProps> = ({
  calc,
  workDaysCount,
  remainingWorkDays,
}) => {
  const { isDark } = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  const {
    category,
    monthlyGoal,
    dailyGoal,
    currentMonthTotal,
    progressPercentage,
    remainingToGoal,
    isGoalReached,
    overAchievedAmount,
  } = calc;

  const classification = getEvolutionClassification(progressPercentage);

  // Remaining needed per working day
  const effectiveRemainingDays = Math.max(remainingWorkDays, 1);
  const dailyNeeded = remainingToGoal > 0 ? Number((remainingToGoal / effectiveRemainingDays).toFixed(2)) : 0;

  // Turn distribution projection (approx 45% morning, 55% closing shift)
  const morningTarget = dailyGoal > 0 ? (dailyGoal * 0.45).toFixed(1) : '0';
  const eveningTarget = dailyGoal > 0 ? (dailyGoal * 0.55).toFixed(1) : '0';

  const showFloatingBox = isHovered || isPinned;

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Single-Line Row Container */}
      <motion.div
        whileHover={{ scale: 1.008, y: -1 }}
        transition={{ duration: 0.15 }}
        onClick={() => setIsPinned(!isPinned)}
        className={`group flex items-center justify-between gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden select-none ${
          isDark
            ? isPinned || isHovered
              ? 'bg-[#131d35] border-blue-500/40 shadow-[0_4px_20px_rgba(0,113,227,0.15)]'
              : 'bg-[#0b1222]/80 hover:bg-[#101930] border-white/[0.06]'
            : isPinned || isHovered
            ? 'bg-blue-50/50 border-blue-300 shadow-sm'
            : 'bg-white hover:bg-slate-50 border-slate-200/80 shadow-2xs'
        }`}
      >
        {/* Subtle active border indicator */}
        <div
          className={`absolute left-0 top-0 bottom-0 w-1 transition-all ${
            isGoalReached
              ? 'bg-emerald-400'
              : progressPercentage >= 70
              ? 'bg-sky-400'
              : 'bg-rose-400'
          }`}
        />

        {/* 1. Category Icon + Title + Unit (Left Column) */}
        <div className="flex items-center gap-3 min-w-[170px] sm:min-w-[210px] shrink-0 pl-1.5">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-transform duration-200 group-hover:scale-105 ${
              isDark
                ? 'bg-white/[0.05] border-white/[0.1] text-sky-400'
                : 'bg-slate-100 border-slate-200 text-blue-600'
            }`}
          >
            <CategoryIcon slug={category.slug} className="w-4 h-4" />
          </div>
          <div className="flex flex-col truncate">
            <span className={`text-xs sm:text-sm font-black tracking-tight truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {category.name}
            </span>
            <span className="text-[10px] font-semibold text-slate-400">
              {category.unit} &bull; {category.metricType === 'currency' ? 'Financeiro' : 'Unidades'}
            </span>
          </div>
        </div>

        {/* 2. Metas: Mensal & Diária (Center-Left) */}
        <div className="hidden md:flex flex-col items-end sm:items-start min-w-[110px] shrink-0">
          <div className="text-[11px] font-bold tabular-nums">
            <span className="text-slate-400 text-[10px] font-medium mr-1">Meta:</span>
            {monthlyGoal !== null ? formatCategoryValue(monthlyGoal, category.metricType) : '--'}
          </div>
          <div className="text-[10px] text-slate-400 tabular-nums">
            <span className="font-medium mr-1">Diária:</span>
            {dailyGoal > 0 ? `${formatCategoryValue(dailyGoal, category.metricType)}/dia` : '--'}
          </div>
        </div>

        {/* 3. Inline Evolution Progress Bar (Center) */}
        <div className="hidden lg:flex flex-col flex-1 max-w-[200px] shrink-0 px-2">
          <div className="flex items-center justify-between text-[10px] font-bold mb-1">
            <span className="text-slate-400">Progresso</span>
            <span className="tabular-nums">{progressPercentage}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progressPercentage, 100)}%` }}
              transition={{ duration: 0.6 }}
              className={`h-full rounded-full bg-gradient-to-r ${classification.barColor}`}
            />
          </div>
        </div>

        {/* 4. Acumulado Real vs Saldo (Center-Right) */}
        <div className="flex flex-col items-end min-w-[100px] sm:min-w-[120px] shrink-0">
          <div className="text-xs sm:text-sm font-black tabular-nums flex items-center gap-1">
            {isGoalReached && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline shrink-0" />}
            <span>{formatCategoryValue(currentMonthTotal, category.metricType)}</span>
          </div>
          <div className="text-[10px] tabular-nums font-semibold">
            {isGoalReached ? (
              <span className="text-emerald-400">+{formatCategoryValue(overAchievedAmount, category.metricType)}</span>
            ) : (
              <span className="text-slate-400">Falta {formatCategoryValue(remainingToGoal, category.metricType)}</span>
            )}
          </div>
        </div>

        {/* 5. Classification Pill Badge (Right) */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold whitespace-nowrap ${classification.badgeClass}`}>
            {classification.label}
          </span>
          <button
            type="button"
            className="p-1 rounded-lg text-slate-400 hover:text-sky-400 transition"
            title="Ver detalhes da fórmula"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>

      {/* 6. CAIXA FLUTUANTE (Floating Popover / Interactive Card) */}
      <AnimatePresence>
        {showFloatingBox && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className={`absolute left-0 right-0 sm:left-auto sm:right-0 -bottom-2 translate-y-full z-30 w-full sm:w-[420px] p-5 rounded-3xl border shadow-2xl backdrop-blur-2xl ${
              isDark
                ? 'bg-[#0d1628]/95 border-blue-500/30 text-white shadow-[0_20px_50px_rgba(0,0,0,0.6)]'
                : 'bg-white/98 border-slate-200 text-slate-900 shadow-[0_16px_40px_rgba(0,0,0,0.12)]'
            }`}
          >
            {/* Header of Floating Card */}
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.08] mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/10 text-sky-400">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black tracking-tight">{category.name}</h4>
                  <p className="text-[10px] text-slate-400">Cálculo de Desempenho & Ritmo</p>
                </div>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${classification.badgeClass}`}>
                {classification.label}
              </span>
            </div>

            {/* Formula Explanation Section */}
            <div className="space-y-3 text-xs">
              <div
                className={`p-3 rounded-2xl border ${
                  isDark ? 'bg-black/30 border-white/[0.05]' : 'bg-slate-50 border-slate-200/60'
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Fórmula de Cálculo do Objetivo Diário
                </span>
                <div className="font-mono text-[11px] font-bold text-sky-400">
                  {monthlyGoal !== null ? formatCategoryValue(monthlyGoal, category.metricType) : '0'} &divide; {workDaysCount} dias = {formatCategoryValue(dailyGoal, category.metricType)} / dia
                </div>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                  O objetivo diário individual considera estritamente os {workDaysCount} dias de escala cadastrados para este vendedor no mês.
                </p>
              </div>

              {/* Status & Daily Pace Needed */}
              <div className="grid grid-cols-2 gap-2">
                <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-white/[0.02] border-white/[0.05]' : 'bg-slate-50/70 border-slate-200/50'}`}>
                  <span className="text-[10px] text-slate-400 block font-semibold">Dias Restantes</span>
                  <span className="text-xs font-black tabular-nums">{remainingWorkDays} dias de escala</span>
                </div>
                <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-white/[0.02] border-white/[0.05]' : 'bg-slate-50/70 border-slate-200/50'}`}>
                  <span className="text-[10px] text-slate-400 block font-semibold">Ritmo Necessário</span>
                  <span className="text-xs font-black text-sky-400 tabular-nums">
                    {isGoalReached ? 'Meta Concluída!' : `${formatCategoryValue(dailyNeeded, category.metricType)}/dia`}
                  </span>
                </div>
              </div>

              {/* Shift distribution preview */}
              <div className="pt-2 border-t border-black/[0.04] dark:border-white/[0.04] flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-1">
                  <Sun className="w-3 h-3 text-amber-400" />
                  <span>Abertura: <strong>~{morningTarget}</strong></span>
                </div>
                <div className="flex items-center gap-1">
                  <Moon className="w-3 h-3 text-indigo-400" />
                  <span>Fecho: <strong>~{eveningTarget}</strong></span>
                </div>
                <span className="text-[10px] text-slate-500">(Sugestão por turno)</span>
              </div>
            </div>

            {/* Click to close reminder for mobile */}
            <div className="mt-3 text-center">
              <span className="text-[9px] text-slate-400">
                {isPinned ? 'Clique na linha para fechar esta caixa flutuante' : 'Passe o mouse ou toque para fixar detalhes'}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
