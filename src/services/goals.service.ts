import { MonthlyGoal } from '../types';
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
 * Falls back to local storage when Supabase is not connected.
 */
export class GoalsService {
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

        if (!error && data && data.length > 0) {
          return (data as MonthlyGoalRow[]).map(r => monthlyGoalRowToGoal(r));
        }
      } catch (err) {
        console.warn('Aviso ao consultar metas no Supabase:', err);
      }
    }

    const m = month ?? (new Date().getMonth() + 1);
    const y = year ?? new Date().getFullYear();
    const localKey = `rp_goals_${m}_${y}`;
    try {
      const saved = localStorage.getItem(localKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}

    return [];
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

        if (!error && data) {
          return (data as MonthlyGoalRow[]).map(r => monthlyGoalRowToGoal(r));
        }
      } catch (err) {
        console.warn('Erro ao guardar metas no Supabase:', err);
      }
    }

    if (goals.length > 0) {
      const m = goals[0].month;
      const y = goals[0].year;
      const localKey = `rp_goals_${m}_${y}`;
      try {
        const current = await this.getGoals(m, y);
        const map = new Map(current.map(g => [`${g.sellerId}_${g.categorySlug}`, g]));
        goals.forEach(g => map.set(`${g.sellerId}_${g.categorySlug}`, g));
        const updated = Array.from(map.values());
        localStorage.setItem(localKey, JSON.stringify(updated));
        return updated;
      } catch {}
    }

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
          return monthlyGoalRowToGoal(data as MonthlyGoalRow);
        }
      } catch (err) {
        console.error('Erro na atualização de meta:', err);
        throw err;
      }
    }

    throw new Error('Supabase não está configurado para atualizar meta.');
  }
}

export const goalsService = new GoalsService();
