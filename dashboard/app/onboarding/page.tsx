'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Stepper from '@/components/Stepper';
import { getToken } from '@/lib/auth';
import { createSessionClient } from '@/lib/session-client';
import { useLang } from '@/lib/i18n';

const DOMAIN_EXAMPLES = [
  { name: 'education', label: 'Education' },
  { name: 'renting', label: 'Renting' },
  { name: 'bookstore', label: 'Bookstore' },
  { name: 'manufacturing', label: 'Manufacturing' },
  { name: 'healthcare', label: 'Healthcare' },
  { name: 'logistics', label: 'Logistics' },
  { name: 'ecommerce', label: 'E-Commerce' },
  { name: 'social', label: 'Social Network' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { t } = useLang();
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');
  const [step, setStep] = useState(0);
  const [workspaceName, setWorkspaceName] = useState('');
  const [domain, setDomain] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!getToken()) router.push('/login');
  }, [router]);

  const handleCreate = async () => {
    if (!domain.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const client = createSessionClient();
      const workspace = await client.post<{ id: string }>('/workspaces', {
        name: workspaceName,
        adapter_name: domain.trim().toLowerCase().replace(/\s+/g, '-'),
      });
      const keyResult = await client.post<{ key: string }>(
        `/workspaces/${workspace.id}/api-keys`,
        { name: 'default' },
      );
      setApiKey(keyResult.key);
      setStep(3);
    } catch (e: unknown) {
      setError(String(e));
    } finally {
      setCreating(false);
    }
  };

  const copyKey = async () => {
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-lg">
      <Stepper steps={t.onboarding.steps} current={step} />

      {/* Step 0 — Welcome */}
      {step === 0 && (
        <div>
          <h2 className="font-display font-bold text-2xl text-primary mb-3">
            {t.onboarding.welcome.title}
          </h2>
          <p className="text-primary/60 text-sm mb-6 leading-relaxed">
            {t.onboarding.welcome.subtitle}
          </p>
          <div className="space-y-2 mb-7">
            {t.onboarding.welcome.layers.map((item, i) => (
              <div
                key={i}
                className="flex gap-4 rounded-xl bg-white border border-muted p-4"
              >
                <span className="font-mono text-xs text-accent bg-primary rounded-md px-2 py-1 self-start shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <p className="font-semibold text-sm text-primary">{item.title}</p>
                  <p className="text-xs text-primary/50 mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <button
            className="rounded-xl bg-accent text-primary px-5 py-2.5 font-semibold hover:bg-accent/90 transition-colors"
            onClick={() => setStep(1)}
          >
            {t.onboarding.welcome.cta}
          </button>
        </div>
      )}

      {/* Step 1 — Workspace name */}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="font-display font-bold text-xl text-primary">{t.onboarding.workspace.title}</h2>
            <p className="text-xs text-primary/40 mt-1">
              {t.onboarding.workspace.subtitle}
            </p>
          </div>
          <input
            type="text"
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            placeholder={t.onboarding.workspace.placeholder}
            className="rounded-xl border border-muted px-4 py-3 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <div className="flex gap-3">
            <button
              className="rounded-xl border border-muted px-4 py-2 text-sm hover:bg-muted/50 transition-colors"
              onClick={() => setStep(0)}
            >
              {t.onboarding.workspace.back}
            </button>
            <button
              className="rounded-xl bg-primary text-white px-5 py-2 text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40"
              disabled={!workspaceName.trim()}
              onClick={() => setStep(2)}
            >
              {t.onboarding.workspace.next}
            </button>
          </div>
        </div>
      )}

      {/* Step 2 — Domain (free text + examples) */}
      {step === 2 && (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="font-display font-bold text-xl text-primary">{t.onboarding.domain.title}</h2>
            <p className="text-xs text-primary/40 mt-1 leading-relaxed">
              {t.onboarding.domain.subtitle}
            </p>
          </div>

          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder={t.onboarding.domain.placeholder}
            className="rounded-xl border border-muted px-4 py-3 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          />

          <div>
            <p className="text-xs font-medium text-primary/40 mb-2">{t.onboarding.domain.quickFill}</p>
            <div className="flex flex-wrap gap-2">
              {DOMAIN_EXAMPLES.map((d) => (
                <button
                  key={d.name}
                  onClick={() => setDomain(d.name)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    domain === d.name
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-primary/60 border-muted hover:border-primary/30 hover:text-primary'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-primary/5 border-l-2 border-l-primary/30 text-primary/70 text-sm px-4 py-3">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              className="rounded-xl border border-muted px-4 py-2 text-sm hover:bg-muted/50 transition-colors"
              onClick={() => setStep(1)}
            >
              {t.onboarding.domain.back}
            </button>
            <button
              className="rounded-xl bg-accent text-primary px-5 py-2 text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-40"
              disabled={!domain.trim() || creating}
              onClick={handleCreate}
            >
              {creating ? t.onboarding.domain.creating : t.onboarding.domain.create}
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — API Key */}
      {step === 3 && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center shrink-0">
              <svg
                className="w-5 h-5 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <h2 className="font-display font-bold text-xl text-primary">{t.onboarding.apiKey.title}</h2>
              <p className="text-xs text-primary/40">{t.onboarding.apiKey.subtitle}</p>
            </div>
          </div>

          <p className="text-sm text-primary/60">
            {t.onboarding.apiKey.saveNote}{' '}
            <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">X-API-Key</code>{' '}
            {t.onboarding.apiKey.saveNoteEnd}
          </p>

          <div className="rounded-xl bg-primary px-4 py-3.5">
            <code className="text-accent font-mono text-xs break-all leading-relaxed">{apiKey}</code>
          </div>

          <div className="flex gap-3">
            <button
              onClick={copyKey}
              className="flex-1 rounded-xl border border-muted bg-white text-primary px-4 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
            >
              {copied ? t.onboarding.apiKey.copied : t.onboarding.apiKey.copy}
            </button>
            <a
              href="/workspaces"
              className="flex-1 rounded-xl bg-accent text-primary px-5 py-2.5 text-sm font-semibold hover:bg-accent/90 transition-colors text-center"
            >
              {t.onboarding.apiKey.goToWorkspaces}
            </a>
          </div>

          <div className="rounded-xl border border-muted bg-white p-4 mt-1">
            <p className="text-xs font-medium text-primary mb-2">{t.onboarding.apiKey.quickStart}</p>
            <code className="text-xs font-mono text-primary/60 block leading-relaxed">
              curl -X POST ${apiBase}/graph/nodes \<br />
              {'  '}-H &quot;X-API-Key: {apiKey.slice(0, 16)}…&quot; \<br />
              {'  '}-d &apos;&#123;&quot;id&quot;: &quot;...&quot;, &quot;type&quot;: &quot;node&quot;&#125;&apos;
            </code>
          </div>
        </div>
      )}
    </div>
  );
}
