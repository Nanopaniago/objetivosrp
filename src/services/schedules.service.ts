import { WorkSchedule } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase/client';
import {
  workScheduleRowToSchedule,
  scheduleToWorkScheduleRow,
  WorkScheduleRow,
} from '../lib/supabase/types';

/**
 * Schedules Service
 *
 * Persists and queries seller work shifts and days off directly from the Supabase `work_schedules` table.
 * Does NOT rely on localStorage.
 * Does NOT use mock data fallbacks.
 */
export class SchedulesService {
  async getSchedules(month?: number, year?: number, sellerId?: string): Promise<WorkSchedule[]> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      let query = client.from('work_schedules').select('*');

      if (sellerId) {
        query = query.eq('seller_id', sellerId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao pesquisar escalas no Supabase:', error.message);
        throw new Error(`Falha ao carregar escalas do Supabase: ${error.message}`);
      }

      if (data && data.length > 0) {
        let mapped = (data as WorkScheduleRow[]).map(r => workScheduleRowToSchedule(r));

        if (month !== undefined && year !== undefined) {
          const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
          mapped = mapped.filter(s => s.date.startsWith(monthPrefix));
        }

        return mapped;
      }

      // No work schedules in Supabase for this period
      return [];
    }

    return [];
  }

  async saveSchedules(schedules: WorkSchedule[]): Promise<WorkSchedule[]> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        const rows = schedules.map(s => scheduleToWorkScheduleRow(s));
        const { data, error } = await client
          .from('work_schedules')
          .upsert(rows as any, { onConflict: 'seller_id,date' })
          .select();

        if (error) {
          console.error('Erro ao guardar escalas no Supabase:', error.message);
          throw new Error(`Falha ao gravar escalas: ${error.message}`);
        }

        if (data) {
          return (data as WorkScheduleRow[]).map(r => workScheduleRowToSchedule(r));
        }
      } catch (err) {
        console.error('Erro na persistência de escalas:', err);
        throw err;
      }
    }

    throw new Error('Supabase não está configurado para gravar escalas.');
  }

  async updateSchedule(schedule: WorkSchedule): Promise<WorkSchedule> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        const row = scheduleToWorkScheduleRow(schedule);
        const { data, error } = await client
          .from('work_schedules')
          .upsert(row as any, { onConflict: 'seller_id,date' })
          .select()
          .single();

        if (error) {
          console.error('Erro ao atualizar escala no Supabase:', error.message);
          throw new Error(`Falha ao atualizar escala: ${error.message}`);
        }

        if (data) {
          return workScheduleRowToSchedule(data as WorkScheduleRow);
        }
      } catch (err) {
        console.error('Erro ao atualizar escala individual:', err);
        throw err;
      }
    }

    throw new Error('Supabase não está configurado para atualizar escala.');
  }
}

export const schedulesService = new SchedulesService();
