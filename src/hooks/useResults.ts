import { useState, useCallback, useEffect } from 'react';
import { DailyEntry } from '../types';
import { resultsService } from '../services/results.service';

/**
 * Custom hook for Daily Results and Updates state and operations.
 * Communicates strictly with resultsService.
 */
export function useResults(month: number, year: number) {
  const [entries, setEntries] = useState<DailyEntry[]>(() => {
    return resultsService.getInitialDailyResults(month, year);
  });

  const saveDailyResult = useCallback(async (newUpdate: DailyEntry) => {
    const updated = await resultsService.saveDailyResult(newUpdate, entries);
    setEntries(updated);
  }, [entries]);

  const saveDailyResults = useCallback(async (updatedEntries: DailyEntry[]) => {
    setEntries(updatedEntries);
    await resultsService.saveDailyResults(updatedEntries);
  }, []);

  return {
    entries,
    setEntries,
    saveDailyResult,
    saveDailyResults,
  };
}
