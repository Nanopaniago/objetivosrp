import React from 'react';
import { motion } from 'motion/react';
import {
  User,
  GoalCategory,
  MonthlyGoal,
  DailyEntry,
  WorkSchedule,
} from '../types';
import { calculateSellerPerformanceSummary, formatCategoryValue } from '../utils/calculations';
import { CategoryCard } from './CategoryCard';
import { WorkingDaysCounter } from './WorkingDaysCounter';
import { EvolutionChart } from './EvolutionChart';
import {
  Calendar,
  Clock,
  Coffee,
  Briefcase,
  TrendingUp,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Check,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { CategoryIcon } from './CategoryIcon';

interface SellerDashboardProps {
  seller: User;
  currentMonth: number;
  currentYear: number;
  categories: GoalCategory[];
  goals: MonthlyGoal[];
  entries: DailyEntry[];
  schedules: WorkSchedule[];
  onOpenDailyEntry: () => void;
}

export const SellerDashboard: React.FC<SellerDashboardProps> = ({
  seller,
  currentMonth,
  currentYear,
  categories,
  goals,
  entries,
  schedules,
  onOpenDailyEntry,
}) => {
  const summary = calculateSellerPerformanceSummary(
    seller,
    currentMonth,
    currentYear,
    categories,
    goals,
    entries,
    schedules
  );

  const { scheduleStats, categories: catCalcs, overallProgressPercentage } = summary;

  // Filter updates for this seller and this month
  const sellerUpdates = entries
    .filter(e => {
      if (e.sellerId !== seller.id) return false;
      const [y, m] = e.date.split('-').map(Number);
      return y === currentYear && m === currentMonth;
    })
    .sort((a, b) => {
      const timeA = a.updatedAt || a.createdAt || `${a.date}T00:00:00Z`;
      const timeB = b.updatedAt || b.createdAt || `${b.date}T00:00:00Z`;
      return timeB.localeCompare(timeA);
    });

  const latestUpdate = sellerUpdates[0];
  const reachedCount = Object.values(catCalcs).filter(c => c.isGoalReached).length;

  return (
    <div className="space-y-6">
      {/* Top Banner: Apple-styled Bento Stage with Profile & Working Days Summary */}
      <div className="rounded-3xl border border-black/[0.05] bg-white/90 backdrop-blur-xl p-6 sm:p-8 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Seller Identity & Overall Progress */}
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative shrink-0">
              <img
                src={seller.avatar}
                alt={seller.name}
                className="w-16 h-16 sm:w-18 sm:h-18 rounded-3xl object-cover border border-black/[0.08] shadow-sm"
              />
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{seller.name}</h1>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-black/[0.04] text-slate-700 border border-black/[0.05]">
                  {seller.storeName || 'Loja Centro - 01'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-normal">
                Desempenho Comercial Individual &bull; Mês de Referência: {currentMonth.toString().padStart(2, '0')}/{currentYear}
              </p>
            </div>
          </div>

          {/* Quick Bento Stats Grid (Apple style clean tiles with interactive animations) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <motion.div
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.96 }}
              className="p-3.5 rounded-2xl bg-[#f5f5f7] hover:bg-slate-100/80 border border-black/[0.03] text-center transition cursor-default"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Dias de Trabalho</span>
              <div className="text-base font-black text-slate-900 flex items-center justify-center gap-1.5 mt-0.5 tabular-nums">
                <motion.span whileHover={{ rotate: 12 }}>
                  <Briefcase className="w-4 h-4 text-slate-600" />
                </motion.span>
                {scheduleStats.hasSchedule ? scheduleStats.totalMonthWorkDays : '--'}
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.96 }}
              className="p-3.5 rounded-2xl bg-blue-50/60 hover:bg-blue-50 border border-blue-100/60 text-center transition cursor-default"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0071e3] block">Dias Restantes</span>
              <div className="text-base font-black text-[#0071e3] flex items-center justify-center gap-1.5 mt-0.5 tabular-nums">
                <motion.span whileHover={{ rotate: 180 }} transition={{ duration: 0.4 }}>
                  <Clock className="w-4 h-4 text-[#0071e3]" />
                </motion.span>
                {scheduleStats.hasSchedule ? `${scheduleStats.remainingWorkDays} d` : '--'}
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.96 }}
              className="p-3.5 rounded-2xl bg-amber-50/60 hover:bg-amber-50 border border-amber-100/60 text-center transition cursor-default"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">Dias de Folga</span>
              <div className="text-base font-black text-amber-800 flex items-center justify-center gap-1.5 mt-0.5 tabular-nums">
                <motion.span whileHover={{ rotate: [0, -10, 10, 0] }}>
                  <Coffee className="w-4 h-4 text-amber-600" />
                </motion.span>
                {scheduleStats.hasSchedule ? `${scheduleStats.totalMonthOffDays} d` : '--'}
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.96 }}
              className="p-3.5 rounded-2xl bg-emerald-50/80 hover:bg-emerald-50 border border-emerald-200/60 text-center transition cursor-default"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">Metas Atingidas</span>
              <div className="text-base font-black text-emerald-700 flex items-center justify-center gap-1.5 mt-0.5 tabular-nums">
                <motion.span whileHover={{ scale: 1.25 }}>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </motion.span>
                {reachedCount} de {categories.length}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Global Progress Bar (Apple Activity Ring / Bar) */}
        <div className="mt-6 pt-5 border-t border-black/[0.04]">
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className="text-slate-700 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[#0071e3]" />
              Média Geral de Cumprimento de Metas
            </span>
            <span className="text-slate-900 font-black text-sm tabular-nums">{overallProgressPercentage}%</span>
          </div>
          <div className="w-full h-3 bg-black/[0.05] rounded-full overflow-hidden p-[1px]">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
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
      </div>

      {/* Working Days & Schedule Counter Component */}
      <WorkingDaysCounter
        scheduleStats={scheduleStats}
        currentMonth={currentMonth}
        currentYear={currentYear}
        sellerName={seller.name}
      />

      {/* Gráfico de Evolução com Aparência Moderna & Minimalista */}
      <EvolutionChart
        seller={seller}
        currentMonth={currentMonth}
        currentYear={currentYear}
        categories={categories}
        goals={goals}
        entries={entries}
        schedules={schedules}
      />

      {/* 6 Category Cards Bento Grid */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Modalidades e Serviços ({categories.length})
            </h2>
            <p className="text-xs text-slate-500 font-normal">
              Acompanhamento de metas mensais e diárias com atualização de resultados em tempo real.
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            onClick={onOpenDailyEntry}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#0071e3] text-xs font-bold text-white hover:bg-[#0077ed] transition shadow-sm self-start sm:self-auto cursor-pointer group"
          >
            <RefreshCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />
            Atualizar Resultado
          </motion.button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {categories.map(cat => {
            const calc = catCalcs[cat.slug];
            return <CategoryCard key={cat.slug} calc={calc} />;
          })}
        </div>
      </div>

      {/* Atualização do Resultado (Substitui o antigo Histórico de Lançamentos) */}
      <div className="rounded-3xl border border-black/[0.05] bg-white/90 backdrop-blur-xl p-6 sm:p-8 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)] space-y-6">
        {/* Panel Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-black/[0.04]">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-black/[0.03] text-slate-800 border border-black/[0.04]">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Atualização do Resultado</h3>
              <p className="text-xs text-slate-500 font-normal">
                O resultado atualizado mais recente substitui os resultados anteriores do mês para manter o quadro consolidado.
              </p>
            </div>
          </div>

          <button
            onClick={onOpenDailyEntry}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-900 text-xs font-bold text-white hover:bg-black active:scale-95 transition shadow-sm self-start sm:self-auto cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Fazer Nova Atualização do Resultado
          </button>
        </div>

        {/* Current Consolidated Snapshot */}
        {latestUpdate ? (
          <div className="bg-[#f5f5f7] rounded-3xl p-5 border border-black/[0.03]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-black/[0.04]">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  <Check className="w-3.5 h-3.5" /> Resultado Vigente do Mês
                </span>
                <span className="text-xs text-slate-500">
                  Referência: <strong className="text-slate-800">{new Date(`${latestUpdate.date}T00:00:00`).toLocaleDateString('pt-PT')}</strong>
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Última atualização: {new Date(latestUpdate.updatedAt || latestUpdate.createdAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Values Bento Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {categories.map(cat => {
                const val = latestUpdate.values[cat.slug] || 0;
                const cCalc = catCalcs[cat.slug];
                return (
                  <div key={cat.slug} className="bg-white/90 backdrop-blur-sm p-3.5 rounded-2xl border border-black/[0.05] shadow-2xs">
                    <div className="flex items-center gap-1.5 text-slate-500 mb-1.5">
                      <CategoryIcon slug={cat.slug} className="w-3.5 h-3.5 text-[#0071e3]" />
                      <span className="text-[11px] font-bold truncate text-slate-700">{cat.name}</span>
                    </div>
                    <div className="text-sm font-black text-slate-900 tabular-nums">
                      {formatCategoryValue(val, cat.metricType)}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 tabular-nums">
                      Meta: {cCalc.monthlyGoal !== null ? formatCategoryValue(cCalc.monthlyGoal, cat.metricType) : '--'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="py-10 text-center bg-[#f5f5f7] rounded-3xl border border-dashed border-black/[0.08]">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">Nenhum resultado registado ainda para este mês.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Clique em "Fazer Nova Atualização do Resultado" para registar o ponto de situação de vendas.
            </p>
          </div>
        )}

        {/* History of Result Updates Log */}
        {sellerUpdates.length > 0 && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Histórico de Atualizações de Resultado
            </h4>
            <div className="overflow-x-auto rounded-2xl border border-black/[0.06] bg-white">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#f5f5f7] border-b border-black/[0.04] text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4 font-bold">Data de Referência</th>
                    <th className="py-3 px-2 font-bold">Plus+Master</th>
                    <th className="py-3 px-2 font-bold">Plus</th>
                    <th className="py-3 px-2 font-bold">Megas</th>
                    <th className="py-3 px-2 font-bold">DM Clássicas</th>
                    <th className="py-3 px-2 font-bold">Dimobilli</th>
                    <th className="py-3 px-2 font-bold">Películas</th>
                    <th className="py-3 px-4 font-bold text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04]">
                  {sellerUpdates.map((update, idx) => (
                    <tr key={update.id} className={`hover:bg-black/[0.02] transition ${idx === 0 ? 'bg-blue-50/20' : ''}`}>
                      <td className="py-3 px-4 font-bold text-slate-900 tabular-nums">
                        {new Date(`${update.date}T00:00:00`).toLocaleDateString('pt-PT')}
                        {idx === 0 && (
                          <span className="ml-2 px-2 py-0.5 text-[10px] font-bold bg-[#0071e3]/10 text-[#0071e3] rounded-full">
                            Ativo
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2 font-medium text-slate-700 tabular-nums">
                        {formatCategoryValue(update.values.plus_master || 0, 'currency')}
                      </td>
                      <td className="py-3 px-2 font-medium text-slate-700 tabular-nums">
                        {formatCategoryValue(update.values.plus || 0, 'currency')}
                      </td>
                      <td className="py-3 px-2 font-medium text-slate-700 tabular-nums">
                        {formatCategoryValue(update.values.megas_total || 0, 'currency')}
                      </td>
                      <td className="py-3 px-2 font-medium text-slate-700 tabular-nums">
                        {formatCategoryValue(update.values.dm_classicas || 0, 'currency')}
                      </td>
                      <td className="py-3 px-2 font-medium text-slate-700 tabular-nums">
                        {formatCategoryValue(update.values.dimobilli || 0, 'unit')}
                      </td>
                      <td className="py-3 px-2 font-medium text-slate-700 tabular-nums">
                        {formatCategoryValue(update.values.peliculas || 0, 'unit')}
                      </td>
                      <td className="py-3 px-4 text-right text-[11px] text-slate-400">
                        {idx === 0 ? (
                          <span className="text-emerald-600 font-bold">Vigente (substitui anteriores)</span>
                        ) : (
                          <span className="text-slate-400">Substituído</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
