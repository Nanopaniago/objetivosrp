import React, { useState } from 'react';
import { ScheduleCalculation } from '../types';
import { useTheme } from '../context/ThemeContext';
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
  const { isDark } = useTheme();
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
      <div
        className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
          isDark
            ? 'bg-[#0f172a] border-white/[0.08] text-white'
            : 'bg-white border-slate-200/80 text-black shadow-2xs'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-xs">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-black tabular-nums ${isDark ? 'text-white' : 'text-black'}`}>
                {scheduleStats.remainingWorkDays} {scheduleStats.remainingWorkDays === 1 ? 'Dia Útil' : 'Dias Úteis'} a Trabalhar
              </span>
              <span className="text-[10px] text-slate-400 font-normal">
                até ao fim de {capitalizedMonth}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-normal tabular-nums">
              {scheduleStats.pastWorkedDays} de {scheduleStats.totalMonthWorkDays} dias de trabalho decorridos ({scheduleStats.progressWorkDaysPercent}%) &bull; {scheduleStats.remainingOffDays} folgas restantes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold shrink-0">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-500 text-[10px] font-bold border border-amber-500/30 tabular-nums">
            <Sun className="w-3 h-3 text-amber-500" /> {scheduleStats.remainingAberturaDays} Abertura
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-400 text-[10px] font-bold border border-indigo-500/30 tabular-nums">
            <Moon className="w-3 h-3 text-indigo-400" /> {scheduleStats.remainingFechoDays} Fecho
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-3xl border p-6 sm:p-7 transition-all shadow-sm ${
        isDark
          ? 'bg-[#0f172a] border-white/[0.08] text-white shadow-[0_4px_24px_rgba(0,0,0,0.4)]'
          : 'bg-white border-slate-200/80 text-black shadow-[0_4px_24px_rgba(0,0,0,0.03)]'
      }`}
    >
      {/* Header */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b ${
          isDark ? 'border-white/[0.08]' : 'border-slate-200/80'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-2xl border ${
              isDark
                ? 'bg-blue-600/15 text-blue-400 border-blue-500/30'
                : 'bg-blue-50 text-blue-600 border-blue-100'
            }`}
          >
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-black'}`}>
                Contador de Dias Úteis & Escala de Trabalho
              </h3>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  isDark
                    ? 'bg-white/[0.05] text-slate-300 border-white/[0.08]'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {capitalizedMonth} / {currentYear}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-normal">
              Cálculo em tempo real baseado no calendário mensal de escalas, turnos e folgas{sellerName ? ` de ${sellerName}` : ''}.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>
            Ref.: <strong className={`font-semibold ${isDark ? 'text-white' : 'text-black'}`}>Dia {refDay} de {capitalizedMonth}</strong>
          </span>
        </div>
      </div>

      {/* Main Grid of Bento Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-5">
        {/* Card 1: Dias Úteis Restantes a Trabalhar (Apple Blue Tile) */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/25 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-100">
              Dias a Trabalhar
            </span>
            <span className="p-1.5 rounded-xl bg-white/20 text-white">
              <Clock className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="my-3">
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
            <span className="font-bold">{isEndOfMonth ? 'Mês Concluído' : 'Em Andamento'}</span>
          </div>
        </div>

        {/* Card 2: Total de Dias de Trabalho */}
        <div
          className={`p-5 rounded-2xl border flex flex-col justify-between transition-colors ${
            isDark
              ? 'bg-[#131d33] border-white/[0.08]'
              : 'bg-slate-50/80 border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total Trabalho no Mês
            </span>
            <span
              className={`p-1.5 rounded-xl border ${
                isDark ? 'bg-white/[0.05] text-white border-white/[0.08]' : 'bg-white text-black border-slate-200'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="my-3">
            <div className={`text-2xl sm:text-3xl font-black flex items-baseline gap-1.5 tabular-nums ${isDark ? 'text-white' : 'text-black'}`}>
              {scheduleStats.hasSchedule ? scheduleStats.totalMonthWorkDays : '--'}
              <span className="text-xs font-medium text-slate-400">dias escalados</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-normal tabular-nums">
              <strong className={isDark ? 'text-white' : 'text-black'}>{scheduleStats.pastWorkedDays}</strong> dias decorridos &bull; <strong className={isDark ? 'text-white' : 'text-black'}>{scheduleStats.remainingWorkDays}</strong> por cumprir
            </p>
          </div>
          <div
            className={`pt-2 border-t flex items-center justify-between text-[10px] ${
              isDark ? 'border-white/[0.08] text-slate-400' : 'border-slate-200/80 text-slate-600'
            }`}
          >
            <span>Ritmo mensal</span>
            <span className="font-bold text-blue-500 tabular-nums">{scheduleStats.progressWorkDaysPercent}% cumprido</span>
          </div>
        </div>

        {/* Card 3: Folgas Restantes e Totais */}
        <div
          className={`p-5 rounded-2xl border flex flex-col justify-between transition-colors ${
            isDark
              ? 'bg-[#131d33] border-white/[0.08]'
              : 'bg-slate-50/80 border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Dias de Folga
            </span>
            <span className="p-1.5 rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/30">
              <Coffee className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="my-3">
            <div className="text-2xl sm:text-3xl font-black text-amber-500 flex items-baseline gap-1.5 tabular-nums">
              {scheduleStats.hasSchedule ? scheduleStats.remainingOffDays : '--'}
              <span className="text-xs font-medium text-slate-400">folgas restantes</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-normal tabular-nums">
              Total do mês: <strong className={isDark ? 'text-white' : 'text-black'}>{scheduleStats.totalMonthOffDays} folgas</strong> ({scheduleStats.pastOffDays} gozadas)
            </p>
          </div>
          <div
            className={`pt-2 border-t flex items-center justify-between text-[10px] ${
              isDark ? 'border-white/[0.08] text-slate-400' : 'border-slate-200/80 text-slate-600'
            }`}
          >
            <span>Descanso programado</span>
            <span className="font-bold text-amber-500 tabular-nums">
              {scheduleStats.totalMonthDays > 0 ? ((scheduleStats.totalMonthOffDays / scheduleStats.totalMonthDays) * 100).toFixed(0) : 0}% do mês
            </span>
          </div>
        </div>

        {/* Card 4: Detalhe de Turnos Restantes (Abertura / Fecho) */}
        <div
          className={`p-5 rounded-2xl border flex flex-col justify-between transition-colors ${
            isDark
              ? 'bg-[#131d33] border-white/[0.08]'
              : 'bg-slate-50/80 border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Turnos por Cumprir
            </span>
            <span className="p-1.5 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              <TrendingUp className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="my-2.5 space-y-2">
            <div
              className={`flex items-center justify-between text-xs p-2.5 rounded-xl border ${
                isDark
                  ? 'bg-amber-500/10 border-amber-500/25 text-white'
                  : 'bg-amber-50 border-amber-200/80 text-black'
              }`}
            >
              <span className="flex items-center gap-1.5 font-bold">
                <Sun className="w-3.5 h-3.5 text-amber-500" /> Abertura (09:30-18:30)
              </span>
              <span className="font-black text-amber-500 tabular-nums">
                {scheduleStats.remainingAberturaDays} <span className="text-[10px] font-normal text-slate-400">/ {scheduleStats.totalAberturaDays}</span>
              </span>
            </div>

            <div
              className={`flex items-center justify-between text-xs p-2.5 rounded-xl border ${
                isDark
                  ? 'bg-indigo-500/10 border-indigo-500/25 text-white'
                  : 'bg-indigo-50 border-indigo-200/80 text-black'
              }`}
            >
              <span className="flex items-center gap-1.5 font-bold">
                <Moon className="w-3.5 h-3.5 text-indigo-400" /> Fecho (11:30-20:30)
              </span>
              <span className="font-black text-indigo-400 tabular-nums">
                {scheduleStats.remainingFechoDays} <span className="text-[10px] font-normal text-slate-400">/ {scheduleStats.totalFechoDays}</span>
              </span>
            </div>
          </div>
          <div
            className={`pt-2 border-t flex items-center justify-between text-[10px] ${
              isDark ? 'border-white/[0.08] text-slate-400' : 'border-slate-200/80 text-slate-600'
            }`}
          >
            <span>Distribuição de horários</span>
            <span className="font-semibold tabular-nums">
              {scheduleStats.remainingAberturaDays + scheduleStats.remainingFechoDays} turnos restantes
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className={`mt-4 pt-3 border-t ${isDark ? 'border-white/[0.08]' : 'border-slate-200/80'}`}>
        <div className="flex items-center justify-between text-xs mb-1.5 font-semibold">
          <span className="flex items-center gap-1.5 text-slate-400">
            <Briefcase className="w-3.5 h-3.5 text-blue-500" />
            Progresso da Escala de Trabalho ({scheduleStats.pastWorkedDays} de {scheduleStats.totalMonthWorkDays} dias trabalhados)
          </span>
          <span className={`font-black tabular-nums ${isDark ? 'text-white' : 'text-black'}`}>
            {scheduleStats.progressWorkDaysPercent}%
          </span>
        </div>
        <div className={`w-full h-2.5 rounded-full overflow-hidden p-0 relative ${isDark ? 'bg-white/[0.08]' : 'bg-slate-200'}`}>
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all duration-500 rounded-full"
            style={{ width: `${Math.min(scheduleStats.progressWorkDaysPercent, 100)}%` }}
            title={`Dias trabalhados: ${scheduleStats.pastWorkedDays}`}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5">
          <span>Início do Mês (Dia 01)</span>
          <span className="text-blue-500 font-bold tabular-nums">Faltam {scheduleStats.remainingWorkDays} dias úteis</span>
          <span>Fim do Mês (Dia {scheduleStats.totalMonthDays})</span>
        </div>
      </div>

      {/* Dynamic Daily Goal Formula Notice */}
      <div className={`mt-4 pt-3 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] ${
        isDark ? 'border-white/[0.08] text-slate-400' : 'border-slate-200/80 text-slate-600'
      }`}>
        <div className="flex items-center gap-1.5 font-normal">
          <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span>
            <strong className={isDark ? 'text-white' : 'text-black'}>Fórmula da Meta Diária Dinâmica:</strong> Valor restante em falta ÷ {scheduleStats.remainingWorkDays} dias úteis a trabalhar até ao término do mês.
          </span>
        </div>
        <span
          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0 border ${
            isDark
              ? 'bg-white/[0.05] text-slate-300 border-white/[0.08]'
              : 'bg-slate-100 text-slate-700 border-slate-200'
          }`}
        >
          Atualização Contínua
        </span>
      </div>
    </div>
  );
};

