import { MonthlyGoal } from '../types';
import { generateInitialGoals } from '../data/initialData';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase/client';
import {
  monthlyGoalRowToGoal,
  goalToMonthlyGoalRow,
  MonthlyGoalRow,
} from '../lib/supabase/types';

/**
 * Goals Service
 *
 * Persists and queries monthly seller goals directly from Supabase `monthly_goals` table.
 * Does NOT use localStorage.
 */
export class GoalsService {
  private inMemoryCache: MonthlyGoal[] = [];

  constructor() {
    const today = new Date();
    this.inMemoryCache = generateInitialGoals(today.getMonth() + 1, today.getFullYear());
  }

  getInitialGoals(month: number, year: number): MonthlyGoal[] {
    const cached = this.inMemoryCache.filter(g => g.month === month && g.year === year);
    if (cached.length > 0) return cached;
    return generateInitialGoals(month, year);
  }

  async getGoals(month?: number, year?: number): Promise<MonthlyGoal[]> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        let query = client.from('monthly_goals').select('*');

        if (month !== undefined) {
          query = query.eq('month', month);
        }
        if (year !== undefined) {
          query = query.eq('year', year);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Erro ao pesquisar metas no Supabase:', error.message);
          throw error;
        }

        if (data && data.length > 0) {
          const mapped = (data as MonthlyGoalRow[]).map(r => monthlyGoalRowToGoal(r));
          // Merge with memory cache
          this.inMemoryCache = [
            ...this.inMemoryCache.filter(g => (month && g.month === month) && (year && g.year === year) ? false : true),
            ...mapped,
          ];
          return mapped;
        }

        // If no records in Supabase for this period, return initial defaults
        if (month && year) {
          const generated = generateInitialGoals(month, year);
          return generated;
        }
      } catch (err) {
        console.error('Falha ao comunicar com Supabase monthly_goals:', err);
      }
    }

    if (month && year) {
      const filtered = this.inMemoryCache.filter(g => g.month === month && g.year === year);
      return filtered.length > 0 ? filtered : generateInitialGoals(month, year);
    }

    return this.inMemoryCache;
  }

  async saveGoals(goals: MonthlyGoal[]): Promise<MonthlyGoal[]> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        const rows = goals.map(g => goalToMonthlyGoalRow(g));
        const { data, error } = await client
          .from('monthly_goals')
          .upsert(rows as any, { onConflict: 'seller_id,category_slug,month,year' })
          .select();

        if (error) {
          console.error('Erro ao guardar metas no Supabase:', error.message);
          throw new Error(`Falha ao guardar metas: ${error.message}`);
        }

        if (data) {
          const mapped = (data as MonthlyGoalRow[]).map(r => monthlyGoalRowToGoal(r));
          this.inMemoryCache = mapped;
          return mapped;
        }
      } catch (err) {
        console.error('Erro na persistência de metas:', err);
        throw err;
      }
    }

    this.inMemoryCache = goals;
    return goals;
  }

  async updateGoal(goal: MonthlyGoal): Promise<MonthlyGoal> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        const row = goalToMonthlyGoalRow(goal);
        const { data, error } = await client
          .from('monthly_goals')
          .upsert(row as any, { onConflict: 'seller_id,category_slug,month,year' })
          .select()
          .single();

        if (error) {
          console.error('Erro ao atualizar meta individual no Supabase:', error.message);
          throw new Error(`Falha ao atualizar meta: ${error.message}`);
        }

        if (data) {
          const mapped = monthlyGoalRowToGoal(data as MonthlyGoalRow);
          this.inMemoryCache = this.inMemoryCache.map(g => (g.id === mapped.id ? mapped : g));
          return mapped;
        }
      } catch (err) {
        console.error('Erro na atualização de meta:', err);
        throw err;
      }
    }

    this.inMemoryCache = this.inMemoryCache.map(g => (g.id === goal.id ? goal : g));
    return goal;
  }
}

export const goalsService = new GoalsService();
