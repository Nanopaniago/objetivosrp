import React, { useState, useEffect, useMemo } from 'react';
import { GoalCategory, DailyEntry, CategorySlug, MonthlyGoal, User } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { formatCategoryValue } from '../utils/calculations';
import {
  X,
  Save,
  Calendar,
  Check,
  AlertCircle,
  RefreshCw,
  Sparkles,
  TrendingUp,
  User as UserIcon,
  ChevronDown,
  Info,
} from 'lucide-react';

interface ResultUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  sellerId: string;
  sellerName?: string;
  allSellers?: User[];
  categories: GoalCategory[];
  goals: MonthlyGoal[];
  existingEntries: DailyEntry[];
  currentMonth: number;
  currentYear: number;
  onSaveResultUpdate: (entry: DailyEntry) => void;
}

export const ResultUpdateModal: React.FC<ResultUpdateModalProps> = ({
  isOpen,
  onClose,
  sellerId,
  sellerName,
  allSellers = [],
  categories,
  goals,
  existingEntries,
  currentMonth,
  currentYear,
  onSaveResultUpdate,
}) => {
  // Compute valid date range for the active month
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const monthStr = currentMonth.toString().padStart(2, '0');
  const minDate = `${currentYear}-${monthStr}-01`;
  const maxDate = `${currentYear}-${monthStr}-${String(daysInMonth).padStart(2, '0')}`;

  const [activeSellerId, setActiveSellerId] = useState<string>(sellerId);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    const isCurrentActiveMonth =
      today.getFullYear() === currentYear && today.getMonth() + 1 === currentMonth;
    if (isCurrentActiveMonth) {
      return today.toISOString().split('T')[0];
    }
    return `${currentYear}-${monthStr}-${String(Math.min(daysInMonth, 24)).padStart(2, '0')}`;
  });

  const [note, setNote] = useState<string>('');
  const [inputValues, setInputValues] = useState<Record<CategorySlug, string>>({
    plus_master: '',
    plus: '',
    megas_total: '',
    dm_classicas: '',
    dimobilli: '',
    peliculas: '',
  });

  const [isSavedToast, setIsSavedToast] = useState(false);

  // Sync active seller if prop changes when opening
  useEffect(() => {
    if (isOpen) {
      setActiveSellerId(sellerId);
      const today = new Date();
      const isCurrentActiveMonth =
        today.getFullYear() === currentYear && today.getMonth() + 1 === currentMonth;
      if (isCurrentActiveMonth) {
        setSelectedDate(today.toISOString().split('T')[0]);
      } else {
        setSelectedDate(`${currentYear}-${monthStr}-${String(Math.min(daysInMonth, 24)).padStart(2, '0')}`);
      }
    }
  }, [isOpen, sellerId, currentMonth, currentYear, monthStr, daysInMonth]);

  // Load existing values for the active seller and current month
  useEffect(() => {
    if (!isOpen) return;

    const sellerMonthEntries = existingEntries
      .filter(e => {
        if (e.sellerId !== activeSellerId) return false;
        const [y, m] = e.date.split('-').map(Number);
        return y === currentYear && m === currentMonth;
      })
      .sort((a, b) => {
        const timeA = a.updatedAt || a.createdAt || `${a.date}T00:00:00Z`;
        const timeB = b.updatedAt || b.createdAt || `${b.date}T00:00:00Z`;
        return timeB.localeCompare(timeA);
      });

    // Find entry for specific selected date or the latest one for this month
    const currentOrLatest =
      sellerMonthEntries.find(e => e.date === selectedDate) || sellerMonthEntries[0];

    if (currentOrLatest) {
      const vals = currentOrLatest.values || {};
      setInputValues({
        plus_master: vals.plus_master !== undefined && vals.plus_master !== null ? String(vals.plus_master) : '',
        plus: vals.plus !== undefined && vals.plus !== null ? String(vals.plus) : '',
        megas_total: vals.megas_total !== undefined && vals.megas_total !== null ? String(vals.megas_total) : '',
        dm_classicas: vals.dm_classicas !== undefined && vals.dm_classicas !== null ? String(vals.dm_classicas) : '',
        dimobilli: vals.dimobilli !== undefined && vals.dimobilli !== null ? String(vals.dimobilli) : '',
        peliculas: vals.peliculas !== undefined && vals.peliculas !== null ? String(vals.peliculas) : '',
      });
      setNote(currentOrLatest.note || '');
    } else {
      setInputValues({
        plus_master: '',
        plus: '',
        megas_total: '',
        dm_classicas: '',
        dimobilli: '',
        peliculas: '',
      });
      setNote('');
    }
  }, [activeSellerId, selectedDate, existingEntries, isOpen, currentMonth, currentYear]);

  // Parse string inputs safely to numbers
  const parsedValues = useMemo(() => {
    const parseNum = (str: string): number => {
      if (!str || str.trim() === '') return 0;
      const clean = str.replace(/\s/g, '').replace(',', '.');
      const val = parseFloat(clean);
      return isNaN(val) ? 0 : Math.max(0, val);
    };

    return {
      plus_master: parseNum(inputValues.plus_master),
      plus: parseNum(inputValues.plus),
      megas_total: parseNum(inputValues.megas_total),
      dm_classicas: parseNum(inputValues.dm_classicas),
      dimobilli: parseNum(inputValues.dimobilli),
      peliculas: parseNum(inputValues.peliculas),
    };
  }, [inputValues]);

  if (!isOpen) return null;

  const currentSellerObj = allSellers.find(s => s.id === activeSellerId) || {
    id: activeSellerId,
    name: sellerName || 'Colaborador',
    role: 'seller',
  };

  const handleInputChange = (slug: CategorySlug, rawVal: string) => {
    setInputValues(prev => ({
      ...prev,
      [slug]: rawVal,
    }));
  };

  const handleQuickAdjust = (slug: CategorySlug, delta: number) => {
    const current = parsedValues[slug] || 0;
    const next = Math.max(0, Number((current + delta).toFixed(2)));
    setInputValues(prev => ({
      ...prev,
      [slug]: String(next),
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    // Ensure selectedDate belongs to current month/year
    let validDate = selectedDate;
    const [dYear, dMonth] = selectedDate.split('-').map(Number);
    if (dYear !== currentYear || dMonth !== currentMonth) {
      validDate = `${currentYear}-${monthStr}-${String(Math.min(daysInMonth, 24)).padStart(2, '0')}`;
    }

    const newUpdate: DailyEntry = {
      id: `result-${activeSellerId}-${validDate}-${Date.now()}`,
      sellerId: activeSellerId,
      date: validDate,
      values: parsedValues,
      note: note.trim() || `Resultado consolidado de ${currentSellerObj.name} em ${validDate}`,
      updatedBy: currentSellerObj.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveResultUpdate(newUpdate);
    setIsSavedToast(true);
    setTimeout(() => {
      setIsSavedToast(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div
        id="result-update-modal"
        className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/90 px-5 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-sm">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">Atualizar Resultado</h2>
              <p className="text-xs text-slate-500">
                Lançamento do acumulado consolidado &bull; Mês de Referência: <span className="font-bold text-blue-700">{monthStr}/{currentYear}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice banner */}
        <div className="bg-blue-50/80 border-b border-blue-200/60 px-5 sm:px-6 py-2.5 flex items-start gap-2.5 text-xs text-blue-900">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <p>
            Insira o <strong>valor total acumulado até à data</strong> para cada serviço. O sistema recalcula automaticamente as metas diárias restantes e as percentagens de cumprimento.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-4">
          {/* Controls Bar: Seller Selector + Date + Note */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            {/* Seller Selector */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
                <UserIcon className="w-3.5 h-3.5 text-blue-600" />
                Colaborador
              </label>
              {allSellers.length > 0 ? (
                <select
                  value={activeSellerId}
                  onChange={e => setActiveSellerId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none shadow-2xs cursor-pointer"
                >
                  {allSellers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="px-2.5 py-1.5 bg-white rounded-lg border border-slate-300 text-xs font-bold text-slate-800">
                  {currentSellerObj.name}
                </div>
              )}
            </div>

            {/* Reference Date */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                Data de Referência
              </label>
              <input
                type="date"
                min={minDate}
                max={maxDate}
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:border-blue-500 focus:outline-none bg-white shadow-2xs"
                required
              />
            </div>

            {/* Note */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Observação
              </label>
              <input
                type="text"
                placeholder="Ex: Fechamento semanal"
                value={note}
                onChange={e => setNote(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none bg-white shadow-2xs"
              />
            </div>
          </div>

          {/* Categories Inputs List */}
          <div className="space-y-2.5 max-h-[48vh] overflow-y-auto pr-1">
            {categories.map(cat => {
              const currentInput = inputValues[cat.slug] ?? '';
              const numericVal = parsedValues[cat.slug] || 0;
              const isCurrency = cat.metricType === 'currency';

              // Find goal for active seller & current month
              const goal = goals.find(
                g =>
                  g.sellerId === activeSellerId &&
                  g.categorySlug === cat.slug &&
                  g.month === currentMonth &&
                  g.year === currentYear
              );
              const monthlyGoalVal = goal?.targetValue || 0;
              const percent = monthlyGoalVal > 0 ? (numericVal / monthlyGoalVal) * 100 : null;
              const isReached = monthlyGoalVal > 0 && numericVal >= monthlyGoalVal;

              return (
                <div
                  key={cat.slug}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border transition ${
                    isReached
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : 'bg-slate-50/60 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 shadow-2xs">
                      <CategoryIcon slug={cat.slug} className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900 leading-tight">{cat.name}</h4>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                            isCurrency
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-sky-50 text-sky-700 border-sky-200'
                          }`}
                        >
                          {isCurrency ? '€ Valor' : 'Peças (un)'}
                        </span>
                      </div>

                      {/* Goal references info */}
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1 flex-wrap">
                        <span>
                          Meta: <strong className="text-slate-700">{formatCategoryValue(monthlyGoalVal, cat.metricType)}</strong>
                        </span>
                        {percent !== null && (
                          <span className={`font-bold ${isReached ? 'text-emerald-700' : 'text-slate-600'}`}>
                            &bull; {percent.toFixed(0)}% {isReached ? '🎯' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Input controls based on metric type */}
                  {isCurrency ? (
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                          €
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={currentInput}
                          placeholder="0,00"
                          onChange={e => handleInputChange(cat.slug, e.target.value)}
                          className="w-36 rounded-lg border border-slate-300 pl-8 pr-2.5 py-1.5 text-sm font-black text-slate-900 text-right focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleQuickAdjust(cat.slug, -1)}
                        className="w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 flex items-center justify-center text-sm shadow-2xs active:scale-95"
                      >
                        -
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={currentInput}
                        placeholder="0"
                        onChange={e => handleInputChange(cat.slug, e.target.value)}
                        className="w-16 text-center rounded-lg border border-slate-300 py-1.5 text-sm font-black text-slate-900 focus:border-blue-500 focus:outline-none bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleQuickAdjust(cat.slug, 1)}
                        className="w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 flex items-center justify-center text-sm shadow-2xs active:scale-95"
                      >
                        +
                      </button>
                      <span className="text-xs font-bold text-slate-500 ml-1">un</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-xs font-bold text-white hover:bg-blue-700 active:scale-95 transition shadow-sm"
            >
              {isSavedToast ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  Resultado Atualizado!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Gravar e Atualizar Resultado
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
