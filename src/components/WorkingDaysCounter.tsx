import React, { useState } from 'react';
import { ScheduleCalculation } from '../types';
import {
  Briefcase,
  Clock,
  Coffee,
  Sun,
  Moon,
  Calendar,
  CalendarDays,
  TrendingUp,
  Info,
} from 'lucide-react';

interface WorkingDaysCounterProps {
  scheduleStats: ScheduleCalculation;
  currentMonth: number;
  currentYear: number;
  sellerName?: string;
  onReferenceDateChange?: (newRefDate: string) => void;
  compact?: boolean;
}

export const WorkingDaysCounter: React.FC<WorkingDaysCounterProps> = ({
  scheduleStats,
  currentMonth,
  currentYear,
  sellerName,
  compact = false,
}) => {
  const monthName = new Date(currentYear, currentMonth - 1, 1).toLocaleDateString('pt-PT', {
    month: 'long',
  });
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  // Parse reference date for nice display
  const refParts = scheduleStats.referenceDateStr.split('-');
  const refDay = parseInt(refParts[2], 10) || 1;
  const isEndOfMonth = scheduleStats.remainingWorkDays === 0 && scheduleStats.totalMonthWorkDays > 0;

  if (compact) {
    return (
      <div className="rounded-2xl bg-[#f5f5f7] border border-black/[0.04] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#0071e3] text-white shadow-xs">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900 tabular-nums">
                {scheduleStats.remainingWorkDays} {scheduleStats.remainingWorkDays === 1 ? 'Dia Útil' : 'Dias Úteis'} a Trabalhar
              </span>
              <span className="text-[10px] text-slate-400 font-normal">
                até ao fim de {capitalizedMonth}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-normal tabular-nums">
              {scheduleStats.pastWorkedDays} de {scheduleStats.totalMonthWorkDays} dias de trabalho decorridos ({scheduleStats.progressWorkDaysPercent}%) &bull; {scheduleStats.remainingOffDays} folgas restantes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 shrink-0">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200/60 tabular-nums">
            <Sun className="w-3 h-3 text-amber-600" /> {scheduleStats.remainingAberturaDays} Abertura
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-800 text-[10px] font-bold border border-indigo-200/60 tabular-nums">
            <Moon className="w-3 h-3 text-indigo-600" /> {scheduleStats.remainingFechoDays} Fecho
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-black/[0.05] bg-white/90 backdrop-blur-xl p-6 sm:p-7 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-black/[0.04]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-black/[0.03] text-slate-800 border border-black/[0.04]">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Contador de Dias Úteis & Escala de Trabalho
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-black/[0.04] text-slate-600 border border-black/[0.04]">
                {capitalizedMonth} / {currentYear}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-normal">
              Cálculo em tempo real baseado no calendário mensal de escalas, turnos e folgas{sellerName ? ` de ${sellerName}` : ''}.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>
            Ref.: <strong className="text-slate-800 font-semibold">Dia {refDay} de {capitalizedMonth}</strong>
          </span>
        </div>
      </div>

      {/* Main Grid of Bento Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 my-5">
        {/* Card 1: Dias Úteis Restantes a Trabalhar (Apple Blue Tile) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#0071e3] text-white shadow-[0_4px_16px_rgba(0,113,227,0.2)] relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-100">
              Dias a Trabalhar
            </span>
            <span className="p-1 rounded-lg bg-white/20 text-white">
              <Clock className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="my-2.5">
            <div className="text-3xl sm:text-4xl font-black tracking-tight flex items-baseline gap-1.5 tabular-nums">
              {scheduleStats.hasSchedule ? scheduleStats.remainingWorkDays : '--'}
              <span className="text-xs font-medium text-blue-100">
                {scheduleStats.remainingWorkDays === 1 ? 'dia útil restante' : 'dias úteis restantes'}
              </span>
            </div>
            <p className="text-[11px] text-blue-100 mt-1 font-normal">
              Até ao término do mês ({scheduleStats.totalMonthDays} de {capitalizedMonth})
            </p>
          </div>
          <div className="pt-2 border-t border-white/20 flex items-center justify-between text-[10px] text-blue-100">
            <span>{scheduleStats.remainingCalendarDays} dias corridos restantes</span>
            <span className="font-semibold">{isEndOfMonth ? 'Mês Concluído' : 'Em Andamento'}</span>
          </div>
        </div>

        {/* Card 2: Total de Dias de Trabalho */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#f5f5f7] border border-black/[0.03] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total Trabalho no Mês
            </span>
            <span className="p-1 rounded-lg bg-white text-slate-600 border border-black/[0.05]">
              <Briefcase className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="my-2.5">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 flex items-baseline gap-1.5 tabular-nums">
              {scheduleStats.hasSchedule ? scheduleStats.totalMonthWorkDays : '--'}
              <span className="text-xs font-medium text-slate-400">dias escalados</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-normal tabular-nums">
              <strong>{scheduleStats.pastWorkedDays}</strong> dias decorridos &bull; <strong>{scheduleStats.remainingWorkDays}</strong> por cumprir
            </p>
          </div>
          <div className="pt-2 border-t border-black/[0.04] flex items-center justify-between text-[10px] text-slate-500">
            <span>Ritmo mensal</span>
            <span className="font-bold text-[#0071e3] tabular-nums">{scheduleStats.progressWorkDaysPercent}% cumprido</span>
          </div>
        </div>

        {/* Card 3: Folgas Restantes e Totais */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#f5f5f7] border border-black/[0.03] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Dias de Folga
            </span>
            <span className="p-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/60">
              <Coffee className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="my-2.5">
            <div className="text-2xl sm:text-3xl font-black text-amber-800 flex items-baseline gap-1.5 tabular-nums">
              {scheduleStats.hasSchedule ? scheduleStats.remainingOffDays : '--'}
              <span className="text-xs font-medium text-slate-400">folgas restantes</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-normal tabular-nums">
              Total do mês: <strong>{scheduleStats.totalMonthOffDays} folgas</strong> ({scheduleStats.pastOffDays} gozadas)
            </p>
          </div>
          <div className="pt-2 border-t border-black/[0.04] flex items-center justify-between text-[10px] text-slate-500">
            <span>Descanso programado</span>
            <span className="font-bold text-amber-800 tabular-nums">
              {scheduleStats.totalMonthDays > 0 ? ((scheduleStats.totalMonthOffDays / scheduleStats.totalMonthDays) * 100).toFixed(0) : 0}% do mês
            </span>
          </div>
        </div>

        {/* Card 4: Detalhe de Turnos Restantes (Abertura / Fecho) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#f5f5f7] border border-black/[0.03] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Turnos por Cumprir
            </span>
            <span className="p-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/60">
              <TrendingUp className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="my-2 space-y-2">
            <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-amber-50/70 border border-amber-200/50">
              <span className="flex items-center gap-1.5 font-bold text-amber-900">
                <Sun className="w-3 h-3 text-amber-600" /> Abertura (09:30-18:30)
              </span>
              <span className="font-black text-amber-950 tabular-nums">
                {scheduleStats.remainingAberturaDays} <span className="text-[10px] font-normal text-amber-800">/ {scheduleStats.totalAberturaDays}</span>
              </span>
            </div>

            <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-indigo-50/70 border border-indigo-200/50">
              <span className="flex items-center gap-1.5 font-bold text-indigo-900">
                <Moon className="w-3 h-3 text-indigo-600" /> Fecho (11:30-20:30)
              </span>
              <span className="font-black text-indigo-950 tabular-nums">
                {scheduleStats.remainingFechoDays} <span className="text-[10px] font-normal text-indigo-800">/ {scheduleStats.totalFechoDays}</span>
              </span>
            </div>
          </div>
          <div className="pt-2 border-t border-black/[0.04] flex items-center justify-between text-[10px] text-slate-400">
            <span>Distribuição de horários</span>
            <span className="text-slate-600 font-medium tabular-nums">
              {scheduleStats.remainingAberturaDays + scheduleStats.remainingFechoDays} turnos restantes
            </span>
          </div>
        </div>
      </div>

      {/* Apple-style Progress Bar */}
      <div className="mt-4 pt-3 border-t border-black/[0.04]">
        <div className="flex items-center justify-between text-xs mb-1.5 font-semibold text-slate-700">
          <span className="flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-[#0071e3]" />
            Progresso da Escala de Trabalho ({scheduleStats.pastWorkedDays} de {scheduleStats.totalMonthWorkDays} dias trabalhados)
          </span>
          <span className="font-bold text-slate-900 tabular-nums">{scheduleStats.progressWorkDaysPercent}%</span>
        </div>
        <div className="w-full h-2 bg-black/[0.05] rounded-full overflow-hidden p-[1px]">
          <div
            className="h-full bg-[#0071e3] transition-all duration-500 rounded-full"
            style={{ width: `${Math.min(scheduleStats.progressWorkDaysPercent, 100)}%` }}
            title={`Dias trabalhados: ${scheduleStats.pastWorkedDays}`}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5">
          <span>Início do Mês (Dia 01)</span>
          <span className="text-[#0071e3] font-bold tabular-nums">Faltam {scheduleStats.remainingWorkDays} dias úteis</span>
          <span>Fim do Mês (Dia {scheduleStats.totalMonthDays})</span>
        </div>
      </div>

      {/* Dynamic Daily Goal Formula Notice */}
      <div className="mt-4 pt-3 border-t border-black/[0.04] flex items-center justify-between gap-2 text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5 font-normal">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>
            <strong className="text-slate-700">Fórmula da Meta Diária Dinâmica:</strong> Valor restante em falta ÷ {scheduleStats.remainingWorkDays} dias úteis a trabalhar até ao término do mês.
          </span>
        </div>
        <span className="text-[10px] font-bold text-slate-600 bg-black/[0.04] px-2.5 py-0.5 rounded-full shrink-0">
          Atualização Contínua
        </span>
      </div>
    </div>
  );
};
