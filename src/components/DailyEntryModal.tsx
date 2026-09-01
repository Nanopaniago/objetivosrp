import React, { useState, useEffect } from 'react';
import { GoalCategory, DailyEntry, CategorySlug } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { X, Save, Calendar, Check, AlertCircle } from 'lucide-react';

interface DailyEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sellerId: string;
  sellerName: string;
  categories: GoalCategory[];
  existingEntries: DailyEntry[];
  onSaveEntry: (entry: DailyEntry) => void;
}

export const DailyEntryModal: React.FC<DailyEntryModalProps> = ({
  isOpen,
  onClose,
  sellerId,
  sellerName,
  categories,
  existingEntries,
  onSaveEntry,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const [values, setValues] = useState<Record<CategorySlug, number>>({
    plus_master: 0,
    plus: 0,
    megas_total: 0,
    dm_classicas: 0,
    dimobilli: 0,
    peliculas: 0,
  });

  const [isSavedToast, setIsSavedToast] = useState(false);

  // Load existing values if editing a date that already has an entry
  useEffect(() => {
    const existing = existingEntries.find(
      e => e.sellerId === sellerId && e.date === selectedDate
    );

    if (existing) {
      setValues({
        plus_master: existing.values.plus_master || 0,
        plus: existing.values.plus || 0,
        megas_total: existing.values.megas_total || 0,
        dm_classicas: existing.values.dm_classicas || 0,
        dimobilli: existing.values.dimobilli || 0,
        peliculas: existing.values.peliculas || 0,
      });
    } else {
      setValues({
        plus_master: 0,
        plus: 0,
        megas_total: 0,
        dm_classicas: 0,
        dimobilli: 0,
        peliculas: 0,
      });
    }
  }, [selectedDate, sellerId, existingEntries, isOpen]);

  if (!isOpen) return null;

  const handleValueChange = (slug: CategorySlug, val: number) => {
    setValues(prev => ({
      ...prev,
      [slug]: Math.max(0, val),
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const existing = existingEntries.find(
      e => e.sellerId === sellerId && e.date === selectedDate
    );

    const newEntry: DailyEntry = {
      id: existing ? existing.id : `entry-${sellerId}-${selectedDate}`,
      sellerId,
      date: selectedDate,
      values,
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveEntry(newEntry);
    setIsSavedToast(true);
    setTimeout(() => {
      setIsSavedToast(false);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div
        id="daily-entry-modal"
        className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Lançamento Diário de Vendas</h2>
            <p className="text-xs text-slate-500">
              Registrando para: <span className="font-semibold text-slate-800">{sellerName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6">
          {/* Date Selector */}
          <div className="mb-5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-600" />
              Data do Lançamento
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
              required
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Informe apenas o que você vendeu nesta data específica. O sistema calcula os acumulados automaticamente.
            </p>
          </div>

          {/* Categories Inputs */}
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {categories.map(cat => {
              const currentVal = values[cat.slug] || 0;
              const isCurrency = cat.metricType === 'currency';

              return (
                <div
                  key={cat.slug}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 shadow-2xs">
                      <CategoryIcon slug={cat.slug} className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-semibold text-slate-900 leading-none">{cat.name}</h4>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                          isCurrency ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-sky-50 text-sky-700 border-sky-200'
                        }`}>
                          {isCurrency ? '€ Valor' : 'Unidades'}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 mt-0.5 inline-block">{cat.shortDescription}</span>
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
                          className="w-28 sm:w-36 rounded-lg border border-slate-300 pl-8 pr-2.5 py-1.5 text-sm font-bold text-slate-900 text-right focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 bg-white"
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
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 active:scale-95 transition shadow-sm"
            >
              {isSavedToast ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  Salvo com Sucesso!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Confirmar Lançamento
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
