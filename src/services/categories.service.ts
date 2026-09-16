import { GoalCategory, CategorySlug } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase/client';
import { categoryRowToGoalCategory, GoalCategoryRow } from '../lib/supabase/types';

export const DEFAULT_CATEGORIES: GoalCategory[] = [
  {
    slug: 'plus_master',
    name: 'Plus Master',
    shortDescription: 'Total faturado no serviço Plus Master',
    detailedDescription: 'Serviço premium com maior margem e comissão acelerada.',
    unit: '€',
    metricType: 'currency',
    iconName: 'Crown',
    badgeColor: 'amber',
  },
  {
    slug: 'plus',
    name: 'Plus',
    shortDescription: 'Faturação obtida no serviço Plus regular',
    detailedDescription: 'Volume base de clientes recorrentes do plano Plus.',
    unit: '€',
    metricType: 'currency',
    iconName: 'Zap',
    badgeColor: 'blue',
  },
  {
    slug: 'megas_total',
    name: 'Megas Total',
    shortDescription: 'Volume total faturado em pacotes Megas',
    detailedDescription: 'Faturação agregada de pacotes de dados e serviços telecom.',
    unit: '€',
    metricType: 'currency',
    iconName: 'Wifi',
    badgeColor: 'indigo',
  },
  {
    slug: 'dm_classicas',
    name: 'DM Clássicas',
    shortDescription: 'Quantidade total de unidades vendidas',
    detailedDescription: 'Total em volume físico de unidades clássicas comercializadas.',
    unit: 'un.',
    metricType: 'unit',
    iconName: 'Box',
    badgeColor: 'emerald',
  },
  {
    slug: 'dimobilli',
    name: 'Dimobilli',
    shortDescription: 'Faturação na linha de produtos Dimobilli',
    detailedDescription: 'Linha de produtos de alta conversão de retalho.',
    unit: '€',
    metricType: 'currency',
    iconName: 'Smartphone',
    badgeColor: 'purple',
  },
  {
    slug: 'peliculas',
    name: 'Películas',
    shortDescription: 'Número total de películas aplicadas/vendidas',
    detailedDescription: 'Serviço de proteção e pós-venda em balcão.',
    unit: 'un.',
    metricType: 'unit',
    iconName: 'Shield',
    badgeColor: 'cyan',
  },
];

/**
 * Categories Service
 *
 * Persists and retrieves goal categories from the Supabase `goal_categories` table.
 * Falls back to DEFAULT_CATEGORIES when Supabase is not connected.
 */
export class CategoriesService {
  async getCategories(): Promise<GoalCategory[]> {
    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        const { data, error } = await client
          .from('goal_categories')
          .select('*')
          .order('sort_order', { ascending: true });

        if (!error && data && data.length > 0) {
          return (data as GoalCategoryRow[]).map(r => categoryRowToGoalCategory(r));
        }
      } catch (err) {
        console.warn('Falha ao carregar categorias do Supabase:', err);
      }
    }

    return DEFAULT_CATEGORIES;
  }

  async getCategoryBySlug(slug: CategorySlug): Promise<GoalCategory | undefined> {
    const categories = await this.getCategories();
    return categories.find(c => c.slug === slug);
  }
}

export const categoriesService = new CategoriesService();
