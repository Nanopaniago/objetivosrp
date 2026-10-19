import React from 'react';
import { AlertTriangle, ArrowRight, Calendar, Check, CheckCircle2, Clock, Plus, Store, Target, TrendingUp, Users } from 'lucide-react';
import { api, type AdminDash } from '../api';
import { useApp } from '../App';
import { pct, relDay } from '../format';
import { Bar, Btn, Card, CatIcon, Empty, ErrorBox, IconTile, Pill, Spinner, barColor, cx } from '../ui';

export default function Lojas() {
  const { me, year, month, setStoreId } = useApp();
  const [data, setData] = React.useState<AdminDash | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [sel, setSel] = React.useState<number | null>(null);

  const load = React.useCallback(() => {
    setError(null);
    api.get<AdminDash>(`/api/dashboard/admin?year=${year}&month=${month}`).then((d) => {
      setData(d);
      setSel((s) => s ?? d.stores[0]?.id ?? null);
    }).catch((e) => setError(e.message));
  }, [year, month]);
  React.useEffect(load, [load]);

  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!data) return <Spinner />;
  const isAdmin = me.user.role === 'admin';
  if (!data.stores.length)
    return <Empty icon={Store} title="Ainda não há lojas" text={isAdmin ? 'Cria a primeira loja para começar.' : 'Pede ao administrador para te associar a uma loja.'} action={isAdmin ? <a href="#/gestao?tab=lojas" className="glow-btn inline-flex min-h-11 items-center gap-2 rounded-[14px] bg-lime px-4 font-bold text-onlime no-underline"><Plus size={17} />Criar loja</a> : undefined} />;

  const open = (storeId: number, route: string) => {
    setStoreId(storeId);
    window.location.hash = route;
  };
  const actionFor = (t: AdminDash['todos'][number]) =>
    ({
      results: { label: 'Importar resultados', route: '/importar', icon: Clock, tone: 'bad' as const },
      goals: { label: 'Definir metas', route: '/gestao?tab=metas', icon: Target, tone: 'warn' as const },
      schedule: { label: 'Carregar escala', route: '/escala', icon: Calendar, tone: 'indigo' as const },
    })[t.type];
  const k = data.kpis;
  const s = data.stores.find((x) => x.id === sel) || data.stores[0];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-2xl font-bold">Lojas</h1>
          <p className="m-0 mt-1 text-sm text-mute">{isAdmin ? 'Todas as lojas' : 'As tuas lojas'}, num relance.</p>
        </div>
        {isAdmin && <a href="#/gestao?tab=lojas" className="glow-btn inline-flex min-h-11 items-center gap-2 rounded-[14px] bg-lime px-4 text-sm font-bold text-onlime no-underline"><Plus size={17} strokeWidth={2.4} aria-hidden />Nova loja</a>}
      </div>

      <section className="flex flex-col gap-2.5 rounded-[26px] border border-limeline bg-card p-5" style={{ background: 'radial-gradient(620px 260px at 100% 0%, rgba(184,245,61,0.16), transparent 70%), #17191c' }}>
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="m-0 text-[22px] font-bold">Precisa de ti hoje</h2>
          {data.todos.length ? <Pill tone="warn">{data.todos.length} por resolver</Pill> : <Pill tone="ok" icon={Check}>Tudo em dia</Pill>}
        </div>
        {data.todos.length === 0 && <p className="m-0 text-sm text-mute">Todas as lojas têm resultados recentes, metas e escala. Bom trabalho.</p>}
        {data.todos.map((t, i) => {
          const a = actionFor(t);
          return (
            <div key={i} className="flex flex-wrap items-center gap-x-3.5 gap-y-3 rounded-[18px] border border-line bg-bg p-3.5">
              <IconTile icon={t.severity === 'high' ? AlertTriangle : a.icon} tone={a.tone} />
              <span className="flex min-w-0 flex-[1_1_260px] flex-col gap-0.5"><strong className="text-[15px]">{t.title}</strong><span className="text-[13px] text-mute">{t.text}</span></span>
              <Btn variant="primary" icon={ArrowRight} onClick={() => open(t.storeId, a.route)}>{a.label}</Btn>
            </div>
          );
        })}
      </section>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
        {[
          { icon: Store, label: 'Lojas ativas', value: String(k.stores), sub: `${k.sellers} vendedores` },
          { icon: Target, label: 'Média da meta', value: pct(k.overall), sub: `Ritmo esperado: ${pct(k.pace)}` },
          { icon: TrendingUp, label: 'Projeção de fecho', value: pct(k.projection), sub: 'Se o ritmo se mantiver' },
          { icon: Clock, label: 'Com resultados recentes', value: `${k.upToDate} de ${k.stores}`, sub: 'Até ontem ou hoje' },
        ].map((x) => (
          <Card key={x.label} className="flex flex-col gap-2.5 p-4.5">
            <IconTile icon={x.icon} size={38} iconSize={19} />
            <span className="text-[13px] text-mute">{x.label}</span>
            <strong className="text-[28px]">{x.value}</strong>
            <span className="text-xs text-mute2">{x.sub}</span>
          </Card>
        ))}
      </section>

      <div className="flex flex-wrap items-start gap-3.5">
        <Card className="flex min-w-0 flex-[2_1_560px] flex-col gap-1 p-2.5">
          <h2 className="mx-3 mt-2.5 mb-2 text-[17px] font-bold">{isAdmin ? 'Todas as lojas' : 'As tuas lojas'}</h2>
          {data.stores.map((x) => (
            <button key={x.id} onClick={() => setSel(x.id)} aria-pressed={x.id === s.id}
              className={cx('flex w-full flex-wrap items-center gap-x-4 gap-y-2.5 rounded-[18px] border-2 px-4 py-3.5 text-left', x.id === s.id ? 'border-lime bg-limesel' : 'border-transparent hover:bg-card2')}>
              <IconTile icon={Store} />
              <span className="flex min-w-0 flex-[1_1_150px] flex-col gap-0.5"><strong className="text-[15px]">{x.name}</strong><span className="text-xs text-mute2">{x.team} {x.team === 1 ? 'vendedor' : 'vendedores'}{x.manager ? ` · gestor ${x.manager}` : ''}</span></span>
              <span className="flex flex-[1_1_140px] flex-col gap-1.5">
                <span className="flex justify-between text-xs text-mute">Meta média<strong className="text-ink">{pct(x.overall)}</strong></span>
                <Bar value={x.overall} height={8} color={barColor(x.overall, x.pace ?? 0)} label={`${x.name}: ${pct(x.overall)}`} />
              </span>
              <span className={cx('flex min-w-[84px] items-center gap-1 text-[13px] font-bold', (x.projection ?? 0) >= 100 ? 'text-ok' : (x.projection ?? 0) >= 80 ? 'text-warn' : 'text-bad')}><TrendingUp size={14} aria-hidden />{pct(x.projection)}</span>
              <Pill tone={x.upToDate ? 'ok' : 'warn'} icon={x.upToDate ? Check : Clock}>{x.lastResult ? relDay(x.lastResult, data.today) : 'Sem resultados'}</Pill>
            </button>
          ))}
        </Card>

        <Card className="flex min-w-0 flex-[1_1_300px] flex-col gap-2 p-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-lime2">Detalhe</span>
          <h2 className="m-0 mb-1.5 text-[19px] font-bold">{s.name}</h2>
          {s.categories.map((c) => (
            <div key={c.id} className="flex flex-col gap-1.5 border-t border-line py-2.5">
              <div className="flex items-center gap-2.5 text-sm">
                <span className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-card2 text-ink2"><CatIcon icon={c.icon} size={15} /></span>
                <span className="flex-1">{c.name}</span><strong>{pct(c.pct)}</strong>
              </div>
              <Bar value={c.pct} height={7} color={barColor(c.pct, s.pace ?? 0)} label={`${c.name}: ${pct(c.pct)}`} />
            </div>
          ))}
          <div className="mt-2 flex flex-wrap gap-2">
            <Btn icon={Users} onClick={() => open(s.id, '/equipa')}>Ver equipa</Btn>
            <Btn icon={CheckCircle2} onClick={() => open(s.id, '/painel')}>Painéis</Btn>
          </div>
        </Card>
      </div>
    </>
  );
}
