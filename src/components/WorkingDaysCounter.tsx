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
  CheckCircle2,
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
  const [customRefDate, setCustomRefDate] = useState<string>('');

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
      <div className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-600 text-white shadow-xs">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-slate-900">
                {scheduleStats.remainingWorkDays} {scheduleStats.remainingWorkDays === 1 ? 'Dia Útil' : 'Dias Úteis'} a Trabalhar
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                até ao fim de {capitalizedMonth}
              </span>
            </div>
            <p className="text-[11px] text-slate-600">
              {scheduleStats.pastWorkedDays} de {scheduleStats.totalMonthWorkDays} dias de trabalho decorridos ({scheduleStats.progressWorkDaysPercent}%) &bull; {scheduleStats.remainingOffDays} folgas restantes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 shrink-0">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100/80 text-amber-900 text-[10px] font-bold border border-amber-200">
            <Sun className="w-3 h-3 text-amber-600" /> {scheduleStats.remainingAberturaDays} Abertura
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-100/80 text-indigo-900 text-[10px] font-bold border border-indigo-200">
            <Moon className="w-3 h-3 text-indigo-600" /> {scheduleStats.remainingFechoDays} Fecho
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-blue-200/90 bg-gradient-to-b from-white to-blue-50/30 p-5 shadow-2xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-xs">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Contador de Dias Úteis & Escala de Trabalho
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                {capitalizedMonth} / {currentYear}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Cálculo baseado no calendário mensal de escalas, turnos e folgas{sellerName ? ` de ${sellerName}` : ''}.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Calendar className="w-3.5 h-3.5 text-blue-600" />
          <span>
            Ref.: <strong>Dia {refDay} de {capitalizedMonth}</strong>
          </span>
        </div>
      </div>

      {/* Main Grid of Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 my-4">
        {/* Card 1: Dias Úteis Restantes a Trabalhar */}
        <div className="p-4 rounded-xl bg-blue-600 text-white shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-100">
              Dias a Trabalhar
            </span>
            <span className="p-1 rounded-md bg-white/20 text-white">
              <Clock className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="my-2">
            <div className="text-3xl font-black tracking-tight flex items-baseline gap-1.5">
              {scheduleStats.hasSchedule ? scheduleStats.remainingWorkDays : '--'}
              <span className="text-xs font-semibold text-blue-200">
                {scheduleStats.remainingWorkDays === 1 ? 'dia útil restante' : 'dias úteis restantes'}
              </span>
            </div>
            <p className="text-[11px] text-blue-100 mt-1">
              Até ao término do mês ({scheduleStats.totalMonthDays} de {capitalizedMonth})
            </p>
          </div>
          <div className="pt-2 border-t border-blue-500/50 flex items-center justify-between text-[10px] text-blue-100">
            <span>{scheduleStats.remainingCalendarDays} dias corridos restantes</span>
            <span>{isEndOfMonth ? 'Mês Concluído' : 'Em Andamento'}</span>
          </div>
        </div>

        {/* Card 2: Total de Dias de Trabalho */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Trabalho no Mês
            </span>
            <span className="p-1 rounded-md bg-slate-100 text-slate-600">
              <Briefcase className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-slate-900 flex items-baseline gap-1.5">
              {scheduleStats.hasSchedule ? scheduleStats.totalMonthWorkDays : '--'}
              <span className="text-xs font-bold text-slate-400">dias escalados</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              <strong>{scheduleStats.pastWorkedDays}</strong> dias decorridos &bull; <strong>{scheduleStats.remainingWorkDays}</strong> por cumprir
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
            <span>Ritmo mensal</span>
            <span className="font-bold text-blue-600">{scheduleStats.progressWorkDaysPercent}% cumprido</span>
          </div>
        </div>

        {/* Card 3: Folgas Restantes e Totais */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Dias de Folga
            </span>
            <span className="p-1 rounded-md bg-amber-50 text-amber-600 border border-amber-100">
              <Coffee className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-amber-700 flex items-baseline gap-1.5">
              {scheduleStats.hasSchedule ? scheduleStats.remainingOffDays : '--'}
              <span className="text-xs font-bold text-slate-400">folgas restantes</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Total do mês: <strong>{scheduleStats.totalMonthOffDays} folgas</strong> ({scheduleStats.pastOffDays} já gozadas)
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
            <span>Descanso programado</span>
            <span className="font-bold text-amber-700">
              {scheduleStats.totalMonthDays > 0 ? ((scheduleStats.totalMonthOffDays / scheduleStats.totalMonthDays) * 100).toFixed(0) : 0}% do mês
            </span>
          </div>
        </div>

        {/* Card 4: Detalhe de Turnos Restantes (Abertura / Fecho) */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Turnos por Cumprir
            </span>
            <span className="p-1 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100">
              <TrendingUp className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="my-2 space-y-2">
            <div className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-amber-50/70 border border-amber-200/70">
              <span className="flex items-center gap-1 font-bold text-amber-900">
                <Sun className="w-3 h-3 text-amber-600" /> Abertura (09:30-18:30)
              </span>
              <span className="font-black text-amber-950">
                {scheduleStats.remainingAberturaDays} <span className="text-[10px] font-normal text-amber-800">/ {scheduleStats.totalAberturaDays}</span>
              </span>
            </div>

            <div className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-indigo-50/70 border border-indigo-200/70">
              <span className="flex items-center gap-1 font-bold text-indigo-900">
                <Moon className="w-3 h-3 text-indigo-600" /> Fecho (11:30-20:30)
              </span>
              <span className="font-black text-indigo-950">
                {scheduleStats.remainingFechoDays} <span className="text-[10px] font-normal text-indigo-800">/ {scheduleStats.totalFechoDays}</span>
              </span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span>Distribuição de horários</span>
            <span className="text-slate-600 font-semibold">
              {scheduleStats.remainingAberturaDays + scheduleStats.remainingFechoDays} turnos restantes
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar of Work Days in the Month */}
      <div className="mt-4 pt-3 border-t border-slate-100">
        <div className="flex items-center justify-between text-xs mb-1.5 font-semibold text-slate-700">
          <span className="flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-blue-600" />
            Progresso da Escala de Trabalho ({scheduleStats.pastWorkedDays} de {scheduleStats.totalMonthWorkDays} dias trabalhados)
          </span>
          <span className="font-bold text-slate-900">{scheduleStats.progressWorkDaysPercent}%</span>
        </div>
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-blue-600 transition-all duration-500 rounded-full"
            style={{ width: `${Math.min(scheduleStats.progressWorkDaysPercent, 100)}%` }}
            title={`Dias trabalhados: ${scheduleStats.pastWorkedDays}`}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
          <span>Início do Mês (Dia 01)</span>
          <span className="text-blue-600 font-bold">Faltam {scheduleStats.remainingWorkDays} dias úteis</span>
          <span>Fim do Mês (Dia {scheduleStats.totalMonthDays})</span>
        </div>
      </div>
    </div>
  );
};
