import React from 'react';
import { motion } from 'motion/react';
import { CategoryCalculation } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { formatCategoryValue } from '../utils/calculations';
import { CheckCircle2, TrendingUp, Calendar, DollarSign, Package, Clock, Sparkles } from 'lucide-react';

interface CategoryCardProps {
  calc: CategoryCalculation;
  onQuickAdd?: (slug: string) => void;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({ calc }) => {
  const {
    category,
    monthlyGoal,
    dailyGoal,
    accumulated,
    remaining,
    percentage,
    isGoalReached,
    surplus,
    statusMessage,
  } = calc;

  // Visual subtle badge styling (Apple palette style)
  const getBadgeStyle = (slug: string) => {
    switch (slug) {
      case 'plus_master':
        return 'bg-blue-50/80 text-[#0071e3] border-blue-200/60';
      case 'plus':
        return 'bg-amber-50/80 text-amber-700 border-amber-200/60';
      case 'megas_total':
        return 'bg-indigo-50/80 text-indigo-700 border-indigo-200/60';
      case 'dm_classicas':
        return 'bg-emerald-50/80 text-emerald-700 border-emerald-200/60';
      case 'dimobilli':
        return 'bg-orange-50/80 text-orange-700 border-orange-200/60';
      case 'peliculas':
        return 'bg-cyan-50/80 text-cyan-700 border-cyan-200/60';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getProgressBarColor = () => {
    if (isGoalReached) return 'bg-emerald-500';
    if (!percentage) return 'bg-slate-300';
    if (percentage >= 80) return 'bg-[#0071e3]';
    if (percentage >= 50) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const formattedPercentage = percentage !== null ? `${Math.min(percentage, 999).toFixed(1)}%` : '--';
  const isCurrency = category.metricType === 'currency';

  return (
    <motion.div
      id={`card-category-${category.slug}`}
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className={`relative rounded-3xl border bg-white/95 backdrop-blur-md p-6 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_32px_-6px_rgba(0,0,0,0.07)] transition-shadow duration-300 flex flex-col justify-between ${
        isGoalReached
          ? 'border-emerald-300/80 ring-1 ring-emerald-200/50'
          : 'border-black/[0.06] hover:border-black/[0.12]'
      }`}
    >
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <motion.div
              whileHover={{ scale: 1.12, rotate: 6 }}
              whileTap={{ scale: 0.9 }}
              className={`p-3 rounded-2xl border ${getBadgeStyle(category.slug)} shadow-2xs cursor-pointer`}
            >
              <CategoryIcon slug={category.slug} className="w-5 h-5" />
            </motion.div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-bold text-slate-900 leading-tight text-sm sm:text-base tracking-tight">
                  {category.name}
                </h3>
                <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  isCurrency ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70' : 'bg-sky-50 text-sky-700 border-sky-200/70'
                }`}>
                  {isCurrency ? (
                    <>
                      <DollarSign className="w-2.5 h-2.5" /> Valor (€)
                    </>
                  ) : (
                    <>
                      <Package className="w-2.5 h-2.5" /> Peças (Un)
                    </>
                  )}
                </span>
              </div>
              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5 font-normal" title={category.shortDescription}>
                {category.shortDescription}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          {isGoalReached ? (
            <motion.span
              whileHover={{ scale: 1.06 }}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Meta Concluída
            </motion.span>
          ) : monthlyGoal === null ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
              Sem Meta
            </span>
          ) : (
            <motion.span
              whileHover={{ scale: 1.06 }}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#0071e3]/10 text-[#0071e3] border border-[#0071e3]/20 shrink-0"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              {formattedPercentage}
            </motion.span>
          )}
        </div>

        {/* Goals Reference Grid: Meta Mensal & Meta Diária */}
        <div className="mt-4 grid grid-cols-2 gap-2 bg-[#f5f5f7] rounded-2xl p-3 border border-black/[0.03] text-xs">
          <div className="text-left pl-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Meta Mensal
            </span>
            <span className="font-black text-slate-900 text-xs sm:text-sm tabular-nums">
              {monthlyGoal !== null ? formatCategoryValue(monthlyGoal, category.metricType) : 'N/D'}
            </span>
          </div>

          <div className="text-right pr-1 border-l border-black/[0.06]">
            <div className="flex items-center justify-end gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0071e3]">
                Meta Diária
              </span>
            </div>
            <span className="font-black text-slate-900 text-xs sm:text-sm block tabular-nums">
              {isGoalReached
                ? 'Concluída 🎯'
                : dailyGoal !== null
                ? `${formatCategoryValue(dailyGoal, category.metricType)}/dia`
                : '--'}
            </span>
            {!isGoalReached && calc.remainingWorkDays > 0 && remaining !== null && remaining > 0 && (
              <span className="text-[10px] text-slate-500 font-medium block mt-0.5 truncate" title={calc.calculationFormula}>
                {calc.remainingWorkDays}d a trabalhar
              </span>
            )}
          </div>
        </div>

        {/* Main Metric Values: Realizado / Falta */}
        <div className="mt-3.5 grid grid-cols-2 gap-2 border-y border-black/[0.04] py-3 text-center">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Resultado Realizado
            </span>
            <p className={`text-base sm:text-lg font-black truncate mt-0.5 tabular-nums ${isGoalReached ? 'text-emerald-600' : 'text-slate-900'}`}>
              {formatCategoryValue(accumulated, category.metricType)}
            </p>
          </div>

          <div className="border-l border-black/[0.04]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              {isGoalReached ? 'Excedente' : 'Saldo Restante'}
            </span>
            <p className={`text-base sm:text-lg font-black truncate mt-0.5 tabular-nums ${isGoalReached ? 'text-emerald-600' : 'text-amber-600'}`}>
              {isGoalReached
                ? `+${formatCategoryValue(surplus, category.metricType)}`
                : formatCategoryValue(remaining ?? 0, category.metricType)}
            </p>
          </div>
        </div>

        {/* Apple Health-style Progress Bar */}
        <div className="mt-3.5">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-slate-600">Progresso Geral</span>
            <span className="font-black text-slate-900 tabular-nums">{formattedPercentage}</span>
          </div>
          <div className="w-full h-2.5 bg-black/[0.05] rounded-full overflow-hidden p-[1px]">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor()}`}
              style={{ width: `${Math.min(percentage || 0, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Footer: Daily Pace Needed */}
      <div className="mt-4 pt-3 border-t border-black/[0.04] flex items-center justify-between gap-2 text-xs text-slate-600">
        <span className="flex items-center gap-1 text-slate-400 font-medium shrink-0 text-[11px]">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          Ritmo:
        </span>
        <span className={`font-semibold text-right text-[11px] truncate ${isGoalReached ? 'text-emerald-600' : 'text-slate-700'}`} title={calc.calculationFormula}>
          {isGoalReached ? 'Meta Mensal Superada! 🎯' : calc.calculationFormula || statusMessage}
        </span>
      </div>
    </motion.div>
  );
};
