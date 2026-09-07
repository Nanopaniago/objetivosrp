import {
  User,
  UserRole,
  GoalCategory,
  CategorySlug,
  MetricType,
  MonthlyGoal,
  DailyEntry,
  WorkSchedule,
  ScheduleStatus,
  WorkShift,
  BrandConfig,
} from '../../types';

/**
 * Supabase / PostgreSQL Database Schema Definitions
 *
 * Prepared for future migration from localStorage to Supabase.
 * These types match the relational PostgreSQL table designs:
 * - stores
 * - profiles
 * - goal_categories
 * - monthly_goals
 * - daily_results
 * - work_schedules
 * - store_settings
 */

export interface Database {
  public: {
    Tables: {
      stores: {
        Row: StoreRow;
        Insert: StoreInsert;
        Update: StoreUpdate;
        Relationships: [];
      };
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        Relationships: [];
      };
      goal_categories: {
        Row: GoalCategoryRow;
        Insert: GoalCategoryInsert;
        Update: GoalCategoryUpdate;
        Relationships: [];
      };
      monthly_goals: {
        Row: MonthlyGoalRow;
        Insert: MonthlyGoalInsert;
        Update: MonthlyGoalUpdate;
        Relationships: [];
      };
      daily_results: {
        Row: DailyResultRow;
        Insert: DailyResultInsert;
        Update: DailyResultUpdate;
        Relationships: [];
      };
      work_schedules: {
        Row: WorkScheduleRow;
        Insert: WorkScheduleInsert;
        Update: WorkScheduleUpdate;
        Relationships: [];
      };
      store_settings: {
        Row: StoreSettingRow;
        Insert: StoreSettingInsert;
        Update: StoreSettingUpdate;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// 1. Stores
export interface StoreRow {
  id: string;
  name: string;
  code?: string | null;
  address?: string | null;
  created_at: string;
  updated_at: string;
}

export type StoreInsert = Omit<StoreRow, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type StoreUpdate = Partial<StoreInsert>;

// 2. Profiles (maps to auth.users in Supabase)
export interface ProfileRow {
  id: string; // references auth.users.id
  name: string;
  username: string;
  email: string | null;
  role: UserRole;
  avatar_url: string;
  active: boolean;
  store_id?: string | null;
  store_name?: string | null;
  created_at: string;
  updated_at: string;
}

export type ProfileInsert = Omit<ProfileRow, 'created_at' | 'updated_at'> & {
  created_at?: string;
  updated_at?: string;
};

export type ProfileUpdate = Partial<ProfileInsert>;

// 3. Goal Categories
export interface GoalCategoryRow {
  id: string;
  slug: CategorySlug;
  name: string;
  short_description: string;
  detailed_description: string;
  unit: string;
  metric_type: MetricType;
  icon_name: string;
  badge_color: string;
  sort_order: number;
  created_at: string;
}

export type GoalCategoryInsert = Omit<GoalCategoryRow, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

export type GoalCategoryUpdate = Partial<GoalCategoryInsert>;

// 4. Monthly Goals
export interface MonthlyGoalRow {
  id: string;
  seller_id: string; // references profiles.id
  category_slug: CategorySlug; // references goal_categories.slug
  month: number;
  year: number;
  target_value: number;
  daily_target_value: number | null;
  created_at: string;
  updated_at: string;
}

export type MonthlyGoalInsert = Omit<MonthlyGoalRow, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type MonthlyGoalUpdate = Partial<MonthlyGoalInsert>;

// 5. Daily Results
export interface DailyResultRow {
  id: string;
  seller_id: string; // references profiles.id
  date: string; // YYYY-MM-DD
  values: Record<CategorySlug, number>; // JSONB in PostgreSQL
  note: string | null;
  updated_by: string | null; // references profiles.id
  created_at: string;
  updated_at: string;
}

export type DailyResultInsert = Omit<DailyResultRow, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type DailyResultUpdate = Partial<DailyResultInsert>;

// 6. Work Schedules
export interface WorkScheduleRow {
  id: string;
  seller_id: string; // references profiles.id
  date: string; // YYYY-MM-DD
  status: ScheduleStatus;
  shift: WorkShift | null;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type WorkScheduleInsert = Omit<WorkScheduleRow, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type WorkScheduleUpdate = Partial<WorkScheduleInsert>;

// 7. Store Settings
export interface StoreSettingRow {
  id: string;
  key: string;
  value: Record<string, unknown>; // JSONB
  updated_at: string;
}

export type StoreSettingInsert = Omit<StoreSettingRow, 'id' | 'updated_at'> & {
  id?: string;
  updated_at?: string;
};

export type StoreSettingUpdate = Partial<StoreSettingInsert>;

// ==========================================
// MAPPERS: Domain Types <-> Supabase Rows
// ==========================================

export function profileToUser(row: ProfileRow, fallbackPassword = '123'): User {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    email: row.email || undefined,
    password: fallbackPassword,
    role: row.role,
    avatar: row.avatar_url,
    active: row.active,
    storeName: row.store_name || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function userToProfile(user: User): ProfileInsert {
  return {
    id: user.id,
    name: user.name,
    username: user.username || user.name.toLowerCase().replace(/\s+/g, '.'),
    email: user.email || null,
    role: user.role,
    avatar_url: user.avatar,
    active: user.active !== false,
    store_name: user.storeName || null,
    store_id: null,
  };
}

export function monthlyGoalRowToGoal(row: MonthlyGoalRow): MonthlyGoal {
  return {
    id: row.id,
    sellerId: row.seller_id,
    categorySlug: row.category_slug,
    month: row.month,
    year: row.year,
    targetValue: row.target_value,
    dailyTargetValue: row.daily_target_value || undefined,
    updatedAt: row.updated_at,
  };
}

export function goalToMonthlyGoalRow(goal: MonthlyGoal): MonthlyGoalInsert {
  return {
    id: goal.id,
    seller_id: goal.sellerId,
    category_slug: goal.categorySlug,
    month: goal.month,
    year: goal.year,
    target_value: goal.targetValue,
    daily_target_value: goal.dailyTargetValue || null,
  };
}

export function dailyResultRowToEntry(row: DailyResultRow): DailyEntry {
  return {
    id: row.id,
    sellerId: row.seller_id,
    date: row.date,
    values: row.values,
    note: row.note || undefined,
    updatedBy: row.updated_by || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function dailyEntryToResultRow(entry: DailyEntry): DailyResultInsert {
  return {
    id: entry.id,
    seller_id: entry.sellerId,
    date: entry.date,
    values: entry.values,
    note: entry.note || null,
    updated_by: entry.updatedBy || null,
  };
}

export function workScheduleRowToSchedule(row: WorkScheduleRow): WorkSchedule {
  return {
    id: row.id,
    sellerId: row.seller_id,
    date: row.date,
    status: row.status,
    shift: row.shift || undefined,
    startTime: row.start_time || undefined,
    endTime: row.end_time || undefined,
    notes: row.notes || undefined,
  };
}

export function scheduleToWorkScheduleRow(schedule: WorkSchedule): WorkScheduleInsert {
  return {
    id: schedule.id,
    seller_id: schedule.sellerId,
    date: schedule.date,
    status: schedule.status,
    shift: schedule.shift || null,
    start_time: schedule.startTime || null,
    end_time: schedule.endTime || null,
    notes: schedule.notes || null,
  };
}

export function categoryRowToGoalCategory(row: GoalCategoryRow): GoalCategory {
  return {
    slug: row.slug,
    name: row.name,
    shortDescription: row.short_description,
    detailedDescription: row.detailed_description,
    unit: row.unit,
    metricType: row.metric_type,
    iconName: row.icon_name,
    badgeColor: row.badge_color,
  };
}

export function storeSettingRowToBrandConfig(row: StoreSettingRow): BrandConfig {
  const val = (row.value || {}) as unknown as Partial<BrandConfig>;
  return {
    name: val.name || 'SalesFlow',
    highlightWord: val.highlightWord ?? 'Flow',
    tagline: val.tagline || 'Gestão de Metas & Desempenho Comercial',
    logoType: val.logoType || 'preset',
    logoPreset: val.logoPreset || 'leaf',
    customLogoUrl: val.customLogoUrl,
    accent: val.accent || 'apple_blue',
  };
}

export function brandConfigToStoreSettingRow(config: BrandConfig): StoreSettingInsert {
  return {
    id: 'brand_config',
    key: 'brand_config',
    value: config as unknown as Record<string, unknown>,
  };
}
