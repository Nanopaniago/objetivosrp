import { DailyEntry } from '../types';
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
 * Falls back to local storage when Supabase is not connected.
 */
export class ResultsService {
  async getDailyResults(month?: number, year?: number, sellerId?: string): Promise<DailyEntry[]> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        let query = client.from('daily_results').select('*');

        if (sellerId) {
          query = query.eq('seller_id', sellerId);
        }

        const { data, error } = await query;

        if (!error && data && data.length > 0) {
          let mapped = (data as DailyResultRow[]).map(r => dailyResultRowToEntry(r));

          if (month !== undefined && year !== undefined) {
            mapped = mapped.filter(e => {
              const [y, m] = e.date.split('-').map(Number);
              return y === year && m === month;
            });
          }

          return mapped;
        }
      } catch (err) {
        console.warn('Aviso ao ler resultados do Supabase:', err);
      }
    }

    const m = month ?? (new Date().getMonth() + 1);
    const y = year ?? new Date().getFullYear();
    const localKey = `rp_results_${m}_${y}`;
    try {
      const saved = localStorage.getItem(localKey);
      if (saved) {
        const parsed: DailyEntry[] = JSON.parse(saved);
        return sellerId ? parsed.filter(p => p.sellerId === sellerId) : parsed;
      }
    } catch {}

    return [];
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

        if (!error && data) {
          const savedEntry = dailyResultRowToEntry(data as DailyResultRow);
          return [
            ...currentEntries.filter(e => !(e.sellerId === savedEntry.sellerId && e.date === savedEntry.date)),
            savedEntry,
          ];
        }
      } catch (err) {
        console.warn('Aviso ao guardar resultado no Supabase:', err);
      }
    }

    const [y, m] = newUpdate.date.split('-').map(Number);
    const localKey = `rp_results_${m}_${y}`;
    const updated = [
      ...currentEntries.filter(e => !(e.sellerId === newUpdate.sellerId && e.date === newUpdate.date)),
      newUpdate,
    ];
    try {
      localStorage.setItem(localKey, JSON.stringify(updated));
    } catch {}
    return updated;
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
          throw new Error(`Falha ao gravar lote de resultados: ${error.message}`);
        }

        if (data) {
          return (data as DailyResultRow[]).map(r => dailyResultRowToEntry(r));
        }
      } catch (err) {
        console.error('Falha ao persistir lote de resultados:', err);
        throw err;
      }
    }

    throw new Error('Supabase não está configurado para gravar lote de resultados.');
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
          throw new Error(`Falha ao eliminar resultado: ${error.message}`);
        }

        return true;
      } catch (err) {
        console.error('Erro ao eliminar resultado:', err);
        throw err;
      }
    }

    throw new Error('Supabase não está configurado para eliminar resultado.');
  }
}

export const resultsService = new ResultsService();
