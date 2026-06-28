'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, setToken } from '@/lib/auth';
import { useLang, Lang } from '@/lib/i18n';

export default function LoginPage() {
  const router = useRouter();
  const { lang, t, setLang } = useLang();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (getToken()) router.replace('/overview');
  }, [router]);

  async function safeJson(res: Response): Promise<Record<string, unknown>> {
    const text = await res.text();
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      if (res.status >= 500) throw new Error('Server is unreachable — is the API running?');
      throw new Error(`HTTP ${res.status}`);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === 'register') {
        const reg = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        if (!reg.ok) {
          const b = await safeJson(reg);
          throw new Error((b.message as string) ?? 'Registration failed');
        }
      }
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const b = await safeJson(res);
        throw new Error((b.message as string) ?? 'Invalid credentials');
      }
      const body = await safeJson(res);
      const token = (body.data as Record<string, unknown>)?.token as string;
      if (!token) throw new Error('No token returned — check API server');
      setToken(token);
      router.push('/overview');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0d1b26 0%, #1a2f3e 50%, #0d1b26 100%)' }}
    >
      {/* Subtle grid texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.035,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Ambient glow */}
      <div
        className="absolute top-1/4 left-1/3 w-[480px] h-[480px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(254,204,0,0.07) 0%, transparent 65%)',
        }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(100,160,220,0.05) 0%, transparent 65%)',
        }}
      />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2.5 mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-primary text-sm"
              style={{ background: '#FECC00' }}
            >
              YL
            </div>
            <span className="font-display font-bold text-3xl text-white tracking-tight">
              YowLinker
            </span>
          </div>
          <p className="text-sm text-white/35">{t.login.tagline}</p>
          <div className="flex items-center justify-center gap-1 mt-2">
            {(['en', 'fr'] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-md transition-colors ${
                  lang === l ? 'bg-white/15 text-white' : 'text-white/30 hover:text-white/60'
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div
          className="bg-white rounded-2xl p-8"
          style={{
            boxShadow: '0 24px 64px rgba(0,0,0,0.40), 0 8px 24px rgba(0,0,0,0.15)',
          }}
        >
          <h1 className="font-display font-semibold text-[17px] text-primary mb-6">
            {mode === 'login' ? t.login.signInTitle : t.login.registerTitle}
          </h1>

          {error && (
            <div className="mb-5 rounded-xl bg-primary/[0.05] border-l-2 border-l-primary/20 text-primary/70 text-sm px-4 py-3">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium text-primary/55 mb-1.5">
                {t.login.emailLabel}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder={t.login.emailPlaceholder}
                className="w-full rounded-xl border border-muted px-3.5 py-2.5 text-sm text-primary placeholder:text-primary/25 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-shadow"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-primary/55 mb-1.5">{t.login.passwordLabel}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder={t.login.passwordPlaceholder}
                className="w-full rounded-xl border border-muted px-3.5 py-2.5 text-sm text-primary placeholder:text-primary/25 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-shadow"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl text-primary px-4 py-3 text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 mt-1"
              style={{ background: '#FECC00' }}
            >
              {loading
                ? t.login.loading
                : mode === 'login'
                  ? t.login.signIn
                  : t.login.createAccount}
            </button>
          </form>

          <p className="text-center text-xs text-primary/40 mt-6">
            {mode === 'login' ? t.login.noAccount : t.login.haveAccount}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError(null);
              }}
              className="text-primary font-medium underline underline-offset-2 hover:text-primary/60 transition-colors"
            >
              {mode === 'login' ? t.login.signUp : t.login.signIn}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
