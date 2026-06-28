'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/auth';
import { createSessionClient } from '@/lib/session-client';
import MetricCard from '@/components/MetricCard';
import { useLang } from '@/lib/i18n';

interface WorkspaceStats {
  node_count: number;
  edge_count: number;
  prediction_jobs: number;
  request_count: number;
  avg_latency_ms: number;
}

interface WorkspaceRow {
  id: string;
  name: string;
  adapter_name: string;
  adapter_version?: string;
  created_at?: string;
}

export default function WorkspaceDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { t } = useLang();
  const [workspace, setWorkspace] = useState<WorkspaceRow | null>(null);
  const [stats, setStats] = useState<WorkspaceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    const client = createSessionClient();
    Promise.all([
      client.get<WorkspaceRow>(`/workspaces/${params.id}`),
      client.get<WorkspaceStats>(`/workspaces/${params.id}/stats`),
    ])
      .then(([ws, s]) => {
        setWorkspace(ws);
        setStats(s);
      })
      .catch((e: unknown) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="max-w-2xl">
        <div className="h-8 bg-white rounded-xl w-48 mb-6 animate-pulse" />
        <div className="grid grid-cols-2 gap-4 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-white h-28 border border-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <p className="text-primary/40 text-sm">{t.workspaceDetail.failedToLoad} {error}</p>;
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <button
          onClick={() => router.push('/workspaces')}
          className="text-xs text-primary/40 hover:text-primary/70 transition-colors mb-2 block"
        >
          {t.workspaceDetail.backLink}
        </button>
        <h1 className="font-display font-bold text-2xl text-primary">
          {workspace?.name ?? params.id.slice(0, 8) + '…'}
        </h1>
        {workspace && (
          <span className="text-xs font-mono text-primary/40 bg-muted px-2 py-0.5 rounded-md mt-1 inline-block">
            {workspace.adapter_name}
            {workspace.adapter_version ? ` v${workspace.adapter_version}` : ''}
          </span>
        )}
      </div>

      {stats && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <MetricCard title={t.workspaceDetail.nodes} value={stats.node_count.toLocaleString()} />
            <MetricCard title={t.workspaceDetail.edges} value={stats.edge_count.toLocaleString()} />
            <MetricCard title={t.workspaceDetail.predictionJobs} value={stats.prediction_jobs.toLocaleString()} />
            <MetricCard title={t.workspaceDetail.avgLatency} value={stats.avg_latency_ms} unit="ms" />
          </div>

          <div className="flex gap-3">
            <a
              href="/api-keys"
              className="rounded-xl bg-primary text-white px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              {t.workspaceDetail.manageKeys}
            </a>
            <a
              href="/logs"
              className="rounded-xl border border-muted bg-white text-primary px-4 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
            >
              {t.workspaceDetail.viewActivity}
            </a>
          </div>
        </>
      )}
    </div>
  );
}
