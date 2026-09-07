import { WorkSchedule } from '../types';
import { generateInitialSchedules } from '../data/initialData';
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
 */
export class SchedulesService {
  private inMemoryCache: WorkSchedule[] = [];

  constructor() {
    const today = new Date();
    this.inMemoryCache = generateInitialSchedules(today.getMonth() + 1, today.getFullYear());
  }

  getInitialSchedules(month: number, year: number): WorkSchedule[] {
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
    const cached = this.inMemoryCache.filter(s => s.date.startsWith(monthPrefix));
    if (cached.length > 0) return cached;
    return generateInitialSchedules(month, year);
  }

  async getSchedules(month?: number, year?: number, sellerId?: string): Promise<WorkSchedule[]> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        let query = client.from('work_schedules').select('*');

        if (sellerId) {
          query = query.eq('seller_id', sellerId);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Erro ao pesquisar escalas no Supabase:', error.message);
          throw error;
        }

        if (data && data.length > 0) {
          let mapped = (data as WorkScheduleRow[]).map(r => workScheduleRowToSchedule(r));

          if (month !== undefined && year !== undefined) {
            const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
            mapped = mapped.filter(s => s.date.startsWith(monthPrefix));
          }

          if (mapped.length > 0) {
            this.inMemoryCache = mapped;
            return mapped;
          }
        }

        // If no schedules exist in Supabase for this period, return initial sample schedules
        if (month && year) {
          return generateInitialSchedules(month, year);
        }
      } catch (err) {
        console.error('Falha ao comunicar com Supabase work_schedules:', err);
      }
    }

    if (month && year) {
      const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
      const filtered = this.inMemoryCache.filter(s => s.date.startsWith(monthPrefix));
      return filtered.length > 0 ? filtered : generateInitialSchedules(month, year);
    }

    return this.inMemoryCache;
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
          const mapped = (data as WorkScheduleRow[]).map(r => workScheduleRowToSchedule(r));
          this.inMemoryCache = mapped;
          return mapped;
        }
      } catch (err) {
        console.error('Erro na persistência de escalas:', err);
        throw err;
      }
    }

    this.inMemoryCache = schedules;
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
          const mapped = workScheduleRowToSchedule(data as WorkScheduleRow);
          this.inMemoryCache = [
            ...this.inMemoryCache.filter(s => !(s.sellerId === mapped.sellerId && s.date === mapped.date)),
            mapped,
          ];
          return mapped;
        }
      } catch (err) {
        console.error('Erro ao atualizar escala individual:', err);
        throw err;
      }
    }

    this.inMemoryCache = [
      ...this.inMemoryCache.filter(s => !(s.sellerId === schedule.sellerId && s.date === schedule.date)),
      schedule,
    ];
    return schedule;
  }
}

export const schedulesService = new SchedulesService();
