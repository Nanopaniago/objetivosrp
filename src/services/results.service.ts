import { DailyEntry } from '../types';
import { generateInitialEntries } from '../data/initialData';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase/client';
import {
  dailyResultRowToEntry,
  dailyEntryToResultRow,
  DailyResultRow,
} from '../lib/supabase/types';

/**
 * Results Service
 *
 * Persists and queries daily and accumulated results from the Supabase `daily_results` table.
 * Does NOT rely on localStorage.
 */
export class ResultsService {
  private inMemoryCache: DailyEntry[] = [];

  constructor() {
    const today = new Date();
    this.inMemoryCache = generateInitialEntries(today.getMonth() + 1, today.getFullYear());
  }

  getInitialDailyResults(month: number, year: number): DailyEntry[] {
    const cached = this.inMemoryCache.filter(e => {
      const [y, m] = e.date.split('-').map(Number);
      return y === year && m === month;
    });
    if (cached.length > 0) return cached;
    return generateInitialEntries(month, year);
  }

  async getDailyResults(month?: number, year?: number, sellerId?: string): Promise<DailyEntry[]> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        let query = client.from('daily_results').select('*');

        if (sellerId) {
          query = query.eq('seller_id', sellerId);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Erro ao pesquisar resultados diários no Supabase:', error.message);
          throw error;
        }

        if (data && data.length > 0) {
          let mapped = (data as DailyResultRow[]).map(r => dailyResultRowToEntry(r));

          if (month !== undefined && year !== undefined) {
            mapped = mapped.filter(e => {
              const [y, m] = e.date.split('-').map(Number);
              return y === year && m === month;
            });
          }

          if (mapped.length > 0) {
            this.inMemoryCache = mapped;
            return mapped;
          }
        }

        // If no records exist yet for this period, return default sample entries
        if (month && year) {
          return generateInitialEntries(month, year);
        }
      } catch (err) {
        console.error('Falha ao comunicar com Supabase daily_results:', err);
      }
    }

    if (month && year) {
      const filtered = this.inMemoryCache.filter(e => {
        const [y, m] = e.date.split('-').map(Number);
        return y === year && m === month;
      });
      return filtered.length > 0 ? filtered : generateInitialEntries(month, year);
    }

    return this.inMemoryCache;
  }

  async saveDailyResult(newUpdate: DailyEntry, currentEntries: DailyEntry[] = []): Promise<DailyEntry[]> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        const row = dailyEntryToResultRow(newUpdate);
        const { data, error } = await client
          .from('daily_results')
          .upsert(row as any, { onConflict: 'seller_id,date' })
          .select()
          .single();

        if (error) {
          console.error('Erro ao gravar resultado no Supabase:', error.message);
          throw new Error(`Falha ao guardar lançamento: ${error.message}`);
        }

        if (data) {
          const savedEntry = dailyResultRowToEntry(data as DailyResultRow);
          const pool = currentEntries.length > 0 ? currentEntries : this.inMemoryCache;
          const updatedList = [
            ...pool.filter(e => !(e.sellerId === savedEntry.sellerId && e.date === savedEntry.date)),
            savedEntry,
          ];
          this.inMemoryCache = updatedList;
          return updatedList;
        }
      } catch (err) {
        console.error('Erro na gravação de resultado no Supabase:', err);
        throw err;
      }
    }

    // Local fallback
    const pool = currentEntries.length > 0 ? currentEntries : this.inMemoryCache;
    const updatedList = [
      ...pool.filter(e => !(e.sellerId === newUpdate.sellerId && e.date === newUpdate.date)),
      newUpdate,
    ];
    this.inMemoryCache = updatedList;
    return updatedList;
  }

  async saveDailyResults(entries: DailyEntry[]): Promise<DailyEntry[]> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        const rows = entries.map(e => dailyEntryToResultRow(e));
        const { data, error } = await client
          .from('daily_results')
          .upsert(rows as any, { onConflict: 'seller_id,date' })
          .select();

        if (error) {
          console.error('Erro ao gravar lote de resultados no Supabase:', error.message);
          throw error;
        }

        if (data) {
          const mapped = (data as DailyResultRow[]).map(r => dailyResultRowToEntry(r));
          this.inMemoryCache = mapped;
          return mapped;
        }
      } catch (err) {
        console.error('Falha ao persistir lote de resultados:', err);
      }
    }

    this.inMemoryCache = entries;
    return entries;
  }

  async deleteDailyResult(id: string): Promise<boolean> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        const { error } = await client
          .from('daily_results')
          .delete()
          .eq('id', id);

        if (error) {
          console.error(`Erro ao eliminar resultado ${id} no Supabase:`, error.message);
          throw error;
        }
      } catch (err) {
        console.error('Erro ao eliminar resultado:', err);
        throw err;
      }
    }

    this.inMemoryCache = this.inMemoryCache.filter(e => e.id !== id);
    return true;
  }
}

export const resultsService = new ResultsService();
