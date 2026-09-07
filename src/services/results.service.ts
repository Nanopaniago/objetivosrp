import { DailyEntry } from '../types';
import { generateInitialEntries } from '../data/initialData';

export const RESULTS_STORAGE_KEY = 'salesflow_entries_v3';

/**
 * Results Service (Daily Results / Lançamentos)
 *
 * Encapsulates management of accumulated result updates and daily entries.
 * Backed by localStorage and initial demo data generator.
 * Future: Will query and mutate Supabase `daily_results` table.
 */
export class ResultsService {
  /**
   * Loads initial daily results from storage or generates fallback data for the month.
   */
  getInitialDailyResults(month: number, year: number): DailyEntry[] {
    try {
      const saved = localStorage.getItem(RESULTS_STORAGE_KEY);
      if (saved) {
        const parsed: DailyEntry[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading initial daily results from storage', e);
    }
    return generateInitialEntries(month, year);
  }

  /**
   * Retrieves all daily results, optionally filtered by month, year, and seller.
   */
  async getDailyResults(month?: number, year?: number, sellerId?: string): Promise<DailyEntry[]> {
    const d = new Date();
    const currentM = month ?? d.getMonth() + 1;
    const currentY = year ?? d.getFullYear();

    let list = this.getInitialDailyResults(currentM, currentY);

    if (sellerId) {
      list = list.filter(e => e.sellerId === sellerId);
    }

    if (month && year) {
      list = list.filter(e => {
        const [eYear, eMonth] = e.date.split('-').map(Number);
        return eYear === year && eMonth === month;
      });
    }

    return list;
  }

  /**
   * Saves the entire list of daily results to storage.
   */
  async saveDailyResults(entries: DailyEntry[]): Promise<DailyEntry[]> {
    try {
      localStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(entries));
    } catch (e) {
      console.error('Error saving daily results to storage', e);
    }
    return entries;
  }

  /**
   * Saves a single result update.
   * Business rule: A new result update replaces previous updates for that seller in that month.
   * Future: Will execute Supabase transaction or upsert query.
   */
  async saveDailyResult(newUpdate: DailyEntry, currentPool?: DailyEntry[]): Promise<DailyEntry[]> {
    const d = new Date();
    const [uYear, uMonth] = newUpdate.date.split('-').map(Number);
    const pool = currentPool || this.getInitialDailyResults(uMonth || d.getMonth() + 1, uYear || d.getFullYear());

    const otherEntries = pool.filter(e => {
      if (e.sellerId !== newUpdate.sellerId) return true;
      const [eYear, eMonth] = e.date.split('-').map(Number);
      return !(eYear === uYear && eMonth === uMonth);
    });

    const updated = [newUpdate, ...otherEntries];
    await this.saveDailyResults(updated);
    return updated;
  }

  /**
   * Deletes a daily result entry by its ID.
   */
  async deleteDailyResult(id: string): Promise<boolean> {
    const all = await this.getDailyResults();
    const filtered = all.filter(e => e.id !== id);
    await this.saveDailyResults(filtered);
    return true;
  }
}

export const resultsService = new ResultsService();
