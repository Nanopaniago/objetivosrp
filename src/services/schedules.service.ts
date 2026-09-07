import { WorkSchedule } from '../types';
import { generateInitialSchedules } from '../data/initialData';

export const SCHEDULES_STORAGE_KEY = 'salesflow_schedules_v3';

/**
 * Schedules Service (Work Schedules / Escala & Folgas)
 *
 * Encapsulates work shifts, off-days, and schedules per seller and month.
 * Backed by localStorage and initial generator fallback.
 * Future: Will query and mutate Supabase `work_schedules` table.
 */
export class SchedulesService {
  /**
   * Loads initial schedules from storage or generates default distribution for the month.
   */
  getInitialSchedules(month: number, year: number): WorkSchedule[] {
    try {
      const saved = localStorage.getItem(SCHEDULES_STORAGE_KEY);
      if (saved) {
        const parsed: WorkSchedule[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading initial schedules from storage', e);
    }
    return generateInitialSchedules(month, year);
  }

  /**
   * Retrieves all schedules, optionally filtered by month, year, and seller.
   */
  async getSchedules(month?: number, year?: number, sellerId?: string): Promise<WorkSchedule[]> {
    const d = new Date();
    const currentM = month ?? d.getMonth() + 1;
    const currentY = year ?? d.getFullYear();

    let list = this.getInitialSchedules(currentM, currentY);

    if (sellerId) {
      list = list.filter(s => s.sellerId === sellerId);
    }

    if (month && year) {
      list = list.filter(s => {
        const [sYear, sMonth] = s.date.split('-').map(Number);
        return sYear === year && sMonth === month;
      });
    }

    return list;
  }

  /**
   * Saves the entire list of schedules to storage.
   */
  async saveSchedules(schedules: WorkSchedule[]): Promise<WorkSchedule[]> {
    try {
      localStorage.setItem(SCHEDULES_STORAGE_KEY, JSON.stringify(schedules));
    } catch (e) {
      console.error('Error saving schedules to storage', e);
    }
    return schedules;
  }

  /**
   * Updates or replaces a specific schedule entry.
   */
  async updateSchedule(schedule: WorkSchedule, currentPool?: WorkSchedule[]): Promise<WorkSchedule[]> {
    const d = new Date();
    const [sYear, sMonth] = schedule.date.split('-').map(Number);
    const pool = currentPool || this.getInitialSchedules(sMonth || d.getMonth() + 1, sYear || d.getFullYear());

    const index = pool.findIndex(s => s.sellerId === schedule.sellerId && s.date === schedule.date);
    let updated: WorkSchedule[];

    if (index >= 0) {
      updated = [...pool];
      updated[index] = schedule;
    } else {
      updated = [...pool, schedule];
    }

    await this.saveSchedules(updated);
    return updated;
  }
}

export const schedulesService = new SchedulesService();
