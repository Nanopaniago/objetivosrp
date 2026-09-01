import React, { useState } from 'react';
import { User, WorkSchedule, ScheduleStatus, WorkShift, WORK_SHIFTS } from '../types';
import { calculateScheduleStats } from '../utils/calculations';
import { WorkingDaysCounter } from './WorkingDaysCounter';
import {
  Calendar,
  Clock,
  Check,
  Coffee,
  Sun,
  Moon,
  Briefcase,
  Sparkles,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react';

interface ScheduleManagerProps {
  sellers: User[];
  currentMonth: number;
  currentYear: number;
  schedules: WorkSchedule[];
  currentUserRole: string;
  onUpdateSchedule: (updated: WorkSchedule[]) => void;
}

export const ScheduleManager: React.FC<ScheduleManagerProps> = ({
  sellers,
  currentMonth,
  currentYear,
  schedules,
  currentUserRole,
  onUpdateSchedule,
}) => {
  const [selectedSellerId, setSelectedSellerId] = useState<string>(sellers[0]?.id || '');
  const [activeDayModal, setActiveDayModal] = useState<number | null>(null);
  const [showBatchTools, setShowBatchTools] = useState(false);

  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const canEdit = currentUserRole !== 'seller';

  const getDaySchedule = (day: number) => {
    const dayStr = day < 10 ? `0${day}` : `${day}`;
    const monthStr = currentMonth < 10 ? `0${currentMonth}` : `${currentMonth}`;
    const dateStr = `${currentYear}-${monthStr}-${dayStr}`;
    return schedules.find(s => s.sellerId === selectedSellerId && s.date === dateStr);
  };

  const updateDaySchedule = (day: number, status: ScheduleStatus, shift?: WorkShift) => {
    if (!canEdit) return;

    const dayStr = day < 10 ? `0${day}` : `${day}`;
    const monthStr = currentMonth < 10 ? `0${currentMonth}` : `${currentMonth}`;
    const dateStr = `${currentYear}-${monthStr}-${dayStr}`;

    const existing = schedules.find(s => s.sellerId === selectedSellerId && s.date === dateStr);
    const updatedList = schedules.filter(s => !(s.sellerId === selectedSellerId && s.date === dateStr));

    let startTime: string | undefined;
    let endTime: string | undefined;

    if (status === 'work') {
      if (shift === 'fecho') {
        startTime = '11:30';
        endTime = '20:30';
      } else {
        // default to abertura
        shift = 'abertura';
        startTime = '09:30';
        endTime = '18:30';
      }
    }

    const newScheduleItem: WorkSchedule = {
      id: existing ? existing.id : `schedule-${selectedSellerId}-${dateStr}`,
      sellerId: selectedSellerId,
      date: dateStr,
      status,
      shift: status === 'work' ? shift : undefined,
      startTime: status === 'work' ? startTime : undefined,
      endTime: status === 'work' ? endTime : undefined,
    };

    updatedList.push(newScheduleItem);
    onUpdateSchedule(updatedList);
  };

  // Cycle quickly between: Abertura (09:30-18:30) -> Fecho (11:30-20:30) -> Folga -> Abertura
  const handleQuickCycle = (day: number) => {
    if (!canEdit) return;
    const sch = getDaySchedule(day);

    if (!sch || sch.status === 'off') {
      // Go to Abertura
      updateDaySchedule(day, 'work', 'abertura');
    } else if (sch.status === 'work' && (sch.shift === 'abertura' || sch.shift === 'manha')) {
      // Go to Fecho
      updateDaySchedule(day, 'work', 'fecho');
    } else {
      // Go to Folga
      updateDaySchedule(day, 'off');
    }
  };

  // Batch actions
  const handleBatchApply = (pattern: 'all_abertura' | 'all_fecho' | 'alternate' | 'weekends_off') => {
    if (!canEdit) return;

    const monthStr = currentMonth < 10 ? `0${currentMonth}` : `${currentMonth}`;
    let updatedList = schedules.filter(s => {
      if (s.sellerId !== selectedSellerId) return true;
      const [y, m] = s.date.split('-').map(Number);
      return !(y === currentYear && m === currentMonth);
    });

    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = day < 10 ? `0${day}` : `${day}`;
      const dateStr = `${currentYear}-${monthStr}-${dayStr}`;
      const dateObj = new Date(currentYear, currentMonth - 1, day);
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

      let status: ScheduleStatus = 'work';
      let shift: WorkShift = 'abertura';
      let startTime = '09:30';
      let endTime = '18:30';

      if (pattern === 'weekends_off' && isWeekend) {
        status = 'off';
        startTime = undefined as unknown as string;
        endTime = undefined as unknown as string;
      } else if (pattern === 'all_fecho') {
        shift = 'fecho';
        startTime = '11:30';
        endTime = '20:30';
      } else if (pattern === 'alternate') {
        if (day % 2 === 0) {
          shift = 'fecho';
          startTime = '11:30';
          endTime = '20:30';
        } else {
          shift = 'abertura';
          startTime = '09:30';
          endTime = '18:30';
        }
      }

      updatedList.push({
        id: `schedule-${selectedSellerId}-${dateStr}`,
        sellerId: selectedSellerId,
        date: dateStr,
        status,
        shift: status === 'work' ? shift : undefined,
        startTime: status === 'work' ? startTime : undefined,
        endTime: status === 'work' ? endTime : undefined,
      });
    }

    onUpdateSchedule(updatedList);
  };

  const selectedSeller = sellers.find(s => s.id === selectedSellerId);

  // Accurate Schedule & Working Days Calculation
  const scheduleStats = calculateScheduleStats(
    selectedSellerId,
    currentMonth,
    currentYear,
    schedules
  );

  return (
    <div className="space-y-6">
      {/* Working Days & Schedule Progress Counter */}
      <WorkingDaysCounter
        scheduleStats={scheduleStats}
        currentMonth={currentMonth}
        currentYear={currentYear}
        sellerName={selectedSeller?.name}
      />

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
        {/* Top Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-slate-900">Escala e Gestão de Turnos</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {canEdit
                ? 'Configure a escala entre Turno de Abertura (09:30 às 18:30), Turno de Fecho (11:30 às 20:30) e Folgas.'
                : 'Visualização da sua escala mensal com horários de abertura, fecho e dias de folga.'}
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {canEdit && (
              <button
                type="button"
                onClick={() => setShowBatchTools(!showBatchTools)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 transition shadow-2xs"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                Ferramentas de Escala
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showBatchTools ? 'rotate-180' : ''}`} />
              </button>
            )}

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">Vendedor:</label>
              <select
                value={selectedSellerId}
                onChange={e => setSelectedSellerId(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:outline-none shadow-2xs"
              >
                {sellers.map(seller => (
                  <option key={seller.id} value={seller.id}>
                    {seller.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

      {/* Batch Tools Accordion */}
      {canEdit && showBatchTools && (
        <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Preenchimento Rápido para {selectedSeller?.name}
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <button
              onClick={() => handleBatchApply('all_abertura')}
              className="p-2.5 rounded-lg border border-amber-200 bg-amber-50/70 text-amber-900 text-xs font-semibold hover:bg-amber-100 flex items-center justify-center gap-2 transition text-center"
            >
              <Sun className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Todos Abertura (09:30-18:30)</span>
            </button>

            <button
              onClick={() => handleBatchApply('all_fecho')}
              className="p-2.5 rounded-lg border border-indigo-200 bg-indigo-50/70 text-indigo-900 text-xs font-semibold hover:bg-indigo-100 flex items-center justify-center gap-2 transition text-center"
            >
              <Moon className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>Todos Fecho (11:30-20:30)</span>
            </button>

            <button
              onClick={() => handleBatchApply('alternate')}
              className="p-2.5 rounded-lg border border-sky-200 bg-sky-50/70 text-sky-900 text-xs font-semibold hover:bg-sky-100 flex items-center justify-center gap-2 transition text-center"
            >
              <RotateCcw className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span>Alternar Abertura / Fecho</span>
            </button>

            <button
              onClick={() => handleBatchApply('weekends_off')}
              className="p-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-100 flex items-center justify-center gap-2 transition text-center"
            >
              <Coffee className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span>Fins de Semana como Folga</span>
            </button>
          </div>
        </div>
      )}

      {/* Turnos Legend & Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        {/* Turno Abertura Box */}
        <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-500 text-white shadow-2xs">
            <Sun className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-950">Turno de Abertura</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-200/70 text-amber-900">
                09:30 às 18:30
              </span>
            </div>
            <span className="text-xs text-amber-800 font-medium mt-0.5 block">
              {scheduleStats.totalAberturaDays} no mês ({scheduleStats.remainingAberturaDays} restantes)
            </span>
          </div>
        </div>

        {/* Turno Fecho Box */}
        <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-600 text-white shadow-2xs">
            <Moon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-indigo-950">Turno de Fecho</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-200/70 text-indigo-900">
                11:30 às 20:30
              </span>
            </div>
            <span className="text-xs text-indigo-800 font-medium mt-0.5 block">
              {scheduleStats.totalFechoDays} no mês ({scheduleStats.remainingFechoDays} restantes)
            </span>
          </div>
        </div>

        {/* Folga Box */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-slate-700 text-white shadow-2xs">
            <Coffee className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">Dias de Folga</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-800">
                {scheduleStats.totalMonthOffDays} folgas
              </span>
            </div>
            <span className="text-xs text-slate-600 font-medium mt-0.5 block">
              {scheduleStats.remainingOffDays} folgas restantes &bull; {scheduleStats.totalMonthWorkDays} dias trabalho
            </span>
          </div>
        </div>
      </div>

      {/* Action Guidance */}
      {canEdit && (
        <div className="mb-4 flex items-center justify-between text-xs text-slate-500 bg-slate-50 px-3.5 py-2 rounded-lg border border-slate-200">
          <span>
            💡 <strong>Dica:</strong> Clique em qualquer dia para alternar rapidamente (
            <span className="text-amber-700 font-semibold">Abertura</span> ➔{' '}
            <span className="text-indigo-700 font-semibold">Fecho</span> ➔{' '}
            <span className="text-slate-600 font-semibold">Folga</span>) ou use o seletor.
          </span>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {daysArray.map(day => {
          const sch = getDaySchedule(day);
          const isWork = sch?.status === 'work';
          const isAbertura = isWork && (sch?.shift === 'abertura' || sch?.shift === 'manha' || !sch?.shift);
          const isFecho = isWork && (sch?.shift === 'fecho' || sch?.shift === 'tarde');
          const isOff = sch?.status === 'off';

          const dayDate = new Date(currentYear, currentMonth - 1, day);
          const weekDayName = dayDate.toLocaleDateString('pt-PT', { weekday: 'short' });
          const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;

          return (
            <div
              key={day}
              className={`relative rounded-xl border p-3 transition-all flex flex-col justify-between min-h-[115px] ${
                isAbertura
                  ? 'bg-amber-50/40 border-amber-200 hover:border-amber-300'
                  : isFecho
                  ? 'bg-indigo-50/40 border-indigo-200 hover:border-indigo-300'
                  : isOff
                  ? 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  : 'bg-white border-slate-200'
              } ${canEdit ? 'cursor-pointer hover:shadow-sm' : ''}`}
              onClick={() => handleQuickCycle(day)}
            >
              {/* Card Header: Day & Weekday */}
              <div className="flex items-center justify-between">
                <span className={`text-base font-bold ${isWeekend ? 'text-rose-600' : 'text-slate-800'}`}>
                  {day}
                </span>
                <span className="text-[10px] uppercase font-semibold text-slate-400">{weekDayName}</span>
              </div>

              {/* Shift / Status Badge */}
              <div className="my-2">
                {isAbertura ? (
                  <div className="p-1.5 rounded-lg bg-amber-100/70 border border-amber-200 text-amber-900">
                    <div className="flex items-center gap-1 text-xs font-bold leading-none">
                      <Sun className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Abertura</span>
                    </div>
                    <div className="text-[10px] font-semibold text-amber-700 mt-1 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" /> 09:30 - 18:30
                    </div>
                  </div>
                ) : isFecho ? (
                  <div className="p-1.5 rounded-lg bg-indigo-100/70 border border-indigo-200 text-indigo-900">
                    <div className="flex items-center gap-1 text-xs font-bold leading-none">
                      <Moon className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>Fecho</span>
                    </div>
                    <div className="text-[10px] font-semibold text-indigo-700 mt-1 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" /> 11:30 - 20:30
                    </div>
                  </div>
                ) : isOff ? (
                  <div className="p-1.5 rounded-lg bg-slate-200/70 border border-slate-300 text-slate-700">
                    <div className="flex items-center gap-1 text-xs font-bold leading-none">
                      <Coffee className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>Folga</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">Descanso</div>
                  </div>
                ) : (
                  <div className="p-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-400 text-xs">
                    Sem escala
                  </div>
                )}
              </div>

              {/* Selector actions if manager/admin */}
              {canEdit && (
                <div
                  className="mt-1 pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500"
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => updateDaySchedule(day, 'work', 'abertura')}
                    className={`px-1 py-0.5 rounded font-bold hover:bg-amber-100 ${
                      isAbertura ? 'text-amber-800 underline' : 'text-slate-400'
                    }`}
                    title="Definir Abertura (09:30 às 18:30)"
                  >
                    Abertura
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => updateDaySchedule(day, 'work', 'fecho')}
                    className={`px-1 py-0.5 rounded font-bold hover:bg-indigo-100 ${
                      isFecho ? 'text-indigo-800 underline' : 'text-slate-400'
                    }`}
                    title="Definir Fecho (11:30 às 20:30)"
                  >
                    Fecho
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => updateDaySchedule(day, 'off')}
                    className={`px-1 py-0.5 rounded font-bold hover:bg-slate-200 ${
                      isOff ? 'text-slate-800 underline' : 'text-slate-400'
                    }`}
                    title="Definir Folga"
                  >
                    Folga
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  </div>
);
};
