'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/auth';
import { createSessionClient } from '@/lib/session-client';
import { useLang } from '@/lib/i18n';

interface Workspace {
  id: string;
  name: string;
  adapter_name: string;
  adapter_version?: string;
  created_at?: string;
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-muted animate-pulse">
      <div className="w-9 h-9 rounded-lg bg-muted shrink-0" />
      <div className="flex-1">
        <div className="h-4 bg-muted rounded w-40 mb-1.5" />
        <div className="h-3 bg-muted rounded w-20" />
      </div>
      <div className="h-3 bg-muted rounded w-24" />
    </div>
  );
}

export default function WorkspacesPage() {
  const router = useRouter();
  const { t } = useLang();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    const client = createSessionClient();
    client
      .get<Workspace[]>('/workspaces')
      .then(setWorkspaces)
      .catch((e: unknown) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="font-display font-bold text-2xl text-primary">{t.workspaces.title}</h1>
        <a
          href="/onboarding"
          className="rounded-xl bg-accent text-primary px-4 py-2 text-sm font-semibold hover:bg-accent/90 transition-colors"
        >
          {t.workspaces.newWorkspace}
        </a>
      </div>

      <div className="bg-white rounded-2xl border border-muted shadow-card overflow-hidden">
        {loading && Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}

        {!loading && error && (
          <p className="p-6 text-rose-500 text-sm">{t.workspaces.failedToLoad} {error}</p>
        )}

        {!loading && !error && workspaces.length === 0 && (
          <div className="p-10 text-center">
            <p className="text-primary/40 text-sm mb-4">{t.workspaces.noWorkspaces}</p>
            <a
              href="/onboarding"
              className="rounded-xl bg-accent text-primary px-5 py-2.5 text-sm font-semibold hover:bg-accent/90 transition-colors"
            >
              {t.workspaces.createFirst}
            </a>
          </div>
        )}

        {!loading &&
          !error &&
          workspaces.map((ws) => (
            <a
              key={ws.id}
              href={`/workspaces/${ws.id}`}
              className="flex items-center gap-4 p-4 border-b border-muted last:border-none hover:bg-muted/40 transition-colors group"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/6 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                <span className="text-primary font-bold text-sm">
                  {ws.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm text-primary block truncate">{ws.name}</span>
                <span className="text-xs text-primary/40">{ws.adapter_name}</span>
              </div>
              <span className="text-xs text-primary/30 shrink-0">
                {ws.created_at ? new Date(ws.created_at).toLocaleDateString() : '—'}
              </span>
              <svg
                className="w-4 h-4 text-primary/20 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </a>
          ))}
      </div>
    </div>
  );
}
