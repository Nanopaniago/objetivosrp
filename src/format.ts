import type { Unit } from './api';

const nf = (v: number, d = 0) => v.toLocaleString('pt-PT', { minimumFractionDigits: d, maximumFractionDigits: d });

export const num = (v: number | null | undefined, d = 0) => (v === null || v === undefined ? '—' : nf(v, d));
export const pct = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${nf(v, 0)}%`);

export function amount(v: number | null | undefined, unit: Unit, opts: { long?: boolean } = {}) {
  if (v === null || v === undefined) return '—';
  if (unit === 'eur') return `${nf(v, Number.isInteger(v) || Math.abs(v) >= 100 ? 0 : 2)} €`;
  const n = nf(v, Number.isInteger(v) ? 0 : 1);
  if (!opts.long) return n;
  return `${n} ${Math.abs(v) === 1 ? 'unidade' : 'unidades'}`;
}

export const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

export function shortDate(iso: string | null | undefined) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1].slice(0, 3)}${y !== new Date().getFullYear() ? ' ' + y : ''}`;
}

export function relDay(iso: string, today: string) {
  const diff = Math.round((Date.parse(today) - Date.parse(iso)) / 86400000);
  if (diff <= 0) return 'Hoje';
  if (diff === 1) return 'Ontem';
  return `Há ${diff} dias`;
}

export const dateOf = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
export const daysIn = (y: number, m: number) => new Date(y, m, 0).getDate();
