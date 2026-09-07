-- ==============================================================================
-- OBJETIVOSRP / SALESFLOW - MIGRATION 001: INITIAL SCHEMA & RLS POLICIES
-- ==============================================================================
-- Compatível com Supabase PostgreSQL (com suporte a Auth, RLS e Triggers)
-- ==============================================================================

-- 1. EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABELA: STORES (Lojas Comerciais)
CREATE TABLE IF NOT EXISTS public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text,
  address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. TABELA: PROFILES (Perfis de Utilizador sincronizados com auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  username text UNIQUE NOT NULL,
  email text,
  role text NOT NULL CHECK (role IN ('seller', 'manager', 'admin', 'super_admin')) DEFAULT 'seller',
  avatar_url text DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  store_name text DEFAULT 'Loja Principal',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_active ON public.profiles(active);

-- 4. TABELA: GOAL_CATEGORIES (Categorias de Metas Comerciais)
CREATE TABLE IF NOT EXISTS public.goal_categories (
  id text PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  short_description text DEFAULT '',
  detailed_description text DEFAULT '',
  unit text NOT NULL DEFAULT '€',
  metric_type text NOT NULL CHECK (metric_type IN ('currency', 'unit')) DEFAULT 'currency',
  icon_name text NOT NULL DEFAULT 'Zap',
  badge_color text NOT NULL DEFAULT 'blue',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_goal_categories_slug ON public.goal_categories(slug);
CREATE INDEX IF NOT EXISTS idx_goal_categories_sort ON public.goal_categories(sort_order);

-- 5. TABELA: MONTHLY_GOALS (Metas Mensais por Vendedor e Categoria)
CREATE TABLE IF NOT EXISTS public.monthly_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_slug text NOT NULL REFERENCES public.goal_categories(slug) ON UPDATE CASCADE ON DELETE CASCADE,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  year integer NOT NULL CHECK (year >= 2020),
  target_value numeric NOT NULL DEFAULT 0,
  daily_target_value numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_monthly_goals_seller_cat_period UNIQUE (seller_id, category_slug, month, year)
);

CREATE INDEX IF NOT EXISTS idx_monthly_goals_lookup ON public.monthly_goals(seller_id, month, year);

-- 6. TABELA: DAILY_RESULTS (Lançamentos e Resultados Diários/Consolidados)
CREATE TABLE IF NOT EXISTS public.daily_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date text NOT NULL, -- Formato YYYY-MM-DD
  values jsonb NOT NULL DEFAULT '{}'::jsonb,
  note text,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_daily_results_seller_date UNIQUE (seller_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_results_seller_date ON public.daily_results(seller_id, date);

-- 7. TABELA: WORK_SCHEDULES (Escalas de Trabalho, Turnos e Folgas)
CREATE TABLE IF NOT EXISTS public.work_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date text NOT NULL, -- Formato YYYY-MM-DD
  status text NOT NULL CHECK (status IN ('work', 'off')) DEFAULT 'work',
  shift text CHECK (shift IN ('abertura', 'fecho', 'manha', 'tarde', 'personalizado', 'off')),
  start_time text,
  end_time text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_work_schedules_seller_date UNIQUE (seller_id, date)
);

CREATE INDEX IF NOT EXISTS idx_work_schedules_seller_date ON public.work_schedules(seller_id, date);

-- 8. TABELA: STORE_SETTINGS (Identidade Visual, Nome da Marca e Configurações)
CREATE TABLE IF NOT EXISTS public.store_settings (
  id text PRIMARY KEY DEFAULT 'brand_config',
  key text UNIQUE NOT NULL DEFAULT 'brand_config',
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ==============================================================================
-- FUNÇÕES & TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA DE TIMESTAMP
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_monthly_goals_updated_at
  BEFORE UPDATE ON public.monthly_goals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_daily_results_updated_at
  BEFORE UPDATE ON public.daily_results
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_work_schedules_updated_at
  BEFORE UPDATE ON public.work_schedules
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_store_settings_updated_at
  BEFORE UPDATE ON public.store_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- TRIGGER PARA REGISTO AUTOMÁTICO DE PERFIL AO CRIAR UTILIZADOR EM AUTH.USERS
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  v_name text;
  v_username text;
  v_role text;
  v_avatar text;
  v_store text;
BEGIN
  v_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  v_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    LOWER(REPLACE(split_part(NEW.email, '@', 1), ' ', '.'))
  );
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'seller');
  v_avatar := COALESCE(
    NEW.raw_user_meta_data->>'avatar',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  );
  v_store := COALESCE(NEW.raw_user_meta_data->>'storeName', 'Loja Principal');

  INSERT INTO public.profiles (id, name, username, email, role, avatar_url, active, store_name)
  VALUES (
    NEW.id,
    v_name,
    v_username,
    NEW.email,
    v_role,
    v_avatar,
    true,
    v_store
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(public.profiles.name, EXCLUDED.name);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ativa trigger no schema auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- 1. Helper function para verificar se o utilizador autenticado é admin/super_admin
CREATE OR REPLACE FUNCTION public.is_admin_or_super()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
      AND active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. Helper function para verificar se o utilizador autenticado é manager, admin ou super_admin
CREATE OR REPLACE FUNCTION public.is_manager_or_above()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('manager', 'admin', 'super_admin')
      AND active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ------------------------------------------------------------------------------
-- Políticas: PROFILES
-- ------------------------------------------------------------------------------
CREATE POLICY "Utilizadores autenticados podem ver perfis ativos"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Utilizadores podem atualizar o seu próprio perfil"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.is_admin_or_super())
  WITH CHECK (auth.uid() = id OR public.is_admin_or_super());

CREATE POLICY "Admins podem inserir perfis"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_super() OR auth.uid() = id);

CREATE POLICY "Admins podem eliminar perfis"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.is_admin_or_super());

-- ------------------------------------------------------------------------------
-- Políticas: GOAL_CATEGORIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Leitura de categorias permitida para utilizadores autenticados"
  ON public.goal_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins podem gerir categorias de metas"
  ON public.goal_categories FOR ALL
  TO authenticated
  USING (public.is_admin_or_super())
  WITH CHECK (public.is_admin_or_super());

-- ------------------------------------------------------------------------------
-- Políticas: MONTHLY_GOALS
-- ------------------------------------------------------------------------------
CREATE POLICY "Utilizadores autenticados podem ver metas mensais"
  ON public.monthly_goals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Gestores e admins podem gerir metas mensais"
  ON public.monthly_goals FOR ALL
  TO authenticated
  USING (public.is_manager_or_above())
  WITH CHECK (public.is_manager_or_above());

-- ------------------------------------------------------------------------------
-- Políticas: DAILY_RESULTS
-- ------------------------------------------------------------------------------
CREATE POLICY "Utilizadores autenticados podem ver resultados diários"
  ON public.daily_results FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Vendedores podem registar ou atualizar os seus próprios resultados"
  ON public.daily_results FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = seller_id OR public.is_manager_or_above());

CREATE POLICY "Vendedores podem atualizar os seus próprios resultados"
  ON public.daily_results FOR UPDATE
  TO authenticated
  USING (auth.uid() = seller_id OR public.is_manager_or_above())
  WITH CHECK (auth.uid() = seller_id OR public.is_manager_or_above());

CREATE POLICY "Gestores e admins podem eliminar resultados diários"
  ON public.daily_results FOR DELETE
  TO authenticated
  USING (public.is_manager_or_above());

-- ------------------------------------------------------------------------------
-- Políticas: WORK_SCHEDULES
-- ------------------------------------------------------------------------------
CREATE POLICY "Utilizadores autenticados podem ver escalas de trabalho"
  ON public.work_schedules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Gestores e admins podem gerir escalas de trabalho"
  ON public.work_schedules FOR ALL
  TO authenticated
  USING (public.is_manager_or_above())
  WITH CHECK (public.is_manager_or_above());

-- ------------------------------------------------------------------------------
-- Políticas: STORE_SETTINGS
-- ------------------------------------------------------------------------------
CREATE POLICY "Utilizadores autenticados podem ver configurações da marca"
  ON public.store_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins podem atualizar configurações da marca"
  ON public.store_settings FOR ALL
  TO authenticated
  USING (public.is_admin_or_super())
  WITH CHECK (public.is_admin_or_super());

-- ==============================================================================
-- INSERTS DE SEED INICIAL (CATEGORIAS E CONFIGURAÇÕES PADRÃO)
-- ==============================================================================

INSERT INTO public.goal_categories (
  id, slug, name, short_description, detailed_description, unit, metric_type, icon_name, badge_color, sort_order
) VALUES
  ('cat-plus-master', 'plus_master', 'Plus Master', 'Total faturado no serviço Plus Master', 'Serviço premium com maior margem e comissão acelerada.', '€', 'currency', 'Crown', 'amber', 1),
  ('cat-plus', 'plus', 'Plus', 'Faturação obtida no serviço Plus regular', 'Volume base de clientes recorrentes do plano Plus.', '€', 'currency', 'Zap', 'blue', 2),
  ('cat-megas-total', 'megas_total', 'Megas Total', 'Volume total faturado em pacotes Megas', 'Faturação agregada de pacotes de dados e serviços telecom.', '€', 'currency', 'Wifi', 'indigo', 3),
  ('cat-dm-classicas', 'dm_classicas', 'DM Clássicas', 'Quantidade total de unidades vendidas', 'Total em volume físico de unidades clássicas comercializadas.', 'un.', 'unit', 'Box', 'emerald', 4),
  ('cat-dimobilli', 'dimobilli', 'Dimobilli', 'Faturação na linha de produtos Dimobilli', 'Linha de produtos de alta conversão de retalho.', '€', 'currency', 'Smartphone', 'purple', 5),
  ('cat-peliculas', 'peliculas', 'Películas', 'Número total de películas aplicadas/vendidas', 'Serviço de proteção e pós-venda em balcão.', 'un.', 'unit', 'Shield', 'cyan', 6)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  short_description = EXCLUDED.short_description,
  detailed_description = EXCLUDED.detailed_description,
  unit = EXCLUDED.unit,
  metric_type = EXCLUDED.metric_type,
  icon_name = EXCLUDED.icon_name,
  badge_color = EXCLUDED.badge_color,
  sort_order = EXCLUDED.sort_order;

INSERT INTO public.store_settings (id, key, value)
VALUES (
  'brand_config',
  'brand_config',
  '{
    "name": "SalesFlow",
    "highlightWord": "Flow",
    "tagline": "Gestão de Metas & Desempenho Comercial",
    "logoType": "preset",
    "logoPreset": "leaf",
    "accent": "apple_blue"
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;
