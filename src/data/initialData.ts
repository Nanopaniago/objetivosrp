import { GoalCategory, User, MonthlyGoal, DailyEntry, WorkSchedule } from '../types';

export const DEFAULT_CATEGORIES: GoalCategory[] = [
  {
    slug: 'plus_master',
    name: 'Plus + Master',
    shortDescription: 'Volume financeiro de artigos Plus + Master',
    detailedDescription: 'Soma em valor (€) de todos os artigos e produtos de alto valor adicionado.',
    unit: '€',
    metricType: 'currency',
    iconName: 'PackageCheck',
    badgeColor: 'blue',
  },
  {
    slug: 'plus',
    name: 'Plus',
    shortDescription: 'Valor vendido em pequenos artigos',
    detailedDescription: 'Soma em valor (€) de acessórios, itens complementares e artigos de giro rápido.',
    unit: '€',
    metricType: 'currency',
    iconName: 'Sparkles',
    badgeColor: 'amber',
  },
  {
    slug: 'megas_total',
    name: 'Megas Total',
    shortDescription: 'Serviços de proteção com pagamento único (€)',
    detailedDescription: 'Soma em valor (€) de garantias estendidas, seguros e coberturas pontuais à vista.',
    unit: '€',
    metricType: 'currency',
    iconName: 'ShieldAlert',
    badgeColor: 'indigo',
  },
  {
    slug: 'dm_classicas',
    name: 'DM Clássicas',
    shortDescription: 'Serviços de proteção mensais (€)',
    detailedDescription: 'Soma em valor (€) de planos recorrentes, assinaturas e seguros com mensalidades.',
    unit: '€',
    metricType: 'currency',
    iconName: 'ShieldCheck',
    badgeColor: 'emerald',
  },
  {
    slug: 'dimobilli',
    name: 'Dimobilli',
    shortDescription: 'Venda de máquinas de café (unidades)',
    detailedDescription: 'Contagem por unidade de cafeteras, expressos e máquinas de café premium.',
    unit: 'un',
    metricType: 'unit',
    iconName: 'Coffee',
    badgeColor: 'orange',
  },
  {
    slug: 'peliculas',
    name: 'Películas',
    shortDescription: 'Venda de películas para telemóveis (unidades)',
    detailedDescription: 'Contagem por unidade de películas de vidro, hidrogel, privacidade e aplicação.',
    unit: 'un',
    metricType: 'unit',
    iconName: 'Smartphone',
    badgeColor: 'cyan',
  },
];

export const INITIAL_USERS: User[] = [
  {
    id: 'user-super-admin',
    name: 'Super Admin (nanopaniagopt)',
    username: 'nanopaniagopt',
    email: 'nanopaniagopt@salesflow.pt',
    password: '96171990',
    role: 'super_admin',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    active: true,
    storeName: 'Sede Central',
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'user-1',
    name: 'Ana Silva',
    username: 'ana.silva',
    email: 'ana.silva@salesflow.pt',
    password: '123',
    role: 'seller',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    active: true,
    storeName: 'Loja Centro - 01',
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-01-10T10:00:00Z',
  },
  {
    id: 'user-2',
    name: 'Carlos Souza',
    username: 'carlos.souza',
    email: 'carlos.souza@salesflow.pt',
    password: '123',
    role: 'seller',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    active: true,
    storeName: 'Loja Centro - 01',
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-01-10T10:00:00Z',
  },
  {
    id: 'user-3',
    name: 'Juliana Lima',
    username: 'juliana.lima',
    email: 'juliana.lima@salesflow.pt',
    password: '123',
    role: 'seller',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    active: true,
    storeName: 'Loja Centro - 01',
    createdAt: '2026-01-12T10:00:00Z',
    updatedAt: '2026-01-12T10:00:00Z',
  },
  {
    id: 'user-4',
    name: 'Rafael Costa',
    username: 'rafael.costa',
    email: 'rafael.costa@salesflow.pt',
    password: '123',
    role: 'seller',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    active: true,
    storeName: 'Loja Centro - 01',
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-01-15T10:00:00Z',
  },
  {
    id: 'user-5',
    name: 'Beatriz Rocha',
    username: 'beatriz.rocha',
    email: 'beatriz.rocha@salesflow.pt',
    password: '123',
    role: 'seller',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    active: true,
    storeName: 'Loja Centro - 01',
    createdAt: '2026-01-18T10:00:00Z',
    updatedAt: '2026-01-18T10:00:00Z',
  },
  {
    id: 'user-6',
    name: 'Matheus Oliveira',
    username: 'matheus.oliveira',
    email: 'matheus.oliveira@salesflow.pt',
    password: '123',
    role: 'seller',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    active: true,
    storeName: 'Loja Centro - 01',
    createdAt: '2026-02-01T10:00:00Z',
    updatedAt: '2026-02-01T10:00:00Z',
  },
  {
    id: 'user-7',
    name: 'Mariana Santos',
    username: 'mariana.santos',
    email: 'mariana.santos@salesflow.pt',
    password: '123',
    role: 'seller',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    active: true,
    storeName: 'Loja Centro - 01',
    createdAt: '2026-02-05T10:00:00Z',
    updatedAt: '2026-02-05T10:00:00Z',
  },
  {
    id: 'user-8',
    name: 'Lucas Ferreira',
    username: 'lucas.ferreira',
    email: 'lucas.ferreira@salesflow.pt',
    password: '123',
    role: 'seller',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    active: true,
    storeName: 'Loja Centro - 01',
    createdAt: '2026-02-10T10:00:00Z',
    updatedAt: '2026-02-10T10:00:00Z',
  },
  {
    id: 'user-9',
    name: 'Marcos Gerente',
    username: 'marcos.gerente',
    email: 'marcos.gerente@salesflow.pt',
    password: '123',
    role: 'manager',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
    active: true,
    storeName: 'Loja Centro - 01',
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z',
  },
  {
    id: 'user-10',
    name: 'Roberto Administrador',
    username: 'roberto.admin',
    email: 'roberto.admin@salesflow.pt',
    password: '123',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    active: true,
    storeName: 'Direção Geral',
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z',
  },
];

// Helper to seed goals for users for month 8, year 2026 (or dynamic current month)
export function generateInitialGoals(month: number, year: number): MonthlyGoal[] {
  const goals: MonthlyGoal[] = [];
  const baseTargets = {
    plus_master: { monthly: 25000, daily: 1150 }, // 25.000 € mensal | 1.150 € diário
    plus: { monthly: 12000, daily: 550 },         // 12.000 € mensal | 550 € diário
    megas_total: { monthly: 5500, daily: 250 },   // 5.500 € mensal | 250 € diário
    dm_classicas: { monthly: 3800, daily: 175 },  // 3.800 € mensal | 175 € diário
    dimobilli: { monthly: 15, daily: 1 },         // 15 unidades | 1 un diário
    peliculas: { monthly: 90, daily: 4 },         // 90 unidades | 4 un diário
  };

  INITIAL_USERS.filter(u => u.role === 'seller').forEach((user, index) => {
    // slight variation per seller to show realistic differences
    const factor = 1 + ((index % 3) - 1) * 0.1;
    (Object.keys(baseTargets) as Array<keyof typeof baseTargets>).forEach(slug => {
      const base = baseTargets[slug];
      const targetVal = slug === 'dimobilli' || slug === 'peliculas'
        ? Math.round(base.monthly * factor)
        : Math.round((base.monthly * factor) / 100) * 100;

      const dailyVal = slug === 'dimobilli' || slug === 'peliculas'
        ? Number((base.daily * factor).toFixed(1))
        : Math.round((base.daily * factor) / 10) * 10;

      goals.push({
        id: `goal-${user.id}-${slug}-${month}-${year}`,
        sellerId: user.id,
        categorySlug: slug,
        month,
        year,
        targetValue: targetVal,
        dailyTargetValue: dailyVal,
        updatedAt: new Date().toISOString(),
      });
    });
  });

  return goals;
}

// Generate realistic result updates (consolidated current result) for sellers
export function generateInitialEntries(month: number, year: number): DailyEntry[] {
  const entries: DailyEntry[] = [];
  const sellers = INITIAL_USERS.filter(u => u.role === 'seller');
  const monthStr = month < 10 ? `0${month}` : `${month}`;

  sellers.forEach((seller, index) => {
    // Each seller has realistic consolidated progress between 60% and 110%
    const progressFactor = 0.65 + (index * 0.06);

    entries.push({
      id: `result-${seller.id}-${year}-${monthStr}-24`,
      sellerId: seller.id,
      date: `${year}-${monthStr}-24`,
      values: {
        plus_master: Number((25000 * progressFactor * (0.95 + (index % 2) * 0.1)).toFixed(2)),
        plus: Number((12000 * progressFactor * (0.9 + (index % 3) * 0.1)).toFixed(2)),
        megas_total: Number((5500 * progressFactor * (0.85 + (index % 4) * 0.1)).toFixed(2)),
        dm_classicas: Number((3800 * progressFactor * (0.95 + (index % 2) * 0.1)).toFixed(2)),
        dimobilli: Math.round(15 * progressFactor),
        peliculas: Math.round(90 * progressFactor),
      },
      note: 'Atualização do resultado consolidado de fechamento parcial do mês',
      updatedBy: seller.name,
      createdAt: `${year}-${monthStr}-24T18:30:00Z`,
      updatedAt: `${year}-${monthStr}-24T18:30:00Z`,
    });
  });

  return entries;
}

// Generate initial schedule for the month
export function generateInitialSchedules(month: number, year: number): WorkSchedule[] {
  const schedules: WorkSchedule[] = [];
  const sellers = INITIAL_USERS.filter(u => u.role === 'seller');
  const daysInMonth = new Date(year, month, 0).getDate();

  sellers.forEach((seller, sIndex) => {
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = day < 10 ? `0${day}` : `${day}`;
      const monthStr = month < 10 ? `0${month}` : `${month}`;
      const dateStr = `${year}-${monthStr}-${dayStr}`;

      // Weekly rotation for folgas
      const isOff = (day + sIndex) % 7 === 0;
      const isAbertura = day % 2 === 0;

      schedules.push({
        id: `schedule-${seller.id}-${dateStr}`,
        sellerId: seller.id,
        date: dateStr,
        status: isOff ? 'off' : 'work',
        shift: isOff ? undefined : (isAbertura ? 'abertura' : 'fecho'),
        startTime: isOff ? undefined : (isAbertura ? '09:30' : '11:30'),
        endTime: isOff ? undefined : (isAbertura ? '18:30' : '20:30'),
      });
    }
  });

  return schedules;
}
