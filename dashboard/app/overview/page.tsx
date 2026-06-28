'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/auth';
import { createSessionClient } from '@/lib/session-client';
import MetricCard from '@/components/MetricCard';
import { useLang } from '@/lib/i18n';

interface Workspace {
  id: string;
  name: string;
  adapter_name: string;
}

interface UsageStats {
  total_requests: number;
  success_rate: number;
  avg_latency_ms: number;
  top_endpoints: { endpoint: string; count: number }[];
}

export default function OverviewPage() {
  const router = useRouter();
  const { t } = useLang();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  const clientRef = useRef<ReturnType<typeof createSessionClient> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wsIdRef = useRef<string>('');

  const fetchStats = useCallback(async () => {
    if (!clientRef.current || !wsIdRef.current) return;
    try {
      const s = await clientRef.current.get<UsageStats>(`/usage/stats?workspace_id=${wsIdRef.current}`);
      setStats(s);
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    clientRef.current = createSessionClient();
    clientRef.current
      .get<Workspace[]>('/workspaces')
      .then(async (ws) => {
        setWorkspaces(ws);
        if (ws.length > 0) {
          wsIdRef.current = ws[0].id;
          const s = await clientRef.current!.get<UsageStats>(`/usage/stats?workspace_id=${ws[0].id}`);
          setStats(s);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    intervalRef.current = setInterval(fetchStats, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchStats]);

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="font-display font-bold text-2xl text-primary">{t.overview.title}</h1>
        <span className="flex items-center gap-1.5 text-[10px] font-semibold text-primary/40 uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shrink-0" />
          {t.overview.live}
        </span>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-white border border-muted" />
          ))}
        </div>
      ) : workspaces.length === 0 ? (
        <div className="rounded-xl bg-white border border-muted p-10 text-center">
          <p className="text-primary/60 mb-5 text-sm">{t.overview.noWorkspaces}</p>
          <a
            href="/onboarding"
            className="rounded-lg bg-accent text-primary px-5 py-2.5 text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            {t.overview.createFirst}
          </a>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 mb-8">
            <MetricCard
              title={t.overview.totalRequests}
              value={(stats?.total_requests ?? 0).toLocaleString()}
            />
            <MetricCard
              title={t.overview.successRate}
              value={stats ? (stats.success_rate * 100).toFixed(1) : '—'}
              unit="%"
            />
            <MetricCard title={t.overview.avgLatency} value={stats?.avg_latency_ms ?? 0} unit="ms" />
            <MetricCard title={t.overview.workspaces} value={workspaces.length} />
          </div>

          {stats && stats.top_endpoints.length > 0 && (
            <div className="rounded-xl bg-white border border-muted shadow-sm">
              <div className="px-5 py-3.5 border-b border-muted flex items-center justify-between">
                <h2 className="text-sm font-semibold text-primary">{t.overview.topEndpoints}</h2>
                <span className="text-xs text-primary/30">{t.overview.updatesEvery5s}</span>
              </div>
              {stats.top_endpoints.map(({ endpoint, count }) => (
                <div
                  key={endpoint}
                  className="flex items-center gap-4 px-5 py-3 border-b border-muted last:border-none"
                >
                  <span className="text-sm font-mono text-primary flex-1 truncate">{endpoint}</span>
                  <span className="text-xs text-primary/40 shrink-0">
                    {count.toLocaleString()} req
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
