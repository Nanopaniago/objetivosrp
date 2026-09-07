import { useState, useCallback, useEffect } from 'react';
import { MonthlyGoal } from '../types';
import { goalsService } from '../services/goals.service';

/**
 * Custom hook for Monthly Goals state and operations.
 * Communicates strictly with goalsService.
 */
export function useGoals(month: number, year: number) {
  const [goals, setGoals] = useState<MonthlyGoal[]>([]);

  useEffect(() => {
    let isMounted = true;
    goalsService.getGoals(month, year).then(data => {
      if (isMounted) {
        setGoals(data);
      }
    }).catch(err => {
      console.error('Erro ao carregar metas:', err);
    });

    return () => {
      isMounted = false;
    };
  }, [month, year]);

  const saveGoals = useCallback(async (updatedGoals: MonthlyGoal[]) => {
    setGoals(updatedGoals);
    await goalsService.saveGoals(updatedGoals);
  }, []);

  return {
    goals,
    setGoals,
    saveGoals,
  };
}
