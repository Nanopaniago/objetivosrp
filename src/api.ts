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

/** Starts a background read and polls until it finishes (reading can take over a minute). */
export async function runJob<T>(url: string, body: FormData, signal?: AbortSignal): Promise<T> {
  const { job } = await api.post<{ job: string }>(url, body);
  const started = Date.now();
  while (Date.now() - started < 10 * 60 * 1000) {
    await new Promise((r) => setTimeout(r, 2000));
    if (signal?.aborted) throw new ApiError(0, 'Cancelado.');
    const s = await api.get<{ status: 'running' | 'done' | 'error'; result?: T; error?: string }>(`/api/imports/jobs/${job}`);
    if (s.status === 'done') return s.result as T;
    if (s.status === 'error') throw new ApiError(502, s.error || 'Não foi possível ler o ficheiro.');
  }
  throw new ApiError(504, 'A leitura está a demorar demasiado. Tenta de novo.');
}

/** Crops the centre square and shrinks a photo to size×size, returning a light WEBP (JPEG fallback). */
export async function shrinkPhoto(file: File, size = 320): Promise<Blob> {
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) throw new ApiError(400, 'Não consegui abrir esta foto. Usa JPG ou PNG.');
  const side = Math.min(bmp.width, bmp.height);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  canvas.getContext('2d')!.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, size, size);
  const out = (type: string) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, 0.85));
  const webp = await out('image/webp');
  return webp && webp.type === 'image/webp' ? webp : ((await out('image/jpeg')) as Blob);
}

export type Role = 'admin' | 'manager' | 'seller';
export type Unit = 'eur' | 'un';

export interface Me {
  user: { id: number; name: string; firstName: string; username: string; role: Role; storeId: number | null; igl: boolean; avatar: number };
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
  near: { id: number; name: string; avatar: number; points: number; pos: number; me: boolean }[];
  series: { x: number; y: number }[];
  wins: PointEvent[];
  challenge: Challenge | null;
}

export interface TeamDash {
  ranking: { pos: number; id: number; name: string; fullName: string; igl: boolean; avatar: number; me: boolean; points: number; week: number; overall: number; streak: number }[];
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
  avatar: number;
}

export type Kind = 'A' | 'F' | 'L' | 'O' | 'V';
export interface DayCell {
  kind: Kind;
  start?: string | null;
  end?: string | null;
}
