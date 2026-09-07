import { useState, useCallback, useEffect } from 'react';
import { MonthlyGoal } from '../types';
import { goalsService } from '../services/goals.service';

/**
 * Custom hook for Monthly Goals state and operations.
 * Communicates strictly with goalsService.
 */
export function useGoals(month: number, year: number) {
  const [goals, setGoals] = useState<MonthlyGoal[]>(() => {
    return goalsService.getInitialGoals(month, year);
  });

  useEffect(() => {
    goalsService.saveGoals(goals);
  }, [goals]);

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
