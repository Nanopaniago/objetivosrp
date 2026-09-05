import React from 'react';
import { motion } from 'motion/react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { User, GoalCategory, MonthlyGoal, DailyEntry, WorkSchedule } from '../types';
import { calculateSellerPerformanceSummary, formatCategoryValue } from '../utils/calculations';
import { Users, TrendingUp, Award, Calendar, ChevronRight, Sparkles } from 'lucide-react';
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
  // Calculate summary for all sellers
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

  const teamAverage = (
    summaries.reduce((acc, s) => acc + s.overallProgressPercentage, 0) /
    (summaries.length || 1)
  ).toFixed(1);

  // Prepare team ranking data for the modern minimalist chart
  const teamChartData = sortedSummaries.map(s => ({
    name: s.seller.name.split(' ')[0],
    fullName: s.seller.name,
    progress: s.overallProgressPercentage,
    sellerId: s.seller.id,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/95 backdrop-blur-xl p-5 sm:p-6 rounded-3xl border border-black/[0.05] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)]">
        <div>
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.15, rotate: 10 }}
              whileTap={{ scale: 0.9 }}
              className="p-2.5 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center cursor-pointer shadow-xs"
            >
              <Users className="w-5 h-5" />
            </motion.div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Visão Geral da Equipa ({sellers.length} Vendedores)
              </h2>
              <p className="text-xs text-slate-500 font-normal mt-0.5">
                Acompanhamento colaborativo das metas do mês com ranking e curva comparativa em tempo real.
              </p>
            </div>
          </div>
        </div>

        <motion.div
          whileHover={{ scale: 1.04 }}
          className="flex items-center gap-2 bg-blue-50 text-blue-900 px-4 py-2 rounded-2xl border border-blue-200/60 text-xs font-bold self-start sm:self-auto cursor-default"
        >
          <motion.span animate={{ rotate: [0, 8, -8, 0] }} transition={{ repeat: Infinity, duration: 4 }}>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </motion.span>
          Média Geral da Loja: <span className="text-blue-700 font-black tabular-nums">{teamAverage}%</span>
        </motion.div>
      </div>

      {/* Modern Minimalist Team Ranking Chart */}
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-black/[0.05] p-5 sm:p-6 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900">
              Ranking de Cumprimento de Metas da Equipa
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Mês {currentMonth.toString().padStart(2, '0')}/{currentYear}
          </span>
        </div>

        <div className="w-full h-36 select-none pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={teamChartData} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={{ stroke: 'rgba(0,0,0,0.06)' }}
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white/95 backdrop-blur-xl border border-black/[0.08] shadow-md p-2.5 rounded-xl text-xs">
                      <p className="font-bold text-slate-900">{data.fullName}</p>
                      <p className="text-blue-600 font-extrabold mt-0.5">{data.progress}% da meta</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="progress" radius={[6, 6, 0, 0]}>
                {teamChartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      index === 0
                        ? '#0071e3'
                        : entry.progress >= 100
                        ? '#10b981'
                        : '#93c5fd'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid of Sellers */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {sortedSummaries.map((summary, index) => {
          const { seller, overallProgressPercentage, categories: catCalcs, scheduleStats } = summary;
          const isTop = index === 0;

          return (
            <motion.div
              key={seller.id}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectSeller(seller.id)}
              className={`group relative cursor-pointer rounded-3xl border bg-white/95 backdrop-blur-md p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.07)] transition duration-200 ${
                isTop ? 'border-amber-300 ring-1 ring-amber-200/60' : 'border-black/[0.06] hover:border-[#0071e3]/40'
              }`}
            >
              {/* Top Seller Crown Badge */}
              {isTop && (
                <motion.div
                  animate={{ y: [0, -2, 0] }}
                  transition={{ repeat: Infinity, duration: 2.5 }}
                  className="absolute -top-2.5 right-4 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-amber-950 shadow-xs"
                >
                  <Award className="w-3.5 h-3.5" />
                  Destaque da Equipa
                </motion.div>
              )}

              {/* Seller Profile */}
              <div className="flex items-center gap-3">
                <img
                  src={seller.avatar}
                  alt={seller.name}
                  className="w-12 h-12 rounded-2xl object-cover border border-black/[0.08]"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition truncate">
                    {seller.name}
                  </h3>
                  <span className="text-xs text-slate-500 block truncate">{seller.storeName || 'Loja Centro'}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition shrink-0" />
              </div>

              {/* Progress Summary */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-500 font-medium">Cumprimento Geral</span>
                  <span className="font-black text-slate-900 tabular-nums">{overallProgressPercentage}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden p-[1px]">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      overallProgressPercentage >= 100
                        ? 'bg-emerald-500'
                        : overallProgressPercentage >= 75
                        ? 'bg-[#0071e3]'
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
                      className={`p-1.5 rounded-xl border text-[11px] ${
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
                  Dias a trabalhar:
                </span>
                <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                  {scheduleStats.hasSchedule ? `${scheduleStats.remainingWorkDays} d` : 'Sem escala'}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
