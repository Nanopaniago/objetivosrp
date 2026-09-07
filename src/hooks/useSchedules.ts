import { useState, useCallback, useEffect } from 'react';
import { WorkSchedule } from '../types';
import { schedulesService } from '../services/schedules.service';

/**
 * Custom hook for Work Schedules state and operations.
 * Communicates strictly with schedulesService.
 */
export function useSchedules(month: number, year: number) {
  const [schedules, setSchedules] = useState<WorkSchedule[]>(() => {
    return schedulesService.getInitialSchedules(month, year);
  });

  useEffect(() => {
    schedulesService.saveSchedules(schedules);
  }, [schedules]);

  const saveSchedules = useCallback(async (updatedSchedules: WorkSchedule[]) => {
    setSchedules(updatedSchedules);
    await schedulesService.saveSchedules(updatedSchedules);
  }, []);

  const updateSchedule = useCallback(async (schedule: WorkSchedule) => {
    const updated = await schedulesService.updateSchedule(schedule, schedules);
    setSchedules(updated);
  }, [schedules]);

  return {
    schedules,
    setSchedules,
    saveSchedules,
    updateSchedule,
  };
}
