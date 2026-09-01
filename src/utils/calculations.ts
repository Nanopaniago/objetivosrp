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

  // Daily target defined or estimated
  let dailyGoal: number | null = null;
  if (goalObj && goalObj.dailyTargetValue !== undefined && goalObj.dailyTargetValue !== null && goalObj.dailyTargetValue > 0) {
    dailyGoal = Number(goalObj.dailyTargetValue);
  } else if (monthlyGoal && monthlyGoal > 0 && scheduleStats.totalMonthWorkDays > 0) {
    dailyGoal = Number((monthlyGoal / scheduleStats.totalMonthWorkDays).toFixed(2));
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
  const accumulated = latestUpdate
    ? Number((latestUpdate.values[category.slug] || 0).toFixed(2))
    : 0;

  const lastUpdatedDate = latestUpdate?.date;

  if (monthlyGoal === null || monthlyGoal === undefined || monthlyGoal <= 0) {
    return {
      category,
      monthlyGoal: null,
      dailyGoal,
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

  // Daily Required Average based on remaining work days
  let dailyRequiredAverage: number | null = null;
  let statusMessage = '';

  if (isGoalReached) {
    statusMessage = surplus > 0 ? `Meta superada! (+${formatCategoryValue(surplus, category.metricType)})` : 'Meta atingida!';
    dailyRequiredAverage = 0;
  } else if (!scheduleStats.hasSchedule) {
    statusMessage = 'Escala não configurada';
    dailyRequiredAverage = null;
  } else if (scheduleStats.remainingWorkDays <= 0) {
    statusMessage = 'Sem dias restantes de trabalho';
    dailyRequiredAverage = null;
  } else {
    // Avoid division by zero
    dailyRequiredAverage = Number((remaining / scheduleStats.remainingWorkDays).toFixed(2));
    statusMessage = `${formatCategoryValue(dailyRequiredAverage, category.metricType)}/dia restante`;
  }

  return {
    category,
    monthlyGoal,
    dailyGoal,
    accumulated,
    remaining,
    percentage,
    isGoalReached,
    surplus,
    dailyRequiredAverage,
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
