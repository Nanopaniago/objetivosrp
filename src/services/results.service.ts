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
 * Does NOT rely on localStorage.
 * Does NOT use mock data fallbacks.
 */
export class ResultsService {
  async getDailyResults(month?: number, year?: number, sellerId?: string): Promise<DailyEntry[]> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      let query = client.from('daily_results').select('*');

      if (sellerId) {
        query = query.eq('seller_id', sellerId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao pesquisar resultados diários no Supabase:', error.message);
        throw new Error(`Falha ao carregar resultados diários do Supabase: ${error.message}`);
      }

      if (data && data.length > 0) {
        let mapped = (data as DailyResultRow[]).map(r => dailyResultRowToEntry(r));

        if (month !== undefined && year !== undefined) {
          mapped = mapped.filter(e => {
            const [y, m] = e.date.split('-').map(Number);
            return y === year && m === month;
          });
        }

        return mapped;
      }

      // No results recorded yet in Supabase
      return [];
    }

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

        if (error) {
          console.error('Erro ao gravar resultado no Supabase:', error.message);
          throw new Error(`Falha ao guardar lançamento: ${error.message}`);
        }

        if (data) {
          const savedEntry = dailyResultRowToEntry(data as DailyResultRow);
          return [
            ...currentEntries.filter(e => !(e.sellerId === savedEntry.sellerId && e.date === savedEntry.date)),
            savedEntry,
          ];
        }
      } catch (err) {
        console.error('Erro na gravação de resultado no Supabase:', err);
        throw err;
      }
    }

    throw new Error('Supabase não está configurado para guardar resultado.');
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
