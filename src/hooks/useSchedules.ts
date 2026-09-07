import { useState, useCallback, useEffect } from 'react';
import { WorkSchedule } from '../types';
import { schedulesService } from '../services/schedules.service';

/**
 * Custom hook for Work Schedules state and operations.
 * Communicates strictly with schedulesService.
 */
export function useSchedules(month: number, year: number) {
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);

  useEffect(() => {
    let isMounted = true;
    schedulesService.getSchedules(month, year).then(data => {
      if (isMounted) {
        setSchedules(data);
      }
    }).catch(err => {
      console.error('Erro ao carregar escalas:', err);
    });

    return () => {
      isMounted = false;
    };
  }, [month, year]);

  const saveSchedules = useCallback(async (updatedSchedules: WorkSchedule[]) => {
    setSchedules(updatedSchedules);
    await schedulesService.saveSchedules(updatedSchedules);
  }, []);

  const updateSchedule = useCallback(async (schedule: WorkSchedule) => {
    const updated = await schedulesService.updateSchedule(schedule);
    setSchedules(prev => [
      ...prev.filter(s => !(s.sellerId === updated.sellerId && s.date === updated.date)),
      updated,
    ]);
  }, []);

  return {
    schedules,
    setSchedules,
    saveSchedules,
    updateSchedule,
  };
}
