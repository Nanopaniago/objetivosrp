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
 * Does NOT use localStorage.
 * Does NOT use mock data fallbacks.
 */
export class GoalsService {
  async getGoals(month?: number, year?: number): Promise<MonthlyGoal[]> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
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
        throw new Error(`Falha ao carregar metas do Supabase: ${error.message}`);
      }

      if (data && data.length > 0) {
        return (data as MonthlyGoalRow[]).map(r => monthlyGoalRowToGoal(r));
      }

      // No goals exist yet in Supabase for this period
      return [];
    }

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

        if (error) {
          console.error('Erro ao guardar metas no Supabase:', error.message);
          throw new Error(`Falha ao guardar metas: ${error.message}`);
        }

        if (data) {
          return (data as MonthlyGoalRow[]).map(r => monthlyGoalRowToGoal(r));
        }
      } catch (err) {
        console.error('Erro na persistência de metas:', err);
        throw err;
      }
    }

    throw new Error('Supabase não está configurado para gravar metas.');
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
