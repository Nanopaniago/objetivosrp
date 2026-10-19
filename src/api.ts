export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const isForm = body instanceof FormData;
  const res = await fetch(url, {
    method,
    credentials: 'same-origin',
    headers: body && !isForm ? { 'content-type': 'application/json' } : undefined,
    body: body ? (isForm ? (body as FormData) : JSON.stringify(body)) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && !url.includes('/auth/login')) window.dispatchEvent(new Event('rp:logout'));
    throw new ApiError(res.status, data?.error || 'Algo correu mal. Tenta de novo.');
  }
  return data as T;
}

export const api = {
  get: <T,>(url: string) => request<T>('GET', url),
  post: <T,>(url: string, body?: unknown) => request<T>('POST', url, body),
  put: <T,>(url: string, body?: unknown) => request<T>('PUT', url, body),
  patch: <T,>(url: string, body?: unknown) => request<T>('PATCH', url, body),
  del: <T,>(url: string) => request<T>('DELETE', url),
};

export type Role = 'admin' | 'manager' | 'seller';
export type Unit = 'eur' | 'un';

export interface Me {
  user: { id: number; name: string; firstName: string; username: string; role: Role; storeId: number | null; igl: boolean };
  stores: { id: number; name: string; code: string | null }[];
  today: string;
}

export interface Category {
  id: number;
  slug: string;
  name: string;
  unit: Unit;
  icon: string;
  sort: number;
  active: number;
}

export interface CatResult {
  id: number;
  slug: string;
  name: string;
  unit: Unit;
  icon: string;
  goal: number | null;
  value: number;
  pct: number | null;
  remaining: number | null;
  need: number | null;
  needToday: number | null;
  projection: number | null;
  projectionPct: number | null;
  status: 'ahead' | 'close' | 'behind' | 'done' | 'nogoal';
  next: number | null;
  nextMissing: number | null;
  nextPoints: number | null;
}

export interface PointEvent {
  date: string;
  type: 'daily' | 'milestone' | 'streak' | 'record' | 'challenge';
  category_id: number | null;
  points: number;
  label: string;
  who?: string;
}

export interface Challenge {
  id: number;
  title: string;
  category_id: number;
  target: number;
  start_date: string;
  end_date: string;
  points: number;
  progress: number;
  completedOn: string | null;
  category: Category | null;
}

export interface SellerDash {
  seller: { id: number; name: string; firstName: string; igl: boolean };
  refDate: string | null;
  days: { total: number; done: number; left: number; hasSchedule: boolean };
  pace: number;
  overall: number;
  projection: number | null;
  categories: CatResult[];
  mission: CatResult[];
  streak: number;
  bestStreak: number;
  points: number;
  rank: number;
  rankTotal: number;
  gapToNext: number;
  aheadName: string | null;
  near: { id: number; name: string; points: number; pos: number; me: boolean }[];
  series: { x: number; y: number }[];
  wins: PointEvent[];
  challenge: Challenge | null;
}

export interface TeamDash {
  ranking: { pos: number; id: number; name: string; fullName: string; igl: boolean; me: boolean; points: number; week: number; overall: number; streak: number }[];
  badges: PointEvent[];
  stores: { id: number; name: string; overall: number; mine: boolean }[];
  challenge: Challenge | null;
  today: string;
}

export interface AdminDash {
  today: string;
  todos: { type: 'results' | 'goals' | 'schedule'; storeId: number; severity: 'high' | 'medium' | 'low'; title: string; text: string }[];
  kpis: { stores: number; sellers: number; overall: number | null; pace: number | null; projection: number | null; upToDate: number };
  stores: {
    id: number;
    name: string;
    code: string | null;
    team: number;
    manager: string | null;
    overall: number | null;
    projection: number | null;
    pace: number | null;
    lastResult: string | null;
    upToDate: boolean;
    categories: { id: number; name: string; icon: string; pct: number | null }[];
  }[];
}

export interface UserRow {
  id: number;
  name: string;
  firstName: string;
  username: string;
  role: Role;
  storeId: number | null;
  igl: boolean;
  active: boolean;
}

export type Kind = 'A' | 'F' | 'L' | 'O' | 'V';
export interface DayCell {
  kind: Kind;
  start?: string | null;
  end?: string | null;
}
