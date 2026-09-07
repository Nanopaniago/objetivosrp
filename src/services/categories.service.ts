import { GoalCategory, CategorySlug } from '../types';
import { DEFAULT_CATEGORIES } from '../data/initialData';

/**
 * Categories Service
 *
 * Encapsulates access to the sales goal categories (Plus Master, Plus, Megas Total, etc.).
 * Backed by DEFAULT_CATEGORIES.
 * Future: Will query Supabase `goal_categories` table.
 */
export class CategoriesService {
  /**
   * Synchronous getter for initial component mount.
   */
  getInitialCategories(): GoalCategory[] {
    return DEFAULT_CATEGORIES;
  }

  /**
   * Asynchronous retrieval of all goal categories.
   */
  async getCategories(): Promise<GoalCategory[]> {
    return this.getInitialCategories();
  }

  /**
   * Finds a category by its unique slug.
   */
  async getCategoryBySlug(slug: CategorySlug): Promise<GoalCategory | undefined> {
    const list = await this.getCategories();
    return list.find(c => c.slug === slug);
  }
}

export const categoriesService = new CategoriesService();
