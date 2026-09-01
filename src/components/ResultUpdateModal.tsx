import React, { useState, useEffect } from 'react';
import { GoalCategory, DailyEntry, CategorySlug, MonthlyGoal } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { formatCategoryValue } from '../utils/calculations';
import { X, Save, Calendar, Check, AlertCircle, RefreshCw, Sparkles, TrendingUp } from 'lucide-react';

interface ResultUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  sellerId: string;
  sellerName: string;
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
  categories,
  goals,
  existingEntries,
  currentMonth,
  currentYear,
  onSaveResultUpdate,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [note, setNote] = useState<string>('');

  const [values, setValues] = useState<Record<CategorySlug, number>>({
    plus_master: 0,
    plus: 0,
    megas_total: 0,
    dm_classicas: 0,
    dimobilli: 0,
    peliculas: 0,
  });

  const [isSavedToast, setIsSavedToast] = useState(false);

  // Load the most recent result update or specific date entry for this seller
  useEffect(() => {
    if (!isOpen) return;

    // Look for existing entry for this specific date or the latest update in this month
    const sellerMonthEntries = existingEntries
      .filter(e => {
        if (e.sellerId !== sellerId) return false;
        const [y, m] = e.date.split('-').map(Number);
        return y === currentYear && m === currentMonth;
      })
      .sort((a, b) => {
        const timeA = a.updatedAt || a.createdAt || `${a.date}T00:00:00Z`;
        const timeB = b.updatedAt || b.createdAt || `${b.date}T00:00:00Z`;
        return timeB.localeCompare(timeA);
      });

    const currentOrLatest =
      sellerMonthEntries.find(e => e.date === selectedDate) || sellerMonthEntries[0];

    if (currentOrLatest) {
      setValues({
        plus_master: currentOrLatest.values.plus_master || 0,
        plus: currentOrLatest.values.plus || 0,
        megas_total: currentOrLatest.values.megas_total || 0,
        dm_classicas: currentOrLatest.values.dm_classicas || 0,
        dimobilli: currentOrLatest.values.dimobilli || 0,
        peliculas: currentOrLatest.values.peliculas || 0,
      });
      setNote(currentOrLatest.note || '');
    } else {
      setValues({
        plus_master: 0,
        plus: 0,
        megas_total: 0,
        dm_classicas: 0,
        dimobilli: 0,
        peliculas: 0,
      });
      setNote('');
    }
  }, [selectedDate, sellerId, existingEntries, isOpen, currentMonth, currentYear]);

  if (!isOpen) return null;

  const handleValueChange = (slug: CategorySlug, val: number) => {
    setValues(prev => ({
      ...prev,
      [slug]: Math.max(0, val),
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const newUpdate: DailyEntry = {
      id: `result-${sellerId}-${selectedDate}-${Date.now()}`,
      sellerId,
      date: selectedDate,
      values,
      note: note.trim() || 'Atualização do resultado consolidado do vendedor',
      updatedBy: sellerName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveResultUpdate(newUpdate);
    setIsSavedToast(true);
    setTimeout(() => {
      setIsSavedToast(false);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div
        id="result-update-modal"
        className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">Atualização do Resultado</h2>
              <p className="text-xs text-slate-500">
                Colaborador: <span className="font-bold text-slate-800">{sellerName}</span> &bull; {currentMonth.toString().padStart(2, '0')}/{currentYear}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice banner */}
        <div className="bg-amber-50/80 border-b border-amber-200/60 px-6 py-2.5 flex items-start gap-2.5 text-xs text-amber-900">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p>
            <strong>Atenção:</strong> Esta atualização substitui os dados de resultado anteriores deste mês para o vendedor selecionado, mantendo a foto consolidada do desempenho atual.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6">
          {/* Date & Note Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                Data de Referência
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-bold text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Observação (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: Ponto de situação semanal..."
                value={note}
                onChange={e => setNote(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition bg-white"
              />
            </div>
          </div>

          {/* Categories Inputs */}
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {categories.map(cat => {
              const currentVal = values[cat.slug] || 0;
              const isCurrency = cat.metricType === 'currency';

              // Find goal for category
              const goal = goals.find(
                g => g.sellerId === sellerId && g.categorySlug === cat.slug && g.month === currentMonth && g.year === currentYear
              );
              const monthlyGoalVal = goal?.targetValue || 0;
              const dailyGoalVal = goal?.dailyTargetValue;

              const percent = monthlyGoalVal > 0 ? (currentVal / monthlyGoalVal) * 100 : null;

              return (
                <div
                  key={cat.slug}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 shadow-2xs">
                      <CategoryIcon slug={cat.slug} className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900 leading-none">{cat.name}</h4>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                          isCurrency ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-sky-50 text-sky-700 border-sky-200'
                        }`}>
                          {isCurrency ? '€ Valor' : 'Peças (un)'}
                        </span>
                      </div>

                      {/* Goal references info */}
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1 flex-wrap">
                        <span>
                          Meta Mês: <strong className="text-slate-700">{formatCategoryValue(monthlyGoalVal, cat.metricType)}</strong>
                        </span>
                        {dailyGoalVal !== undefined && dailyGoalVal !== null && dailyGoalVal > 0 && (
                          <span className="text-blue-600 font-semibold">
                            &bull; Meta Dia: <strong>{formatCategoryValue(dailyGoalVal, cat.metricType)}</strong>
                          </span>
                        )}
                        {percent !== null && (
                          <span className={`font-bold ${percent >= 100 ? 'text-emerald-600' : 'text-slate-600'}`}>
                            ({percent.toFixed(0)}%)
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
                          type="number"
                          step="any"
                          min="0"
                          value={currentVal === 0 ? '' : currentVal}
                          placeholder="0,00"
                          onChange={e => {
                            const raw = e.target.value;
                            const parsed = parseFloat(raw.replace(',', '.'));
                            handleValueChange(cat.slug, isNaN(parsed) ? 0 : parsed);
                          }}
                          className="w-32 sm:w-36 rounded-lg border border-slate-300 pl-8 pr-2.5 py-1.5 text-sm font-bold text-slate-900 text-right focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleValueChange(cat.slug, Math.max(0, Number((currentVal - 1).toFixed(2))))}
                        className="w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 flex items-center justify-center text-sm shadow-2xs"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={currentVal === 0 ? '' : currentVal}
                        placeholder="0"
                        onChange={e => {
                          const raw = e.target.value;
                          const parsed = parseFloat(raw.replace(',', '.'));
                          handleValueChange(cat.slug, isNaN(parsed) ? 0 : parsed);
                        }}
                        className="w-16 text-center rounded-lg border border-slate-300 py-1 text-sm font-bold text-slate-900 focus:border-blue-500 focus:outline-none bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleValueChange(cat.slug, Number((currentVal + 1).toFixed(2)))}
                        className="w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 flex items-center justify-center text-sm shadow-2xs"
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
          <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
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
                  Resultado Gravado!
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
