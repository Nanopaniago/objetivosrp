import React, { useState, useMemo } from 'react';
import { User, GoalCategory, MonthlyGoal, CategorySlug, WorkSchedule } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { calculateScheduleStats, formatCategoryValue } from '../utils/calculations';
import { Target, Save, Check, Calendar, Sparkles, Info } from 'lucide-react';

interface GoalsManagerProps {
  sellers: User[];
  categories: GoalCategory[];
  currentMonth: number;
  currentYear: number;
  goals: MonthlyGoal[];
  schedules?: WorkSchedule[];
  onSaveGoals: (updatedGoals: MonthlyGoal[]) => void;
}

export const GoalsManager: React.FC<GoalsManagerProps> = ({
  sellers,
  categories,
  currentMonth,
  currentYear,
  goals,
  schedules = [],
  onSaveGoals,
}) => {
  const [selectedSellerId, setSelectedSellerId] = useState<string>(sellers[0]?.id || '');

  // Monthly goals string input state (allows natural decimal typing & clearing)
  const [monthlyInputs, setMonthlyInputs] = useState<Record<CategorySlug, string>>(() => {
    const initial: Record<CategorySlug, string> = {} as any;
    categories.forEach(cat => {
      const g = goals.find(
        item =>
          item.sellerId === (sellers[0]?.id || '') &&
          item.categorySlug === cat.slug &&
          item.month === currentMonth &&
          item.year === currentYear
      );
      initial[cat.slug] = g && g.targetValue ? String(g.targetValue) : '';
    });
    return initial;
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  const selectedSeller = sellers.find(s => s.id === selectedSellerId);

  // Compute work days for selected seller
  const scheduleStats = calculateScheduleStats(selectedSellerId, currentMonth, currentYear, schedules);
  const workDaysCount = scheduleStats.hasSchedule && scheduleStats.totalMonthWorkDays > 0 ? scheduleStats.totalMonthWorkDays : 22;

  // Helper to parse input to number safely
  const parseVal = (str: string): number => {
    if (!str || str.trim() === '') return 0;
    const clean = str.replace(/\s/g, '').replace(',', '.');
    const val = parseFloat(clean);
    return isNaN(val) ? 0 : Math.max(0, val);
  };

  const parsedMonthlyValues = useMemo(() => {
    const res: Record<CategorySlug, number> = {} as any;
    categories.forEach(cat => {
      res[cat.slug] = parseVal(monthlyInputs[cat.slug]);
    });
    return res;
  }, [monthlyInputs, categories]);

  const handleSellerChange = (sellerId: string) => {
    setSelectedSellerId(sellerId);
    const updatedMonthly: Record<CategorySlug, string> = {} as any;

    categories.forEach(cat => {
      const g = goals.find(
        item =>
          item.sellerId === sellerId &&
          item.categorySlug === cat.slug &&
          item.month === currentMonth &&
          item.year === currentYear
      );
      updatedMonthly[cat.slug] = g && g.targetValue ? String(g.targetValue) : '';
    });

    setMonthlyInputs(updatedMonthly);
  };

  const handleMonthlyChange = (slug: CategorySlug, valStr: string) => {
    setMonthlyInputs(prev => ({
      ...prev,
      [slug]: valStr,
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const otherGoals = goals.filter(
      g => !(g.sellerId === selectedSellerId && g.month === currentMonth && g.year === currentYear)
    );

    const newGoalsForSeller: MonthlyGoal[] = categories.map(cat => {
      const mVal = parsedMonthlyValues[cat.slug] || 0;
      // Automatic daily target calculation: Monthly Goal ÷ Work Days
      const dailyTarget = workDaysCount > 0 && mVal > 0 ? Number((mVal / workDaysCount).toFixed(2)) : 0;

      return {
        id: `goal-${selectedSellerId}-${cat.slug}-${currentMonth}-${currentYear}`,
        sellerId: selectedSellerId,
        categorySlug: cat.slug,
        month: currentMonth,
        year: currentYear,
        targetValue: mVal,
        dailyTargetValue: dailyTarget,
        updatedAt: new Date().toISOString(),
      };
    });

    onSaveGoals([...otherGoals, ...newGoalsForSeller]);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">Gestão de Metas Mensais</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Defina a meta mensal de cada serviço. O objetivo diário é calculado automaticamente pela divisão do valor mensal pelos dias de trabalho na escala ({workDaysCount} dias).
          </p>
        </div>

        {/* Seller Selection */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-600">Vendedor:</label>
            <select
              value={selectedSellerId}
              onChange={e => handleSellerChange(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none shadow-2xs cursor-pointer"
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

      {/* Schedule & Working Days Context Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 text-xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="font-bold text-slate-800">
            Escala de {selectedSeller?.name}:
          </span>
          <span className="text-slate-600">
            {scheduleStats.hasSchedule ? (
              <>
                <strong>{scheduleStats.totalMonthWorkDays} dias de trabalho</strong> no mês ({scheduleStats.remainingWorkDays} restantes) &bull;{' '}
                <strong>{scheduleStats.totalMonthOffDays} folgas</strong>
              </>
            ) : (
              <span className="text-amber-700 font-semibold">Sem escala personalizada (a utilizar 22 dias úteis padrão)</span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-700">
          <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-200">
            {scheduleStats.totalAberturaDays} Aberturas
          </span>
          <span className="bg-indigo-100 text-indigo-900 px-2 py-0.5 rounded border border-indigo-200">
            {scheduleStats.totalFechoDays} Fechos
          </span>
        </div>
      </div>

      {/* Form Grid */}
      <form onSubmit={handleSave}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {categories.map(cat => {
            const rawInput = monthlyInputs[cat.slug] ?? '';
            const mVal = parsedMonthlyValues[cat.slug] || 0;
            const isCurrency = cat.metricType === 'currency';

            // Real-time automatic daily target calculation
            const computedDailyTarget = workDaysCount > 0 && mVal > 0
              ? Number((mVal / workDaysCount).toFixed(2))
              : 0;

            return (
              <div
                key={cat.slug}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-200 transition flex flex-col justify-between space-y-3.5"
              >
                {/* Header of Category */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 shrink-0">
                        <CategoryIcon slug={cat.slug} className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <h4 className="text-sm font-bold text-slate-900 truncate">{cat.name}</h4>
                        <span className="text-[10px] text-slate-500 block truncate">{cat.shortDescription}</span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                      isCurrency ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-sky-50 text-sky-700 border-sky-200'
                    }`}>
                      {isCurrency ? '€ Valor' : 'Peças (un)'}
                    </span>
                  </div>

                  {/* Single Clean Input: Meta Mensal */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Meta Mensal
                    </label>
                    <div className="relative">
                      {isCurrency && (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                          €
                        </span>
                      )}
                      <input
                        type="text"
                        inputMode="decimal"
                        value={rawInput}
                        placeholder={isCurrency ? '0,00' : '0'}
                        onChange={e => handleMonthlyChange(cat.slug, e.target.value)}
                        className={`w-full rounded-xl border border-slate-300 py-2.5 text-sm font-black text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 bg-white shadow-2xs transition ${
                          isCurrency ? 'pl-8 pr-3' : 'px-3'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Automatic Daily Target Box (Computed from Monthly ÷ Work Days) */}
                <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/80">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-blue-600" />
                      Objetivo Diário Calculado
                    </span>
                    <span className="text-[10px] font-bold text-blue-900 bg-white px-2 py-0.5 rounded-md border border-blue-200 shadow-2xs">
                      {computedDailyTarget > 0 ? `${formatCategoryValue(computedDailyTarget, cat.metricType)} / dia` : '--'}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center justify-between text-[10px] text-blue-800/80 pt-1 border-t border-blue-100">
                    <span>Fórmula automática:</span>
                    <span className="font-semibold">
                      {mVal > 0 ? `${formatCategoryValue(mVal, cat.metricType)} ÷ ${workDaysCount} dias` : `Meta Mensal ÷ ${workDaysCount} dias`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer save */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-slate-500 text-center sm:text-left flex items-center gap-1.5">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            As metas definidas aplicam-se a <strong>{selectedSeller?.name}</strong> no mês {currentMonth.toString().padStart(2, '0')}/{currentYear}.
          </span>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-xs font-bold text-white hover:bg-blue-700 active:scale-95 transition shadow-sm cursor-pointer"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                Metas Guardadas com Sucesso!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Guardar Metas de {selectedSeller?.name}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
