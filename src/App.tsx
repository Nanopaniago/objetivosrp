import React from 'react';
import { Calendar, ChevronLeft, ChevronRight, Home, LogOut, Settings2, Store, Target, Trophy, Upload, type LucideIcon } from 'lucide-react';
import { api, type Me } from './api';
import { MONTHS } from './format';
import { Spinner, Toaster, cx, inputCls } from './ui';
import Login from './pages/Login';
import Painel from './pages/Painel';
import Equipa from './pages/Equipa';
import Importar from './pages/Importar';
import Escala from './pages/Escala';
import Lojas from './pages/Lojas';
import Gestao from './pages/Gestao';

interface Ctx {
  me: Me;
  storeId: number | null;
  setStoreId: (id: number) => void;
  year: number;
  month: number;
  setPeriod: (y: number, m: number) => void;
  canManage: boolean;
  go: (route: Route) => void;
}
const AppCtx = React.createContext<Ctx | null>(null);
export const useApp = () => {
  const c = React.useContext(AppCtx);
  if (!c) throw new Error('useApp fora do contexto');
  return c;
};

type Route = 'painel' | 'equipa' | 'importar' | 'escala' | 'lojas' | 'gestao';
interface NavItem { route: Route; label: string; icon: LucideIcon; group: 'dia' | 'gestao'; roles: Me['user']['role'][] }
const NAV: NavItem[] = [
  { route: 'painel', label: 'Painel', icon: Home, group: 'dia', roles: ['seller', 'manager', 'admin'] },
  { route: 'equipa', label: 'Equipa', icon: Trophy, group: 'dia', roles: ['seller', 'manager', 'admin'] },
  { route: 'escala', label: 'Escala', icon: Calendar, group: 'dia', roles: ['seller'] },
  { route: 'importar', label: 'Importar', icon: Upload, group: 'gestao', roles: ['manager', 'admin'] },
  { route: 'escala', label: 'Escala', icon: Calendar, group: 'gestao', roles: ['manager', 'admin'] },
  { route: 'lojas', label: 'Lojas', icon: Store, group: 'gestao', roles: ['manager', 'admin'] },
  { route: 'gestao', label: 'Gestão', icon: Settings2, group: 'gestao', roles: ['manager', 'admin'] },
];

const readRoute = (): Route => {
  const r = window.location.hash.replace(/^#\/?/, '').split('?')[0] as Route;
  return ['painel', 'equipa', 'importar', 'escala', 'lojas', 'gestao'].includes(r) ? r : 'painel';
};

export default function App() {
  const [me, setMe] = React.useState<Me | null | undefined>(undefined);
  const [route, setRoute] = React.useState<Route>(readRoute);
  const [storeId, setStoreIdState] = React.useState<number | null>(null);
  const [period, setPeriodState] = React.useState<[number, number] | null>(null);

  const loadMe = React.useCallback(() => {
    api.get<Me>('/api/me').then((m) => {
      setMe(m);
      const saved = Number(localStorageGet('rp_store'));
      const pick = m.stores.find((s) => s.id === saved)?.id ?? m.user.storeId ?? m.stores[0]?.id ?? null;
      setStoreIdState(pick);
      setPeriodState((p) => p ?? [Number(m.today.slice(0, 4)), Number(m.today.slice(5, 7))]);
    }).catch(() => setMe(null));
  }, []);

  React.useEffect(() => {
    loadMe();
    const onHash = () => setRoute(readRoute());
    const onLogout = () => setMe(null);
    window.addEventListener('hashchange', onHash);
    window.addEventListener('rp:logout', onLogout);
    return () => {
      window.removeEventListener('hashchange', onHash);
      window.removeEventListener('rp:logout', onLogout);
    };
  }, [loadMe]);

  if (me === undefined) return <Spinner />;
  if (me === null) return (<><Login onDone={loadMe} /><Toaster /></>);
  if (!period) return <Spinner />;

  const role = me.user.role;
  const allowed = NAV.filter((n) => n.roles.includes(role));
  const current = allowed.some((n) => n.route === route) || route === 'gestao' ? route : 'painel';
  const ctx: Ctx = {
    me,
    storeId,
    setStoreId: (id) => { setStoreIdState(id); localStorageSet('rp_store', String(id)); },
    year: period[0],
    month: period[1],
    setPeriod: (y, m) => setPeriodState([y, m]),
    canManage: role !== 'seller',
    go: (r) => { window.location.hash = `/${r}`; },
  };

  const logout = async () => {
    await api.post('/api/auth/logout').catch(() => null);
    setMe(null);
  };

  const Page = { painel: Painel, equipa: Equipa, importar: Importar, escala: Escala, lojas: Lojas, gestao: Gestao }[current];
  const roleLabel = { admin: 'Administrador', manager: 'Gestor', seller: 'Vendedor' }[role];
  const storeName = me.stores.find((s) => s.id === storeId)?.name;

  return (
    <AppCtx.Provider value={ctx}>
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col gap-6 border-r border-line bg-side px-4 py-6 md:flex">
          <a href="#/painel" className="flex items-center gap-2.5 px-2 text-ink no-underline">
            <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-lime text-onlime"><Target size={20} strokeWidth={2} aria-hidden /></span>
            <span className="text-lg font-bold">Objetivos <span className="text-lime">RP</span></span>
          </a>
          <nav aria-label="Principal" className="flex flex-col gap-1">
            {(['dia', 'gestao'] as const).map((g) => {
              const items = allowed.filter((n) => n.group === g);
              if (!items.length) return null;
              return (
                <React.Fragment key={g}>
                  <span className={cx('px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-mute2', g === 'gestao' && 'pt-4')}>{g === 'dia' ? (role === 'seller' ? 'O meu dia' : 'A loja') : 'Gestão'}</span>
                  {items.map((n) => (
                    <a key={n.route + g} href={`#/${n.route}`} aria-current={current === n.route ? 'page' : undefined}
                      className={cx('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm no-underline', current === n.route ? 'bg-lime font-semibold text-onlime' : 'font-medium text-[#b4b9ae] hover:bg-card2')}>
                      <n.icon size={20} strokeWidth={1.8} aria-hidden />{n.label}
                    </a>
                  ))}
                </React.Fragment>
              );
            })}
          </nav>
          <div className="mt-auto flex items-center gap-2.5 rounded-2xl border border-line bg-card p-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-limebg font-bold text-lime2">{me.user.firstName.charAt(0)}</span>
            <a href="#/gestao?tab=conta" title="A minha conta" className="flex min-w-0 flex-1 flex-col text-ink no-underline">
              <strong className="truncate text-sm">{me.user.firstName}</strong>
              <span className="truncate text-xs text-mute2">{roleLabel}{storeName && role === 'seller' ? ` · ${storeName}` : ''}</span>
            </a>
            <button onClick={logout} aria-label="Terminar sessão" className="flex h-9 w-9 items-center justify-center rounded-lg text-mute hover:bg-card2"><LogOut size={17} /></button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col pb-24 md:pb-0">
          <TopBar onLogout={logout} />
          <main className="mx-auto flex w-full max-w-[1180px] flex-col gap-5 px-4 py-6 sm:px-8">
            <Page key={`${current}-${storeId}-${period[0]}-${period[1]}`} />
          </main>
        </div>

        <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-40 flex gap-1.5 border-t border-line bg-side px-3 pt-2 pb-[max(14px,env(safe-area-inset-bottom))] md:hidden">
          {allowed.slice(0, 5).map((n) => (
            <a key={n.route + n.group} href={`#/${n.route}`} aria-current={current === n.route ? 'page' : undefined}
              className={cx('flex flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-2 text-xs no-underline', current === n.route ? 'bg-limebg font-semibold text-lime2' : 'font-medium text-mute')}>
              <n.icon size={21} strokeWidth={1.8} aria-hidden />{n.label}
            </a>
          ))}
        </nav>
      </div>
      <Toaster />
    </AppCtx.Provider>
  );
}

function TopBar({ onLogout }: { onLogout: () => void }) {
  const { me, storeId, setStoreId, year, month, setPeriod } = useApp();
  const shift = (d: number) => {
    const dt = new Date(year, month - 1 + d, 1);
    setPeriod(dt.getFullYear(), dt.getMonth() + 1);
  };
  const isCurrent = me.today.startsWith(`${year}-${String(month).padStart(2, '0')}`);
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3.5 sm:px-8">
      <span className="flex items-center gap-2 md:hidden">
        <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-lime text-onlime"><Target size={18} aria-hidden /></span>
        <strong>Objetivos <span className="text-lime">RP</span></strong>
      </span>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {me.stores.length > 1 && (
          <label className="flex items-center gap-2">
            <span className="sr-only">Loja</span>
            <Store size={16} className="text-mute" aria-hidden />
            <select value={storeId ?? ''} onChange={(e) => setStoreId(Number(e.target.value))} className={cx(inputCls, 'min-h-10 py-1.5 text-sm')}>
              {me.stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
        )}
        <div className="flex items-center rounded-xl border border-line bg-card2">
          <button onClick={() => shift(-1)} aria-label="Mês anterior" className="flex h-10 w-10 items-center justify-center text-mute hover:text-ink"><ChevronLeft size={18} /></button>
          <span className="min-w-[118px] text-center text-sm font-semibold capitalize">{MONTHS[month - 1]} {year}</span>
          <button onClick={() => shift(1)} aria-label="Mês seguinte" className="flex h-10 w-10 items-center justify-center text-mute hover:text-ink"><ChevronRight size={18} /></button>
        </div>
        {!isCurrent && (
          <button onClick={() => setPeriod(Number(me.today.slice(0, 4)), Number(me.today.slice(5, 7)))} className="min-h-10 rounded-xl px-3 text-sm font-semibold text-lime2 hover:bg-card2">Hoje</button>
        )}
        <button onClick={onLogout} aria-label="Terminar sessão" className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-card2 text-mute md:hidden"><LogOut size={17} /></button>
      </div>
    </div>
  );
}

function localStorageGet(k: string) {
  try { return window.localStorage.getItem(k); } catch { return null; }
}
function localStorageSet(k: string, v: string) {
  try { window.localStorage.setItem(k, v); } catch { /* ignore */ }
}
