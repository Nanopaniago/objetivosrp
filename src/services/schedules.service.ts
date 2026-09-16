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
 * Falls back to local storage when Supabase is not connected.
 */
export class SchedulesService {
  async getSchedules(month?: number, year?: number, sellerId?: string): Promise<WorkSchedule[]> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        let query = client.from('work_schedules').select('*');

        if (sellerId) {
          query = query.eq('seller_id', sellerId);
        }

        const { data, error } = await query;

        if (!error && data && data.length > 0) {
          let mapped = (data as WorkScheduleRow[]).map(r => workScheduleRowToSchedule(r));

          if (month !== undefined && year !== undefined) {
            const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
            mapped = mapped.filter(s => s.date.startsWith(monthPrefix));
          }

          return mapped;
        }
      } catch (err) {
        console.warn('Aviso ao ler escalas do Supabase:', err);
      }
    }

    const m = month ?? (new Date().getMonth() + 1);
    const y = year ?? new Date().getFullYear();
    const localKey = `rp_schedules_${m}_${y}`;
    try {
      const saved = localStorage.getItem(localKey);
      if (saved) {
        const parsed: WorkSchedule[] = JSON.parse(saved);
        return sellerId ? parsed.filter(s => s.sellerId === sellerId) : parsed;
      }
    } catch {}

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

        if (!error && data) {
          return (data as WorkScheduleRow[]).map(r => workScheduleRowToSchedule(r));
        }
      } catch (err) {
        console.warn('Aviso ao gravar escalas no Supabase:', err);
      }
    }

    if (schedules.length > 0) {
      const [y, m] = schedules[0].date.split('-').map(Number);
      const localKey = `rp_schedules_${m}_${y}`;
      try {
        const current = await this.getSchedules(m, y);
        const map = new Map(current.map(s => [`${s.sellerId}_${s.date}`, s]));
        schedules.forEach(s => map.set(`${s.sellerId}_${s.date}`, s));
        const updated = Array.from(map.values());
        localStorage.setItem(localKey, JSON.stringify(updated));
        return updated;
      } catch {}
    }

    return schedules;
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
