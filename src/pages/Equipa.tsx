import React from 'react';
import { Check, Flame, Medal, Shield, Star, Store, Target, TrendingUp, Trophy, Users } from 'lucide-react';
import { api, type TeamDash } from '../api';
import { useApp } from '../App';
import { amount, relDay, shortDate } from '../format';
import { Avatar, Bar, Card, CatIcon, Empty, ErrorBox, IconTile, Spinner, cx, type Tone } from '../ui';

export default function Equipa() {
  const { me, storeId, year, month } = useApp();
  const [data, setData] = React.useState<TeamDash | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [sort, setSort] = React.useState<'points' | 'pct'>('points');

  const load = React.useCallback(() => {
    if (!storeId) return;
    setError(null);
    api.get<TeamDash>(`/api/dashboard/team?store_id=${storeId}&year=${year}&month=${month}`).then(setData).catch((e) => setError(e.message));
  }, [storeId, year, month]);
  React.useEffect(load, [load]);

  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!data) return <Spinner />;
  if (!data.ranking.length) return <Empty icon={Users} title="Ainda não há vendedores nesta loja" text="O ranking aparece assim que houver vendedores com metas." />;

  const rows = [...data.ranking].sort((a, b) => (sort === 'points' ? b.points - a.points : b.overall - a.overall)).map((r, i) => ({ ...r, pos: i + 1 }));
  const meRow = data.ranking.find((r) => r.me);
  const idx = meRow ? data.ranking.indexOf(meRow) : -1;
  const near = idx >= 0 ? data.ranking.slice(Math.max(0, idx - 1), idx + 2) : [];
  const ahead = idx > 0 ? data.ranking[idx - 1] : null;
  const ch = data.challenge;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-2xl font-bold">Equipa</h1>
          <p className="m-0 mt-1 text-sm text-mute">Todos jogam contra a própria meta. Folgas e férias não contam contra ninguém.</p>
        </div>
        <div className="flex gap-1 rounded-2xl border border-line bg-card2 p-1" role="group" aria-label="Ordenar ranking">
          {(['points', 'pct'] as const).map((k) => (
            <button key={k} onClick={() => setSort(k)} aria-pressed={sort === k} className={cx('min-h-10 rounded-xl px-3.5 text-sm font-semibold', sort === k ? 'bg-lime text-onlime' : 'text-[#b4b9ae]')}>
              {k === 'points' ? 'Pontos' : '% da meta'}
            </button>
          ))}
        </div>
      </div>

      {meRow && (
        <section className="hero flex flex-wrap items-center gap-6 rounded-[26px] border border-limeline p-6">
          <div className="flex flex-[1_1_280px] flex-col gap-2.5">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-lime2"><Trophy size={16} aria-hidden />A tua posição</span>
            <h2 className="m-0 text-[28px] font-bold leading-tight">{meRow.pos}.º lugar{ahead ? `, a ${ahead.points - meRow.points} pts do ${ahead.pos}.º` : ', a liderar'}</h2>
            <p className="m-0 text-[15px] text-[#c9cec4]">{ahead ? 'Cada dia na meta vale +20 pts por categoria. Uma sequência de 5 dias vale mais 60.' : 'Mantém a sequência para defender o lugar.'}</p>
          </div>
          <div className="flex flex-[1_1_300px] flex-col gap-2">
            {near.map((n) => (
              <div key={n.id} className={cx('flex items-center gap-3 rounded-2xl border px-3.5 py-3', n.me ? 'border-lime bg-[#b8f53d22]' : 'border-limeline bg-[rgba(14,15,17,0.55)]')}>
                <strong className="w-6 text-mute">{n.pos}</strong>
                <Avatar id={n.id} name={n.name} v={n.avatar} size={34} />
                <strong className="flex-1">{n.me ? 'Tu' : n.name}</strong>
                {!n.me && <span className="text-[13px] text-mute">{n.points > meRow.points ? '+' : '−'}{Math.abs(n.points - meRow.points)}</span>}
                <strong className="tabular">{n.points.toLocaleString('pt-PT')}</strong>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-start gap-3.5">
        <Card className="flex min-w-0 flex-[2_1_560px] flex-col p-2.5">
          <h2 className="mx-3 mt-2.5 mb-2 text-lg font-bold">Ranking da loja</h2>
          {rows.map((r) => (
            <div key={r.id} className={cx('flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-[18px] px-4 py-3.5', r.me && 'bg-limesel')}>
              <span className={cx('flex h-[30px] w-[30px] items-center justify-center rounded-[10px] text-sm font-bold', r.pos === 1 ? 'bg-lime text-onlime' : 'bg-card2 text-ink2')}>{r.pos}</span>
              <Avatar id={r.id} name={r.name} v={r.avatar} size={38} tone="plain" />
              <div className="flex min-w-0 flex-[1_1_140px] flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-2">
                  <strong>{r.name}</strong>
                  {r.me && <span className="rounded-full bg-lime px-2 py-0.5 text-[11px] font-bold text-onlime">Tu</span>}
                  {r.igl && <span className="rounded-full bg-violetbg px-2 py-0.5 text-[11px] font-bold text-violet">IGL</span>}
                </span>
                <span className={cx('flex items-center gap-1 text-xs', r.streak > 0 ? 'text-warn' : 'text-mute2')}><Flame size={13} aria-hidden />{r.streak > 0 ? `${r.streak} dias seguidos` : 'Sem sequência ativa'}</span>
              </div>
              <div className="flex min-w-[150px] flex-[2_1_180px] flex-col gap-1.5">
                <div className="flex justify-between text-xs text-mute"><span>Meta média</span><strong className="text-ink">{Math.round(r.overall)}%</strong></div>
                <Bar value={r.overall} height={8} label={`${r.name}: ${Math.round(r.overall)}% da meta`} />
              </div>
              <div className="flex min-w-[92px] flex-col items-end gap-0.5">
                <strong className="tabular text-[17px]">{r.points.toLocaleString('pt-PT')} pts</strong>
                <span className="flex items-center gap-1 text-xs font-semibold text-ok"><TrendingUp size={12} aria-hidden />+{r.week} esta semana</span>
              </div>
            </div>
          ))}
          <p className="mx-4 mt-2 mb-2.5 text-xs text-mute2">Os pontos são calculados pelo sistema a partir dos resultados confirmados pelo gestor.</p>
        </Card>

        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-3.5">
          {ch && (
            <Card className="flex flex-col gap-3 p-5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-limebg text-lime2">{ch.category ? <CatIcon icon={ch.category.icon} size={20} /> : <Shield size={20} />}</span>
                <span className="flex flex-col"><span className="text-xs text-mute">Desafio de equipa</span><strong className="text-[17px]">{ch.title}</strong></span>
              </div>
              <div className="flex items-baseline gap-2"><strong className="text-[34px]">{amount(Math.min(ch.progress, ch.target), ch.category?.unit || 'un')}</strong><span className="text-[15px] text-mute">de {amount(ch.target, ch.category?.unit || 'un', { long: true })}</span></div>
              <ChallengeDots progress={ch.progress} target={ch.target} />
              <p className="m-0 text-[13px] leading-snug text-mute">
                {ch.completedOn ? `Cumprido a ${shortDate(ch.completedOn)}. Quem contribuiu ganhou +${ch.points} pts.` : `Faltam ${amount(ch.target - ch.progress, ch.category?.unit || 'un', { long: true })} até ${shortDate(ch.end_date)}. Quem contribuir ganha +${ch.points} pts.`}
              </p>
            </Card>
          )}
          <Card className="flex flex-col gap-2 p-5">
            <h2 className="m-0 mb-1 text-[17px] font-bold">Loja contra loja</h2>
            {data.stores.map((s) => (
              <div key={s.id} className="flex flex-col gap-1.5 border-t border-line py-2.5">
                <div className="flex items-center gap-2 text-sm"><Store size={15} aria-hidden /><span className={cx('flex-1', s.mine ? 'font-bold' : 'font-medium')}>{s.name}</span><strong>{Math.round(s.overall)}%</strong></div>
                <Bar value={s.overall} height={8} color={s.mine ? '#b8f53d' : '#6b716a'} label={`${s.name}: ${Math.round(s.overall)}%`} />
              </div>
            ))}
          </Card>
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-3.5">
        <Card className="flex min-w-0 flex-[1_1_400px] flex-col p-5">
          <h2 className="m-0 mb-2.5 text-[17px] font-bold">Medalhas recentes</h2>
          {data.badges.length === 0 && <p className="m-0 text-sm text-mute">As medalhas aparecem aqui à medida que forem conquistadas.</p>}
          {data.badges.map((b, i) => {
            const map: Record<string, [Tone, typeof Medal]> = { milestone: ['violet', Target], streak: ['warn', Flame], record: ['lime', Medal], challenge: ['ok', Users] };
            const [tone, icon] = map[b.type] || ['lime', Star];
            return (
              <div key={i} className="flex items-center gap-3 border-t border-line py-2.5 first-of-type:border-t-0">
                <IconTile icon={icon} tone={tone} />
                <span className="flex min-w-0 flex-1 flex-col"><strong className="text-sm">{b.label}</strong><span className="text-xs text-mute2">{b.who} · {relDay(b.date, me.today).toLowerCase()}</span></span>
              </div>
            );
          })}
        </Card>
        <Card className="flex min-w-0 flex-[1_1_400px] flex-col p-5">
          <h2 className="m-0 mb-2.5 text-[17px] font-bold">Como se ganham pontos</h2>
          {[
            [Check, 'Meta diária batida numa categoria', '+20'],
            [Flame, 'Sequência de 3 / 5 / 10 dias', '+30 / +60 / +150'],
            [Target, 'Marcos de 50 / 80 / 100 / 120%', '+40 / +80 / +150 / +100'],
            [Star, 'Recorde pessoal numa categoria', '+25'],
            [Users, 'Desafio de equipa cumprido', '+50'],
          ].map(([I, what, pts]) => {
            const Icon = I as typeof Check;
            return (
              <div key={what as string} className="flex items-center gap-3 border-t border-line py-2.5 text-sm first-of-type:border-t-0">
                <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-card2 text-ink2"><Icon size={16} aria-hidden /></span>
                <span className="flex-1 text-ink2">{what as string}</span>
                <strong className="whitespace-nowrap text-lime2">{pts as string}</strong>
              </div>
            );
          })}
          <p className="mt-2.5 mb-0 text-xs text-mute2">Folgas e férias nunca quebram uma sequência.</p>
        </Card>
      </div>
    </>
  );
}

function ChallengeDots({ progress, target }: { progress: number; target: number }) {
  const n = Math.min(20, Math.max(1, Math.round(target)));
  const filled = Math.min(n, Math.floor((progress / target) * n));
  return (
    <div role="img" aria-label={`${Math.round((progress / target) * 100)}% do desafio`} className="grid grid-cols-10 gap-1.5">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className={cx('h-3 rounded', i < filled && 'rp-bar')} style={{ background: i < filled ? '#b8f53d' : '#2a2d31', color: '#b8f53d' }} />
      ))}
    </div>
  );
}
