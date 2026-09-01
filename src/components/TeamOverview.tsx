import React from 'react';
import { User, GoalCategory, MonthlyGoal, DailyEntry, WorkSchedule } from '../types';
import { calculateSellerPerformanceSummary, formatCategoryValue } from '../utils/calculations';
import { Users, TrendingUp, Award, Calendar, CheckCircle2, ChevronRight } from 'lucide-react';
import { CategoryIcon } from './CategoryIcon';

interface TeamOverviewProps {
  sellers: User[];
  currentMonth: number;
  currentYear: number;
  categories: GoalCategory[];
  goals: MonthlyGoal[];
  entries: DailyEntry[];
  schedules: WorkSchedule[];
  onSelectSeller: (sellerId: string) => void;
}

export const TeamOverview: React.FC<TeamOverviewProps> = ({
  sellers,
  currentMonth,
  currentYear,
  categories,
  goals,
  entries,
  schedules,
  onSelectSeller,
}) => {
  const summaries = sellers.map(seller =>
    calculateSellerPerformanceSummary(
      seller,
      currentMonth,
      currentYear,
      categories,
      goals,
      entries,
      schedules
    )
  );

  // Sort by overall progress percentage
  const sortedSummaries = [...summaries].sort(
    (a, b) => b.overallProgressPercentage - a.overallProgressPercentage
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">Visão Geral da Equipa ({sellers.length} Vendedores)</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Acompanhamento colaborativo das metas do mês. Todos os vendedores podem consultar o progresso da equipa para apoiar os colegas.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-blue-50 text-blue-800 px-3.5 py-1.5 rounded-xl border border-blue-100 text-xs font-semibold">
          <TrendingUp className="w-4 h-4" />
          Média Geral da Loja: {(
            summaries.reduce((acc, s) => acc + s.overallProgressPercentage, 0) /
            (summaries.length || 1)
          ).toFixed(1)}%
        </div>
      </div>

      {/* Grid of Sellers */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {sortedSummaries.map((summary, index) => {
          const { seller, overallProgressPercentage, categories: catCalcs, scheduleStats } = summary;
          const isTop = index === 0;

          return (
            <div
              key={seller.id}
              onClick={() => onSelectSeller(seller.id)}
              className={`group relative cursor-pointer rounded-2xl border bg-white p-5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                isTop ? 'border-amber-300 ring-1 ring-amber-200/60' : 'border-slate-200 hover:border-blue-300'
              }`}
            >
              {/* Top Seller Crown Badge */}
              {isTop && (
                <div className="absolute -top-2.5 right-4 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400 text-amber-950 shadow-xs">
                  <Award className="w-3.5 h-3.5" />
                  Destaque da Equipa
                </div>
              )}

              {/* Seller Profile */}
              <div className="flex items-center gap-3">
                <img
                  src={seller.avatar}
                  alt={seller.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-slate-100"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition truncate">
                    {seller.name}
                  </h3>
                  <span className="text-xs text-slate-500 block truncate">{seller.storeName || 'Loja Centro'}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition shrink-0" />
              </div>

              {/* Progress Summary */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-500 font-medium">Cumprimento Geral</span>
                  <span className="font-bold text-slate-900">{overallProgressPercentage}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      overallProgressPercentage >= 100
                        ? 'bg-emerald-500'
                        : overallProgressPercentage >= 75
                        ? 'bg-blue-600'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.min(overallProgressPercentage, 100)}%` }}
                  />
                </div>
              </div>

              {/* Mini Categories Pills */}
              <div className="mt-4 grid grid-cols-3 gap-1.5 text-center">
                {categories.slice(0, 6).map(cat => {
                  const c = catCalcs[cat.slug];
                  const reached = c.isGoalReached;
                  return (
                    <div
                      key={cat.slug}
                      className={`p-1.5 rounded-lg border text-[11px] ${
                        reached
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold'
                          : 'bg-slate-50 border-slate-100 text-slate-600'
                      }`}
                      title={`${cat.name}: ${formatCategoryValue(c.accumulated, cat.metricType)} de ${c.monthlyGoal !== null ? formatCategoryValue(c.monthlyGoal, cat.metricType) : 'Sem Meta'}`}
                    >
                      <div className="truncate text-[10px] text-slate-400 font-medium">{cat.name.split(' ')[0]}</div>
                      <div className="font-bold truncate mt-0.5">
                        {c.percentage !== null ? `${Math.round(c.percentage)}%` : '--'}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Schedule Info */}
              <div className="mt-3.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  Dias a trabalhar até ao fim do mês:
                </span>
                <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                  {scheduleStats.hasSchedule ? `${scheduleStats.remainingWorkDays} d` : 'Sem escala'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
