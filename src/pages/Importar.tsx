import React from 'react';
import { AlertTriangle, Calendar, Check, CheckCircle2, ChevronRight, Eye, FileText, ImageUp, Sparkles, Trophy, Undo2, Upload, UserX } from 'lucide-react';
import { api, runJob, type Kind } from '../api';
import { useApp } from '../App';
import { MONTHS, amount, daysIn, dateOf, shortDate } from '../format';
import { Btn, Card, CatIcon, ErrorBox, Field, IconTile, Pill, cx, inputCls, toast } from '../ui';
import { KIND_STYLE, KindIcon } from './Escala';

type Val = { goal: number | null; actual: number; uncertain: boolean };
interface ResRow { key: string; readName: string; status: 'ok' | 'unknown' | 'ambiguous' | 'ignored'; userId: number | null; candidates?: { id: number; name: string }[]; reason?: string; values: Record<string, Val> }
interface ResDraft {
  date: string;
  categories: { slug: string; name: string; unit: 'eur' | 'un'; icon: string }[];
  rows: ResRow[];
  totals: Record<string, Val>;
  issues: { kind: string; row?: string; category?: string; categoryName?: string; read?: number; suggested?: number; diff?: number; readName?: string; text: string }[];
  checks: { ok: boolean; text: string }[];
  cellCount: number;
  sellers: { id: number; name: string }[];
}
interface SchedRow { key: string; readName: string; status: ResRow['status']; userId: number | null; candidates?: { id: number; name: string }[]; days: Record<string, { kind: Kind; start?: string; end?: string }>; unreadable: number[] }
interface SchedDraft { year: number; month: number; days: number; rows: SchedRow[]; issues: { kind: string; row?: string; text: string }[]; checks: { ok: boolean; text: string }[]; sellers: { id: number; name: string; igl: boolean }[] }
interface HistoryRow { id: number; kind: 'results' | 'schedule'; status: 'committed' | 'undone'; ref: string; created_at: string; by: string | null }

export default function Importar() {
  const { storeId, me, year, month } = useApp();
  const [kind, setKind] = React.useState<'results' | 'schedule'>('results');
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [date, setDate] = React.useState(me.today);
  const [period, setPeriod] = React.useState<[number, number]>([year, month]);
  const [busy, setBusy] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const isPdf = !!file && (file.type === 'application/pdf' || /\.pdf$/i.test(file.name));
  React.useEffect(() => {
    if (!busy) return;
    setElapsed(0);
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [busy]);
  const [draft, setDraft] = React.useState<{ id: number; kind: 'results'; d: ResDraft } | { id: number; kind: 'schedule'; d: SchedDraft } | null>(null);
  const [saved, setSaved] = React.useState<{ id: number; text: string } | null>(null);
  const [history, setHistory] = React.useState<HistoryRow[]>([]);

  const loadHistory = React.useCallback(() => {
    if (storeId) api.get<HistoryRow[]>(`/api/imports?store_id=${storeId}`).then(setHistory).catch(() => null);
  }, [storeId]);
  React.useEffect(loadHistory, [loadHistory]);

  const pick = (f: File | null) => {
    setFile(f);
    setError(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const read = async () => {
    if (!file || !storeId) return;
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('store_id', String(storeId));
    if (kind === 'results') fd.append('date', date);
    else { fd.append('year', String(period[0])); fd.append('month', String(period[1])); }
    try {
      const r = await runJob<{ id: number; draft: ResDraft | SchedDraft }>(`/api/imports/${kind}`, fd);
      setDraft(kind === 'results' ? { id: r.id, kind, d: r.draft as ResDraft } : { id: r.id, kind, d: r.draft as SchedDraft });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => { setDraft(null); setSaved(null); pick(null); loadHistory(); };

  const undo = async (id: number) => {
    try {
      await api.post(`/api/imports/${id}/undo`);
      toast('Importação desfeita.');
      setSaved(null);
      loadHistory();
    } catch (e) {
      toast((e as Error).message, 'bad');
    }
  };

  const steps = [
    { label: 'Carregar', done: !!draft || !!saved, cur: !draft && !saved },
    { label: 'Rever', done: !!saved, cur: !!draft && !saved },
    { label: 'Gravar', done: !!saved, cur: false },
  ];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-2xl font-bold">Importar</h1>
          <p className="m-0 mt-1 text-sm text-mute">Carrega a captura e confirma. Nada é gravado sem passar por ti.</p>
        </div>
        <ol aria-label="Passos" className="m-0 flex list-none flex-wrap gap-1.5 p-0">
          {steps.map((s) => (
            <li key={s.label} className={cx('flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-semibold', s.done ? 'bg-okbg text-ok' : s.cur ? 'bg-lime text-onlime' : 'bg-card2 text-mute2')}>
              {s.done ? <Check size={15} strokeWidth={2.4} aria-hidden /> : s.cur ? <Eye size={15} aria-hidden /> : <ChevronRight size={15} aria-hidden />}{s.label}
            </li>
          ))}
        </ol>
      </div>

      {saved ? (
        <section className="flex flex-col items-center gap-3.5 rounded-[26px] border border-limeline bg-card px-6 py-14 text-center" style={{ background: 'radial-gradient(520px 300px at 50% 0%, rgba(184,245,61,0.26), transparent 70%), #17191c' }}>
          <span className="glow-btn flex h-[76px] w-[76px] items-center justify-center rounded-full bg-lime text-onlime"><Check size={38} strokeWidth={2.6} aria-hidden /></span>
          <h2 className="m-0 text-[28px] font-bold">Gravado</h2>
          <p className="m-0 max-w-lg text-[15px] leading-relaxed text-[#c9cec4]">{saved.text}</p>
          <div className="mt-1.5 flex flex-wrap justify-center gap-2.5">
            <a href="#/equipa" className="glow-btn inline-flex min-h-11 items-center gap-2 rounded-[14px] bg-lime px-4 font-bold text-onlime no-underline"><Trophy size={18} aria-hidden />Ver ranking atualizado</a>
            <Btn icon={Undo2} onClick={() => undo(saved.id)}>Desfazer</Btn>
            <Btn variant="quiet" icon={Upload} onClick={reset}>Importar outra</Btn>
          </div>
        </section>
      ) : draft ? (
        draft.kind === 'results'
          ? <ReviewResults id={draft.id} d={draft.d} image={preview} pdf={isPdf} onCancel={reset} onSaved={(t) => { setDraft(null); setSaved({ id: draft.id, text: t }); loadHistory(); }} />
          : <ReviewSchedule id={draft.id} d={draft.d} image={preview} pdf={isPdf} onCancel={reset} onSaved={(t) => { setDraft(null); setSaved({ id: draft.id, text: t }); loadHistory(); }} />
      ) : (
        <div className="flex flex-wrap items-start gap-4">
          <Card className="flex min-w-0 flex-[3_1_480px] flex-col gap-5 p-6">
            <div className="flex gap-1 self-start rounded-2xl border border-line bg-card2 p-1" role="group" aria-label="Tipo de importação">
              {(['results', 'schedule'] as const).map((k) => (
                <button key={k} onClick={() => setKind(k)} aria-pressed={kind === k} className={cx('flex min-h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold', kind === k ? 'bg-lime text-onlime' : 'text-[#b4b9ae]')}>
                  {k === 'results' ? <><Trophy size={16} aria-hidden />Resultados do dia</> : <><Calendar size={16} aria-hidden />Escala do mês</>}
                </button>
              ))}
            </div>

            <label className={cx('flex cursor-pointer flex-col items-center gap-3 rounded-[20px] border-2 border-dashed px-6 py-10 text-center transition', file ? 'border-lime bg-limesel' : 'border-line2 bg-bg hover:border-mute2')}
              onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files[0] || null); }}>
              {preview && !isPdf ? <img src={preview} alt="Imagem escolhida" className="max-h-56 rounded-xl border border-line object-contain" /> : <IconTile icon={isPdf ? FileText : ImageUp} tone="lime" size={56} iconSize={28} />}
              <strong className="text-base">{file ? file.name : 'Escolhe ou arrasta a imagem ou o PDF'}</strong>
              <span className="text-sm text-mute">{kind === 'results' ? 'Captura ou PDF do relatório diário' : 'Fotografia, captura ou PDF da escala do mês'} · PNG, JPG, WEBP ou PDF</span>
              <input type="file" accept="image/png,image/jpeg,image/webp,image/heic,application/pdf,.pdf" className="sr-only" onChange={(e) => pick(e.target.files?.[0] || null)} />
            </label>

            <div className="flex flex-wrap items-end gap-3">
              {kind === 'results' ? (
                <Field label="Data do relatório" hint="Se a data aparecer no ficheiro, usamos essa.">
                  <input type="date" className={inputCls} value={date} max={me.today} onChange={(e) => setDate(e.target.value)} />
                </Field>
              ) : (
                <Field label="Mês da escala">
                  <select className={inputCls} value={`${period[0]}-${period[1]}`} onChange={(e) => { const [y, m] = e.target.value.split('-').map(Number); setPeriod([y, m]); }}>
                    {[-1, 0, 1, 2].map((o) => { const dt = new Date(year, month - 1 + o, 1); const y = dt.getFullYear(); const m = dt.getMonth() + 1; return <option key={o} value={`${y}-${m}`}>{MONTHS[m - 1]} {y}</option>; })}
                  </select>
                </Field>
              )}
              <Btn variant="primary" icon={Sparkles} onClick={read} disabled={!file} loading={busy} className="ml-auto">{busy ? 'A ler…' : isPdf ? 'Ler PDF' : 'Ler imagem'}</Btn>
            </div>
            {busy && <p className="m-0 text-sm text-mute" role="status">A ler a tabela… {elapsed}s. Pode demorar até um minuto ou dois; não feches a página.</p>}
            {error && <ErrorBox message={error} />}
          </Card>

          <Card className="flex min-w-0 flex-[1_1_280px] flex-col p-5">
            <h2 className="m-0 mb-2 text-base font-bold">Últimas importações</h2>
            {history.length === 0 && <p className="m-0 text-sm text-mute">Ainda não há importações nesta loja.</p>}
            {history.map((h, i) => {
              const latestOfKind = history.find((x) => x.kind === h.kind && x.status === 'committed')?.id === h.id;
              return (
                <div key={h.id} className="flex items-center gap-3 border-t border-line py-2.5 first-of-type:border-t-0">
                  <IconTile icon={h.kind === 'results' ? Trophy : Calendar} tone={h.status === 'undone' ? 'neutral' : 'lime'} size={34} iconSize={16} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <strong className={cx('text-sm', h.status === 'undone' && 'text-mute line-through')}>{h.kind === 'results' ? `Resultados ${shortDate(h.ref)}` : `Escala ${MONTHS[Number(h.ref.slice(5, 7)) - 1]}`}</strong>
                    <span className="text-xs text-mute2">{h.status === 'undone' ? 'Desfeita' : `Por ${h.by || '—'}`}</span>
                  </span>
                  {h.status === 'committed' && latestOfKind && <button onClick={() => undo(h.id)} className="flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-ink2 hover:bg-card2" key={i}><Undo2 size={14} aria-hidden />Desfazer</button>}
                </div>
              );
            })}
          </Card>
        </div>
      )}
    </>
  );
}

// --------------------------------------------------------------- results

function ReviewResults({ id, d, image, pdf, onCancel, onSaved }: { id: number; d: ResDraft; image: string | null; pdf: boolean; onCancel: () => void; onSaved: (text: string) => void }) {
  const [rows, setRows] = React.useState<ResRow[]>(() => d.rows.map((r) => ({ ...r, values: Object.fromEntries(Object.entries(r.values).map(([k, v]) => [k, { ...v }])) })));
  const [date, setDate] = React.useState(d.date);
  const [acked, setAcked] = React.useState<Set<string>>(new Set());
  const [showAll, setShowAll] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const setVal = (key: string, slug: string, field: 'actual' | 'goal', v: string) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, values: { ...r.values, [slug]: { ...(r.values[slug] || { goal: null, actual: 0, uncertain: false }), [field]: v === '' ? (field === 'goal' ? null : 0) : Number(v.replace(',', '.')), uncertain: false } } } : r)));
  const assign = (key: string, v: string) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, userId: v === 'ignore' ? null : Number(v), status: v === 'ignore' ? 'ignored' : 'ok' } : r)));

  // The report's Total Geral includes every seller row (even ones we choose not to save),
  // so sums always use the rows as read, minus the manager rows.
  const managerKeys = new Set(d.rows.filter((r) => r.status === 'ignored').map((r) => r.key));
  const counted = rows.filter((r) => !managerKeys.has(r.key));
  const sumIssues = d.categories
    .map((c) => {
      const t = d.totals[c.slug];
      if (!t) return null;
      const sum = counted.reduce((s, r) => s + (r.values[c.slug]?.actual || 0), 0);
      const diff = Math.round((t.actual - sum) * 100) / 100;
      if (Math.abs(diff) < 0.5 || acked.has(c.slug)) return null;
      const orig = d.issues.find((i) => i.kind === 'sum' && i.category === c.slug);
      return { cat: c, sum, total: t.actual, diff, orig };
    })
    .filter(Boolean) as { cat: ResDraft['categories'][number]; sum: number; total: number; diff: number; orig?: ResDraft['issues'][number] }[];
  const peopleIssues = rows.filter((r) => r.status === 'unknown' || r.status === 'ambiguous');
  const pending = sumIssues.length + peopleIssues.length;
  const doubtful = d.rows.filter((r) => r.status !== 'ignored').reduce((s, r) => s + Object.values(r.values).filter((v) => v.uncertain).length, 0);
  const okCells = d.cellCount - doubtful;
  const decreases = d.issues.filter((i) => i.kind === 'decrease');
  const assigned = new Set(rows.filter((r) => r.userId).map((r) => r.userId));

  const commit = async () => {
    setBusy(true);
    setErr(null);
    try {
      const payload = { date, rows: rows.filter((r) => r.status === 'ok' && r.userId).map((r) => ({ userId: r.userId, values: Object.fromEntries(Object.entries(r.values).map(([k, v]) => [k, { goal: v.goal, actual: v.actual }])) })) };
      const res = await api.post<{ updated: number }>(`/api/imports/${id}/commit`, payload);
      onSaved(`${res.updated} vendedores atualizados com os resultados de ${shortDate(date)}. Metas, pontos e ranking já estão recalculados.`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-start gap-4">
      <div className="flex min-w-0 flex-[3_1_520px] flex-col gap-4">
        <Card className="flex flex-wrap items-center gap-4 p-5">
          <IconTile icon={pending ? Sparkles : CheckCircle2} tone="lime" size={48} iconSize={24} />
          <div className="flex flex-[1_1_240px] flex-col gap-0.5">
            <strong className="text-xl">{pending ? `Lemos ${d.cellCount} valores. ${Math.max(0, okCells)} estão certos.` : 'Tudo pronto para gravar'}</strong>
            <span className="text-sm text-mute">{pending ? `Só ${pending === 1 ? 'falta decidires 1 coisa' : `faltam decidires ${pending} coisas`}.` : 'Todos os valores foram verificados.'}</span>
          </div>
          {pending > 0 && <Pill tone="warn" icon={AlertTriangle}>{pending} {pending === 1 ? 'precisa' : 'precisam'} de ti</Pill>}
        </Card>

        {sumIssues.map((s) => {
          const row = s.orig?.row ? rows.find((r) => r.key === s.orig!.row) : null;
          const current = row?.values[s.cat.slug]?.actual;
          const suggested = row && current !== undefined ? Math.round((current + s.diff) * 100) / 100 : null;
          return (
            <Card key={s.cat.slug} className="flex flex-col gap-4 border-[#6b5518] p-5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-warnbg text-warn"><CatIcon icon={s.cat.icon} size={19} /></span>
                <strong className="text-[17px]">{row ? `${row.readName} · ${s.cat.name}` : s.cat.name}</strong>
              </div>
              {row && suggested !== null ? (
                <>
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-2.5">
                    <div className="flex flex-col gap-2 rounded-2xl border border-line2 bg-card2 p-3.5"><span className="text-xs text-mute2">Lido na imagem</span><span className="text-[26px] font-bold">{amount(current!, s.cat.unit)}</span></div>
                    <div className="flex flex-col gap-2 rounded-2xl border border-lime bg-limesel p-3.5"><span className="flex items-center gap-1.5 text-xs font-semibold text-lime2"><Sparkles size={14} aria-hidden />Sugerido</span><span className="text-[26px] font-bold text-lime2">{amount(suggested, s.cat.unit)}</span></div>
                  </div>
                  <p className="m-0 text-sm leading-relaxed text-mute">Com {amount(current!, s.cat.unit)}, a soma dos vendedores fica {amount(Math.abs(s.diff), s.cat.unit)} {s.diff > 0 ? 'abaixo' : 'acima'} do Total Geral ({amount(s.total, s.cat.unit)}). Com {amount(suggested, s.cat.unit)} bate certo.</p>
                  <div className="flex flex-wrap gap-2.5">
                    <Btn variant="primary" icon={Check} onClick={() => setVal(row.key, s.cat.slug, 'actual', String(suggested))}>Usar {amount(suggested, s.cat.unit)}</Btn>
                    <Btn onClick={() => setAcked((a) => new Set(a).add(s.cat.slug))}>Manter {amount(current!, s.cat.unit)}</Btn>
                  </div>
                </>
              ) : (
                <>
                  <p className="m-0 text-sm leading-relaxed text-mute">A soma dos vendedores ({amount(s.sum, s.cat.unit)}) não bate com o Total Geral ({amount(s.total, s.cat.unit)}). Confere os valores desta categoria na tabela abaixo.</p>
                  <div className="flex flex-wrap gap-2.5">
                    <Btn icon={Eye} onClick={() => setShowAll(true)}>Ver a tabela</Btn>
                    <Btn variant="quiet" onClick={() => setAcked((a) => new Set(a).add(s.cat.slug))}>Está certo assim</Btn>
                  </div>
                </>
              )}
            </Card>
          );
        })}

        {peopleIssues.map((r) => (
          <Card key={r.key} className="flex flex-wrap items-center gap-4 border-[#6b5518] p-5">
            <IconTile icon={UserX} tone="warn" />
            <div className="flex flex-[1_1_220px] flex-col gap-0.5">
              <strong>{r.readName}</strong>
              <span className="text-sm text-mute">{r.status === 'ambiguous' ? 'Há mais do que um vendedor com este primeiro nome.' : 'Não encontrei este nome nos vendedores da loja. Se for alguém novo, cria-o na Gestão e importa de novo, ou ignora a linha por agora.'}</span>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <span className="sr-only">Corresponde a</span>
              <select className={inputCls} defaultValue="" onChange={(e) => assign(r.key, e.target.value)}>
                <option value="" disabled>Escolher vendedor…</option>
                {(r.candidates?.length ? r.candidates : d.sellers.filter((s) => !assigned.has(s.id))).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                <option value="ignore">Ignorar esta linha</option>
              </select>
            </label>
          </Card>
        ))}

        <Card className="flex flex-col gap-3.5 p-5">
          <button onClick={() => setShowAll((v) => !v)} aria-expanded={showAll} className="flex items-center gap-2.5 text-left text-[15px] font-semibold text-ink">
            <ChevronRight size={18} aria-hidden style={{ transform: showAll ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }} />
            {showAll ? 'Esconder os valores' : `Ver e editar os ${d.cellCount} valores lidos`}
          </button>
          {showAll && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-separate border-spacing-1 text-sm">
                <thead>
                  <tr>
                    <th className="px-1.5 text-left text-xs font-medium text-mute2">Vendedor</th>
                    {d.categories.map((c) => <th key={c.slug} className="px-1.5 text-left text-xs font-medium text-mute2"><span className="inline-flex items-center gap-1"><CatIcon icon={c.icon} size={13} />{c.name}</span></th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.filter((r) => r.status !== 'ignored').map((r) => (
                    <tr key={r.key}>
                      <td className="px-1.5 font-bold">{r.readName}</td>
                      {d.categories.map((c) => {
                        const v = r.values[c.slug];
                        return (
                          <td key={c.slug}>
                            <div className={cx('flex flex-col gap-0.5 rounded-[10px] border p-1.5', v?.uncertain ? 'border-[#8a6b1e] bg-[#2b2410]' : 'border-line bg-card2')}>
                              <input aria-label={`${r.readName} ${c.name} realizado`} inputMode="decimal" className="w-full bg-transparent font-semibold tabular text-ink focus:outline-none" value={v?.actual ?? ''} onChange={(e) => setVal(r.key, c.slug, 'actual', e.target.value)} />
                              <input aria-label={`${r.readName} ${c.name} meta`} inputMode="decimal" className="w-full bg-transparent text-[11px] tabular text-mute2 focus:outline-none" placeholder="meta" value={v?.goal ?? ''} onChange={(e) => setVal(r.key, c.slug, 'goal', e.target.value)} />
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr>
                    <td className="px-1.5 text-xs text-mute2">Total Geral</td>
                    {d.categories.map((c) => <td key={c.slug} className="rounded-[10px] bg-[#23262a] px-2 py-1.5 font-bold tabular">{d.totals[c.slug] ? amount(d.totals[c.slug].actual, c.unit) : '—'}</td>)}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {err && <ErrorBox message={err} />}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-[13px] text-mute"><Undo2 size={16} aria-hidden />Podes desfazer depois de gravar.</span>
          <div className="flex flex-wrap gap-2.5">
            <Btn variant="quiet" onClick={onCancel}>Cancelar</Btn>
            <Btn variant="primary" icon={Check} disabled={pending > 0} loading={busy} onClick={commit}>Confirmar e gravar</Btn>
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-4">
        <Card className="flex flex-col gap-3 p-4.5">
          <Field label="Data dos resultados">
            <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <SourcePreview src={image || `/api/imports/${id}/image`} pdf={pdf} className="w-full" />
        </Card>
        <Card className="flex flex-col p-4.5">
          <strong className="mb-2 text-[15px]">Verificações</strong>
          {d.checks.map((c, i) => (
            <div key={i} className="flex items-start gap-2.5 border-t border-line py-2 text-[13px] leading-snug">
              <span className={cx('flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px]', c.ok ? 'bg-okbg text-ok' : 'bg-warnbg text-warn')}>{c.ok ? <Check size={13} strokeWidth={2.6} /> : <AlertTriangle size={13} />}</span>
              <span className="text-ink2">{c.text}</span>
            </div>
          ))}
          {decreases.slice(0, 4).map((x, i) => <div key={`d${i}`} className="border-t border-line py-2 text-xs text-warn">{x.text}</div>)}
        </Card>
      </div>
    </div>
  );
}

// -------------------------------------------------------------- schedule

const CYCLE: (Kind | null)[] = ['A', 'F', 'L', 'O', 'V', null];

function ReviewSchedule({ id, d, image, pdf, onCancel, onSaved }: { id: number; d: SchedDraft; image: string | null; pdf: boolean; onCancel: () => void; onSaved: (text: string) => void }) {
  const [rows, setRows] = React.useState<SchedRow[]>(() => d.rows.map((r) => ({ ...r, days: { ...r.days } })));
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const n = daysIn(d.year, d.month);

  const cycle = (key: string, date: string) =>
    setRows((rs) => rs.map((r) => {
      if (r.key !== key) return r;
      const cur = r.days[date]?.kind ?? null;
      const next = CYCLE[(CYCLE.indexOf(cur) + 1) % CYCLE.length];
      const days = { ...r.days };
      if (next) days[date] = { kind: next, ...(next === 'L' ? { start: '09:00', end: '18:00' } : {}) };
      else delete days[date];
      return { ...r, days };
    }));
  const assign = (key: string, v: string) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, userId: v === 'ignore' ? null : Number(v), status: v === 'ignore' ? 'ignored' : 'ok' } : r)));

  const visible = rows.filter((r) => r.status !== 'ignored');
  const people = visible.filter((r) => r.status !== 'ok');
  const missingCells = visible.filter((r) => r.status === 'ok').reduce((s, r) => s + (n - Object.keys(r.days).length), 0);

  const commit = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await api.post<{ updated: number }>(`/api/imports/${id}/commit`, { rows: rows.filter((r) => r.status === 'ok' && r.userId).map((r) => ({ userId: r.userId, days: r.days })) });
      onSaved(`Escala de ${MONTHS[d.month - 1]} gravada para ${res.updated} vendedores. As metas diárias já usam os novos dias de trabalho.`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-wrap items-center gap-4 p-5">
        <IconTile icon={people.length || missingCells ? Sparkles : CheckCircle2} tone="lime" size={48} iconSize={24} />
        <div className="flex flex-[1_1_240px] flex-col gap-0.5">
          <strong className="text-xl">Escala de {MONTHS[d.month - 1]} lida</strong>
          <span className="text-sm text-mute">{missingCells ? `${missingCells} dias por ler. Toca num dia para escolher o turno.` : 'Todos os dias foram lidos.'}{people.length ? ` ${people.length} ${people.length === 1 ? 'pessoa por identificar' : 'pessoas por identificar'}.` : ''}</span>
        </div>
      </Card>

      {people.map((r) => (
        <Card key={r.key} className="flex flex-wrap items-center gap-4 border-[#6b5518] p-5">
          <IconTile icon={UserX} tone="warn" />
          <div className="flex flex-[1_1_220px] flex-col"><strong>{r.readName}</strong><span className="text-sm text-mute">Não reconheci este nome.</span></div>
          <select className={inputCls} defaultValue="" onChange={(e) => assign(r.key, e.target.value)} aria-label={`Vendedor para ${r.readName}`}>
            <option value="" disabled>Escolher vendedor…</option>
            {(r.candidates?.length ? r.candidates : d.sellers).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            <option value="ignore">Ignorar esta linha</option>
          </select>
        </Card>
      ))}

      <Card className="p-4">
        <div className="overflow-x-auto pb-1.5">
          <div className="flex min-w-[1200px] flex-col gap-1">
            <div className="grid items-end gap-[3px]" style={{ gridTemplateColumns: `120px repeat(${n}, 32px)` }}>
              <span className="text-xs text-mute2">Vendedor</span>
              {Array.from({ length: n }, (_, i) => <span key={i} className="text-center text-xs font-bold text-ink2">{i + 1}</span>)}
            </div>
            {visible.map((r) => (
              <div key={r.key} className="grid items-center gap-[3px]" style={{ gridTemplateColumns: `120px repeat(${n}, 32px)` }}>
                <strong className="truncate text-sm">{r.readName}</strong>
                {Array.from({ length: n }, (_, i) => {
                  const date = dateOf(d.year, d.month, i + 1);
                  const cell = r.days[date];
                  const st = cell ? KIND_STYLE[cell.kind] : null;
                  return (
                    <button key={i} onClick={() => cycle(r.key, date)} aria-label={`${r.readName}, dia ${i + 1}: ${st ? st.name : 'por ler'}`} title={st ? `${st.name}${cell?.start ? ` ${cell.start}–${cell.end}` : ''}` : 'Por ler'}
                      className={cx('flex h-[34px] w-8 items-center justify-center rounded-[9px]', !st && 'border-2 border-dashed border-[#8a6b1e] bg-[#2b2410]')} style={st ? { background: st.bg, color: st.fg } : undefined}>
                      {cell ? <KindIcon kind={cell.kind} size={14} /> : <span className="text-xs text-warn">?</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-4">
        <Card className="flex min-w-0 flex-[1_1_320px] flex-col p-4.5">
          <strong className="mb-2 text-[15px]">Verificações</strong>
          {d.checks.map((c, i) => (
            <div key={i} className="flex items-start gap-2.5 border-t border-line py-2 text-[13px]">
              <span className={cx('flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px]', c.ok ? 'bg-okbg text-ok' : 'bg-warnbg text-warn')}>{c.ok ? <Check size={13} strokeWidth={2.6} /> : <AlertTriangle size={13} />}</span>
              <span className="text-ink2">{c.text}</span>
            </div>
          ))}
          {d.issues.filter((x) => x.kind === 'month' || x.kind === 'freeShift').map((x, i) => <div key={i} className="border-t border-line py-2 text-xs text-warn">{x.text}</div>)}
        </Card>
        <Card className="flex min-w-0 flex-[1_1_320px] p-4.5">
          <SourcePreview src={image || `/api/imports/${id}/image`} pdf={pdf} className="max-h-72 w-full object-contain" />
        </Card>
      </div>

      {err && <ErrorBox message={err} />}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-[13px] text-mute"><Undo2 size={16} aria-hidden />Os dias por ler ficam vazios se gravares assim. Podes corrigir depois na Escala.</span>
        <div className="flex flex-wrap gap-2.5">
          <Btn variant="quiet" onClick={onCancel}>Cancelar</Btn>
          <Btn variant="primary" icon={Check} disabled={people.length > 0} loading={busy} onClick={commit}>Confirmar e gravar</Btn>
        </div>
      </div>
    </div>
  );
}

/** The uploaded file shown next to the review: an image, or the PDF in an embedded viewer. */
function SourcePreview({ src, pdf, className }: { src: string; pdf: boolean; className?: string }) {
  if (!pdf) return <img src={src} alt="Ficheiro carregado" className={cx('rounded-xl border border-line', className)} />;
  return (
    <div className="flex w-full flex-col gap-2">
      <iframe src={src} title="PDF carregado" className="h-[420px] w-full rounded-xl border border-line bg-white" />
      <a href={src} target="_blank" rel="noreferrer" className="text-xs font-semibold text-lime2">Abrir o PDF noutra janela</a>
    </div>
  );
}
