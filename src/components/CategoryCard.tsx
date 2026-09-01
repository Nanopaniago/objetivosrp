import React from 'react';
import { CategoryCalculation } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { formatCategoryValue } from '../utils/calculations';
import { CheckCircle2, TrendingUp, Calendar, DollarSign, Package, Clock } from 'lucide-react';

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
    dailyRequiredAverage,
    statusMessage,
  } = calc;

  // Visual color accents
  const getBadgeStyle = (slug: string) => {
    switch (slug) {
      case 'plus_master':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'plus':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'megas_total':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'dm_classicas':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'dimobilli':
        return 'bg-orange-50 text-orange-800 border-orange-200';
      case 'peliculas':
        return 'bg-cyan-50 text-cyan-800 border-cyan-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getProgressBarColor = () => {
    if (isGoalReached) return 'bg-emerald-500';
    if (!percentage) return 'bg-slate-300';
    if (percentage >= 80) return 'bg-blue-600';
    if (percentage >= 50) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const formattedPercentage = percentage !== null ? `${Math.min(percentage, 999).toFixed(1)}%` : '--';
  const isCurrency = category.metricType === 'currency';

  return (
    <div
      id={`card-category-${category.slug}`}
      className={`relative rounded-2xl border bg-white p-5 shadow-2xs transition-all duration-200 hover:shadow-md flex flex-col justify-between ${
        isGoalReached ? 'border-emerald-300 ring-1 ring-emerald-200/50' : 'border-slate-200'
      }`}
    >
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${getBadgeStyle(category.slug)}`}>
              <CategoryIcon slug={category.slug} className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-bold text-slate-900 leading-tight">{category.name}</h3>
                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                  isCurrency ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-sky-50 text-sky-700 border-sky-200'
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
              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5" title={category.shortDescription}>
                {category.shortDescription}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          {isGoalReached ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Meta Atingida
            </span>
          ) : monthlyGoal === null ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
              Sem Meta
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
              <TrendingUp className="w-3.5 h-3.5" />
              {formattedPercentage}
            </span>
          )}
        </div>

        {/* Goals Reference Grid: Meta Mensal & Meta Diária */}
        <div className="mt-3.5 grid grid-cols-2 gap-2 bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-xs">
          <div className="text-left pl-1">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Meta Mensal</span>
            <span className="font-bold text-slate-800 text-xs sm:text-sm">
              {monthlyGoal !== null ? formatCategoryValue(monthlyGoal, category.metricType) : 'N/D'}
            </span>
          </div>

          <div className="text-right pr-1 border-l border-slate-200">
            <div className="flex items-center justify-end gap-1">
              <span className="text-[10px] font-bold uppercase text-blue-600">Meta Diária</span>
            </div>
            <span className="font-black text-blue-900 text-xs sm:text-sm block">
              {isGoalReached
                ? 'Concluída 🎯'
                : dailyGoal !== null
                ? `${formatCategoryValue(dailyGoal, category.metricType)}/dia`
                : '--'}
            </span>
            {!isGoalReached && calc.remainingWorkDays > 0 && remaining !== null && remaining > 0 && (
              <span className="text-[9px] text-blue-600/80 font-medium block mt-0.5 truncate" title={calc.calculationFormula}>
                {calc.remainingWorkDays}d a trabalhar
              </span>
            )}
          </div>
        </div>

        {/* Main Metric Values: Realizado / Falta */}
        <div className="mt-3 grid grid-cols-2 gap-2 border-y border-slate-100 py-2.5 text-center">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Resultado Realizado
            </span>
            <p className={`text-base font-black truncate mt-0.5 ${isGoalReached ? 'text-emerald-600' : 'text-slate-900'}`}>
              {formatCategoryValue(accumulated, category.metricType)}
            </p>
          </div>

          <div className="border-l border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              {isGoalReached ? 'Excedente' : 'Saldo Restante'}
            </span>
            <p className={`text-base font-black truncate mt-0.5 ${isGoalReached ? 'text-emerald-600' : 'text-amber-600'}`}>
              {isGoalReached
                ? `+${formatCategoryValue(surplus, category.metricType)}`
                : formatCategoryValue(remaining ?? 0, category.metricType)}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-bold text-slate-600">Cumprimento da Meta</span>
            <span className="font-black text-slate-900">{formattedPercentage}</span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor()}`}
              style={{ width: `${Math.min(percentage || 0, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Footer: Daily Pace Needed */}
      <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 text-xs text-slate-600">
        <span className="flex items-center gap-1 text-slate-500 font-medium shrink-0">
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          Ritmo Diário:
        </span>
        <span className={`font-bold text-right text-[11px] truncate ${isGoalReached ? 'text-emerald-600' : 'text-slate-800'}`} title={calc.calculationFormula}>
          {isGoalReached ? 'Meta Atingida! 🎯' : calc.calculationFormula || statusMessage}
        </span>
      </div>
    </div>
  );
};
