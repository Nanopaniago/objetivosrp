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
  Users,
  Edit3,
  Eye,
  X,
  Info,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface ScheduleManagerProps {
  sellers: User[];
  currentMonth: number;
  currentYear: number;
  schedules: WorkSchedule[];
  currentUserRole: string;
  currentUser?: User;
  onUpdateSchedule: (updated: WorkSchedule[]) => void;
}

export const ScheduleManager: React.FC<ScheduleManagerProps> = ({
  sellers,
  currentMonth,
  currentYear,
  schedules,
  currentUserRole,
  currentUser,
  onUpdateSchedule,
}) => {
  // Default to currentUser if seller, or first seller
  const initialSellerId = currentUser && sellers.some(s => s.id === currentUser.id)
    ? currentUser.id
    : sellers[0]?.id || '';

  const [selectedSellerId, setSelectedSellerId] = useState<string>(initialSellerId);
  const [showBatchTools, setShowBatchTools] = useState(false);
  const [viewMode, setViewMode] = useState<'calendar' | 'daily_roster'>('calendar');
  const [selectedRosterDay, setSelectedRosterDay] = useState<number>(new Date().getDate());

  // Modal for editing specific day's hours and viewing teammates
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [modalShift, setModalShift] = useState<WorkShift>('abertura');
  const [modalStatus, setModalStatus] = useState<ScheduleStatus>('work');
  const [modalStartTime, setModalStartTime] = useState<string>('09:30');
  const [modalEndTime, setModalEndTime] = useState<string>('18:30');
  const [modalNote, setModalNote] = useState<string>('');

  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Permission: Any user can edit their OWN schedule; Managers/Admins can edit anyone's schedule
  const isEditingSelf = currentUser ? selectedSellerId === currentUser.id : false;
  const canEdit = currentUserRole !== 'seller' || isEditingSelf;

  const selectedSeller = sellers.find(s => s.id === selectedSellerId);

  const getDaySchedule = (day: number, sellerId: string = selectedSellerId) => {
    const dayStr = day < 10 ? `0${day}` : `${day}`;
    const monthStr = currentMonth < 10 ? `0${currentMonth}` : `${currentMonth}`;
    const dateStr = `${currentYear}-${monthStr}-${dayStr}`;
    return schedules.find(s => s.sellerId === sellerId && s.date === dateStr);
  };

  // Open Edit Modal for a day
  const handleOpenEditModal = (day: number) => {
    const sch = getDaySchedule(day);
    setEditingDay(day);

    if (sch) {
      setModalStatus(sch.status);
      setModalShift(sch.shift || 'abertura');
      setModalStartTime(sch.startTime || (sch.shift === 'fecho' ? '11:30' : '09:30'));
      setModalEndTime(sch.endTime || (sch.shift === 'fecho' ? '20:30' : '18:30'));
      setModalNote(sch.notes || '');
    } else {
      // Default to work - abertura
      setModalStatus('work');
      setModalShift('abertura');
      setModalStartTime('09:30');
      setModalEndTime('18:30');
      setModalNote('');
    }
  };

  // Save Modal Changes
  const handleSaveModal = () => {
    if (!editingDay || !canEdit) return;

    const day = editingDay;
    const dayStr = day < 10 ? `0${day}` : `${day}`;
    const monthStr = currentMonth < 10 ? `0${currentMonth}` : `${currentMonth}`;
    const dateStr = `${currentYear}-${monthStr}-${dayStr}`;

    const existing = schedules.find(s => s.sellerId === selectedSellerId && s.date === dateStr);
    const updatedList = schedules.filter(s => !(s.sellerId === selectedSellerId && s.date === dateStr));

    const newScheduleItem: WorkSchedule = {
      id: existing ? existing.id : `schedule-${selectedSellerId}-${dateStr}`,
      sellerId: selectedSellerId,
      date: dateStr,
      status: modalStatus,
      shift: modalStatus === 'work' ? modalShift : undefined,
      startTime: modalStatus === 'work' ? modalStartTime : undefined,
      endTime: modalStatus === 'work' ? modalEndTime : undefined,
      notes: modalNote.trim() || undefined,
    };

    updatedList.push(newScheduleItem);
    onUpdateSchedule(updatedList);
    setEditingDay(null);
  };

  // Direct schedule updater
  const updateDaySchedule = (
    day: number,
    status: ScheduleStatus,
    shift?: WorkShift,
    startTimeParam?: string,
    endTimeParam?: string
  ) => {
    if (!canEdit) return;

    const dayStr = day < 10 ? `0${day}` : `${day}`;
    const monthStr = currentMonth < 10 ? `0${currentMonth}` : `${currentMonth}`;
    const dateStr = `${currentYear}-${monthStr}-${dayStr}`;

    const existing = schedules.find(s => s.sellerId === selectedSellerId && s.date === dateStr);
    const updatedList = schedules.filter(s => !(s.sellerId === selectedSellerId && s.date === dateStr));

    let startTime = startTimeParam;
    let endTime = endTimeParam;

    if (status === 'work') {
      if (shift === 'fecho') {
        startTime = startTime || '11:30';
        endTime = endTime || '20:30';
      } else if (shift === 'personalizado') {
        startTime = startTime || '10:00';
        endTime = endTime || '19:00';
      } else {
        shift = 'abertura';
        startTime = startTime || '09:30';
        endTime = endTime || '18:30';
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
      updateDaySchedule(day, 'work', 'abertura');
    } else if (sch.status === 'work' && (sch.shift === 'abertura' || sch.shift === 'manha')) {
      updateDaySchedule(day, 'work', 'fecho');
    } else {
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

  // Helper: Get all team members' schedule info for a given day
  const getDayTeamRoster = (day: number) => {
    const dayStr = day < 10 ? `0${day}` : `${day}`;
    const monthStr = currentMonth < 10 ? `0${currentMonth}` : `${currentMonth}`;
    const dateStr = `${currentYear}-${monthStr}-${dayStr}`;

    return sellers.map(seller => {
      const sch = schedules.find(s => s.sellerId === seller.id && s.date === dateStr);
      const status: ScheduleStatus = sch ? sch.status : 'work';
      const shift: WorkShift = sch?.shift || (status === 'work' ? 'abertura' : 'abertura');
      const startTime = sch?.startTime || (shift === 'fecho' ? '11:30' : '09:30');
      const endTime = sch?.endTime || (shift === 'fecho' ? '20:30' : '18:30');

      return {
        seller,
        schedule: sch,
        status,
        shift,
        startTime,
        endTime,
        notes: sch?.notes,
      };
    });
  };

  // Accurate Schedule & Working Days Calculation
  const scheduleStats = calculateScheduleStats(
    selectedSellerId,
    currentMonth,
    currentYear,
    schedules
  );

  const monthName = new Date(currentYear, currentMonth - 1, 1).toLocaleDateString('pt-PT', {
    month: 'long',
  });
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  return (
    <div className="space-y-6">
      {/* Working Days & Schedule Progress Counter */}
      <WorkingDaysCounter
        scheduleStats={scheduleStats}
        currentMonth={currentMonth}
        currentYear={currentYear}
        sellerName={selectedSeller?.name}
      />

      <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-black/[0.06] p-6 sm:p-8 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)]">
        {/* Top Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-black/[0.05] pb-5 mb-6">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="p-2 rounded-2xl bg-[#0071e3]/10 text-[#0071e3]">
                <Calendar className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Escala e Gestão de Turnos
              </h2>
              {/* Permission Badge */}
              {isEditingSelf ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Sua Escala Pessoal (Pode Editar Seus Horários)
                </span>
              ) : canEdit ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-[#0071e3] border border-blue-200">
                  <Edit3 className="w-3 h-3" />
                  Modo Gestão (A editar escala de {selectedSeller?.name})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  <Eye className="w-3 h-3 text-slate-400" />
                  Modo Visualização
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-normal">
              {canEdit
                ? 'Pode editar e personalizar os seus horários de trabalho, além de acompanhar as miniaturas dos colegas escalados no mesmo turno.'
                : 'Acompanhe a sua escala e visualize as miniaturas com foto dos colegas em cada turno de trabalho.'}
            </p>
          </div>

          {/* Controls & Quick Jump */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Switcher Tabs */}
            <div className="flex items-center bg-[#f5f5f7] p-1 rounded-2xl border border-black/[0.04] text-xs font-bold">
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1.5 rounded-xl transition ${
                  viewMode === 'calendar'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Calendário Mensal
              </button>
              <button
                type="button"
                onClick={() => setViewMode('daily_roster')}
                className={`px-3 py-1.5 rounded-xl transition ${
                  viewMode === 'daily_roster'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Quadro Diário da Equipa
              </button>
            </div>

            {/* Jump to My Schedule if viewing someone else */}
            {currentUser && selectedSellerId !== currentUser.id && sellers.some(s => s.id === currentUser.id) && (
              <button
                type="button"
                onClick={() => setSelectedSellerId(currentUser.id)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition shadow-2xs cursor-pointer"
                title="Voltar para a minha escala pessoal onde posso editar os meus horários"
              >
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-4 h-4 rounded-full object-cover"
                />
                A Minha Escala
              </button>
            )}

            {canEdit && (
              <button
                type="button"
                onClick={() => setShowBatchTools(!showBatchTools)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-2xl border border-black/[0.08] bg-[#f5f5f7] text-slate-700 hover:bg-black/[0.05] transition shadow-2xs cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                Preenchimento Rápido
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showBatchTools ? 'rotate-180' : ''}`} />
              </button>
            )}

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500">Membro:</label>
              <select
                value={selectedSellerId}
                onChange={e => setSelectedSellerId(e.target.value)}
                className="rounded-2xl border border-black/[0.08] bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus:border-[#0071e3] focus:outline-none shadow-2xs"
              >
                {sellers.map(seller => (
                  <option key={seller.id} value={seller.id}>
                    {seller.name} {currentUser && seller.id === currentUser.id ? '(Você)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Batch Tools Accordion */}
        {canEdit && showBatchTools && (
          <div className="mb-6 p-4 rounded-2xl bg-[#f5f5f7] border border-black/[0.05]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#0071e3]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Preenchimento Automático para {selectedSeller?.name} {isEditingSelf ? '(Seus Horários)' : ''}
                </h4>
              </div>
              <span className="text-[11px] text-slate-400">Aplica um padrão a todos os dias deste mês</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => handleBatchApply('all_abertura')}
                className="p-3 rounded-xl border border-amber-200 bg-amber-50/80 text-amber-900 text-xs font-semibold hover:bg-amber-100 flex items-center justify-center gap-2 transition text-center cursor-pointer"
              >
                <Sun className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Todos Abertura (09:30 - 18:30)</span>
              </button>

              <button
                type="button"
                onClick={() => handleBatchApply('all_fecho')}
                className="p-3 rounded-xl border border-indigo-200 bg-indigo-50/80 text-indigo-900 text-xs font-semibold hover:bg-indigo-100 flex items-center justify-center gap-2 transition text-center cursor-pointer"
              >
                <Moon className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Todos Fecho (11:30 - 20:30)</span>
              </button>

              <button
                type="button"
                onClick={() => handleBatchApply('alternate')}
                className="p-3 rounded-xl border border-sky-200 bg-sky-50/80 text-sky-900 text-xs font-semibold hover:bg-sky-100 flex items-center justify-center gap-2 transition text-center cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-sky-600 shrink-0" />
                <span>Alternar Abertura / Fecho</span>
              </button>

              <button
                type="button"
                onClick={() => handleBatchApply('weekends_off')}
                className="p-3 rounded-xl border border-black/[0.08] bg-white text-slate-700 text-xs font-semibold hover:bg-black/[0.02] flex items-center justify-center gap-2 transition text-center cursor-pointer"
              >
                <Coffee className="w-4 h-4 text-slate-600 shrink-0" />
                <span>Fins de Semana como Folga</span>
              </button>
            </div>
          </div>
        )}

        {/* Turnos Legend & Information Bento Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
          {/* Turno Abertura Box */}
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/70 flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-amber-500 text-white shadow-2xs">
              <Sun className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-amber-950">Turno de Abertura</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/80 text-amber-900">
                  09:30 às 18:30
                </span>
              </div>
              <span className="text-xs text-amber-800 font-medium mt-0.5 block">
                {scheduleStats.totalAberturaDays} dias no mês ({scheduleStats.remainingAberturaDays} restantes)
              </span>
            </div>
          </div>

          {/* Turno Fecho Box */}
          <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200/70 flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-indigo-600 text-white shadow-2xs">
              <Moon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-indigo-950">Turno de Fecho</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-200/80 text-indigo-900">
                  11:30 às 20:30
                </span>
              </div>
              <span className="text-xs text-indigo-800 font-medium mt-0.5 block">
                {scheduleStats.totalFechoDays} dias no mês ({scheduleStats.remainingFechoDays} restantes)
              </span>
            </div>
          </div>

          {/* Folga Box */}
          <div className="p-4 rounded-2xl bg-[#f5f5f7] border border-black/[0.04] flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-slate-700 text-white shadow-2xs">
              <Coffee className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-900">Dias de Folga</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/[0.06] text-slate-700">
                  {scheduleStats.totalMonthOffDays} folgas
                </span>
              </div>
              <span className="text-xs text-slate-600 font-medium mt-0.5 block">
                {scheduleStats.remainingOffDays} folgas restantes &bull; {scheduleStats.totalMonthWorkDays} dias trabalho
              </span>
            </div>
          </div>
        </div>

        {/* Action Guidance & Instructions */}
        <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 bg-[#f5f5f7] px-4 py-2.5 rounded-2xl border border-black/[0.04]">
          <div className="flex items-center gap-2 flex-wrap">
            <Info className="w-4 h-4 text-[#0071e3] shrink-0" />
            <span>
              <strong>Equipa no mesmo turno:</strong> Miniaturas dos colegas escalados no mesmo horário. Os <strong>dias que já se passaram</strong> são destacados com borda verde e ícone de verificação centralizado em primeiro plano.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
              <Check className="w-3 h-3 stroke-[3]" /> Dias Decorridos
            </span>
            {canEdit && (
              <span className="text-[11px] font-bold text-[#0071e3]">
                Edição Ativa
              </span>
            )}
          </div>
        </div>

        {/* VIEW MODE 1: CALENDAR VIEW */}
        {viewMode === 'calendar' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            {daysArray.map(day => {
              const sch = getDaySchedule(day);
              const isWork = sch?.status === 'work';
              const isAbertura = isWork && (sch?.shift === 'abertura' || sch?.shift === 'manha' || !sch?.shift);
              const isFecho = isWork && (sch?.shift === 'fecho' || sch?.shift === 'tarde');
              const isPersonalizado = isWork && sch?.shift === 'personalizado';
              const isOff = sch?.status === 'off';

              const dayDate = new Date(currentYear, currentMonth - 1, day);
              dayDate.setHours(0, 0, 0, 0);

              const today = new Date();
              today.setHours(0, 0, 0, 0);

              const isPastDay = dayDate.getTime() < today.getTime();
              const isToday = dayDate.getTime() === today.getTime();

              const weekDayName = dayDate.toLocaleDateString('pt-PT', { weekday: 'short' });
              const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;

              // Team members for this day
              const dayRoster = getDayTeamRoster(day);

              // Members in the EXACT same shift as the selected seller (excluding self)
              const teammatesInSameShift = dayRoster.filter(m => {
                if (m.seller.id === selectedSellerId) return false;
                if (!isWork) return false; // if self is off, none is in "same shift"

                if (isAbertura) {
                  return m.status === 'work' && (m.shift === 'abertura' || m.shift === 'manha' || !m.shift);
                }
                if (isFecho) {
                  return m.status === 'work' && (m.shift === 'fecho' || m.shift === 'tarde');
                }
                if (isPersonalizado) {
                  return m.status === 'work';
                }
                return false;
              });

              // Also count who is in service if self is off
              const teamInService = dayRoster.filter(m => m.seller.id !== selectedSellerId && m.status === 'work');

              return (
                <div
                  key={day}
                  className={`relative rounded-2xl p-3 transition-all flex flex-col justify-between min-h-[175px] overflow-hidden ${
                    isPastDay
                      ? 'border-2 border-emerald-500 ring-1 ring-emerald-500/25 bg-emerald-500/[0.03] shadow-xs'
                      : isToday
                      ? 'border-2 border-[#0071e3] ring-1 ring-[#0071e3]/20 shadow-xs'
                      : isAbertura
                      ? 'border border-amber-200/80 hover:border-amber-300'
                      : isFecho
                      ? 'border border-indigo-200/80 hover:border-indigo-300'
                      : isPersonalizado
                      ? 'border border-sky-200/80 hover:border-sky-300'
                      : isOff
                      ? 'border border-slate-200 hover:border-slate-300'
                      : 'border border-black/[0.06]'
                  } ${
                    isAbertura
                      ? 'bg-amber-50/40'
                      : isFecho
                      ? 'bg-indigo-50/40'
                      : isPersonalizado
                      ? 'bg-sky-50/40'
                      : isOff
                      ? 'bg-slate-50/80'
                      : 'bg-white'
                  } shadow-2xs hover:shadow-xs`}
                >
                  {/* Ícone centralizado em primeiro plano com check para dias que já se passaram */}
                  {isPastDay && (
                    <div
                      className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
                      aria-label={`Dia ${day} já decorrido`}
                    >
                      <div className="flex flex-col items-center justify-center drop-shadow-sm">
                        <div className="w-11 h-11 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/35 border-2 border-white ring-2 ring-emerald-500/20">
                          <Check className="w-6 h-6 stroke-[3.5]" />
                        </div>
                        <span className="mt-1 px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase bg-white/95 text-emerald-800 border border-emerald-300 shadow-2xs backdrop-blur-xs">
                          Concluído
                        </span>
                      </div>
                    </div>
                  )}

                  <div>
                    {/* Card Header: Day & Weekday & Edit trigger */}
                    <div className="flex items-center justify-between relative z-20">
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className={`text-base font-black tabular-nums ${isPastDay ? 'text-emerald-700' : isWeekend ? 'text-rose-600' : 'text-slate-900'}`}>
                          {day}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          {weekDayName}
                        </span>
                        {isPastDay && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Passou
                          </span>
                        )}
                        {isToday && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-[#0071e3] border border-blue-200">
                            Hoje
                          </span>
                        )}
                      </div>

                      {canEdit && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(day);
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-black/[0.04] transition cursor-pointer"
                          title="Editar horário e ver detalhes da equipa neste dia"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Shift / Status Badge */}
                    <div className="my-2">
                      {isAbertura ? (
                        <div className="p-2 rounded-xl bg-amber-100/80 border border-amber-200 text-amber-950">
                          <div className="flex items-center justify-between gap-1 text-xs font-bold leading-none">
                            <span className="flex items-center gap-1">
                              <Sun className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              Abertura
                            </span>
                          </div>
                          <div className="text-[10px] font-semibold text-amber-800 mt-1 flex items-center gap-1 tabular-nums">
                            <Clock className="w-2.5 h-2.5" /> {sch?.startTime || '09:30'} - {sch?.endTime || '18:30'}
                          </div>
                        </div>
                      ) : isFecho ? (
                        <div className="p-2 rounded-xl bg-indigo-100/80 border border-indigo-200 text-indigo-950">
                          <div className="flex items-center justify-between gap-1 text-xs font-bold leading-none">
                            <span className="flex items-center gap-1">
                              <Moon className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              Fecho
                            </span>
                          </div>
                          <div className="text-[10px] font-semibold text-indigo-800 mt-1 flex items-center gap-1 tabular-nums">
                            <Clock className="w-2.5 h-2.5" /> {sch?.startTime || '11:30'} - {sch?.endTime || '20:30'}
                          </div>
                        </div>
                      ) : isPersonalizado ? (
                        <div className="p-2 rounded-xl bg-sky-100/80 border border-sky-200 text-sky-950">
                          <div className="flex items-center justify-between gap-1 text-xs font-bold leading-none">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                              Personalizado
                            </span>
                          </div>
                          <div className="text-[10px] font-semibold text-sky-800 mt-1 flex items-center gap-1 tabular-nums">
                            {sch?.startTime || '10:00'} - {sch?.endTime || '19:00'}
                          </div>
                        </div>
                      ) : isOff ? (
                        <div className="p-2 rounded-xl bg-slate-200/80 border border-slate-300 text-slate-800">
                          <div className="flex items-center gap-1 text-xs font-bold leading-none">
                            <Coffee className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                            <span>Folga</span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-1">Dia de Descanso</div>
                        </div>
                      ) : (
                        <div className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-400 text-xs">
                          Sem escala definida
                        </div>
                      )}
                    </div>

                    {/* TEAM MEMBERS MINIATURES IN SAME SHIFT WITH SHIFT ICONS */}
                    <div className="pt-2 border-t border-black/[0.04]">
                      {isWork ? (
                        <div>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                            <span className="font-bold flex items-center gap-1 text-slate-700">
                              <Users className="w-3 h-3 text-slate-400" />
                              No mesmo turno:
                            </span>
                            <span className="text-[10px] font-bold text-slate-800 tabular-nums">
                              {teammatesInSameShift.length} {teammatesInSameShift.length === 1 ? 'colega' : 'colegas'}
                            </span>
                          </div>

                          {teammatesInSameShift.length > 0 ? (
                            <div className="flex items-center -space-x-1.5 overflow-visible py-1">
                              {teammatesInSameShift.slice(0, 4).map(tm => (
                                <div
                                  key={tm.seller.id}
                                  className="relative group cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditModal(day);
                                  }}
                                  title={`${tm.seller.name} - ${
                                    tm.shift === 'fecho' ? 'Fecho (11:30-20:30)' : 'Abertura (09:30-18:30)'
                                  }`}
                                >
                                  <img
                                    src={tm.seller.avatar}
                                    alt={tm.seller.name}
                                    className="w-7 h-7 rounded-full object-cover border-2 border-white shadow-xs hover:scale-125 hover:z-20 transition-all duration-200"
                                  />
                                  {/* Shift Icon Overlay on Avatar */}
                                  <span
                                    className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white text-[8px] shadow-2xs ${
                                      tm.shift === 'fecho'
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-amber-500 text-white'
                                    }`}
                                  >
                                    {tm.shift === 'fecho' ? (
                                      <Moon className="w-2 h-2" />
                                    ) : (
                                      <Sun className="w-2 h-2" />
                                    )}
                                  </span>
                                </div>
                              ))}
                              {teammatesInSameShift.length > 4 && (
                                <span className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white text-[10px] font-black text-slate-700 flex items-center justify-center shadow-xs">
                                  +{teammatesInSameShift.length - 4}
                                </span>
                              )}
                            </div>
                          ) : (
                            <p className="text-[10px] text-slate-400 py-1 italic">
                              Apenas você neste turno
                            </p>
                          )}
                        </div>
                      ) : (
                        <div>
                          {/* If self is on Folga, show teammates working that day with their respective shift icons */}
                          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                            <span className="font-semibold flex items-center gap-1 text-slate-600">
                              <Users className="w-3 h-3 text-slate-400" />
                              Equipa de Serviço:
                            </span>
                            <span className="text-[10px] text-slate-400 tabular-nums">
                              {teamInService.length} a trabalhar
                            </span>
                          </div>

                          <div className="flex items-center -space-x-1.5 overflow-visible py-1">
                            {teamInService.slice(0, 4).map(tm => (
                              <div
                                key={tm.seller.id}
                                className="relative group cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditModal(day);
                                }}
                                title={`${tm.seller.name} - ${
                                  tm.shift === 'fecho' ? 'Fecho (11:30-20:30)' : 'Abertura (09:30-18:30)'
                                }`}
                              >
                                <img
                                  src={tm.seller.avatar}
                                  alt={tm.seller.name}
                                  className="w-7 h-7 rounded-full object-cover border-2 border-white shadow-xs hover:scale-125 hover:z-20 transition-all duration-200"
                                />
                                <span
                                  className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white text-[8px] shadow-2xs ${
                                    tm.shift === 'fecho'
                                      ? 'bg-indigo-600 text-white'
                                      : 'bg-amber-500 text-white'
                                  }`}
                                >
                                  {tm.shift === 'fecho' ? (
                                    <Moon className="w-2 h-2" />
                                  ) : (
                                    <Sun className="w-2 h-2" />
                                  )}
                                </span>
                              </div>
                            ))}
                            {teamInService.length > 4 && (
                              <span className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white text-[10px] font-black text-slate-700 flex items-center justify-center shadow-xs">
                                +{teamInService.length - 4}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar on Card */}
                  {canEdit && (
                    <div
                      className="mt-2.5 pt-2 border-t border-black/[0.04] flex items-center justify-between text-[10px] relative z-20"
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => updateDaySchedule(day, 'work', 'abertura')}
                        className={`px-1.5 py-0.5 rounded font-bold transition cursor-pointer ${
                          isAbertura
                            ? 'bg-amber-500 text-white'
                            : 'text-slate-400 hover:text-amber-800 hover:bg-amber-50'
                        }`}
                        title="Definir Abertura (09:30 às 18:30)"
                      >
                        Abertura
                      </button>

                      <button
                        type="button"
                        onClick={() => updateDaySchedule(day, 'work', 'fecho')}
                        className={`px-1.5 py-0.5 rounded font-bold transition cursor-pointer ${
                          isFecho
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-400 hover:text-indigo-800 hover:bg-indigo-50'
                        }`}
                        title="Definir Fecho (11:30 às 20:30)"
                      >
                        Fecho
                      </button>

                      <button
                        type="button"
                        onClick={() => updateDaySchedule(day, 'off')}
                        className={`px-1.5 py-0.5 rounded font-bold transition cursor-pointer ${
                          isOff
                            ? 'bg-slate-700 text-white'
                            : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'
                        }`}
                        title="Definir Folga"
                      >
                        Folga
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(day)}
                        className="p-1 rounded text-[#0071e3] hover:bg-blue-50 transition cursor-pointer"
                        title="Personalizar horários específicos ou ver equipa"
                      >
                        <Clock className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* VIEW MODE 2: DAILY ROSTER BOARD */}
        {viewMode === 'daily_roster' && (
          <div className="space-y-6">
            {/* Day Selector Pill Strip */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Selecione o Dia do Mês ({capitalizedMonth} de {currentYear}):
              </label>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
                {daysArray.map(day => {
                  const dayDate = new Date(currentYear, currentMonth - 1, day);
                  dayDate.setHours(0, 0, 0, 0);

                  const today = new Date();
                  today.setHours(0, 0, 0, 0);

                  const isPastDay = dayDate.getTime() < today.getTime();
                  const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
                  const isSelected = selectedRosterDay === day;

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setSelectedRosterDay(day)}
                      className={`px-3 py-2 rounded-2xl flex flex-col items-center justify-center min-w-[52px] border transition cursor-pointer relative ${
                        isSelected
                          ? 'bg-[#0071e3] text-white border-[#0071e3] shadow-sm scale-105'
                          : isPastDay
                          ? 'bg-emerald-50/70 text-emerald-950 border-emerald-400 hover:bg-emerald-100/80'
                          : 'bg-white text-slate-700 border-black/[0.06] hover:bg-[#f5f5f7]'
                      }`}
                    >
                      {isPastDay && !isSelected && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-xs">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                      )}
                      <span className={`text-[10px] font-semibold uppercase ${
                        isSelected
                          ? 'text-blue-100'
                          : isPastDay
                          ? 'text-emerald-700 font-bold'
                          : isWeekend
                          ? 'text-rose-500'
                          : 'text-slate-400'
                      }`}>
                        {dayDate.toLocaleDateString('pt-PT', { weekday: 'narrow' })}
                      </span>
                      <span className="text-sm font-black tabular-nums">
                        {day}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Daily Roster Breakdown Columns */}
            {(() => {
              const roster = getDayTeamRoster(selectedRosterDay);
              const aberturaMembers = roster.filter(m => m.status === 'work' && (m.shift === 'abertura' || m.shift === 'manha' || !m.shift));
              const fechoMembers = roster.filter(m => m.status === 'work' && (m.shift === 'fecho' || m.shift === 'tarde'));
              const personalizadoMembers = roster.filter(m => m.status === 'work' && m.shift === 'personalizado');
              const folgaMembers = roster.filter(m => m.status === 'off');

              const rosterDate = new Date(currentYear, currentMonth - 1, selectedRosterDay);
              rosterDate.setHours(0, 0, 0, 0);

              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const isRosterPastDay = rosterDate.getTime() < today.getTime();

              const formattedRosterDate = rosterDate.toLocaleDateString('pt-PT', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              });

              return (
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-black/[0.04]">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-slate-900 capitalize tracking-tight">
                          {formattedRosterDate}
                        </h3>
                        {isRosterPastDay && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                            <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                            Dia Concluído
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-normal">
                        Distribuição da equipa pelos turnos de serviço e dias de folga.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(selectedRosterDay)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0071e3] text-xs font-bold text-white hover:bg-[#0077ed] transition shadow-2xs cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Editar Meu Horário Neste Dia
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Abertura Column */}
                    <div className="rounded-3xl border border-amber-200/80 bg-amber-50/40 p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-xl bg-amber-500 text-white shadow-2xs">
                            <Sun className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-amber-950">Turno de Abertura</h4>
                            <span className="text-[11px] font-semibold text-amber-800">09:30 às 18:30</span>
                          </div>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-200 text-amber-900 tabular-nums">
                          {aberturaMembers.length}
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {aberturaMembers.length > 0 ? (
                          aberturaMembers.map(m => {
                            const isSelected = m.seller.id === selectedSellerId;
                            return (
                              <div
                                key={m.seller.id}
                                className={`p-3 rounded-2xl border transition flex items-center justify-between ${
                                  isSelected
                                    ? 'bg-white border-amber-300 ring-2 ring-amber-300/50 shadow-xs'
                                    : 'bg-white/90 border-amber-200/60'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="relative">
                                    <img
                                      src={m.seller.avatar}
                                      alt={m.seller.name}
                                      className="w-10 h-10 rounded-full object-cover border border-black/[0.08]"
                                    />
                                    <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center border border-white text-[9px] shadow-2xs">
                                      <Sun className="w-2.5 h-2.5" />
                                    </span>
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-xs font-bold text-slate-900">{m.seller.name}</span>
                                      {isSelected && (
                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#0071e3]/10 text-[#0071e3]">
                                          Você
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-slate-500 block font-normal">
                                      {m.seller.storeName || 'Loja Centro'} &bull; {m.startTime}-{m.endTime}
                                    </span>
                                  </div>
                                </div>

                                {canEdit && isSelected && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditModal(selectedRosterDay)}
                                    className="p-1 text-slate-400 hover:text-amber-800"
                                    title="Editar"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div className="py-8 text-center text-xs text-amber-800/60">
                            Nenhum colaborador alocado neste turno
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Fecho Column */}
                    <div className="rounded-3xl border border-indigo-200/80 bg-indigo-50/40 p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-2xs">
                            <Moon className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-indigo-950">Turno de Fecho</h4>
                            <span className="text-[11px] font-semibold text-indigo-800">11:30 às 20:30</span>
                          </div>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-200 text-indigo-900 tabular-nums">
                          {fechoMembers.length}
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {fechoMembers.length > 0 ? (
                          fechoMembers.map(m => {
                            const isSelected = m.seller.id === selectedSellerId;
                            return (
                              <div
                                key={m.seller.id}
                                className={`p-3 rounded-2xl border transition flex items-center justify-between ${
                                  isSelected
                                    ? 'bg-white border-indigo-300 ring-2 ring-indigo-300/50 shadow-xs'
                                    : 'bg-white/90 border-indigo-200/60'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="relative">
                                    <img
                                      src={m.seller.avatar}
                                      alt={m.seller.name}
                                      className="w-10 h-10 rounded-full object-cover border border-black/[0.08]"
                                    />
                                    <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center border border-white text-[9px] shadow-2xs">
                                      <Moon className="w-2.5 h-2.5" />
                                    </span>
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-xs font-bold text-slate-900">{m.seller.name}</span>
                                      {isSelected && (
                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#0071e3]/10 text-[#0071e3]">
                                          Você
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-slate-500 block font-normal">
                                      {m.seller.storeName || 'Loja Centro'} &bull; {m.startTime}-{m.endTime}
                                    </span>
                                  </div>
                                </div>

                                {canEdit && isSelected && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditModal(selectedRosterDay)}
                                    className="p-1 text-slate-400 hover:text-indigo-800"
                                    title="Editar"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div className="py-8 text-center text-xs text-indigo-800/60">
                            Nenhum colaborador alocado neste turno
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Folga Column */}
                    <div className="rounded-3xl border border-black/[0.06] bg-[#f5f5f7] p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-xl bg-slate-700 text-white shadow-2xs">
                            <Coffee className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">Em Folga</h4>
                            <span className="text-[11px] font-semibold text-slate-500">Descanso Programado</span>
                          </div>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-black/[0.06] text-slate-700 tabular-nums">
                          {folgaMembers.length}
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {folgaMembers.length > 0 ? (
                          folgaMembers.map(m => {
                            const isSelected = m.seller.id === selectedSellerId;
                            return (
                              <div
                                key={m.seller.id}
                                className={`p-3 rounded-2xl border transition flex items-center justify-between ${
                                  isSelected
                                    ? 'bg-white border-slate-300 ring-2 ring-slate-300/50 shadow-xs'
                                    : 'bg-white/90 border-black/[0.05]'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="relative">
                                    <img
                                      src={m.seller.avatar}
                                      alt={m.seller.name}
                                      className="w-10 h-10 rounded-full object-cover opacity-75 border border-black/[0.08]"
                                    />
                                    <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-slate-700 text-white flex items-center justify-center border border-white text-[9px] shadow-2xs">
                                      <Coffee className="w-2.5 h-2.5" />
                                    </span>
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-xs font-bold text-slate-700">{m.seller.name}</span>
                                      {isSelected && (
                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-200 text-slate-800">
                                          Você
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-slate-400 block font-normal">
                                      Folga semanal
                                    </span>
                                  </div>
                                </div>

                                {canEdit && isSelected && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditModal(selectedRosterDay)}
                                    className="p-1 text-slate-400 hover:text-slate-800"
                                    title="Editar"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div className="py-8 text-center text-xs text-slate-400">
                            Nenhum colaborador de folga neste dia
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* EDIT MODAL: ALLOWS USER TO EDIT THEIR SCHEDULE & VIEW TEAMMATES IN THE SAME SHIFT */}
      {editingDay !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl border border-black/[0.08] max-w-xl w-full p-6 sm:p-7 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-black/[0.05]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-[#0071e3]/10 text-[#0071e3]">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    Editar Horário & Escala &bull; Dia {editingDay} de {capitalizedMonth}
                  </h3>
                  <p className="text-xs text-slate-500 font-normal">
                    Colaborador: <strong>{selectedSeller?.name}</strong> {isEditingSelf ? '(Você)' : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingDay(null)}
                className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-black/[0.05] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            {canEdit ? (
              <div className="mt-5 space-y-5">
                {/* Status Toggle: Trabalho vs Folga */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Tipo de Escala para este Dia:
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setModalStatus('work')}
                      className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                        modalStatus === 'work'
                          ? 'bg-[#0071e3] text-white border-[#0071e3] shadow-xs'
                          : 'bg-[#f5f5f7] text-slate-700 border-black/[0.06] hover:bg-black/[0.04]'
                      }`}
                    >
                      <Briefcase className="w-4 h-4" />
                      Dia de Trabalho
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalStatus('off')}
                      className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                        modalStatus === 'off'
                          ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                          : 'bg-[#f5f5f7] text-slate-700 border-black/[0.06] hover:bg-black/[0.04]'
                      }`}
                    >
                      <Coffee className="w-4 h-4" />
                      Dia de Folga (Descanso)
                    </button>
                  </div>
                </div>

                {/* Shift Selector if Status === 'work' */}
                {modalStatus === 'work' && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                        Turno de Trabalho:
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            setModalShift('abertura');
                            setModalStartTime('09:30');
                            setModalEndTime('18:30');
                          }}
                          className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                            modalShift === 'abertura'
                              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-300/60 shadow-xs'
                              : 'bg-white border-black/[0.06] hover:bg-[#f5f5f7]'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                            <Sun className="w-4 h-4 text-amber-600" />
                            Abertura
                          </div>
                          <span className="text-[11px] text-amber-800 font-medium block mt-1">
                            09:30 às 18:30
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setModalShift('fecho');
                            setModalStartTime('11:30');
                            setModalEndTime('20:30');
                          }}
                          className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                            modalShift === 'fecho'
                              ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-300/60 shadow-xs'
                              : 'bg-white border-black/[0.06] hover:bg-[#f5f5f7]'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950">
                            <Moon className="w-4 h-4 text-indigo-600" />
                            Fecho
                          </div>
                          <span className="text-[11px] text-indigo-800 font-medium block mt-1">
                            11:30 às 20:30
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setModalShift('personalizado')}
                          className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                            modalShift === 'personalizado'
                              ? 'bg-sky-50 border-sky-300 ring-2 ring-sky-300/60 shadow-xs'
                              : 'bg-white border-black/[0.06] hover:bg-[#f5f5f7]'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 text-xs font-bold text-sky-950">
                            <Clock className="w-4 h-4 text-sky-600" />
                            Personalizado
                          </div>
                          <span className="text-[11px] text-sky-800 font-medium block mt-1">
                            Definir horas livres
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Custom Hours inputs */}
                    <div className="grid grid-cols-2 gap-3 bg-[#f5f5f7] p-3.5 rounded-2xl border border-black/[0.04]">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          Hora de Início:
                        </label>
                        <input
                          type="time"
                          value={modalStartTime}
                          onChange={e => setModalStartTime(e.target.value)}
                          className="w-full bg-white border border-black/[0.08] rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:border-[#0071e3] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          Hora de Término:
                        </label>
                        <input
                          type="time"
                          value={modalEndTime}
                          onChange={e => setModalEndTime(e.target.value)}
                          className="w-full bg-white border border-black/[0.08] rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:border-[#0071e3] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Optional Note */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Anotação / Justificação (opcional):
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Troca autorizada com Carlos, horário reduzido..."
                    value={modalNote}
                    onChange={e => setModalNote(e.target.value)}
                    className="w-full bg-[#f5f5f7] border border-black/[0.08] rounded-2xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:border-[#0071e3] focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="mt-4 p-4 rounded-2xl bg-amber-50 text-amber-900 text-xs">
                Apenas o próprio colaborador ou gestores têm permissão para editar os horários desta escala.
              </div>
            )}

            {/* TEAMMATES IN THE SAME SHIFT FOR THIS DAY (FULL ROSTER BREAKDOWN) */}
            <div className="mt-6 pt-5 border-t border-black/[0.05]">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#0071e3]" />
                  Colegas e Turnos deste Dia ({editingDay} de {capitalizedMonth})
                </h4>
                <span className="text-[11px] text-slate-400">Escala da Loja</span>
              </div>

              {(() => {
                const dayRoster = getDayTeamRoster(editingDay);
                const currentShift = modalStatus === 'work' ? modalShift : null;

                return (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {dayRoster.map(m => {
                      const isSelf = m.seller.id === selectedSellerId;
                      const isSameShift = currentShift && m.status === 'work' && (
                        (currentShift === 'abertura' && (m.shift === 'abertura' || m.shift === 'manha' || !m.shift)) ||
                        (currentShift === 'fecho' && (m.shift === 'fecho' || m.shift === 'tarde')) ||
                        (currentShift === 'personalizado' && m.status === 'work')
                      );

                      return (
                        <div
                          key={m.seller.id}
                          className={`p-2.5 rounded-2xl border flex items-center justify-between text-xs transition ${
                            isSelf
                              ? 'bg-blue-50/70 border-blue-200'
                              : isSameShift
                              ? 'bg-emerald-50/70 border-emerald-200/80'
                              : 'bg-[#f5f5f7] border-black/[0.04]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="relative">
                              <img
                                src={m.seller.avatar}
                                alt={m.seller.name}
                                className="w-7 h-7 rounded-full object-cover border border-black/[0.08]"
                              />
                              {/* Shift Icon attached to miniature photo */}
                              <span
                                className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white text-[8px] shadow-2xs ${
                                  m.status === 'off'
                                    ? 'bg-slate-600 text-white'
                                    : m.shift === 'fecho'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-amber-500 text-white'
                                }`}
                              >
                                {m.status === 'off' ? (
                                  <Coffee className="w-2 h-2" />
                                ) : m.shift === 'fecho' ? (
                                  <Moon className="w-2 h-2" />
                                ) : (
                                  <Sun className="w-2 h-2" />
                                )}
                              </span>
                            </div>

                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-800">{m.seller.name}</span>
                                {isSelf && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#0071e3] text-white">
                                    Você
                                  </span>
                                )}
                                {!isSelf && isSameShift && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                                    Mesmo Turno que Você
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-500 font-normal">
                                {m.seller.storeName || 'Loja Centro'}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            {m.status === 'work' ? (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                m.shift === 'fecho'
                                  ? 'bg-indigo-100 text-indigo-900'
                                  : 'bg-amber-100 text-amber-900'
                              }`}>
                                {m.shift === 'fecho' ? <Moon className="w-2.5 h-2.5 text-indigo-600" /> : <Sun className="w-2.5 h-2.5 text-amber-600" />}
                                {m.shift === 'fecho' ? 'Fecho' : 'Abertura'} ({m.startTime}-{m.endTime})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                                <Coffee className="w-2.5 h-2.5 text-slate-500" />
                                Folga
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Modal Actions */}
            <div className="mt-6 pt-4 border-t border-black/[0.05] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingDay(null)}
                className="px-4 py-2.5 rounded-2xl border border-black/[0.08] text-xs font-bold text-slate-700 hover:bg-black/[0.03] transition cursor-pointer"
              >
                Cancelar
              </button>
              {canEdit && (
                <button
                  type="button"
                  onClick={handleSaveModal}
                  className="px-5 py-2.5 rounded-2xl bg-[#0071e3] text-xs font-bold text-white hover:bg-[#0077ed] transition shadow-sm cursor-pointer"
                >
                  Guardar Horário
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
