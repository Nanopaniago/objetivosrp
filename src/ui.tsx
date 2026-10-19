import React from 'react';
import {
  AlertTriangle, ArrowDown, Box, Check, Coffee, Crown, Gift, Headphones, Loader2, Package, Shield, Smartphone, Star, Tag, Target, Tv, Wifi, Zap,
  type LucideIcon,
} from 'lucide-react';
import type { CatResult } from './api';

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  crown: Crown, zap: Zap, wifi: Wifi, box: Box, smartphone: Smartphone, shield: Shield, target: Target,
  star: Star, gift: Gift, tag: Tag, package: Package, tv: Tv, coffee: Coffee, headphones: Headphones,
};

export function CatIcon({ icon, size = 18, className = '' }: { icon: string; size?: number; className?: string }) {
  const I = CATEGORY_ICONS[icon] || Target;
  return <I size={size} strokeWidth={1.8} className={className} aria-hidden />;
}

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLElement> & { as?: 'section' | 'div' }) {
  return (
    <section className={cx('rounded-[22px] border border-line bg-card', className)} {...rest}>
      {children}
    </section>
  );
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'quiet' | 'danger'; icon?: LucideIcon; loading?: boolean };
export function Btn({ variant = 'ghost', icon: Icon, loading, className, children, disabled, ...rest }: BtnProps) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-[14px] px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed min-h-11';
  const styles = {
    primary: 'bg-lime text-onlime font-bold glow-btn hover:brightness-105 disabled:bg-track disabled:text-mute2 disabled:shadow-none',
    ghost: 'border border-line2 bg-card2 text-ink2 hover:border-mute2 disabled:opacity-50',
    quiet: 'text-ink2 hover:bg-card2 disabled:opacity-50',
    danger: 'border border-[#5a2a25] bg-badbg text-bad hover:brightness-110 disabled:opacity-50',
  }[variant];
  return (
    <button className={cx(base, styles, className)} disabled={disabled || loading} {...rest}>
      {loading ? <Loader2 size={17} className="animate-spin" aria-hidden /> : Icon ? <Icon size={17} strokeWidth={2.2} aria-hidden /> : null}
      {children}
    </button>
  );
}

export function IconTile({ icon: Icon, tone = 'neutral', size = 40, iconSize = 20 }: { icon: LucideIcon; tone?: Tone; size?: number; iconSize?: number }) {
  const t = TONES[tone];
  return (
    <span className={cx('flex shrink-0 items-center justify-center rounded-xl', t.bg, t.fg)} style={{ width: size, height: size }}>
      <Icon size={iconSize} strokeWidth={1.8} aria-hidden />
    </span>
  );
}

export type Tone = 'neutral' | 'lime' | 'ok' | 'warn' | 'bad' | 'violet' | 'indigo' | 'teal';
export const TONES: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: 'bg-card2', fg: 'text-ink2' },
  lime: { bg: 'bg-limebg', fg: 'text-lime2' },
  ok: { bg: 'bg-okbg', fg: 'text-ok' },
  warn: { bg: 'bg-warnbg', fg: 'text-warn' },
  bad: { bg: 'bg-badbg', fg: 'text-bad' },
  violet: { bg: 'bg-violetbg', fg: 'text-violet' },
  indigo: { bg: 'bg-indigobg', fg: 'text-indigo' },
  teal: { bg: 'bg-tealbg', fg: 'text-teal' },
};

export function Pill({ tone = 'neutral', icon: Icon, children, className }: { tone?: Tone; icon?: LucideIcon; children: React.ReactNode; className?: string }) {
  const t = TONES[tone];
  return (
    <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold', t.bg, t.fg, className)}>
      {Icon && <Icon size={13} strokeWidth={2.4} aria-hidden />}
      {children}
    </span>
  );
}

export const BAR_COLORS = { lime: '#b8f53d', warn: '#f0b440', bad: '#ff6b5b', grey: '#6b716a' };
export function barColor(pct: number | null, pace: number) {
  if (pct === null) return BAR_COLORS.grey;
  if (pct >= pace) return BAR_COLORS.lime;
  if (pct >= pace - 10) return BAR_COLORS.warn;
  return BAR_COLORS.bad;
}

export function Bar({ value, color = BAR_COLORS.lime, marker, height = 10, label }: { value: number | null; color?: string; marker?: number; height?: number; label?: string }) {
  const w = Math.max(0, Math.min(100, value ?? 0));
  return (
    <div className="relative rounded-full bg-track" style={{ height }} role="progressbar" aria-valuenow={Math.round(value ?? 0)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="rp-bar h-full rounded-full" style={{ width: `${w}%`, background: color, color }} />
      {marker !== undefined && marker > 0 && (
        <div title="Onde devias estar hoje" className="absolute rounded-sm bg-ink" style={{ left: `calc(${Math.min(100, marker)}% - 1px)`, top: -4, width: 3, height: height + 8 }} />
      )}
    </div>
  );
}

export function Ring({ value, pace, size = 160, caption = 'do mês, em média' }: { value: number; pace?: number; size?: number; caption?: string }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  const ang = ((pace ?? 0) / 100) * 2 * Math.PI - Math.PI / 2;
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={`${Math.round(value)}% da meta${pace !== undefined ? `, ritmo esperado ${Math.round(pace)}%` : ''}`}>
      <circle cx="60" cy="60" r={r} fill="none" stroke="#2a2d31" strokeWidth="11" />
      <circle className="rp-ring" cx="60" cy="60" r={r} fill="none" stroke="#b8f53d" strokeWidth="11" strokeLinecap="round" strokeDasharray={`${(v / 100) * c} ${c}`} transform="rotate(-90 60 60)" style={{ transition: 'stroke-dasharray .6s ease' }} />
      {pace !== undefined && pace > 0 && <circle cx={60 + r * Math.cos(ang)} cy={60 + r * Math.sin(ang)} r="4" fill="#f2f4f0" stroke="#0e0f11" strokeWidth="2" />}
      <text x="60" y={caption ? 60 : 68} textAnchor="middle" fontSize="26" fontWeight="700" fill="#f2f4f0">{Math.round(value)}%</text>
      {caption && <text x="60" y="76" textAnchor="middle" fontSize="8.5" fill="#a3a8a0">{caption}</text>}
    </svg>
  );
}

export function statusInfo(c: Pick<CatResult, 'status'>): { label: string; tone: Tone; icon: LucideIcon } {
  switch (c.status) {
    case 'done': return { label: 'Meta atingida', tone: 'ok', icon: Check };
    case 'ahead': return { label: 'À frente', tone: 'ok', icon: Check };
    case 'close': return { label: 'Quase no ritmo', tone: 'warn', icon: AlertTriangle };
    case 'behind': return { label: 'Atrás do ritmo', tone: 'bad', icon: ArrowDown };
    default: return { label: 'Sem meta', tone: 'neutral', icon: Target };
  }
}

export function Spinner({ label = 'A carregar…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-20 text-mute" role="status">
      <Loader2 className="animate-spin" size={22} aria-hidden /> {label}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card className="flex flex-wrap items-center gap-4 border-[#5a2a25] p-5">
      <IconTile icon={AlertTriangle} tone="bad" />
      <p className="m-0 flex-1 text-sm text-ink2">{message}</p>
      {onRetry && <Btn onClick={onRetry}>Tentar de novo</Btn>}
    </Card>
  );
}

export function Empty({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text: string; action?: React.ReactNode }) {
  return (
    <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <IconTile icon={Icon} tone="lime" size={52} iconSize={26} />
      <h2 className="m-0 text-lg font-bold">{title}</h2>
      <p className="m-0 max-w-md text-sm leading-relaxed text-mute">{text}</p>
      {action}
    </Card>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-semibold text-ink2">{label}</span>
      {children}
      {hint && <span className="text-xs text-mute2">{hint}</span>}
    </label>
  );
}

export const inputCls = 'min-h-11 rounded-xl border border-line2 bg-bg px-3 py-2 text-ink placeholder:text-mute2 focus:border-lime focus:outline-none';

let toastTimer: number | undefined;
export function toast(message: string, tone: 'ok' | 'bad' = 'ok') {
  window.dispatchEvent(new CustomEvent('rp:toast', { detail: { message, tone } }));
  window.clearTimeout(toastTimer);
}

export function Toaster() {
  const [t, setT] = React.useState<{ message: string; tone: 'ok' | 'bad' } | null>(null);
  React.useEffect(() => {
    let timer: number;
    const on = (e: Event) => {
      setT((e as CustomEvent).detail);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setT(null), 3500);
    };
    window.addEventListener('rp:toast', on);
    return () => window.removeEventListener('rp:toast', on);
  }, []);
  if (!t) return null;
  return (
    <div role="status" aria-live="polite" className="rp-pop fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-line2 bg-card2 px-4 py-3 text-sm shadow-2xl md:bottom-8">
      <span className={cx('flex h-6 w-6 items-center justify-center rounded-lg', t.tone === 'ok' ? 'bg-okbg text-ok' : 'bg-badbg text-bad')}>
        {t.tone === 'ok' ? <Check size={14} strokeWidth={2.6} /> : <AlertTriangle size={14} />}
      </span>
      {t.message}
    </div>
  );
}
