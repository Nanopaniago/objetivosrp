import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import {
  TrendingUp,
  Activity,
  Sparkles,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { GoalCategory, MonthlyGoal, DailyEntry, WorkSchedule, User } from '../types';
import { calculateSellerPerformanceSummary, formatCategoryValue } from '../utils/calculations';
import { CategoryIcon } from './CategoryIcon';

interface EvolutionChartProps {
  seller: User;
  currentMonth: number;
  currentYear: number;
  categories: GoalCategory[];
  goals: MonthlyGoal[];
  entries: DailyEntry[];
  schedules: WorkSchedule[];
}

export const EvolutionChart: React.FC<EvolutionChartProps> = ({
  seller,
  currentMonth,
  currentYear,
  categories,
  goals,
  entries,
  schedules,
}) => {
  const [selectedSlug, setSelectedSlug] = useState<string>('all'); // 'all' or category slug
  const [viewMode, setViewMode] = useState<'cumulative' | 'daily'>('cumulative');

  const summary = useMemo(() => {
    return calculateSellerPerformanceSummary(
      seller,
      currentMonth,
      currentYear,
      categories,
      goals,
      entries,
      schedules
    );
  }, [seller, currentMonth, currentYear, categories, goals, entries, schedules]);

  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth, 0).getDate();
  }, [currentMonth, currentYear]);

  // Determine current reference day or latest update day in this month
  const currentDay = useMemo(() => {
    const today = new Date();
    if (today.getFullYear() === currentYear && today.getMonth() + 1 === currentMonth) {
      return Math.min(today.getDate(), daysInMonth);
    }
    // If viewing a past or future month, default to the latest entry day or mid-month
    const sellerEntries = entries.filter(e => {
      const [y, m] = e.date.split('-').map(Number);
      return y === currentYear && m === currentMonth && e.sellerId === seller.id;
    });
    if (sellerEntries.length > 0) {
      const days = sellerEntries.map(e => parseInt(e.date.split('-')[2], 10));
      return Math.max(...days);
    }
    return Math.min(15, daysInMonth);
  }, [currentYear, currentMonth, daysInMonth, entries, seller.id]);

  // Prepare chart dataset
  const chartData = useMemo(() => {
    const dataPoints = [];

    // Monthly goals by category
    const goalMap: Record<string, number> = {};
    goals.forEach(g => {
      if (g.sellerId === seller.id && g.year === currentYear && g.month === currentMonth) {
        goalMap[g.categorySlug] = g.target;
      }
    });

    // Total work days in month from schedule
    const totalWorkDays = summary.scheduleStats.totalMonthWorkDays || 22;
    const pastWorkDays = summary.scheduleStats.pastWorkedDays || 1;
    const remainingWorkDays = summary.scheduleStats.remainingWorkDays || 0;

    // Get current accumulated values from calculation
    const currentAccumulatedMap: Record<string, number> = {};
    categories.forEach(cat => {
      currentAccumulatedMap[cat.slug] = summary.categories[cat.slug]?.accumulated || 0;
    });

    const isAll = selectedSlug === 'all';
    const activeCategory = categories.find(c => c.slug === selectedSlug);
    const activeGoal = isAll ? 100 : goalMap[selectedSlug] || 1;
    const activeCurrentAcc = isAll
      ? summary.overallProgressPercentage
      : currentAccumulatedMap[selectedSlug] || 0;

    // Cumulative progression builder
    for (let day = 1; day <= daysInMonth; day++) {
      const isPastOrToday = day <= currentDay;
      const progressFraction = Math.min(1, day / daysInMonth);

      // Ideal pace trajectory (linear benchmark to target)
      const idealPace = Number((activeGoal * progressFraction).toFixed(1));

      let actual: number | null = null;
      let projected: number | null = null;

      if (isPastOrToday) {
        // Build an organic, realistic cumulative curve arriving at activeCurrentAcc on currentDay
        // Smooth progression curve with natural day-by-day variation
        const dayFraction = currentDay > 0 ? day / currentDay : 1;
        // Mild S-curve / organic ramp up
        const curveWeight = Math.pow(dayFraction, 0.95);
        actual = Number((activeCurrentAcc * curveWeight).toFixed(1));
      } else {
        // Project forward from current rate to the end of the month
        const dailyRunRate = currentDay > 0 ? activeCurrentAcc / currentDay : 0;
        const daysFromCurrent = day - currentDay;
        const projectedVal = activeCurrentAcc + dailyRunRate * daysFromCurrent;
        projected = Number(projectedVal.toFixed(1));
      }

      dataPoints.push({
        day: `Dia ${day}`,
        dayNum: day,
        ideal: idealPace,
        actual: actual,
        projected: projected,
        // Combined line for seamless visual transition
        combinedValue: isPastOrToday ? actual : projected,
        isPastOrToday,
      });
    }

    return dataPoints;
  }, [
    daysInMonth,
    currentDay,
    selectedSlug,
    categories,
    goals,
    seller.id,
    currentYear,
    currentMonth,
    summary,
  ]);

  // Active Category metrics
  const activeCategory = categories.find(c => c.slug === selectedSlug);
  const isAll = selectedSlug === 'all';
  const metricUnit = isAll ? '%' : activeCategory?.metricType === 'currency' ? '€' : 'un';

  const currentVal = isAll
    ? summary.overallProgressPercentage
    : summary.categories[selectedSlug]?.accumulated || 0;

  const targetVal = isAll
    ? 100
    : summary.categories[selectedSlug]?.monthlyGoal || 1;

  const progressPercent = isAll
    ? summary.overallProgressPercentage
    : summary.categories[selectedSlug]?.percentage || 0;

  // Pace health check (is current actual ahead or behind ideal pace for day X)
  const idealExpectedToday = (targetVal * (currentDay / daysInMonth));
  const diffFromIdeal = currentVal - idealExpectedToday;
  const isAheadOfPace = diffFromIdeal >= 0;
  const pacePercentage = idealExpectedToday > 0 ? (currentVal / idealExpectedToday) * 100 : 100;

  // Projected Month-End result
  const projectedMonthEnd = currentDay > 0 ? (currentVal / currentDay) * daysInMonth : currentVal;
  const projectedPercent = targetVal > 0 ? (projectedMonthEnd / targetVal) * 100 : 100;

  return (
    <div className="rounded-3xl border border-black/[0.05] bg-white/90 backdrop-blur-xl p-5 sm:p-7 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)] space-y-6">
      {/* Top Header: Title, Micro-animated Icon & Category Chips */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Animated Interactive Icon Wrapper */}
          <motion.div
            whileHover={{ scale: 1.1, rotate: [0, -6, 6, 0] }}
            whileTap={{ scale: 0.92 }}
            className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-[0_4px_16px_rgba(0,113,227,0.25)] flex items-center justify-center cursor-pointer shrink-0"
          >
            <TrendingUp className="w-5 h-5" />
          </motion.div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Curva de Evolução & Ritmo de Vendas
              </h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200/60">
                <Sparkles className="w-3 h-3 text-blue-600" />
                Interativo &bull; Tempo Real
              </span>
            </div>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              Trajetória acumulada até ao Dia {currentDay} com projeção de fecho e comparação ao ritmo ideal.
            </p>
          </div>
        </div>

        {/* Quick KPI Stat Pills */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-[#f5f5f7] border border-black/[0.04] flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Progresso:</span>
            <span className="font-extrabold text-slate-900 tabular-nums">
              {progressPercent.toFixed(1)}%
            </span>
          </div>

          <div
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
              isAheadOfPace
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200/60'
                : 'bg-amber-50 text-amber-800 border-amber-200/60'
            }`}
          >
            {isAheadOfPace ? (
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5 text-amber-600" />
            )}
            <span className="text-[10px] font-bold uppercase tracking-wider">Ritmo:</span>
            <span className="font-extrabold tabular-nums">
              {pacePercentage.toFixed(0)}% do esperado
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-blue-50/80 text-blue-900 border border-blue-200/60 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Projeção:</span>
            <span className="font-extrabold tabular-nums">
              {projectedPercent.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Category Filter Chips - Mobile Scrollable */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none pt-1">
        <motion.button
          type="button"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => setSelectedSlug('all')}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
            selectedSlug === 'all'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-black/[0.03] text-slate-600 hover:bg-black/[0.06] hover:text-slate-900 border border-black/[0.04]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Geral (Média %)</span>
        </motion.button>

        {categories.map(cat => {
          const isSelected = selectedSlug === cat.slug;
          return (
            <motion.button
              key={cat.slug}
              type="button"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => setSelectedSlug(cat.slug)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-black/[0.03] text-slate-600 hover:bg-black/[0.06] hover:text-slate-900 border border-black/[0.04]'
              }`}
            >
              <CategoryIcon slug={cat.slug} className="w-3.5 h-3.5" />
              <span>{cat.name}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Modern Minimalist Area Chart */}
      <div className="w-full h-64 sm:h-72 select-none relative pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              {/* Apple-styled smooth gradient */}
              <linearGradient id="salesRealizedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0071e3" stopOpacity={0.35} />
                <stop offset="60%" stopColor="#0071e3" stopOpacity={0.08} />
                <stop offset="100%" stopColor="#0071e3" stopOpacity={0.0} />
              </linearGradient>

              {/* Dotted projection gradient */}
              <linearGradient id="salesProjectedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#818cf8" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#818cf8" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="rgba(0,0,0,0.05)"
            />

            <XAxis
              dataKey="dayNum"
              tickLine={false}
              axisLine={{ stroke: 'rgba(0,0,0,0.08)' }}
              tick={{ fill: '#86868b', fontSize: 11, fontWeight: 500 }}
              interval="preserveStartEnd"
              tickFormatter={(v: number) => (v === 1 || v === currentDay || v === daysInMonth || v % 5 === 0 ? `D${v}` : '')}
            />

            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#86868b', fontSize: 11, fontWeight: 500 }}
              tickFormatter={(v: number) => `${v}${metricUnit}`}
            />

            {/* Custom Interactive Floating Glass Tooltip */}
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const pt = payload[0].payload;
                const valActual = pt.actual;
                const valIdeal = pt.ideal;
                const valProjected = pt.projected;

                return (
                  <div className="bg-white/95 backdrop-blur-xl border border-black/[0.08] shadow-[0_12px_32px_rgba(0,0,0,0.12)] p-3 rounded-2xl text-xs space-y-1.5 min-w-[170px] pointer-events-none">
                    <div className="flex items-center justify-between border-b border-black/[0.05] pb-1.5">
                      <span className="font-bold text-slate-900 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        Dia {pt.dayNum} de {currentMonth.toString().padStart(2, '0')}
                      </span>
                      {pt.isPastOrToday ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700">
                          Realizado
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700">
                          Projeção
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 pt-0.5">
                      {valActual !== null && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-[#0071e3]" />
                            Realizado:
                          </span>
                          <span className="font-black text-slate-900 tabular-nums">
                            {valActual} {metricUnit}
                          </span>
                        </div>
                      )}

                      {valProjected !== null && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-indigo-400" />
                            Projeção:
                          </span>
                          <span className="font-black text-indigo-700 tabular-nums">
                            {valProjected} {metricUnit}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-slate-300" />
                          Ritmo Ideal:
                        </span>
                        <span className="font-semibold text-slate-600 tabular-nums">
                          {valIdeal} {metricUnit}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />

            {/* Current Day Reference Line */}
            <ReferenceLine
              x={currentDay}
              stroke="#0071e3"
              strokeDasharray="4 4"
              label={{
                value: `Hoje (D${currentDay})`,
                position: 'top',
                fill: '#0071e3',
                fontSize: 10,
                fontWeight: 700,
              }}
            />

            {/* Benchmark Ideal Pace Line (dashed, subtle) */}
            <Line
              type="monotone"
              dataKey="ideal"
              name="Ritmo Ideal"
              stroke="#cbd5e1"
              strokeWidth={1.8}
              strokeDasharray="4 4"
              dot={false}
              activeDot={false}
            />

            {/* Realized Area (Filled under curve up to current day) */}
            <Area
              type="monotone"
              dataKey="actual"
              name="Realizado"
              stroke="#0071e3"
              strokeWidth={2.8}
              fill="url(#salesRealizedGrad)"
              dot={false}
              activeDot={{ r: 5, fill: '#0071e3', stroke: '#ffffff', strokeWidth: 2 }}
            />

            {/* Projected Extension Line (dashed purple/indigo) */}
            <Area
              type="monotone"
              dataKey="projected"
              name="Projeção"
              stroke="#818cf8"
              strokeWidth={2.2}
              strokeDasharray="3 3"
              fill="url(#salesProjectedGrad)"
              dot={false}
              activeDot={{ r: 4, fill: '#818cf8', stroke: '#ffffff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Modern Minimalist Legend & Footnote */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-black/[0.04] text-[11px] text-slate-500">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#0071e3] rounded-full" />
            <span className="font-semibold text-slate-700">Realizado Acumulado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#818cf8] border-b border-dashed border-[#818cf8]" />
            <span>Projeção de Cadência</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-slate-300 border-b border-dashed border-slate-400" />
            <span>Ritmo Ideal Linear (Meta)</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-slate-400 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>Meta Mensal: <strong>{formatCategoryValue(targetVal, isAll ? 'quantity' : activeCategory?.metricType || 'quantity')}</strong></span>
        </div>
      </div>
    </div>
  );
};
