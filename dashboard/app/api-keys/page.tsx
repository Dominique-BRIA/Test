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
}

interface ApiKey {
  id: string;
  name: string;
  created_at: string;
  last_used_at?: string;
  revoked: boolean;
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-muted last:border-none animate-pulse">
      <div className="h-4 bg-muted rounded w-32" />
      <div className="h-3 bg-muted rounded w-24 ml-auto" />
      <div className="h-3 bg-muted rounded w-16" />
      <div className="h-4 bg-muted rounded w-12" />
    </div>
  );
}

export default function ApiKeysPage() {
  const router = useRouter();
  const { t } = useLang();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWs, setSelectedWs] = useState('');
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
      return;
    }
    const client = createSessionClient();
    client
      .get<Workspace[]>('/workspaces')
      .then((ws) => {
        setWorkspaces(ws);
        if (ws.length > 0) setSelectedWs(ws[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (!selectedWs) return;
    const client = createSessionClient();
    client
      .get<ApiKey[]>(`/workspaces/${selectedWs}/api-keys`)
      .then(setKeys)
      .catch(() => {});
  }, [selectedWs]);

  const handleCreate = async () => {
    if (!newKeyName.trim() || !selectedWs) return;
    setCreating(true);
    try {
      const client = createSessionClient();
      const result = await client.post<{ key: string }>(
        `/workspaces/${selectedWs}/api-keys`,
        { name: newKeyName },
      );
      setCreatedKey(result.key);
      setNewKeyName('');
      const updated = await client.get<ApiKey[]>(`/workspaces/${selectedWs}/api-keys`);
      setKeys(updated);
    } catch {}
    finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (keyId: string) => {
    const client = createSessionClient();
    await client.delete(`/workspaces/${selectedWs}/api-keys/${keyId}`);
    setKeys((prev) => prev.map((k) => (k.id === keyId ? { ...k, revoked: true } : k)));
  };

  const copyKey = async () => {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-bold text-2xl text-primary">{t.apiKeys.title}</h1>
        {workspaces.length > 1 && (
          <select
            value={selectedWs}
            onChange={(e) => setSelectedWs(e.target.value)}
            className="rounded-lg border border-muted px-3 py-1.5 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {createdKey && (
        <div className="mb-6 rounded-xl bg-primary p-5">
          <p className="text-xs font-medium text-white/50 mb-3 uppercase tracking-widest">
            {t.apiKeys.saveKey}
          </p>
          <div className="flex items-center gap-3">
            <code className="flex-1 rounded-lg bg-white/10 border border-white/10 px-4 py-2.5 text-xs font-mono text-accent break-all leading-relaxed">
              {createdKey}
            </code>
            <button
              onClick={copyKey}
              className="shrink-0 rounded-lg bg-accent text-primary px-4 py-2.5 text-sm font-semibold hover:bg-accent/90 transition-colors"
            >
              {copied ? t.apiKeys.copied : t.apiKeys.copy}
            </button>
          </div>
          <button
            onClick={() => setCreatedKey(null)}
            className="mt-3 text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            {t.apiKeys.dismiss}
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-muted shadow-sm">
        <div className="p-4 border-b border-muted flex items-center gap-3">
          <input
            type="text"
            placeholder={t.apiKeys.keyNamePlaceholder}
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleCreate()}
            className="flex-1 rounded-lg border border-muted px-3.5 py-2 text-sm text-primary placeholder:text-primary/30 focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <button
            onClick={() => void handleCreate()}
            disabled={!newKeyName.trim() || creating || !selectedWs}
            className="rounded-lg bg-accent text-primary px-4 py-2 text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-40 shrink-0"
          >
            {creating ? t.apiKeys.creating : t.apiKeys.addKey}
          </button>
        </div>

        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
        ) : keys.length === 0 ? (
          <p className="p-8 text-sm text-primary/40 text-center">
            {t.apiKeys.noKeys}
          </p>
        ) : (
          keys.map((key) => (
            <div
              key={key.id}
              className="flex items-center gap-4 p-4 border-b border-muted last:border-none"
            >
              <div className="flex-1 min-w-0">
                <span
                  className={`font-medium text-sm ${
                    key.revoked ? 'line-through text-primary/30' : 'text-primary'
                  }`}
                >
                  {key.name}
                </span>
                <p className="text-xs text-primary/40 mt-0.5">
                  {t.apiKeys.created} {new Date(key.created_at).toLocaleDateString()}
                  {key.last_used_at &&
                    ` ${t.apiKeys.lastUsed} ${new Date(key.last_used_at).toLocaleDateString()}`}
                </p>
              </div>
              {key.revoked ? (
                <span className="text-xs text-primary/30 font-medium">{t.apiKeys.revoked}</span>
              ) : (
                <button
                  onClick={() => void handleRevoke(key.id)}
                  className="text-xs text-primary/30 hover:text-primary/60 font-medium transition-colors"
                >
                  {t.apiKeys.revoke}
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <p className="text-xs text-primary/40 mt-4">
        {t.apiKeys.footer} <code className="font-mono bg-white px-1 py-0.5 rounded border border-muted">X-API-Key</code> {t.apiKeys.footerEnd}
      </p>
    </div>
  );
}
