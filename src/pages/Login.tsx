import React from 'react';
import { LogIn, Target } from 'lucide-react';
import { api } from '../api';
import { Btn, Field, inputCls } from '../ui';

export default function Login({ onDone }: { onDone: () => void }) {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post('/api/auth/login', { username, password });
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <form onSubmit={submit} className="hero flex w-full max-w-sm flex-col gap-5 rounded-[26px] border border-limeline p-7">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-lime text-onlime"><Target size={24} aria-hidden /></span>
          <span className="text-xl font-bold">Objetivos <span className="text-lime">RP</span></span>
        </div>
        <div>
          <h1 className="m-0 text-2xl font-bold">Entrar</h1>
          <p className="mt-1 mb-0 text-sm text-mute">Usa o utilizador que o teu gestor te deu.</p>
        </div>
        <Field label="Utilizador">
          <input className={inputCls} autoComplete="username" autoCapitalize="none" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </Field>
        <Field label="Palavra-passe">
          <input className={inputCls} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        {error && <p role="alert" className="m-0 rounded-xl bg-badbg px-3 py-2 text-sm text-bad">{error}</p>}
        <Btn variant="primary" type="submit" icon={LogIn} loading={busy}>Entrar</Btn>
      </form>
    </div>
  );
}
