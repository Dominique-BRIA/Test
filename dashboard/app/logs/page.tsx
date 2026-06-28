'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/auth';
import { createSessionClient } from '@/lib/session-client';
import StatusBadge from '@/components/StatusBadge';
import { useLang } from '@/lib/i18n';

interface Workspace {
  id: string;
  name: string;
}

interface UsageLog {
  id: string;
  endpoint: string;
  method: string;
  status_code?: number;
  latency_ms?: number;
  created_at: string;
}

// Documented payload schemas per endpoint (actual bodies are not persisted)
const ENDPOINT_SCHEMAS: Record<string, { description: string; request: unknown; response: unknown }> = {
  '/graph/nodes': {
    description: 'Upsert a graph node',
    request: { id: '<uuid>', workspace_id: '<uuid>', type: 'PROPERTY | OWNER | TENANT', attributes: { title: '...', price: 0 } },
    response: { id: '<uuid>', type: 'PROPERTY', workspace_id: '<uuid>', attributes: {}, created_at: '<datetime>' },
  },
  '/graph/edges': {
    description: 'Create a relationship edge',
    request: { source: '<uuid>', target: '<uuid>', relation_type: 'OWNS | RENTED | VISITED', weight: 0.9 },
    response: { id: '<uuid>', source: '<uuid>', target: '<uuid>', relation_type: 'OWNS', weight: 0.9, created_at: '<datetime>' },
  },
  '/graph/query': {
    description: 'Traverse the graph from a root node',
    request: { rootNode: '<uuid>', depth: 2, relationTypes: ['OWNS', 'RENTED', 'VISITED'] },
    response: ['<uuid>', '<uuid>', '...'],
  },
  '/features/compute': {
    description: 'Run a single feature provider',
    request: { provider: 'price_match', source: '<uuid>', target: '<uuid>', context: {} },
    response: { score: 0.87, details: {} },
  },
  '/features/composite': {
    description: 'Compute multi-provider composite score',
    request: { providers: ['price_match', 'location_affinity'], source: '<uuid>', target: '<uuid>' },
    response: { features: { price_match: 0.82, location_affinity: 0.91 } },
  },
  '/features/providers': {
    description: 'Register a custom feature provider',
    request: { name: 'my_provider', category: 'similarity', callback_url: 'https://...' },
    response: { id: '<uuid>', name: 'my_provider', category: 'similarity', callback_url: '...' },
  },
  '/prediction/link': {
    description: 'Predict probability of a directed link',
    request: { source: '<uuid>', target: '<uuid>', relation_type: 'RENTED' },
    response: { probability: 0.73, confidence: 'high' },
  },
  '/prediction/explain': {
    description: 'Explain a predicted link',
    request: { source: '<uuid>', target: '<uuid>' },
    response: { explanation: 'Nodes share 3 common neighbors...', top_features: [] },
  },
  '/prediction/rank': {
    description: 'Rank candidate nodes for a source',
    request: { source: '<uuid>', candidates: ['<uuid>', '<uuid>'], relation_type: 'RENTED' },
    response: [{ target: '<uuid>', score: 0.91 }, { target: '<uuid>', score: 0.78 }],
  },
  '/ranking/top-k': {
    description: 'Top-K recommendations for a node',
    request: { source: '<uuid>', k: 5, relation_type: 'RENTED', strategy: 'promising_node' },
    response: [{ id: '<uuid>', score: 0.91, rank: 1 }],
  },
  '/usage/logs': {
    description: 'Query recent usage logs',
    request: { workspace_id: '<uuid>', limit: 100 },
    response: [{ endpoint: '/features/composite', method: 'POST', status_code: 200, latency_ms: 42 }],
  },
  '/usage/stats': {
    description: 'Aggregate usage statistics',
    request: { workspace_id: '<uuid>' },
    response: { total_requests: 500, success_rate: 0.98, avg_latency_ms: 37, top_endpoints: [] },
  },
  '/workspaces': {
    description: 'Create or list workspaces',
    request: { name: 'my-workspace', adapter_name: 'neo4j' },
    response: { id: '<uuid>', name: 'my-workspace', adapter_name: 'neo4j', api_key: '...' },
  },
};

function getEndpointSchema(endpoint: string) {
  for (const [pattern, schema] of Object.entries(ENDPOINT_SCHEMAS)) {
    if (endpoint.includes(pattern)) return schema;
  }
  return null;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return new Date(dateStr).toLocaleTimeString();
}

function MethodBadge({ method }: { method: string }) {
  const styles: Record<string, string> = {
    GET:    'text-primary/60 bg-primary/5',
    POST:   'text-accent bg-accent/10',
    PUT:    'text-primary/50 bg-primary/5',
    PATCH:  'text-primary/50 bg-primary/5',
    DELETE: 'text-primary/30 bg-primary/5',
  };
  return (
    <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${styles[method] ?? 'text-primary/40 bg-primary/5'}`}>
      {method}
    </span>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-muted last:border-none animate-pulse">
      <div className="h-3 bg-muted rounded flex-1" />
      <div className="h-3 bg-muted rounded w-10 shrink-0 hidden sm:block" />
      <div className="h-3 bg-muted rounded w-12 shrink-0" />
      <div className="h-3 bg-muted rounded w-10 shrink-0 hidden sm:block" />
      <div className="h-3 bg-muted rounded w-14 shrink-0" />
    </div>
  );
}

function LogRow({ log, isNew, tLogs }: { log: UsageLog; isNew: boolean; tLogs: { reqLabel: string; resLabel: string; schemaNote: string; noSchema: string } }) {
  const [expanded, setExpanded] = useState(false);
  const schema = getEndpointSchema(log.endpoint);

  return (
    <>
      <div
        onClick={() => setExpanded(e => !e)}
        className={[
          'flex items-center gap-3 px-4 py-3 border-b border-muted cursor-pointer transition-colors select-none',
          isNew ? 'bg-accent/[0.06]' : expanded ? 'bg-muted/20' : 'hover:bg-muted/30',
        ].join(' ')}
      >
        <span className="text-sm font-mono text-primary truncate flex items-center gap-2 flex-1 min-w-0" title={log.endpoint}>
          {isNew && (
            <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 animate-pulse" />
          )}
          <span className="truncate">{log.endpoint}</span>
        </span>
        <span className="shrink-0 hidden sm:block">
          <MethodBadge method={log.method} />
        </span>
        <span className="shrink-0">
          {log.status_code ? (
            <StatusBadge code={log.status_code} />
          ) : (
            <span className="text-xs text-primary/30">—</span>
          )}
        </span>
        <span className={`text-xs shrink-0 font-mono hidden sm:block ${
          log.latency_ms != null && log.latency_ms > 300 ? 'text-primary/40' : 'text-primary/60'
        }`}>
          {log.latency_ms != null ? `${log.latency_ms}ms` : '—'}
        </span>
        <span
          className="text-xs text-primary/40 shrink-0"
          title={new Date(log.created_at).toISOString()}
        >
          {timeAgo(log.created_at)}
        </span>
      </div>

      {expanded && (
        <div className="border-b border-muted bg-muted/[0.04] px-6 py-5">
          {schema ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <p className="text-[10px] font-semibold text-primary/40 uppercase tracking-wider mb-2">
                  {log.method} {log.endpoint} — {tLogs.reqLabel}
                </p>
                <pre className="text-xs font-mono text-primary/70 bg-white border border-muted rounded-lg p-3 overflow-auto max-h-48">
                  {JSON.stringify(schema.request, null, 2)}
                </pre>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-primary/40 uppercase tracking-wider mb-2">
                  {tLogs.resLabel} — {log.status_code ?? '—'}
                </p>
                <pre className="text-xs font-mono text-primary/70 bg-white border border-muted rounded-lg p-3 overflow-auto max-h-48">
                  {JSON.stringify(schema.response, null, 2)}
                </pre>
              </div>
              <p className="col-span-2 text-xs text-primary/30 italic">
                {schema.description} · {tLogs.schemaNote}
              </p>
            </div>
          ) : (
            <p className="text-xs text-primary/40 italic">
              {tLogs.noSchema}
            </p>
          )}
        </div>
      )}
    </>
  );
}

export default function LogsPage() {
  const router = useRouter();
  const { t } = useLang();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWs, setSelectedWs] = useState('');
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const clientRef = useRef<ReturnType<typeof createSessionClient> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const knownIdsRef = useRef<Set<string>>(new Set());

  const fetchLogs = useCallback(async (wsId: string, initial = false) => {
    if (!clientRef.current || !wsId) return;
    try {
      const data = await clientRef.current.get<UsageLog[]>(`/usage/logs?workspace_id=${wsId}&limit=100`);
      const fresh = new Set<string>();
      for (const log of data) {
        if (!knownIdsRef.current.has(log.id)) fresh.add(log.id);
      }
      knownIdsRef.current = new Set(data.map(l => l.id));
      setLogs(data);
      if (!initial && fresh.size > 0) {
        setNewIds(fresh);
        setTimeout(() => setNewIds(new Set()), 3500);
      }
    } catch (_) {}
    if (initial) setLoading(false);
  }, []);

  useEffect(() => {
    if (!getToken()) { router.push('/login'); return; }
    clientRef.current = createSessionClient();
    clientRef.current
      .get<Workspace[]>('/workspaces')
      .then((ws) => {
        setWorkspaces(ws);
        if (ws.length > 0) setSelectedWs(ws[0].id);
        else setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (!selectedWs) return;
    setLoading(true);
    knownIdsRef.current = new Set();
    setNewIds(new Set());
    fetchLogs(selectedWs, true);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => fetchLogs(selectedWs), 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [selectedWs, fetchLogs]);

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="font-display font-bold text-2xl text-primary">{t.logs.title}</h1>
          <span className="flex items-center gap-1.5 text-[10px] font-semibold text-primary/40 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shrink-0" />
            {t.logs.live}
          </span>
        </div>
        {workspaces.length > 0 && (
          <select
            value={selectedWs}
            onChange={(e) => setSelectedWs(e.target.value)}
            className="rounded-lg border border-muted px-3 py-1.5 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>{ws.name}</option>
            ))}
          </select>
        )}
      </div>

      {!loading && logs.length > 0 && (
        <p className="text-xs text-primary/30 mb-3">
          {t.logs.entries(logs.length)}
        </p>
      )}

      <div className="bg-white rounded-xl border border-muted shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-muted bg-muted/50">
          {t.logs.cols.map((h, i) => (
            <span
              key={h}
              className={`text-xs font-medium text-primary/50 uppercase tracking-wide shrink-0 ${
                i === 0 ? 'flex-1 min-w-0' : i === 1 || i === 3 ? 'hidden sm:block' : ''
              }`}
            >
              {h}
            </span>
          ))}
        </div>

        {loading ? (
          Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
        ) : logs.length === 0 ? (
          <p className="p-10 text-sm text-primary/40 text-center">
            {t.logs.noRequests}
          </p>
        ) : (
          logs.map((log) => (
            <LogRow key={log.id} log={log} isNew={newIds.has(log.id)} tLogs={t.logs} />
          ))
        )}
      </div>
    </div>
  );
}
