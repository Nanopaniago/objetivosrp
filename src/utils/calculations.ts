import {
  CategorySlug,
  DailyEntry,
  GoalCategory,
  MonthlyGoal,
  User,
  WorkSchedule,
  CategoryCalculation,
  ScheduleCalculation,
  SellerPerformanceSummary,
} from '../types';

/**
 * Formats a metric value according to whether it's currency (€) or unit (un).
 */
export function formatCategoryValue(
  value: number | null | undefined,
  metricType: 'currency' | 'unit',
  options?: { showUnit?: boolean; maximumFractionDigits?: number }
): string {
  if (value === null || value === undefined) return '--';
  const showUnit = options?.showUnit ?? true;

  if (metricType === 'currency') {
    const formattedNum = value.toLocaleString('pt-PT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return showUnit ? `${formattedNum} €` : formattedNum;
  }

  const formattedNum = value.toLocaleString('pt-PT', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  });
  return showUnit ? `${formattedNum} un` : formattedNum;
}

/**
 * Calculates schedule metrics for a given seller in a specific month/year
 * relative to the current reference date (today).
 */
export function calculateScheduleStats(
  sellerId: string,
  month: number,
  year: number,
  schedules: WorkSchedule[],
  referenceDateStr?: string
): ScheduleCalculation {
  const daysInMonth = new Date(year, month, 0).getDate();

  const sellerSchedules = schedules.filter(s => {
    if (s.sellerId !== sellerId) return false;
    const [sYear, sMonth] = s.date.split('-').map(Number);
    return sYear === year && sMonth === month;
  });

  const now = new Date();
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth() + 1;
  const nowDay = now.getDate();

  let refDateStr = referenceDateStr;
  if (!refDateStr) {
    if (year < nowYear || (year === nowYear && month < nowMonth)) {
      // Past month
      refDateStr = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
    } else if (year > nowYear || (year === nowYear && month > nowMonth)) {
      // Future month
      refDateStr = `${year}-${String(month).padStart(2, '0')}-00`;
    } else {
      // Current month
      refDateStr = `${year}-${String(month).padStart(2, '0')}-${String(nowDay).padStart(2, '0')}`;
    }
  }

  // Reference day number
  const refDayNum = parseInt(refDateStr.split('-')[2], 10) || 0;
  const remainingCalendarDays = Math.max(0, daysInMonth - Math.min(daysInMonth, refDayNum));

  if (sellerSchedules.length === 0) {
    return {
      totalMonthDays: daysInMonth,
      totalMonthWorkDays: 0,
      totalMonthOffDays: 0,
      pastWorkedDays: 0,
      pastOffDays: 0,
      remainingWorkDays: 0,
      remainingOffDays: 0,
      remainingCalendarDays,
      progressWorkDaysPercent: 0,
      totalAberturaDays: 0,
      totalFechoDays: 0,
      remainingAberturaDays: 0,
      remainingFechoDays: 0,
      pastAberturaDays: 0,
      pastFechoDays: 0,
      referenceDateStr: refDateStr,
      hasSchedule: false,
    };
  }

  let totalMonthWorkDays = 0;
  let totalMonthOffDays = 0;
  let pastWorkedDays = 0;
  let pastOffDays = 0;
  let remainingWorkDays = 0;
  let remainingOffDays = 0;
  let totalAberturaDays = 0;
  let totalFechoDays = 0;
  let remainingAberturaDays = 0;
  let remainingFechoDays = 0;
  let pastAberturaDays = 0;
  let pastFechoDays = 0;

  sellerSchedules.forEach(item => {
    const isAbertura = item.shift === 'abertura' || item.shift === 'manha' || !item.shift;
    const isFecho = item.shift === 'fecho' || item.shift === 'tarde';
    const isPastOrToday = item.date <= refDateStr;

    if (item.status === 'work') {
      totalMonthWorkDays++;
      if (isAbertura) totalAberturaDays++;
      if (isFecho) totalFechoDays++;

      if (isPastOrToday) {
        pastWorkedDays++;
        if (isAbertura) pastAberturaDays++;
        if (isFecho) pastFechoDays++;
      } else {
        remainingWorkDays++;
        if (isAbertura) remainingAberturaDays++;
        if (isFecho) remainingFechoDays++;
      }
    } else if (item.status === 'off') {
      totalMonthOffDays++;
      if (isPastOrToday) {
        pastOffDays++;
      } else {
        remainingOffDays++;
      }
    }
  });

  const progressWorkDaysPercent =
    totalMonthWorkDays > 0 ? Number(((pastWorkedDays / totalMonthWorkDays) * 100).toFixed(1)) : 0;

  return {
    totalMonthDays: daysInMonth,
    totalMonthWorkDays,
    totalMonthOffDays,
    pastWorkedDays,
    pastOffDays,
    remainingWorkDays,
    remainingOffDays,
    remainingCalendarDays,
    progressWorkDaysPercent,
    totalAberturaDays,
    totalFechoDays,
    remainingAberturaDays,
    remainingFechoDays,
    pastAberturaDays,
    pastFechoDays,
    referenceDateStr: refDateStr,
    hasSchedule: true,
  };
}

/**
 * Calculates performance metrics for a single category for a seller.
 */
export function calculateCategoryPerformance(
  category: GoalCategory,
  sellerId: string,
  month: number,
  year: number,
  goals: MonthlyGoal[],
  entries: DailyEntry[],
  scheduleStats: ScheduleCalculation
): CategoryCalculation {
  // Find Goal
  const goalObj = goals.find(
    g => g.sellerId === sellerId && g.categorySlug === category.slug && g.month === month && g.year === year
  );
  const monthlyGoal = goalObj && goalObj.targetValue !== undefined ? Number(goalObj.targetValue) : null;

  // Base Daily Target (monthly goal / total work days of month)
  let baseDailyGoal: number | null = null;
  if (monthlyGoal && monthlyGoal > 0 && scheduleStats.totalMonthWorkDays > 0) {
    baseDailyGoal = Number((monthlyGoal / scheduleStats.totalMonthWorkDays).toFixed(2));
  } else if (goalObj && goalObj.dailyTargetValue !== undefined && goalObj.dailyTargetValue !== null && goalObj.dailyTargetValue > 0) {
    baseDailyGoal = Number(goalObj.dailyTargetValue);
  } else if (monthlyGoal && monthlyGoal > 0) {
    baseDailyGoal = Number((monthlyGoal / 22).toFixed(2));
  }

  // Filter entries/result updates for this seller and this month, sorted by latest
  const sellerEntries = entries
    .filter(e => {
      if (e.sellerId !== sellerId) return false;
      const [eYear, eMonth] = e.date.split('-').map(Number);
      return eYear === year && eMonth === month;
    })
    .sort((a, b) => {
      const timeA = a.updatedAt || a.createdAt || `${a.date}T00:00:00Z`;
      const timeB = b.updatedAt || b.createdAt || `${b.date}T00:00:00Z`;
      return timeB.localeCompare(timeA);
    });

  // The latest result update replaces previous results
  const latestUpdate = sellerEntries[0];
  const rawVal = latestUpdate?.values ? latestUpdate.values[category.slug] : 0;
  let accumulated = 0;
  if (typeof rawVal === 'number') {
    accumulated = isNaN(rawVal) ? 0 : Number(rawVal.toFixed(2));
  } else if (typeof rawVal === 'string') {
    const parsed = parseFloat((rawVal as string).replace(/\s/g, '').replace(',', '.'));
    accumulated = isNaN(parsed) ? 0 : Number(parsed.toFixed(2));
  }

  const lastUpdatedDate = latestUpdate?.date;

  if (monthlyGoal === null || monthlyGoal === undefined || monthlyGoal <= 0) {
    return {
      category,
      monthlyGoal: null,
      dailyGoal: null,
      baseDailyGoal: null,
      dynamicDailyGoal: null,
      remainingWorkDays: scheduleStats.remainingWorkDays,
      calculationFormula: 'Defina a meta mensal para calcular a meta diária',
      accumulated,
      remaining: null,
      percentage: null,
      isGoalReached: false,
      surplus: 0,
      dailyRequiredAverage: null,
      statusMessage: 'Meta ainda não registada',
      lastUpdatedDate,
    };
  }

  const isGoalReached = accumulated >= monthlyGoal;
  const remaining = isGoalReached ? 0 : Number(Math.max(0, monthlyGoal - accumulated).toFixed(2));
  const surplus = isGoalReached ? Number((accumulated - monthlyGoal).toFixed(2)) : 0;
  const percentage = monthlyGoal > 0 ? (accumulated / monthlyGoal) * 100 : 0;

  // Dynamic Daily Goal: (Valor que ainda falta para fechar os objetivos ÷ Dias úteis a serem trabalhados)
  let dynamicDailyGoal: number | null = null;
  let calculationFormula = '';
  let statusMessage = '';

  const remWorkDays = scheduleStats.remainingWorkDays;

  if (isGoalReached) {
    dynamicDailyGoal = 0;
    statusMessage = surplus > 0 ? `Meta superada! (+${formatCategoryValue(surplus, category.metricType)})` : 'Meta atingida!';
    calculationFormula = `Objetivo mensal concluído (+${formatCategoryValue(surplus, category.metricType)} excedente)`;
  } else if (!scheduleStats.hasSchedule) {
    // Fallback if no schedule configured yet
    const fallbackDays = 22;
    dynamicDailyGoal = Number((remaining / fallbackDays).toFixed(2));
    statusMessage = `${formatCategoryValue(dynamicDailyGoal, category.metricType)}/dia (escala não configurada)`;
    calculationFormula = `Falta ${formatCategoryValue(remaining, category.metricType)} ÷ 22 dias padrão`;
  } else if (remWorkDays <= 0) {
    dynamicDailyGoal = remaining;
    statusMessage = 'Sem mais dias de trabalho agendados';
    calculationFormula = `Falta ${formatCategoryValue(remaining, category.metricType)} (0 dias de trabalho restantes)`;
  } else {
    // Exact requested formula: Valor que falta ÷ Dias a serem trabalhados
    dynamicDailyGoal = Number((remaining / remWorkDays).toFixed(2));
    statusMessage = `${formatCategoryValue(dynamicDailyGoal, category.metricType)}/dia restante`;
    calculationFormula = `Falta ${formatCategoryValue(remaining, category.metricType)} ÷ ${remWorkDays} ${remWorkDays === 1 ? 'dia a trabalhar' : 'dias a trabalhar'}`;
  }

  return {
    category,
    monthlyGoal,
    dailyGoal: dynamicDailyGoal,
    baseDailyGoal,
    dynamicDailyGoal,
    remainingWorkDays: remWorkDays,
    calculationFormula,
    accumulated,
    remaining,
    percentage,
    isGoalReached,
    surplus,
    dailyRequiredAverage: dynamicDailyGoal,
    statusMessage,
    lastUpdatedDate,
  };
}

/**
 * Calculates complete summary for a seller across all categories and schedule.
 */
export function calculateSellerPerformanceSummary(
  seller: User,
  month: number,
  year: number,
  categories: GoalCategory[],
  goals: MonthlyGoal[],
  entries: DailyEntry[],
  schedules: WorkSchedule[],
  referenceDateStr?: string
): SellerPerformanceSummary {
  const scheduleStats = calculateScheduleStats(seller.id, month, year, schedules, referenceDateStr);

  const categoryCalcs: Record<CategorySlug, CategoryCalculation> = {} as any;
  let totalPercentSum = 0;
  let categoriesWithGoals = 0;

  categories.forEach(cat => {
    const calc = calculateCategoryPerformance(cat, seller.id, month, year, goals, entries, scheduleStats);
    categoryCalcs[cat.slug] = calc;

    if (calc.percentage !== null) {
      totalPercentSum += calc.percentage;
      categoriesWithGoals++;
    }
  });

  const overallProgressPercentage =
    categoriesWithGoals > 0 ? Number((totalPercentSum / categoriesWithGoals).toFixed(1)) : 0;

  return {
    seller,
    month,
    year,
    categories: categoryCalcs,
    scheduleStats,
    overallProgressPercentage,
  };
}
