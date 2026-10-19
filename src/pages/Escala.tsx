import React from 'react';
import { AlertTriangle, Check, Clock, ImageUp, Moon, Paintbrush, Pause, Sun, Umbrella, Undo2, Users, type LucideIcon } from 'lucide-react';
import { api, type DayCell, type Kind, type UserRow } from '../api';
import { useApp } from '../App';
import { MONTHS, WEEKDAYS, daysIn, dateOf } from '../format';
import { Btn, Card, Empty, ErrorBox, IconTile, Spinner, cx, inputCls, toast } from '../ui';

export const KIND_STYLE: Record<Kind, { name: string; sub: string; bg: string; fg: string; icon: LucideIcon }> = {
  A: { name: 'Abertura', sub: '09:30–18:30', bg: '#17333a', fg: '#8ddde8', icon: Sun },
  F: { name: 'Fecho', sub: '11:30–20:30', bg: '#1e2547', fg: '#a9b8ff', icon: Moon },
  L: { name: 'Horário livre', sub: 'Equipa IGL', bg: '#2a2340', fg: '#c7b4f5', icon: Clock },
  O: { name: 'Folga', sub: 'Não conta', bg: '#1e2125', fg: '#7d837a', icon: Pause },
  V: { name: 'Férias', sub: 'Não conta', bg: '#33290f', fg: '#f5c86b', icon: Umbrella },
};

export function KindIcon({ kind, size = 14 }: { kind: Kind; size?: number }) {
  const I = KIND_STYLE[kind].icon;
  return <I size={size} strokeWidth={2.2} aria-hidden />;
}

type Grid = Record<number, Record<string, DayCell>>;
const WK = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export default function Escala() {
  const { me, storeId, year, month, canManage, go } = useApp();
  const [people, setPeople] = React.useState<{ id: number; name: string; igl: boolean }[] | null>(null);
  const [grid, setGrid] = React.useState<Grid>({});
  const [history, setHistory] = React.useState<Grid[]>([]);
  const [brush, setBrush] = React.useState<Kind>('A');
  const [free, setFree] = React.useState({ start: '09:00', end: '18:00' });
  const [dirty, setDirty] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const n = daysIn(year, month);

  const load = React.useCallback(async () => {
    if (!storeId) return;
    setError(null);
    try {
      const [rows, team] = await Promise.all([
        api.get<{ user_id: number; date: string; kind: Kind; start_time: string | null; end_time: string | null }[]>(`/api/schedules?store_id=${storeId}&year=${year}&month=${month}`),
        canManage
          ? api.get<UserRow[]>(`/api/users?store_id=${storeId}`).then((u) => u.filter((x) => x.role === 'seller' && x.active).map((x) => ({ id: x.id, name: x.firstName, igl: x.igl })))
          : api.get<{ ranking: { id: number; name: string; igl: boolean }[] }>(`/api/dashboard/team?store_id=${storeId}&year=${year}&month=${month}`).then((t) => t.ranking.map((x) => ({ id: x.id, name: x.name, igl: x.igl })).sort((a, b) => a.name.localeCompare(b.name))),
      ]);
      const g: Grid = {};
      for (const r of rows) (g[r.user_id] ||= {})[r.date] = { kind: r.kind, start: r.start_time, end: r.end_time };
      setGrid(g);
      setPeople(team);
      setHistory([]);
      setDirty(false);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [storeId, year, month, canManage]);
  React.useEffect(() => { load(); }, [load]);

  React.useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!people) return <Spinner />;
  if (!people.length) return <Empty icon={Users} title="Ainda não há vendedores nesta loja" text="A escala aparece aqui assim que houver vendedores." />;

  const paint = (uid: number, date: string) => {
    if (!canManage) return;
    const cur = grid[uid]?.[date];
    const next: DayCell = brush === 'L' ? { kind: 'L', start: free.start, end: free.end } : { kind: brush };
    if (cur && cur.kind === next.kind && cur.start === next.start && cur.end === next.end) return;
    setHistory((h) => [...h.slice(-29), grid]);
    setGrid({ ...grid, [uid]: { ...(grid[uid] || {}), [date]: next } });
    setDirty(true);
  };
  const undo = () => {
    const prev = history[history.length - 1];
    if (!prev) return;
    setGrid(prev);
    setHistory(history.slice(0, -1));
    setDirty(history.length > 1);
  };
  const fillEmpty = () => {
    setHistory((h) => [...h.slice(-29), grid]);
    const g: Grid = { ...grid };
    for (const p of people) {
      g[p.id] = { ...(g[p.id] || {}) };
      for (let d = 1; d <= n; d++) {
        const date = dateOf(year, month, d);
        if (!g[p.id][date]) g[p.id][date] = new Date(year, month - 1, d).getDay() === 0 ? { kind: 'O' } : { kind: p.igl ? 'L' : 'A', ...(p.igl ? { start: '09:00', end: '18:00' } : {}) };
      }
    }
    setGrid(g);
    setDirty(true);
  };
  const save = async () => {
    setBusy(true);
    try {
      await api.put('/api/schedules', { store_id: storeId, year, month, rows: people.map((p) => ({ userId: p.id, days: grid[p.id] || {} })) });
      setDirty(false);
      setHistory([]);
      toast('Escala guardada. As metas diárias já foram recalculadas.');
    } catch (e) {
      toast((e as Error).message, 'bad');
    } finally {
      setBusy(false);
    }
  };

  const today = me.today;
  const isWork = (c?: DayCell) => !!c && (c.kind === 'A' || c.kind === 'F' || c.kind === 'L');
  const cover = Array.from({ length: n }, (_, i) => people.filter((p) => isWork(grid[p.id]?.[dateOf(year, month, i + 1)])).length);
  const filledAny = people.some((p) => Object.keys(grid[p.id] || {}).length > 0);
  const low = filledAny ? cover.map((c, i) => (c < Math.min(3, people.length) ? i + 1 : 0)).filter(Boolean) : [];
  const empties = people.reduce((s, p) => s + (n - Object.keys(grid[p.id] || {}).length), 0);
  const cols = `120px repeat(${n}, 32px) 64px 64px`;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-2xl font-bold capitalize-first">Escala de {MONTHS[month - 1]}</h1>
          <p className="m-0 mt-1 text-sm text-mute">{canManage ? 'Escolhe um turno e clica nos dias para o aplicar.' : 'Os teus dias de trabalho contam para a meta diária. Folgas e férias não.'}</p>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2.5">
            <Btn icon={ImageUp} onClick={() => go('importar')}>Importar da imagem</Btn>
            <Btn icon={Undo2} onClick={undo} disabled={!history.length}>Desfazer</Btn>
            <Btn variant="primary" icon={Check} onClick={save} disabled={!dirty} loading={busy}>Guardar escala</Btn>
          </div>
        )}
      </div>

      {canManage && (
        <Card className="flex flex-wrap items-center gap-2.5 p-3.5" aria-label="Pincel de turnos">
          <span className="flex items-center gap-2 px-1.5 text-[13px] font-semibold text-mute"><Paintbrush size={17} aria-hidden />Pincel</span>
          {(Object.keys(KIND_STYLE) as Kind[]).map((k) => {
            const s = KIND_STYLE[k];
            return (
              <button key={k} onClick={() => setBrush(k)} aria-pressed={brush === k}
                className={cx('flex items-center gap-2.5 rounded-[14px] border-2 py-2 pr-3.5 pl-2 text-left', brush === k ? 'border-lime bg-limesel' : 'border-transparent bg-card2')}>
                <span className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: s.bg, color: s.fg }}><KindIcon kind={k} size={17} /></span>
                <span className="flex flex-col"><strong className="text-[13px]">{s.name}</strong><span className="text-[11px] text-mute2">{s.sub}</span></span>
              </button>
            );
          })}
          {brush === 'L' && (
            <span className="flex items-center gap-2 text-sm">
              <input type="time" aria-label="Entrada" className={cx(inputCls, 'min-h-10 py-1')} value={free.start} onChange={(e) => setFree({ ...free, start: e.target.value })} />
              <span className="text-mute">–</span>
              <input type="time" aria-label="Saída" className={cx(inputCls, 'min-h-10 py-1')} value={free.end} onChange={(e) => setFree({ ...free, end: e.target.value })} />
            </span>
          )}
        </Card>
      )}

      {!filledAny && canManage ? (
        <Empty icon={Paintbrush} title="Ainda não há escala para este mês" text="Importa a fotografia da escala, ou preenche tudo como Abertura (domingos como folga) e ajusta com o pincel."
          action={<div className="flex flex-wrap justify-center gap-2.5"><Btn variant="primary" icon={ImageUp} onClick={() => go('importar')}>Importar da imagem</Btn><Btn onClick={fillEmpty}>Preencher e ajustar</Btn></div>} />
      ) : (
        <Card className="flex flex-col gap-3 p-4">
          <div className="overflow-x-auto pb-1.5">
            <div className="flex min-w-[1260px] flex-col gap-1">
              <div className="grid items-end gap-[3px]" style={{ gridTemplateColumns: cols }}>
                <span className="text-xs text-mute2">Vendedor</span>
                {Array.from({ length: n }, (_, i) => {
                  const date = dateOf(year, month, i + 1);
                  const wd = new Date(year, month - 1, i + 1).getDay();
                  const isToday = date === today;
                  return (
                    <div key={i} className={cx('flex flex-col items-center rounded-[9px] py-1', isToday ? 'bg-lime text-onlime' : wd === 0 || wd === 6 ? 'bg-[#23262a] text-ink2' : 'text-ink2')}>
                      <span className="text-[10px] font-medium">{WK[wd]}</span><strong className="text-xs">{i + 1}</strong>
                    </div>
                  );
                })}
                <span className="text-center text-[11px] text-mute2">No mês</span>
                <span className="text-center text-[11px] text-mute2">Restam</span>
              </div>
              {people.map((p) => {
                const cells = grid[p.id] || {};
                const work = Object.values(cells).filter(isWork).length;
                const left = Object.entries(cells).filter(([d, c]) => d > today && isWork(c)).length;
                const mine = p.id === me.user.id;
                return (
                  <div key={p.id} className={cx('grid items-center gap-[3px] rounded-lg', mine && 'bg-limesel')} style={{ gridTemplateColumns: cols }}>
                    <span className="flex min-w-0 items-center gap-1.5 pl-1"><strong className="truncate text-sm">{mine ? 'Tu' : p.name}</strong>{p.igl && <span className="rounded-full bg-violetbg px-1.5 py-0.5 text-[10px] font-bold text-violet">IGL</span>}</span>
                    {Array.from({ length: n }, (_, i) => {
                      const date = dateOf(year, month, i + 1);
                      const c = cells[date];
                      const s = c ? KIND_STYLE[c.kind] : null;
                      const label = `${p.name}, ${i + 1} de ${MONTHS[month - 1]} (${WEEKDAYS[new Date(year, month - 1, i + 1).getDay()]}): ${s ? s.name + (c?.start ? ` ${c.start}–${c.end}` : '') : 'sem turno'}`;
                      return (
                        <button key={i} onClick={() => paint(p.id, date)} aria-label={label} title={label} disabled={!canManage}
                          className={cx('flex h-[34px] w-8 items-center justify-center rounded-[9px]', !s && 'border border-dashed border-line2', canManage ? 'cursor-pointer hover:brightness-125' : 'cursor-default')}
                          style={s ? { background: s.bg, color: s.fg } : undefined}>
                          {c && <KindIcon kind={c.kind} />}
                        </button>
                      );
                    })}
                    <strong className="text-center text-sm">{work}</strong>
                    <strong className="text-center text-sm text-lime2">{left}</strong>
                  </div>
                );
              })}
              <div className="mt-1.5 grid items-center gap-[3px] border-t border-line pt-2" style={{ gridTemplateColumns: cols }}>
                <span className="flex items-center gap-1.5 text-xs text-mute"><Users size={14} aria-hidden />A trabalhar</span>
                {cover.map((c, i) => {
                  const isLow = low.includes(i + 1);
                  return <span key={i} title={`${i + 1}: ${c} pessoas`} className={cx('flex h-[26px] items-center justify-center rounded-lg text-xs font-bold', isLow ? 'bg-badbg text-bad' : 'bg-card2 text-mute')}>{c}</span>;
                })}
              </div>
            </div>
          </div>
        </Card>
      )}

      {filledAny && (
        <div className="flex flex-wrap gap-3.5">
          <Card className={cx('flex min-w-0 flex-[1_1_340px] items-start gap-3.5 p-4.5', low.length > 0 && 'border-[#5a2a25]')}>
            <IconTile icon={low.length ? AlertTriangle : Check} tone={low.length ? 'bad' : 'ok'} />
            <span className="flex flex-col gap-1">
              <strong>{low.length ? (low.length === 1 ? `Pouca gente no dia ${low[0]}` : `Pouca gente em ${low.length} dias`) : 'Cobertura completa'}</strong>
              <span className="text-[13px] leading-snug text-mute">{low.length ? `Menos de ${Math.min(3, people.length)} pessoas a trabalhar em: ${low.join(', ')}.` : 'Todos os dias têm gente suficiente.'}</span>
            </span>
          </Card>
          {canManage && empties > 0 && (
            <Card className="flex min-w-0 flex-[1_1_340px] items-start gap-3.5 p-4.5">
              <IconTile icon={Paintbrush} tone="warn" />
              <span className="flex flex-col gap-1">
                <strong>{empties} dias sem turno</strong>
                <span className="text-[13px] leading-snug text-mute">Dias sem turno não contam como trabalho. Pinta-os ou <button onClick={fillEmpty} className="font-semibold text-lime2 underline">preenche automaticamente</button>.</span>
              </span>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
