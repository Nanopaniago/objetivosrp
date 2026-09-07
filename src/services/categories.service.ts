import { GoalCategory, CategorySlug } from '../types';
import { DEFAULT_CATEGORIES } from '../data/initialData';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase/client';
import { categoryRowToGoalCategory, GoalCategoryRow } from '../lib/supabase/types';

/**
 * Categories Service
 *
 * Persists and retrieves goal categories from the Supabase `goal_categories` table.
 * Does NOT depend on localStorage.
 */
export class CategoriesService {
  private inMemoryCache: GoalCategory[] = [...DEFAULT_CATEGORIES];

  getInitialCategories(): GoalCategory[] {
    return this.inMemoryCache;
  }

  async getCategories(): Promise<GoalCategory[]> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        const { data, error } = await client
          .from('goal_categories')
          .select('*')
          .order('sort_order', { ascending: true });

        if (error) {
          console.error('Erro ao pesquisar categorias no Supabase:', error.message);
          throw error;
        }

        if (data && data.length > 0) {
          const mapped = (data as GoalCategoryRow[]).map(r => categoryRowToGoalCategory(r));
          this.inMemoryCache = mapped;
          return mapped;
        }

        // Auto-seed default categories if table is empty
        console.info('Tabela goal_categories vazia no Supabase. A inicializar seed...');
        const seedRows = DEFAULT_CATEGORIES.map((cat, idx) => ({
          id: `cat-${cat.slug}`,
          slug: cat.slug,
          name: cat.name,
          short_description: cat.shortDescription,
          detailed_description: cat.detailedDescription,
          unit: cat.unit,
          metric_type: cat.metricType,
          icon_name: cat.iconName,
          badge_color: cat.badgeColor,
          sort_order: idx + 1,
        }));

        const { data: inserted, error: insertErr } = await client
          .from('goal_categories')
          .insert(seedRows as any)
          .select();

        if (!insertErr && inserted) {
          const mapped = (inserted as GoalCategoryRow[]).map(r => categoryRowToGoalCategory(r));
          this.inMemoryCache = mapped;
          return mapped;
        }
      } catch (err) {
        console.error('Falha ao comunicar com Supabase goal_categories:', err);
      }
    }

    return this.inMemoryCache;
  }

  async getCategoryBySlug(slug: CategorySlug): Promise<GoalCategory | undefined> {
    const categories = await this.getCategories();
    return categories.find(c => c.slug === slug);
  }
}

export const categoriesService = new CategoriesService();
