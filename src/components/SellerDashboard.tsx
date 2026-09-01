import React from 'react';
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
import {
  Calendar,
  Clock,
  Coffee,
  Briefcase,
  TrendingUp,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Check,
  ChevronRight,
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
      {/* Top Banner: Profile & Working Days Summary */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Seller Identity & Overall Progress */}
          <div className="flex items-center gap-4">
            <img
              src={seller.avatar}
              alt={seller.name}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-blue-500/20 shadow-xs shrink-0"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">{seller.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {seller.storeName || 'Loja Centro - 01'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Acompanhamento e Gestão de Metas &bull; Mês de Referência: {currentMonth.toString().padStart(2, '0')}/{currentYear}
              </p>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Dias de Trabalho</span>
              <div className="text-base font-black text-slate-800 flex items-center justify-center gap-1 mt-0.5">
                <Briefcase className="w-4 h-4 text-blue-600" />
                {scheduleStats.hasSchedule ? scheduleStats.totalMonthWorkDays : '--'}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Dias Restantes</span>
              <div className="text-base font-black text-blue-600 flex items-center justify-center gap-1 mt-0.5">
                <Clock className="w-4 h-4 text-blue-600" />
                {scheduleStats.hasSchedule ? `${scheduleStats.remainingWorkDays} d` : '--'}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Dias de Folga</span>
              <div className="text-base font-black text-amber-700 flex items-center justify-center gap-1 mt-0.5">
                <Coffee className="w-4 h-4 text-amber-600" />
                {scheduleStats.hasSchedule ? `${scheduleStats.totalMonthOffDays} d` : '--'}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
              <span className="text-[10px] font-bold text-emerald-800 uppercase">Metas Atingidas</span>
              <div className="text-base font-black text-emerald-700 flex items-center justify-center gap-1 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
                {reachedCount} de {categories.length}
              </div>
            </div>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className="text-slate-700 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Média Geral de Cumprimento de Metas
            </span>
            <span className="text-slate-900 font-bold text-sm">{overallProgressPercentage}%</span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
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
      </div>

      {/* Working Days & Schedule Counter Component */}
      <WorkingDaysCounter
        scheduleStats={scheduleStats}
        currentMonth={currentMonth}
        currentYear={currentYear}
        sellerName={seller.name}
      />

      {/* 6 Category Cards Grid */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Modalidades e Serviços ({categories.length})
            </h2>
            <p className="text-xs text-slate-500">
              Acompanhamento de metas mensais e diárias com atualização de resultados em tempo real.
            </p>
          </div>

          <button
            onClick={onOpenDailyEntry}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-xs font-bold text-white hover:bg-blue-700 active:scale-95 transition shadow-sm self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Atualizar Resultado
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {categories.map(cat => {
            const calc = catCalcs[cat.slug];
            return <CategoryCard key={cat.slug} calc={calc} />;
          })}
        </div>
      </div>

      {/* Atualização do Resultado (Substitui o antigo Histórico de Lançamentos) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs space-y-5">
        {/* Panel Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Atualização do Resultado</h3>
              <p className="text-xs text-slate-500">
                O resultado atualizado mais recente substitui os resultados anteriores do mês para manter o quadro consolidado.
              </p>
            </div>
          </div>

          <button
            onClick={onOpenDailyEntry}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-xs font-bold text-white hover:bg-blue-700 active:scale-95 transition shadow-sm self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Fazer Nova Atualização do Resultado
          </button>
        </div>

        {/* Current Consolidated Snapshot */}
        {latestUpdate ? (
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-200/60">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800">
                  <Check className="w-3 h-3" /> Resultado Vigente do Mês
                </span>
                <span className="text-xs text-slate-500">
                  Referência: <strong className="text-slate-800">{new Date(`${latestUpdate.date}T00:00:00`).toLocaleDateString('pt-PT')}</strong>
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Última atualização: {new Date(latestUpdate.updatedAt || latestUpdate.createdAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Values Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {categories.map(cat => {
                const val = latestUpdate.values[cat.slug] || 0;
                const cCalc = catCalcs[cat.slug];
                return (
                  <div key={cat.slug} className="bg-white p-3 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                      <CategoryIcon slug={cat.slug} className="w-3.5 h-3.5 text-blue-600" />
                      <span className="text-[10px] font-bold truncate">{cat.name}</span>
                    </div>
                    <div className="text-sm font-black text-slate-900">
                      {formatCategoryValue(val, cat.metricType)}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Meta: {cCalc.monthlyGoal !== null ? formatCategoryValue(cCalc.monthlyGoal, cat.metricType) : '--'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
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
            <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">
              Histórico de Atualizações de Resultado
            </h4>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3 font-bold">Data de Referência</th>
                    <th className="py-2.5 px-2 font-bold">Plus+Master</th>
                    <th className="py-2.5 px-2 font-bold">Plus</th>
                    <th className="py-2.5 px-2 font-bold">Megas</th>
                    <th className="py-2.5 px-2 font-bold">DM Clássicas</th>
                    <th className="py-2.5 px-2 font-bold">Dimobilli</th>
                    <th className="py-2.5 px-2 font-bold">Películas</th>
                    <th className="py-2.5 px-3 font-bold text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sellerUpdates.map((update, idx) => (
                    <tr key={update.id} className={`hover:bg-slate-50 transition ${idx === 0 ? 'bg-blue-50/20' : ''}`}>
                      <td className="py-2.5 px-3 font-bold text-slate-800">
                        {new Date(`${update.date}T00:00:00`).toLocaleDateString('pt-PT')}
                        {idx === 0 && (
                          <span className="ml-2 px-1.5 py-0.5 text-[9px] font-bold bg-blue-100 text-blue-800 rounded">
                            Ativo
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 font-medium text-slate-700">
                        {formatCategoryValue(update.values.plus_master || 0, 'currency')}
                      </td>
                      <td className="py-2.5 px-2 font-medium text-slate-700">
                        {formatCategoryValue(update.values.plus || 0, 'currency')}
                      </td>
                      <td className="py-2.5 px-2 font-medium text-slate-700">
                        {formatCategoryValue(update.values.megas_total || 0, 'currency')}
                      </td>
                      <td className="py-2.5 px-2 font-medium text-slate-700">
                        {formatCategoryValue(update.values.dm_classicas || 0, 'currency')}
                      </td>
                      <td className="py-2.5 px-2 font-medium text-slate-700">
                        {formatCategoryValue(update.values.dimobilli || 0, 'unit')}
                      </td>
                      <td className="py-2.5 px-2 font-medium text-slate-700">
                        {formatCategoryValue(update.values.peliculas || 0, 'unit')}
                      </td>
                      <td className="py-2.5 px-3 text-right text-[11px] text-slate-400">
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
