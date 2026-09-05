export type UserRole = 'seller' | 'manager' | 'admin' | 'super_admin';

export type CategorySlug = 
  | 'plus_master'
  | 'plus'
  | 'megas_total'
  | 'dm_classicas'
  | 'dimobilli'
  | 'peliculas';

export type MetricType = 'currency' | 'unit';

export interface GoalCategory {
  slug: CategorySlug;
  name: string;
  shortDescription: string;
  detailedDescription: string;
  unit: string;
  metricType: MetricType;
  iconName: string;
  badgeColor: string;
}

export interface User {
  id: string;
  name: string;
  username?: string; // Nome de utilizador para início de sessão
  email?: string; // E-mail opcional de contacto
  password?: string;
  role: UserRole;
  avatar: string;
  active: boolean;
  storeName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyGoal {
  id: string;
  sellerId: string;
  categorySlug: CategorySlug;
  month: number; // 1-12
  year: number;
  targetValue: number; // Meta Mensal
  dailyTargetValue?: number; // Meta Diária
  updatedAt: string;
}

export interface DailyEntry {
  id: string;
  sellerId: string;
  date: string; // YYYY-MM-DD
  values: Record<CategorySlug, number>;
  note?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type ScheduleStatus = 'work' | 'off';
export type WorkShift = 'abertura' | 'fecho' | 'manha' | 'tarde' | 'personalizado';

export interface ShiftInfo {
  id: WorkShift;
  name: string;
  shortName: string;
  startTime: string;
  endTime: string;
  timeRange: string;
}

export const WORK_SHIFTS: Record<'abertura' | 'fecho', ShiftInfo> = {
  abertura: {
    id: 'abertura',
    name: 'Turno de Abertura',
    shortName: 'Abertura',
    startTime: '09:30',
    endTime: '18:30',
    timeRange: '09:30 às 18:30',
  },
  fecho: {
    id: 'fecho',
    name: 'Turno de Fecho',
    shortName: 'Fecho',
    startTime: '11:30',
    endTime: '20:30',
    timeRange: '11:30 às 20:30',
  },
};

export interface WorkSchedule {
  id: string;
  sellerId: string;
  date: string; // YYYY-MM-DD
  status: ScheduleStatus;
  shift?: WorkShift;
  startTime?: string;
  endTime?: string;
  notes?: string;
}

export interface CategoryCalculation {
  category: GoalCategory;
  monthlyGoal: number | null;
  dailyGoal: number | null;
  baseDailyGoal: number | null;
  dynamicDailyGoal: number | null;
  remainingWorkDays: number;
  calculationFormula: string;
  accumulated: number;
  remaining: number | null;
  percentage: number | null;
  isGoalReached: boolean;
  surplus: number;
  dailyRequiredAverage: number | null;
  statusMessage: string;
  lastUpdatedDate?: string;
}

export interface ScheduleCalculation {
  totalMonthDays: number;
  totalMonthWorkDays: number;
  totalMonthOffDays: number;
  pastWorkedDays: number;
  pastOffDays: number;
  remainingWorkDays: number;
  remainingOffDays: number;
  remainingCalendarDays: number;
  progressWorkDaysPercent: number;
  totalAberturaDays: number;
  totalFechoDays: number;
  remainingAberturaDays: number;
  remainingFechoDays: number;
  pastAberturaDays: number;
  pastFechoDays: number;
  referenceDateStr: string;
  hasSchedule: boolean;
}

export interface SellerPerformanceSummary {
  seller: User;
  month: number;
  year: number;
  categories: Record<CategorySlug, CategoryCalculation>;
  scheduleStats: ScheduleCalculation;
  overallProgressPercentage: number;
}

export type BrandAccent = 'graphite' | 'apple_blue' | 'indigo' | 'emerald' | 'amber';

export type LogoPreset = 'leaf' | 'sparkle' | 'pulse' | 'wave' | 'gem' | 'target' | 'flow';

export interface BrandConfig {
  name: string; // e.g. "SalesFlow"
  highlightWord?: string; // e.g. "Flow"
  tagline: string; // e.g. "Gestão de Metas & Alta Performance"
  logoType: 'preset' | 'custom_image';
  logoPreset: LogoPreset;
  customLogoUrl?: string; // uploaded image Data URL or image link
  accent: BrandAccent;
}
