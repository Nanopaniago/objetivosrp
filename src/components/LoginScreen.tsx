import React, { useState } from 'react';
import { User, BrandConfig } from '../types';
import { BrandLogo } from './BrandLogo';
import {
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Cloud,
  CheckCircle2,
} from 'lucide-react';
import { getAccentClasses } from '../utils/brand';
import { authService } from '../services/auth.service';
import { isSupabaseConfigured } from '../lib/supabase/client';

interface LoginScreenProps {
  users: User[];
  brand: BrandConfig;
  onLogin: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  users,
  brand,
  onLogin,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const accentClasses = getAccentClasses(brand.accent);
  const supabaseConnected = isSupabaseConfigured();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedInput = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedInput) {
      setErrorMsg('Por favor, introduza o seu nome de utilizador ou e-mail.');
      return;
    }

    if (!trimmedPass) {
      setErrorMsg('Por favor, introduza a sua palavra-passe.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await authService.login(trimmedInput, trimmedPass, users);
      if (result.error || !result.user) {
        setErrorMsg(result.error || 'Credenciais inválidas. Verifique os dados introduzidos.');
        setIsLoading(false);
        return;
      }

      setIsLoading(false);
      onLogin(result.user);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Falha ao autenticar. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex flex-col justify-center items-center p-4 sm:p-6 text-slate-900 selection:bg-slate-900 selection:text-white relative overflow-hidden">
      {/* Subtle organic ambient gradients inspired by Apple */}
      <div className="absolute top-1/6 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-blue-100/40 via-purple-100/30 to-emerald-100/30 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="mb-3">
            <BrandLogo brand={brand} size="xl" showText={false} />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-1.5">
            {brand.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xs text-center font-normal">
            {brand.tagline || 'Plataforma de Gestão de Metas & Desempenho Comercial'}
          </p>
        </div>

        {/* Main Card (Apple Frosted Glass Aesthetic) */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-7 sm:p-9 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] border border-black/[0.06]">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-black/[0.04]">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Iniciar Sessão</h2>
                {supabaseConnected ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                    <Cloud className="w-2.5 h-2.5" />
                    Supabase
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                    Modo Local
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Introduza as suas credenciais para continuar</p>
            </div>
            <div className="p-2.5 rounded-2xl bg-black/[0.03] text-slate-700 border border-black/[0.04]">
              <Lock className="w-4 h-4" />
            </div>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50/90 border border-rose-200/80 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Não foi possível aceder</p>
                <p className="text-rose-700 mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Field */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Nome de Utilizador
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="ex: nanopaniagopt, ana.silva, etc."
                  className="w-full rounded-2xl border border-black/[0.08] bg-black/[0.02] pl-10 pr-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:border-[#0071e3] focus:bg-white focus:ring-2 focus:ring-blue-100 focus:outline-none transition"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Palavra-passe
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Introduza a palavra-passe..."
                  className="w-full rounded-2xl border border-black/[0.08] bg-black/[0.02] pl-10 pr-10 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:border-[#0071e3] focus:bg-white focus:ring-2 focus:ring-blue-100 focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full mt-2 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold shadow-[0_4px_16px_rgba(0,113,227,0.25)] transition disabled:opacity-50 cursor-pointer ${accentClasses.primary}`}
            >
              {isLoading ? (
                <span>A validar credenciais...</span>
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Policy Information */}
          <div className="mt-6 p-3.5 rounded-2xl bg-[#f5f5f7] border border-black/[0.04] text-[11px] text-slate-600 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-700 shrink-0" />
              <span>Políticas de Segurança do Sistema:</span>
            </div>
            <ul className="list-disc pl-4 space-y-0.5 text-slate-500">
              <li>
                <strong className="text-slate-700">O Super Admin</strong> tem permissão total para criar membros e editar qualquer utilizador.
              </li>
              <li>
                <strong className="text-slate-700">Cada colaborador</strong> pode gerir e atualizar o seu próprio perfil.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-xs text-slate-400 font-normal">
          {brand.name} &bull; Design Orgânico de Alta Precisão
        </div>
      </div>
    </div>
  );
};
