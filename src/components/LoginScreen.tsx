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
  KeyRound,
} from 'lucide-react';
import { getAccentClasses } from '../utils/brand';
import { authService } from '../services/auth.service';
import { isSupabaseConfigured } from '../lib/supabase/client';
import { useTheme } from '../context/ThemeContext';

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
  const { isDark } = useTheme();
  const [username, setUsername] = useState('nanopaniago1@gmail.com');
  const [password, setPassword] = useState('somos@102030');
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
      const result = await authService.login(trimmedInput, trimmedPass);
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
    <div className={`min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden transition-colors duration-200 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-[#f5f5f7] text-slate-900'
    }`}>
      {/* Subtle organic ambient gradients */}
      <div className={`absolute top-1/6 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl pointer-events-none ${
        isDark
          ? 'bg-gradient-to-tr from-blue-950/40 via-purple-950/30 to-emerald-950/20'
          : 'bg-gradient-to-tr from-blue-100/40 via-purple-100/30 to-emerald-100/30'
      }`} />

      <div className="relative w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="mb-3">
            <BrandLogo brand={brand} size="xl" showText={false} />
          </div>

          <h1 className={`text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-1.5 ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}>
            {brand.name}
          </h1>
          <p className={`text-xs sm:text-sm mt-1 max-w-xs text-center font-normal ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}>
            {brand.tagline || 'Plataforma de Gestão de Metas & Desempenho Comercial'}
          </p>
        </div>

        {/* Main Card (Apple Frosted Glass Aesthetic) */}
        <div className={`rounded-3xl p-7 sm:p-9 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] border backdrop-blur-xl ${
          isDark
            ? 'bg-slate-900/90 border-slate-800'
            : 'bg-white/90 border-black/[0.06]'
        }`}>
          <div className={`flex items-center justify-between mb-6 pb-4 border-b ${
            isDark ? 'border-slate-800' : 'border-black/[0.04]'
          }`}>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-lg font-bold tracking-tight ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>Iniciar Sessão</h2>
                {supabaseConnected ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800">
                    <Cloud className="w-2.5 h-2.5" />
                    Supabase
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    Pronto a Entrar
                  </span>
                )}
              </div>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Introduza as suas credenciais para continuar
              </p>
            </div>
            <div className={`p-2.5 rounded-2xl border ${
              isDark
                ? 'bg-slate-800/80 text-slate-300 border-slate-700'
                : 'bg-black/[0.03] text-slate-700 border-black/[0.04]'
            }`}>
              <Lock className="w-4 h-4" />
            </div>
          </div>

          {/* Quick Credential Helper Pill */}
          <div className={`mb-5 p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
            isDark
              ? 'bg-slate-800/60 border-slate-700 text-slate-300'
              : 'bg-blue-50/70 border-blue-200/70 text-slate-700'
          }`}>
            <div className="flex items-center gap-2.5 min-w-0">
              <KeyRound className="w-4 h-4 text-blue-500 shrink-0" />
              <div className="min-w-0">
                <p className="font-bold text-[11px] uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Credenciais Definidas
                </p>
                <p className="truncate font-mono text-xs text-slate-900 dark:text-slate-200 font-semibold">
                  nanopaniago1@gmail.com
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setUsername('nanopaniago1@gmail.com');
                setPassword('somos@102030');
                setErrorMsg(null);
              }}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition cursor-pointer shrink-0 shadow-sm"
            >
              Preencher
            </button>
          </div>

          {supabaseConnected && users.length === 0 && (
            <div className="mb-5 p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200/80 text-amber-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Base de dados sem utilizadores</p>
                <p className="text-amber-700 mt-0.5">
                  Nenhum utilizador encontrado no Supabase. Crie o primeiro utilizador administrador no Supabase Auth/profiles.
                </p>
              </div>
            </div>
          )}

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
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>
                E-mail ou Utilizador
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="nanopaniago1@gmail.com"
                  className={`w-full rounded-2xl border pl-10 pr-3.5 py-2.5 text-xs sm:text-sm font-semibold focus:outline-none transition ${
                    isDark
                      ? 'bg-slate-800/80 border-slate-700 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-900/50'
                      : 'bg-black/[0.02] border-black/[0.08] text-slate-900 focus:border-[#0071e3] focus:bg-white focus:ring-2 focus:ring-blue-100'
                  }`}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={`block text-[11px] font-bold uppercase tracking-wider ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}>
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
                  className={`w-full rounded-2xl border pl-10 pr-10 py-2.5 text-xs sm:text-sm font-semibold focus:outline-none transition ${
                    isDark
                      ? 'bg-slate-800/80 border-slate-700 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-900/50'
                      : 'bg-black/[0.02] border-black/[0.08] text-slate-900 focus:border-[#0071e3] focus:bg-white focus:ring-2 focus:ring-blue-100'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
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
          <div className={`mt-6 p-3.5 rounded-2xl border text-[11px] space-y-1.5 ${
            isDark
              ? 'bg-slate-800/40 border-slate-800 text-slate-400'
              : 'bg-[#f5f5f7] border-black/[0.04] text-slate-600'
          }`}>
            <div className={`flex items-center gap-1.5 font-bold ${
              isDark ? 'text-slate-200' : 'text-slate-800'
            }`}>
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>Acesso Administrativo Autorizado:</span>
            </div>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>
                <strong className={isDark ? 'text-slate-200' : 'text-slate-700'}>Super Administrador:</strong> nanopaniago1@gmail.com
              </li>
              <li>
                <strong className={isDark ? 'text-slate-200' : 'text-slate-700'}>Controlo Total:</strong> Gestão individual de metas por vendedor, escalas e relatórios.
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
