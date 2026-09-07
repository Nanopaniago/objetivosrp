import { GoalCategory, CategorySlug } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase/client';
import { categoryRowToGoalCategory, GoalCategoryRow } from '../lib/supabase/types';

/**
 * Categories Service
 *
 * Persists and retrieves goal categories from the Supabase `goal_categories` table.
 * Does NOT depend on localStorage or mock fallback seeds.
 */
export class CategoriesService {
  async getCategories(): Promise<GoalCategory[]> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      const { data, error } = await client
        .from('goal_categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Erro ao pesquisar categorias no Supabase:', error.message);
        throw new Error(`Falha ao carregar categorias do Supabase: ${error.message}`);
      }

      if (data && data.length > 0) {
        return (data as GoalCategoryRow[]).map(r => categoryRowToGoalCategory(r));
      }

      // If table is empty, return empty array without generating mock data
      return [];
    }

    return [];
  }

  async getCategoryBySlug(slug: CategorySlug): Promise<GoalCategory | undefined> {
    const categories = await this.getCategories();
    return categories.find(c => c.slug === slug);
  }
}

export const categoriesService = new CategoriesService();
