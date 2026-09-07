import { MonthlyGoal } from '../types';
import { generateInitialGoals } from '../data/initialData';

export const GOALS_STORAGE_KEY = 'salesflow_goals_v3';

/**
 * Goals Service
 *
 * Encapsulates management of monthly sales targets per category and seller.
 * Backed by localStorage and initial generator fallback.
 * Future: Will query and mutate Supabase `monthly_goals` table.
 */
export class GoalsService {
  /**
   * Loads initial goals from storage or generates defaults for the current period.
   */
  getInitialGoals(month: number, year: number): MonthlyGoal[] {
    try {
      const saved = localStorage.getItem(GOALS_STORAGE_KEY);
      if (saved) {
        const parsed: MonthlyGoal[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading initial goals from storage', e);
    }
    return generateInitialGoals(month, year);
  }

  /**
   * Retrieves all goals, optionally filtered by month and year.
   */
  async getGoals(month?: number, year?: number): Promise<MonthlyGoal[]> {
    const d = new Date();
    const currentM = month ?? d.getMonth() + 1;
    const currentY = year ?? d.getFullYear();

    const all = this.getInitialGoals(currentM, currentY);
    if (month && year) {
      return all.filter(g => g.month === month && g.year === year);
    }
    return all;
  }

  /**
   * Retrieves goals for a specific seller in a given period.
   */
  async getGoalsBySeller(sellerId: string, month: number, year: number): Promise<MonthlyGoal[]> {
    const goals = await this.getGoals(month, year);
    return goals.filter(g => g.sellerId === sellerId);
  }

  /**
   * Saves or replaces goals in storage.
   * Future: Will execute `supabase.from('monthly_goals').upsert(goals.map(goalToMonthlyGoalRow))`.
   */
  async saveGoals(goals: MonthlyGoal[]): Promise<MonthlyGoal[]> {
    try {
      localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals));
    } catch (e) {
      console.error('Error saving goals to storage', e);
    }
    return goals;
  }

  /**
   * Updates or inserts a single goal.
   */
  async updateGoal(goal: MonthlyGoal): Promise<MonthlyGoal> {
    const all = await this.getGoals();
    const existingIndex = all.findIndex(
      g => g.sellerId === goal.sellerId && g.categorySlug === goal.categorySlug && g.month === goal.month && g.year === goal.year
    );

    let updatedList: MonthlyGoal[];
    if (existingIndex >= 0) {
      updatedList = [...all];
      updatedList[existingIndex] = goal;
    } else {
      updatedList = [...all, goal];
    }

    await this.saveGoals(updatedList);
    return goal;
  }
}

export const goalsService = new GoalsService();
