import React from 'react';
import { CalendarX, Clock, Flame, Medal, Settings2, Target, TrendingUp, Trophy } from 'lucide-react';
import { api, type CatResult, type SellerDash, type UserRow } from '../api';
import { useApp } from '../App';
import { amount, pct, relDay, shortDate } from '../format';
import { Bar, Btn, Card, CatIcon, Empty, ErrorBox, IconTile, Pill, Ring, Spinner, barColor, cx, inputCls, statusInfo } from '../ui';

export default function Painel() {
  const { me, storeId, year, month, canManage, go } = useApp();
  const [sellers, setSellers] = React.useState<UserRow[] | null>(canManage ? null : []);
  const [sellerId, setSellerId] = React.useState<number | null>(canManage ? null : me.user.id);
  const [data, setData] = React.useState<SellerDash | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!canManage || !storeId) return;
    api.get<UserRow[]>(`/api/users?store_id=${storeId}`).then((u) => {
      const s = u.filter((x) => x.role === 'seller' && x.active);
      setSellers(s);
      setSellerId(s[0]?.id ?? null);
    }).catch((e) => setError(e.message));
  }, [canManage, storeId]);

  const load = React.useCallback(() => {
    if (!sellerId) return;
    setError(null);
    api.get<SellerDash>(`/api/dashboard/seller?user_id=${sellerId}&year=${year}&month=${month}`).then(setData).catch((e) => setError(e.message));
  }, [sellerId, year, month]);
  React.useEffect(load, [load]);

  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (canManage && sellers && !sellers.length)
    return <Empty icon={Settings2} title="Esta loja ainda não tem vendedores" text="Cria os vendedores na Gestão. Depois podes importar resultados e escalas." action={<Btn variant="primary" onClick={() => go('gestao')}>Abrir Gestão</Btn>} />;
  if (!data) return <Spinner />;

  const d = data;
  const withGoal = d.categories.filter((c) => c.goal);
  const picker = canManage && sellers && (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-mute">A ver o painel de</span>
      <select className={cx(inputCls, 'min-h-10 py-1.5')} value={sellerId ?? ''} onChange={(e) => { setData(null); setSellerId(Number(e.target.value)); }}>
        {sellers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
    </label>
  );

  const isMe = d.seller.id === me.user.id;
  const header = (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="m-0 text-2xl font-bold">{isMe ? `Olá, ${d.seller.firstName}` : d.seller.name}</h1>
        <p className="m-0 mt-1 text-sm text-mute">
          {d.refDate ? `Resultados de ${shortDate(d.refDate)} · dia ${d.days.done} de ${d.days.total} de trabalho` : 'Ainda não há resultados este mês'}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {!d.days.hasSchedule && <Pill tone="warn" icon={CalendarX}>Sem escala: conta todos os dias menos domingo</Pill>}
        {picker}
      </div>
    </div>
  );

  if (!withGoal.length)
    return (<>{header}<Empty icon={Target} title="Ainda não há metas para este mês" text={canManage ? 'Define as metas na Gestão ou importa o relatório diário, que já traz as metas de cada vendedor.' : 'O teu gestor ainda não definiu as tuas metas. Assim que o fizer, aparecem aqui.'} action={canManage ? <Btn variant="primary" onClick={() => go('importar')}>Importar relatório</Btn> : undefined} /></>);

  const nearMilestone = withGoal
    .filter((c) => c.next && c.pct !== null && c.nextMissing !== null)
    .sort((a, b) => (a.next! - a.pct!) - (b.next! - b.pct!))[0];
  const groups = [
    { title: 'Em euros', hint: 'A barra branca marca onde devias estar hoje.', cats: withGoal.filter((c) => c.unit === 'eur') },
    { title: 'Em unidades', hint: 'Contam peça a peça.', cats: withGoal.filter((c) => c.unit === 'un') },
  ].filter((g) => g.cats.length);
  const diff = Math.round(d.overall - d.pace);

  return (
    <>
      {header}

      <section className="hero flex flex-wrap items-center gap-7 rounded-[26px] border border-limeline p-6 sm:p-7">
        <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-lime text-onlime"><Target size={18} aria-hidden /></span>
            <h2 className="m-0 text-2xl font-bold">{isMe ? 'A tua missão de hoje' : 'Missão de hoje'}</h2>
          </div>
          <p className="m-0 text-[15px] leading-relaxed text-[#c9cec4]">
            {d.mission.length === 0
              ? 'Todas as metas do mês estão cumpridas. Tudo o que vier agora é extra.'
              : diff >= 0
                ? `Estás ${diff === 0 ? 'no ritmo' : `${diff} pontos à frente do ritmo`}. Cumpre ${d.mission.length === 1 ? 'esta meta' : `estas ${d.mission.length} metas`} hoje para continuar assim.`
                : `Estás ${Math.abs(diff)} ${Math.abs(diff) === 1 ? 'ponto' : 'pontos'} atrás do ritmo do mês. Cumpre ${d.mission.length === 1 ? 'esta meta' : `estas ${d.mission.length} metas`} hoje para recuperar.`}
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(150px,1fr))] sm:gap-2.5">
            {d.mission.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-[18px] border border-limeline bg-[rgba(14,15,17,0.55)] px-3 py-2.5 sm:flex-col sm:items-start sm:gap-2.5 sm:p-3.5">
                <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-limebg text-lime2"><CatIcon icon={m.icon} /></span>
                <span className="flex-1 text-[13px] text-mute">{m.name}</span>
                <strong className="tabular text-base sm:text-[22px]">{amount(m.needToday, m.unit, { long: true })}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="mx-auto flex flex-col items-center gap-2">
          <Ring value={d.overall} pace={d.pace} size={168} />
          <span className="flex items-center gap-1.5 text-xs text-mute"><span className="h-2 w-2 rounded-full bg-ink" />onde devias estar hoje: {pct(d.pace)}</span>
        </div>
      </section>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-3.5">
        <Card className="flex gap-3.5 p-4.5">
          <IconTile icon={Flame} tone="warn" size={44} iconSize={22} />
          <div className="flex flex-col gap-1">
            <strong className="text-lg">{d.streak > 0 ? (d.streak === 1 ? '1 dia na meta' : `${d.streak} dias seguidos`) : 'Começa hoje uma sequência'}</strong>
            <span className="text-[13px] leading-snug text-mute">{d.streak > 0 ? `Bate a meta diária hoje e chegas aos ${d.streak + 1}. Não percas a sequência.` : 'Cada dia na meta conta. Folgas e férias não quebram a sequência.'}</span>
          </div>
        </Card>
        <Card className="flex gap-3.5 p-4.5">
          <IconTile icon={Medal} tone="lime" size={44} iconSize={22} />
          <div className="flex flex-col gap-1">
            {nearMilestone ? (
              <>
                <strong className="text-lg">Quase lá: +{nearMilestone.nextPoints} pts</strong>
                <span className="text-[13px] leading-snug text-mute">Faltam {amount(nearMilestone.nextMissing, nearMilestone.unit, { long: true })} em {nearMilestone.name} para chegares aos {nearMilestone.next}%.</span>
              </>
            ) : (
              <>
                <strong className="text-lg">Todos os marcos conquistados</strong>
                <span className="text-[13px] leading-snug text-mute">Já passaste os 120% em todas as categorias.</span>
              </>
            )}
          </div>
        </Card>
        <a href="#/equipa" className="flex gap-3.5 rounded-[22px] border border-line bg-card p-4.5 text-ink no-underline hover:border-line2">
          <IconTile icon={Trophy} tone="violet" size={44} iconSize={22} />
          <span className="flex flex-col gap-1">
            <strong className="text-lg">{d.rank}.º lugar · {d.points.toLocaleString('pt-PT')} pts</strong>
            <span className="text-[13px] leading-snug text-mute">{d.aheadName ? `Estás a ${d.gapToNext} pts de ${d.aheadName}. Ver ranking` : 'Lideras a loja. Ver ranking'}</span>
          </span>
        </a>
      </section>

      {groups.map((g) => (
        <section key={g.title} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
            <h2 className="m-0 text-lg font-bold">{g.title}</h2>
            <span className="text-[13px] text-mute2">{g.hint}</span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-3.5">
            {g.cats.map((c) => <CategoryCard key={c.id} c={c} pace={d.pace} />)}
          </div>
        </section>
      ))}

      <section className="flex flex-wrap gap-3.5">
        <Card className="flex min-w-0 flex-[2_1_460px] flex-col gap-3 p-5">
          <div className="flex flex-wrap justify-between gap-2">
            <h2 className="m-0 text-lg font-bold">Como vai o mês</h2>
            <div className="flex flex-wrap gap-3.5 text-xs text-mute">
              <span><span className="mr-1.5 inline-block h-[3px] w-3.5 bg-lime align-middle" />Real</span>
              <span><span className="mr-1.5 inline-block w-3.5 border-t-2 border-dashed border-lime align-middle" />Projeção</span>
              <span><span className="mr-1.5 inline-block w-3.5 border-t-2 border-dashed border-[#6b716a] align-middle" />Ritmo ideal</span>
            </div>
          </div>
          <MonthChart d={d} />
        </Card>
        <Card className="flex min-w-0 flex-[1_1_280px] flex-col p-5">
          <h2 className="m-0 mb-2 text-lg font-bold">{isMe ? 'As tuas conquistas' : 'Conquistas'}</h2>
          {d.wins.length === 0 && <p className="m-0 text-sm text-mute">As conquistas do mês aparecem aqui.</p>}
          {d.wins.map((w, i) => {
            const t = { daily: ['lime', Target], milestone: ['violet', Medal], streak: ['warn', Flame], record: ['lime', TrendingUp], challenge: ['ok', Trophy] }[w.type] as ['lime', typeof Target];
            return (
              <div key={i} className="flex items-center gap-3 border-t border-line py-2.5 first-of-type:border-t-0">
                <IconTile icon={t[1]} tone={t[0]} size={38} iconSize={18} />
                <span className="flex min-w-0 flex-1 flex-col"><strong className="text-sm">{w.label}</strong><span className="text-xs text-mute2">{relDay(w.date, me.today)}</span></span>
                <strong className="text-[13px] text-lime2">+{w.points}</strong>
              </div>
            );
          })}
        </Card>
      </section>
    </>
  );
}

function CategoryCard({ c, pace }: { c: CatResult; pace: number }) {
  const s = statusInfo(c);
  return (
    <Card className="flex flex-col gap-3.5 p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line2 bg-card2 text-ink2"><CatIcon icon={c.icon} size={20} /></span>
        <strong className="min-w-0 flex-1 text-base">{c.name}</strong>
        <Pill tone={s.tone} icon={s.icon}>{s.label}</Pill>
      </div>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-[13px] text-mute">Já tens</span>
        <span className="tabular text-[28px] font-bold">{amount(c.value, c.unit)}</span>
        <span className="text-sm text-mute">de {amount(c.goal, c.unit, { long: true })}</span>
        <span className="tabular ml-auto text-base font-bold">{pct(c.pct)}</span>
      </div>
      <Bar value={c.pct} color={barColor(c.pct, pace)} marker={pace} label={`${c.name}: ${pct(c.pct)}`} />
      <div className="flex flex-wrap gap-2">
        {c.status !== 'done' && (
          <span className="flex items-center gap-1.5 rounded-[10px] bg-card2 px-2.5 py-1.5 text-[13px] text-ink2"><Clock size={14} aria-hidden />Hoje: <strong className="text-ink">{amount(c.needToday, c.unit, { long: true })}</strong></span>
        )}
        <span className="flex items-center gap-1.5 rounded-[10px] bg-card2 px-2.5 py-1.5 text-[13px] text-ink2"><Medal size={14} aria-hidden />
          {c.next ? `Faltam ${amount(c.nextMissing, c.unit, { long: true })} para ${c.next}% (+${c.nextPoints} pts)` : 'Todos os marcos conquistados'}
        </span>
      </div>
      {c.projectionPct !== null && (
        <div className="flex items-center gap-2 border-t border-line pt-3 text-[13px] text-mute">
          <TrendingUp size={15} aria-hidden />A este ritmo fechas com <strong className={c.projectionPct >= 100 ? 'text-ok' : c.projectionPct >= 80 ? 'text-warn' : 'text-bad'}>{pct(c.projectionPct)}</strong>
        </div>
      )}
    </Card>
  );
}

function MonthChart({ d }: { d: SellerDash }) {
  const total = Math.max(1, d.days.total);
  const yMax = Math.max(100, d.projection ?? 0, ...d.series.map((p) => p.y));
  const X = (x: number) => 40 + (x / total) * 540;
  const Y = (y: number) => 190 - (y / yMax) * 180;
  const pts = d.series.map((p) => `${X(p.x)},${Y(p.y)}`).join(' ');
  const last = d.series[d.series.length - 1];
  const ticks = [0, 25, 50, 75, 100].filter((t) => t <= yMax);
  return (
    <svg viewBox="0 0 600 220" width="100%" role="img" aria-label={`Progresso de ${Math.round(d.overall)}% ao dia ${d.days.done}${d.projection !== null ? `, projeção de ${Math.round(d.projection)}% no fim do mês` : ''}`}>
      <defs>
        <linearGradient id="fillg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b8f53d" stopOpacity="0.35" />
          <stop offset="1" stopColor="#b8f53d" stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((t) => (
        <g key={t}>
          <line x1="40" y1={Y(t)} x2="580" y2={Y(t)} stroke="#26292d" />
          <text x="32" y={Y(t) + 3} textAnchor="end" fontSize="10" fill="#8e948a">{t}%</text>
        </g>
      ))}
      {d.series.length > 1 && <polygon points={`${pts} ${X(last.x)},${Y(0)} ${X(0)},${Y(0)}`} fill="url(#fillg)" />}
      <polyline points={`${X(0)},${Y(0)} ${X(total)},${Y(100)}`} fill="none" stroke="#6b716a" strokeWidth="2" strokeDasharray="5 5" />
      {d.projection !== null && last && <polyline points={`${X(last.x)},${Y(last.y)} ${X(total)},${Y(d.projection)}`} fill="none" stroke="#b8f53d" strokeWidth="2" strokeDasharray="2 5" strokeLinecap="round" />}
      <polyline points={pts} fill="none" stroke="#b8f53d" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {last && <circle cx={X(last.x)} cy={Y(last.y)} r="5" fill="#b8f53d" stroke="#0e0f11" strokeWidth="2" />}
      <text x="40" y="212" fontSize="10" fill="#8e948a">Dia 1</text>
      <text x="580" y="212" textAnchor="end" fontSize="10" fill="#8e948a">Dia {total}</text>
    </svg>
  );
}
