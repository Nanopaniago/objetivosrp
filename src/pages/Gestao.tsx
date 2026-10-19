import React from 'react';
import { Check, Copy, KeyRound, ListChecks, Plus, Store, Tag, Target, Trash2, Trophy, UserPlus, Users } from 'lucide-react';
import { api, type Category, type Challenge, type UserRow } from '../api';
import { useApp } from '../App';
import { MONTHS, amount, shortDate } from '../format';
import { Btn, CATEGORY_ICONS, Card, CatIcon, ErrorBox, Field, Pill, Spinner, cx, inputCls, toast } from '../ui';

type Tab = 'vendedores' | 'metas' | 'resultados' | 'desafios' | 'lojas' | 'categorias' | 'conta';
const readTab = (): Tab | null => {
  const m = window.location.hash.match(/tab=([a-z]+)/);
  return (m?.[1] as Tab) || null;
};

export default function Gestao() {
  const { me } = useApp();
  const isAdmin = me.user.role === 'admin';
  const isSeller = me.user.role === 'seller';
  const tabs: { id: Tab; label: string; icon: typeof Users }[] = isSeller ? [{ id: 'conta', label: 'A minha conta', icon: KeyRound }] : [
    { id: 'vendedores', label: 'Vendedores', icon: Users },
    { id: 'metas', label: 'Metas', icon: Target },
    { id: 'resultados', label: 'Resultados', icon: ListChecks },
    { id: 'desafios', label: 'Desafios', icon: Trophy },
    ...(isAdmin ? [{ id: 'lojas' as Tab, label: 'Lojas', icon: Store }, { id: 'categorias' as Tab, label: 'Categorias', icon: Tag }] : []),
    { id: 'conta', label: 'A minha conta', icon: KeyRound },
  ];
  const [tab, setTab] = React.useState<Tab>(() => {
    const t = readTab();
    return tabs.some((x) => x.id === t) ? t! : tabs[0].id;
  });
  React.useEffect(() => {
    const on = () => { const t = readTab(); if (t) setTab(t); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  return (
    <>
      <div>
        <h1 className="m-0 text-2xl font-bold">{isSeller ? 'A minha conta' : 'Gestão'}</h1>
        {!isSeller && <p className="m-0 mt-1 text-sm text-mute">Tudo o que a importação faz também se faz aqui à mão.</p>}
      </div>
      <div className="flex flex-wrap gap-1 self-start rounded-2xl border border-line bg-card2 p-1" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => { setTab(t.id); history.replaceState(null, '', `#/gestao?tab=${t.id}`); }}
            className={cx('flex min-h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold', tab === t.id ? 'bg-lime text-onlime' : 'text-[#b4b9ae]')}>
            <t.icon size={16} aria-hidden />{t.label}
          </button>
        ))}
      </div>
      {tab === 'vendedores' && <Vendedores />}
      {tab === 'metas' && <Metas />}
      {tab === 'resultados' && <Resultados />}
      {tab === 'desafios' && <Desafios />}
      {tab === 'lojas' && <Lojas />}
      {tab === 'categorias' && <Categorias />}
      {tab === 'conta' && <Conta />}
    </>
  );
}

function useCategories() {
  const [cats, setCats] = React.useState<Category[] | null>(null);
  React.useEffect(() => { api.get<Category[]>('/api/categories').then(setCats).catch(() => setCats([])); }, []);
  return cats;
}

function useSellers() {
  const { storeId } = useApp();
  const [users, setUsers] = React.useState<UserRow[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const reload = React.useCallback(() => {
    if (!storeId) return;
    api.get<UserRow[]>(`/api/users?store_id=${storeId}`).then(setUsers).catch((e) => setError(e.message));
  }, [storeId]);
  React.useEffect(reload, [reload]);
  return { users, error, reload };
}

const slugUser = (name: string) =>
  name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.').replace(/[^a-z0-9.]/g, '');

// ------------------------------------------------------------------ users
function Vendedores() {
  const { me, storeId } = useApp();
  const { users, error, reload } = useSellers();
  const [form, setForm] = React.useState({ name: '', username: '', password: '', igl: false, role: 'seller' as 'seller' | 'manager' });
  const [busy, setBusy] = React.useState(false);
  const [pwFor, setPwFor] = React.useState<number | null>(null);
  const [pw, setPw] = React.useState('');
  const isAdmin = me.user.role === 'admin';

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!users) return <Spinner />;

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/api/users', { ...form, store_id: storeId });
      toast(`${form.name.split(' ')[0]} criado. Partilha o utilizador e a palavra-passe.`);
      setForm({ name: '', username: '', password: '', igl: false, role: 'seller' });
      reload();
    } catch (err) {
      toast((err as Error).message, 'bad');
    } finally {
      setBusy(false);
    }
  };
  const patch = async (id: number, body: object, msg: string) => {
    try {
      await api.patch(`/api/users/${id}`, body);
      toast(msg);
      reload();
    } catch (err) {
      toast((err as Error).message, 'bad');
    }
  };

  return (
    <div className="flex flex-wrap items-start gap-4">
      <Card className="flex min-w-0 flex-[2_1_520px] flex-col p-2.5">
        <h2 className="mx-3 mt-2.5 mb-2 text-[17px] font-bold">Pessoas desta loja</h2>
        {users.length === 0 && <p className="mx-3 mb-3 text-sm text-mute">Ainda não há ninguém. Cria o primeiro vendedor ao lado.</p>}
        {users.map((u) => (
          <div key={u.id} className={cx('flex flex-col gap-3 rounded-[18px] px-3.5 py-3', !u.active && 'opacity-55')}>
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-limebg font-bold text-lime2">{u.firstName.charAt(0)}</span>
              <span className="flex min-w-0 flex-[1_1_160px] flex-col">
                <strong className="text-[15px]">{u.name}</strong>
                <span className="text-xs text-mute2">@{u.username} · {u.role === 'seller' ? 'Vendedor' : u.role === 'manager' ? 'Gestor' : 'Admin'}{!u.active ? ' · desativado' : ''}</span>
              </span>
              {u.role === 'seller' && (
                <button onClick={() => patch(u.id, { igl: !u.igl }, u.igl ? 'Removido da equipa IGL.' : 'Adicionado à equipa IGL.')} aria-pressed={u.igl}
                  className={cx('min-h-9 rounded-full px-3 text-xs font-bold', u.igl ? 'bg-violetbg text-violet' : 'border border-line2 text-mute')}>IGL</button>
              )}
              <button onClick={() => { setPwFor(pwFor === u.id ? null : u.id); setPw(''); }} className="flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-ink2 hover:bg-card2"><KeyRound size={14} aria-hidden />Palavra-passe</button>
              {u.id !== me.user.id && (u.role === 'seller' || isAdmin) && (
                <button onClick={() => patch(u.id, { active: !u.active }, u.active ? `${u.firstName} desativado.` : `${u.firstName} reativado.`)} className="min-h-9 rounded-lg px-2.5 text-xs font-semibold text-mute hover:bg-card2">
                  {u.active ? 'Desativar' : 'Reativar'}
                </button>
              )}
            </div>
            {pwFor === u.id && (
              <form className="flex flex-wrap items-end gap-2 pl-12" onSubmit={(e) => { e.preventDefault(); patch(u.id, { password: pw }, 'Palavra-passe alterada.'); setPwFor(null); }}>
                <Field label="Nova palavra-passe" hint="Mínimo 8 caracteres."><input className={inputCls} type="text" minLength={8} required value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
                <Btn variant="primary" type="submit" icon={Check}>Guardar</Btn>
              </form>
            )}
          </div>
        ))}
      </Card>

      <Card className="flex min-w-0 flex-[1_1_300px] flex-col p-5">
        <form onSubmit={create} className="flex flex-col gap-3.5">
          <h2 className="m-0 flex items-center gap-2 text-[17px] font-bold"><UserPlus size={18} aria-hidden />Nova pessoa</h2>
          {isAdmin && (
            <Field label="Função">
              <select className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as 'seller' | 'manager' })}>
                <option value="seller">Vendedor</option>
                <option value="manager">Gestor desta loja</option>
              </select>
            </Field>
          )}
          <Field label="Nome completo" hint="O primeiro nome é usado para reconhecer a pessoa nas imagens.">
            <input className={inputCls} required value={form.name} onChange={(e) => { const name = e.target.value; setForm((f) => ({ ...f, name, username: f.username && f.username !== slugUser(f.name) ? f.username : slugUser(name) })); }} />
          </Field>
          <Field label="Utilizador"><input className={inputCls} required minLength={3} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })} /></Field>
          <Field label="Palavra-passe inicial" hint="Mínimo 8 caracteres. A pessoa pode mudá-la depois."><input className={inputCls} required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
          {form.role === 'seller' && (
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input type="checkbox" className="h-5 w-5 accent-[#b8f53d]" checked={form.igl} onChange={(e) => setForm({ ...form, igl: e.target.checked })} />
              Equipa IGL (horário livre)
            </label>
          )}
          <Btn variant="primary" type="submit" icon={Plus} loading={busy}>Criar</Btn>
        </form>
      </Card>
    </div>
  );
}

// ------------------------------------------------------------------ goals
function Metas() {
  const { storeId, year, month } = useApp();
  const cats = useCategories();
  const { users } = useSellers();
  const [vals, setVals] = React.useState<Record<string, string>>({});
  const [loaded, setLoaded] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const sellers = (users || []).filter((u) => u.role === 'seller' && u.active);

  const fetchGoals = React.useCallback(async (y: number, m: number) => {
    const rows = await api.get<{ user_id: number; category_id: number; target: number }[]>(`/api/goals?store_id=${storeId}&year=${y}&month=${m}`);
    return Object.fromEntries(rows.map((r) => [`${r.user_id}:${r.category_id}`, String(r.target)]));
  }, [storeId]);

  React.useEffect(() => { fetchGoals(year, month).then((v) => { setVals(v); setLoaded(true); }); }, [fetchGoals, year, month]);

  if (!cats || !users || !loaded) return <Spinner />;
  if (!sellers.length) return <Card className="p-6 text-sm text-mute">Cria primeiro os vendedores no separador Vendedores.</Card>;

  const copyPrev = async () => {
    const d = new Date(year, month - 2, 1);
    const prev = await fetchGoals(d.getFullYear(), d.getMonth() + 1);
    if (!Object.keys(prev).length) return toast('O mês anterior não tem metas.', 'bad');
    setVals((v) => ({ ...prev, ...Object.fromEntries(Object.entries(v).filter(([, x]) => x)) }));
    toast('Metas do mês anterior copiadas. Revê e guarda.');
  };
  const save = async () => {
    setBusy(true);
    try {
      const items = sellers.flatMap((s) => cats.map((c) => ({ user_id: s.id, category_id: c.id, target: Number((vals[`${s.id}:${c.id}`] || '').replace(',', '.')) || null })));
      await api.put('/api/goals', { store_id: storeId, year, month, items });
      toast('Metas guardadas.');
    } catch (e) {
      toast((e as Error).message, 'bad');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="m-0 text-[17px] font-bold">Metas de {MONTHS[month - 1]} {year}</h2>
          <p className="m-0 mt-0.5 text-[13px] text-mute">Dica: a importação do relatório diário já preenche as metas sozinha.</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Btn icon={Copy} onClick={copyPrev}>Copiar do mês anterior</Btn>
          <Btn variant="primary" icon={Check} loading={busy} onClick={save}>Guardar metas</Btn>
        </div>
      </div>
      <SellerGrid sellers={sellers} cats={cats} get={(s, c) => vals[`${s}:${c}`] ?? ''} set={(s, c, v) => setVals({ ...vals, [`${s}:${c}`]: v })} />
    </Card>
  );
}

function SellerGrid({ sellers, cats, get, set, hint }: { sellers: UserRow[]; cats: Category[]; get: (s: number, c: number) => string; set: (s: number, c: number, v: string) => void; hint?: (s: number, c: number) => string | null }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-separate border-spacing-1.5 text-sm">
        <thead>
          <tr>
            <th className="text-left text-xs font-medium text-mute2">Vendedor</th>
            {cats.map((c) => <th key={c.id} className="text-left text-xs font-medium text-mute2"><span className="inline-flex items-center gap-1"><CatIcon icon={c.icon} size={13} />{c.name} {c.unit === 'eur' ? '€' : 'un'}</span></th>)}
          </tr>
        </thead>
        <tbody>
          {sellers.map((s) => (
            <tr key={s.id}>
              <td className="font-bold">{s.firstName}</td>
              {cats.map((c) => (
                <td key={c.id}>
                  <input aria-label={`${s.firstName} ${c.name}`} inputMode="decimal" className={cx(inputCls, 'tabular w-full min-w-[90px]')} value={get(s.id, c.id)} onChange={(e) => set(s.id, c.id, e.target.value)} />
                  {hint?.(s.id, c.id) && <span className="mt-0.5 block text-[11px] text-mute2">{hint(s.id, c.id)}</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------- results
function Resultados() {
  const { me, storeId } = useApp();
  const cats = useCategories();
  const { users } = useSellers();
  const [date, setDate] = React.useState(me.today);
  const [vals, setVals] = React.useState<Record<string, string> | null>(null);
  const [prev, setPrev] = React.useState<Record<string, number>>({});
  const [busy, setBusy] = React.useState(false);
  const sellers = (users || []).filter((u) => u.role === 'seller' && u.active);

  React.useEffect(() => {
    setVals(null);
    api.get<{ rows: { user_id: number; category_id: number; value: number }[]; previous: { user_id: number; category_id: number; value: number }[] }>(`/api/results?store_id=${storeId}&date=${date}`).then((r) => {
      setVals(Object.fromEntries(r.rows.map((x) => [`${x.user_id}:${x.category_id}`, String(x.value)])));
      setPrev(Object.fromEntries(r.previous.map((x) => [`${x.user_id}:${x.category_id}`, x.value])));
    });
  }, [storeId, date]);

  if (!cats || !users || !vals) return <Spinner />;
  if (!sellers.length) return <Card className="p-6 text-sm text-mute">Cria primeiro os vendedores no separador Vendedores.</Card>;

  const save = async () => {
    setBusy(true);
    try {
      const items = sellers.flatMap((s) => cats.map((c) => {
        const raw = (vals[`${s.id}:${c.id}`] ?? '').replace(',', '.').trim();
        return { user_id: s.id, category_id: c.id, value: raw === '' ? null : Number(raw) };
      }));
      await api.put('/api/results', { store_id: storeId, date, items });
      toast(`Resultados de ${shortDate(date)} guardados. Pontos recalculados.`);
    } catch (e) {
      toast((e as Error).message, 'bad');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Data"><input type="date" className={inputCls} value={date} max={me.today} onChange={(e) => setDate(e.target.value)} /></Field>
          <p className="m-0 max-w-sm pb-2 text-[13px] text-mute">Escreve o <strong className="text-ink2">acumulado do mês</strong> até esta data, como no relatório. Por baixo vês o último valor registado.</p>
        </div>
        <Btn variant="primary" icon={Check} loading={busy} onClick={save}>Guardar resultados</Btn>
      </div>
      <SellerGrid sellers={sellers} cats={cats} get={(s, c) => vals[`${s}:${c}`] ?? ''} set={(s, c, v) => setVals({ ...vals, [`${s}:${c}`]: v })}
        hint={(s, c) => (prev[`${s}:${c}`] !== undefined ? `antes: ${amount(prev[`${s}:${c}`], cats.find((x) => x.id === c)!.unit)}` : null)} />
    </Card>
  );
}

// ------------------------------------------------------------- challenges
function Desafios() {
  const { storeId, me } = useApp();
  const cats = useCategories();
  const [list, setList] = React.useState<Challenge[] | null>(null);
  const end = new Date(Date.parse(me.today) + 6 * 86400000).toISOString().slice(0, 10);
  const [form, setForm] = React.useState({ title: '', category_id: 0, target: '', start_date: me.today, end_date: end, points: '50' });
  const reload = React.useCallback(() => { api.get<Challenge[]>(`/api/challenges?store_id=${storeId}`).then(setList); }, [storeId]);
  React.useEffect(reload, [reload]);
  React.useEffect(() => { if (cats?.length && !form.category_id) setForm((f) => ({ ...f, category_id: cats.find((c) => c.slug === 'peliculas')?.id || cats[0].id })); }, [cats, form.category_id]);

  if (!cats || !list) return <Spinner />;
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/challenges', { ...form, store_id: storeId, target: Number(form.target.replace(',', '.')), points: Number(form.points) });
      toast('Desafio criado. A equipa já o vê.');
      setForm({ ...form, title: '', target: '' });
      reload();
    } catch (err) {
      toast((err as Error).message, 'bad');
    }
  };
  const remove = async (id: number) => {
    await api.del(`/api/challenges/${id}`);
    toast('Desafio apagado.');
    reload();
  };

  return (
    <div className="flex flex-wrap items-start gap-4">
      <Card className="flex min-w-0 flex-[2_1_480px] flex-col p-2.5">
        <h2 className="mx-3 mt-2.5 mb-2 text-[17px] font-bold">Desafios de equipa</h2>
        {list.length === 0 && <p className="mx-3 mb-3 text-sm text-mute">Ainda não há desafios. Um desafio curto (uma semana) numa categoria atrasada costuma resultar bem.</p>}
        {list.map((c) => {
          const cat = cats.find((x) => x.id === c.category_id);
          const active = c.start_date <= me.today && c.end_date >= me.today;
          return (
            <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-[18px] px-3.5 py-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-limebg text-lime2">{cat && <CatIcon icon={cat.icon} size={19} />}</span>
              <span className="flex min-w-0 flex-[1_1_180px] flex-col"><strong>{c.title}</strong><span className="text-xs text-mute2">{amount(c.target, cat?.unit || 'un', { long: true })} de {cat?.name} · {shortDate(c.start_date)} a {shortDate(c.end_date)} · +{c.points} pts</span></span>
              {active ? <Pill tone="lime">A decorrer</Pill> : c.end_date < me.today ? <Pill>Terminado</Pill> : <Pill tone="indigo">Agendado</Pill>}
              <button onClick={() => remove(c.id)} aria-label={`Apagar ${c.title}`} className="flex h-9 w-9 items-center justify-center rounded-lg text-mute hover:bg-badbg hover:text-bad"><Trash2 size={16} /></button>
            </div>
          );
        })}
      </Card>
      <Card className="flex min-w-0 flex-[1_1_300px] flex-col p-5">
        <form onSubmit={create} className="flex flex-col gap-3.5">
          <h2 className="m-0 flex items-center gap-2 text-[17px] font-bold"><Trophy size={18} aria-hidden />Novo desafio</h2>
          <Field label="Nome"><input className={inputCls} required maxLength={60} placeholder="Semana das Películas" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Categoria">
            <select className={inputCls} value={form.category_id} onChange={(e) => setForm({ ...form, category_id: Number(e.target.value) })}>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Objetivo da equipa" hint="Soma de todos os vendedores no período."><input className={inputCls} required inputMode="decimal" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Início"><input type="date" className={inputCls} value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></Field>
            <Field label="Fim"><input type="date" className={inputCls} value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></Field>
          </div>
          <Field label="Pontos para quem contribuir"><input className={inputCls} inputMode="numeric" value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} /></Field>
          <Btn variant="primary" type="submit" icon={Plus}>Criar desafio</Btn>
        </form>
      </Card>
    </div>
  );
}

// ----------------------------------------------------------------- stores
function Lojas() {
  const [list, setList] = React.useState<{ id: number; name: string; code: string | null; active: number }[] | null>(null);
  const [form, setForm] = React.useState({ name: '', code: '' });
  const reload = React.useCallback(() => { api.get<typeof list>('/api/stores').then(setList); }, []);
  React.useEffect(reload, [reload]);
  if (!list) return <Spinner />;
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/stores', form);
      toast('Loja criada. A página vai recarregar para a mostrar no seletor.');
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      toast((err as Error).message, 'bad');
    }
  };
  const toggle = async (id: number, active: boolean) => {
    await api.patch(`/api/stores/${id}`, { active });
    reload();
  };
  return (
    <div className="flex flex-wrap items-start gap-4">
      <Card className="flex min-w-0 flex-[2_1_480px] flex-col p-2.5">
        <h2 className="mx-3 mt-2.5 mb-2 text-[17px] font-bold">Lojas</h2>
        {list.map((s) => (
          <div key={s.id} className={cx('flex items-center gap-3 rounded-[18px] px-3.5 py-3', !s.active && 'opacity-55')}>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-card2 text-ink2"><Store size={19} aria-hidden /></span>
            <span className="flex flex-1 flex-col"><strong>{s.name}</strong><span className="text-xs text-mute2">{s.code ? `Código ${s.code}` : 'Sem código'}</span></span>
            <Btn variant="quiet" onClick={() => toggle(s.id, !s.active)}>{s.active ? 'Desativar' : 'Reativar'}</Btn>
          </div>
        ))}
      </Card>
      <Card className="flex min-w-0 flex-[1_1_300px] flex-col p-5">
        <form onSubmit={create} className="flex flex-col gap-3.5">
          <h2 className="m-0 text-[17px] font-bold">Nova loja</h2>
          <Field label="Nome"><input className={inputCls} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Código" hint="Opcional, por exemplo 230."><input className={inputCls} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field>
          <Btn variant="primary" type="submit" icon={Plus}>Criar loja</Btn>
        </form>
      </Card>
    </div>
  );
}

// ------------------------------------------------------------- categories
function Categorias() {
  const [list, setList] = React.useState<Category[] | null>(null);
  const [form, setForm] = React.useState({ name: '', unit: 'eur', icon: 'target' });
  const reload = React.useCallback(() => { api.get<Category[]>('/api/categories?all=1').then(setList); }, []);
  React.useEffect(reload, [reload]);
  if (!list) return <Spinner />;
  const patch = async (id: number, body: object) => {
    try { await api.patch(`/api/categories/${id}`, body); reload(); } catch (e) { toast((e as Error).message, 'bad'); }
  };
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await api.post('/api/categories', form); toast('Categoria criada.'); setForm({ name: '', unit: 'eur', icon: 'target' }); reload(); } catch (err) { toast((err as Error).message, 'bad'); }
  };
  const icons = Object.keys(CATEGORY_ICONS);
  return (
    <div className="flex flex-wrap items-start gap-4">
      <Card className="flex min-w-0 flex-[2_1_520px] flex-col p-2.5">
        <h2 className="mx-3 mt-2.5 mb-2 text-[17px] font-bold">Categorias</h2>
        {list.map((c) => (
          <div key={c.id} className={cx('flex flex-wrap items-center gap-3 rounded-[18px] px-3.5 py-3', !c.active && 'opacity-55')}>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-card2 text-ink2"><CatIcon icon={c.icon} size={19} /></span>
            <strong className="flex-[1_1_140px]">{c.name}</strong>
            <select aria-label={`Unidade de ${c.name}`} className={cx(inputCls, 'min-h-9 py-1 text-sm')} value={c.unit} onChange={(e) => patch(c.id, { unit: e.target.value })}>
              <option value="eur">Euros</option><option value="un">Unidades</option>
            </select>
            <select aria-label={`Ícone de ${c.name}`} className={cx(inputCls, 'min-h-9 py-1 text-sm')} value={c.icon} onChange={(e) => patch(c.id, { icon: e.target.value })}>
              {icons.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
            <Btn variant="quiet" onClick={() => patch(c.id, { active: !c.active })}>{c.active ? 'Desativar' : 'Reativar'}</Btn>
          </div>
        ))}
      </Card>
      <Card className="flex min-w-0 flex-[1_1_300px] flex-col p-5">
        <form onSubmit={create} className="flex flex-col gap-3.5">
          <h2 className="m-0 text-[17px] font-bold">Nova categoria</h2>
          <Field label="Nome"><input className={inputCls} required maxLength={40} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Unidade"><select className={inputCls} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}><option value="eur">Euros</option><option value="un">Unidades</option></select></Field>
          <Field label="Ícone">
            <div className="flex flex-wrap gap-1.5">
              {icons.map((i) => (
                <button type="button" key={i} onClick={() => setForm({ ...form, icon: i })} aria-label={i} aria-pressed={form.icon === i}
                  className={cx('flex h-10 w-10 items-center justify-center rounded-xl border-2', form.icon === i ? 'border-lime bg-limesel text-lime2' : 'border-transparent bg-card2 text-ink2')}>
                  <CatIcon icon={i} size={18} />
                </button>
              ))}
            </div>
          </Field>
          <Btn variant="primary" type="submit" icon={Plus}>Criar categoria</Btn>
        </form>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------- account
function Conta() {
  const [f, setF] = React.useState({ current: '', next: '' });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await api.patch('/api/me/password', f); toast('Palavra-passe alterada.'); setF({ current: '', next: '' }); } catch (err) { toast((err as Error).message, 'bad'); }
  };
  return (
    <Card className="max-w-md p-5">
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <h2 className="m-0 text-[17px] font-bold">Mudar a minha palavra-passe</h2>
        <Field label="Palavra-passe atual"><input type="password" autoComplete="current-password" className={inputCls} required value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} /></Field>
        <Field label="Nova palavra-passe" hint="Mínimo 8 caracteres."><input type="password" autoComplete="new-password" minLength={8} className={inputCls} required value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} /></Field>
        <Btn variant="primary" type="submit" icon={Check}>Guardar</Btn>
      </form>
    </Card>
  );
}
