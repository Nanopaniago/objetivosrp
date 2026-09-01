import React, { useState } from 'react';
import { User, GoalCategory, MonthlyGoal, CategorySlug, WorkSchedule } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { calculateScheduleStats } from '../utils/calculations';
import { Target, Save, Check, Calculator, Calendar, DollarSign, Package, Sparkles } from 'lucide-react';

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

  // Monthly goals state
  const [monthlyTargetValues, setMonthlyTargetValues] = useState<Record<CategorySlug, number>>(() => {
    const initial: Record<CategorySlug, number> = {} as any;
    categories.forEach(cat => {
      const g = goals.find(
        item =>
          item.sellerId === (sellers[0]?.id || '') &&
          item.categorySlug === cat.slug &&
          item.month === currentMonth &&
          item.year === currentYear
      );
      initial[cat.slug] = g ? g.targetValue : 0;
    });
    return initial;
  });

  // Daily goals state
  const [dailyTargetValues, setDailyTargetValues] = useState<Record<CategorySlug, number>>(() => {
    const initial: Record<CategorySlug, number> = {} as any;
    categories.forEach(cat => {
      const g = goals.find(
        item =>
          item.sellerId === (sellers[0]?.id || '') &&
          item.categorySlug === cat.slug &&
          item.month === currentMonth &&
          item.year === currentYear
      );
      initial[cat.slug] = g && g.dailyTargetValue !== undefined ? g.dailyTargetValue : 0;
    });
    return initial;
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  const selectedSeller = sellers.find(s => s.id === selectedSellerId);

  // Compute work days for selected seller
  const scheduleStats = calculateScheduleStats(selectedSellerId, currentMonth, currentYear, schedules);
  const workDaysCount = scheduleStats.hasSchedule && scheduleStats.totalMonthWorkDays > 0 ? scheduleStats.totalMonthWorkDays : 22;

  const handleSellerChange = (sellerId: string) => {
    setSelectedSellerId(sellerId);
    const updatedMonthly: Record<CategorySlug, number> = {} as any;
    const updatedDaily: Record<CategorySlug, number> = {} as any;

    categories.forEach(cat => {
      const g = goals.find(
        item =>
          item.sellerId === sellerId &&
          item.categorySlug === cat.slug &&
          item.month === currentMonth &&
          item.year === currentYear
      );
      updatedMonthly[cat.slug] = g ? g.targetValue : 0;
      updatedDaily[cat.slug] = g && g.dailyTargetValue !== undefined ? g.dailyTargetValue : 0;
    });

    setMonthlyTargetValues(updatedMonthly);
    setDailyTargetValues(updatedDaily);
  };

  const handleMonthlyChange = (slug: CategorySlug, val: number) => {
    setMonthlyTargetValues(prev => ({
      ...prev,
      [slug]: Math.max(0, val),
    }));
  };

  const handleDailyChange = (slug: CategorySlug, val: number) => {
    setDailyTargetValues(prev => ({
      ...prev,
      [slug]: Math.max(0, val),
    }));
  };

  const handleAutoCalculateDaily = (slug: CategorySlug) => {
    const mVal = monthlyTargetValues[slug] || 0;
    if (mVal > 0 && workDaysCount > 0) {
      const calculated = Number((mVal / workDaysCount).toFixed(2));
      handleDailyChange(slug, calculated);
    }
  };

  const handleAutoCalculateAllDaily = () => {
    categories.forEach(cat => {
      const mVal = monthlyTargetValues[cat.slug] || 0;
      if (mVal > 0 && workDaysCount > 0) {
        const calculated = Number((mVal / workDaysCount).toFixed(2));
        setDailyTargetValues(prev => ({
          ...prev,
          [cat.slug]: calculated,
        }));
      }
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const otherGoals = goals.filter(
      g => !(g.sellerId === selectedSellerId && g.month === currentMonth && g.year === currentYear)
    );

    const newGoalsForSeller: MonthlyGoal[] = categories.map(cat => ({
      id: `goal-${selectedSellerId}-${cat.slug}-${currentMonth}-${currentYear}`,
      sellerId: selectedSellerId,
      categorySlug: cat.slug,
      month: currentMonth,
      year: currentYear,
      targetValue: monthlyTargetValues[cat.slug] || 0,
      dailyTargetValue: dailyTargetValues[cat.slug] || 0,
      updatedAt: new Date().toISOString(),
    }));

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
            <h2 className="text-lg font-bold text-slate-900">Gestão de Metas Mensais e Diárias</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Defina a meta mensal e a meta diária para cada serviço e modalidade para o mês {currentMonth.toString().padStart(2, '0')}/{currentYear}.
          </p>
        </div>

        {/* Seller Selection & Auto Calc */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleAutoCalculateAllDaily}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-bold transition"
            title={`Calcular Meta Diária com base nos ${workDaysCount} dias de trabalho`}
          >
            <Calculator className="w-3.5 h-3.5 text-blue-600" />
            Calcular Diárias Auto ({workDaysCount} dias)
          </button>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-600">Vendedor:</label>
            <select
              value={selectedSellerId}
              onChange={e => handleSellerChange(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
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
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 text-xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span className="font-bold text-slate-800">
            Escala de {selectedSeller?.name}:
          </span>
          <span className="text-slate-600">
            {scheduleStats.hasSchedule ? (
              <>
                <strong>{scheduleStats.totalMonthWorkDays} dias de trabalho</strong> no mês &bull;{' '}
                <strong>{scheduleStats.remainingWorkDays} dias úteis a trabalhar</strong> até ao fim do mês &bull;{' '}
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
            const mVal = monthlyTargetValues[cat.slug] ?? 0;
            const dVal = dailyTargetValues[cat.slug] ?? 0;
            const isCurrency = cat.metricType === 'currency';

            return (
              <div
                key={cat.slug}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-200 transition flex flex-col justify-between"
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

                  {/* Two Columns: Monthly Target and Daily Target */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Monthly Target */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Meta Mensal
                      </label>
                      <div className="relative">
                        {isCurrency && (
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                            €
                          </span>
                        )}
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={mVal === 0 ? '' : mVal}
                          placeholder={isCurrency ? '0,00' : '0'}
                          onChange={e => {
                            const raw = e.target.value;
                            const parsed = parseFloat(raw.replace(',', '.'));
                            handleMonthlyChange(cat.slug, isNaN(parsed) ? 0 : parsed);
                          }}
                          className={`w-full rounded-lg border border-slate-300 py-1.5 text-xs font-bold text-slate-900 focus:border-blue-500 focus:outline-none bg-white ${
                            isCurrency ? 'pl-7 pr-2' : 'px-2.5'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Daily Target */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-bold uppercase text-blue-700">
                          Meta Diária
                        </label>
                        <button
                          type="button"
                          onClick={() => handleAutoCalculateDaily(cat.slug)}
                          title="Dividir mensal pelos dias de trabalho"
                          className="text-[9px] font-bold text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          Auto
                        </button>
                      </div>
                      <div className="relative">
                        {isCurrency && (
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-500">
                            €
                          </span>
                        )}
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={dVal === 0 ? '' : dVal}
                          placeholder={isCurrency ? '0,00' : '0'}
                          onChange={e => {
                            const raw = e.target.value;
                            const parsed = parseFloat(raw.replace(',', '.'));
                            handleDailyChange(cat.slug, isNaN(parsed) ? 0 : parsed);
                          }}
                          className={`w-full rounded-lg border border-blue-300 py-1.5 text-xs font-bold text-blue-950 focus:border-blue-600 focus:outline-none bg-blue-50/40 ${
                            isCurrency ? 'pl-7 pr-2' : 'px-2.5'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Subtext info */}
                <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500">
                  <span>
                    Ritmo diário: <strong>{dVal > 0 ? (isCurrency ? `${dVal.toFixed(2)} €` : `${dVal} un`) : '--'}</strong>
                  </span>
                  <span>{workDaysCount} dias de trabalho</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer save */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-slate-500 text-center sm:text-left">
            As metas definidas são específicas para {selectedSeller?.name} no mês {currentMonth.toString().padStart(2, '0')}/{currentYear}.
          </span>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-xs font-bold text-white hover:bg-blue-700 active:scale-95 transition shadow-sm"
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
