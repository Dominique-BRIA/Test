'use client';

import { useEffect, useState } from 'react';
import { getToken, clearToken } from '@/lib/auth';
import { useLang } from '@/lib/i18n';

export default function UserNav() {
  const { t } = useLang();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((body: { data?: { email?: string } }) => setEmail(body.data?.email ?? null))
      .catch(() => {});
  }, []);

  if (!email) {
    return (
      <a
        href="/login"
        className="mt-2 px-3 py-2 rounded-md text-xs text-white/50 hover:text-white hover:bg-white/10 transition-colors"
      >
        {t.user.signIn}
      </a>
    );
  }

  return (
    <div className="mt-2 border-t border-white/10 pt-4 flex flex-col gap-1">
      <span className="px-3 text-xs text-white/40 truncate" title={email}>
        {email}
      </span>
      <button
        onClick={async () => {
          const token = getToken();
          if (token) {
            await fetch('/api/auth/logout', {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            }).catch(() => {});
          }
          clearToken();
          window.location.href = '/login';
        }}
        className="px-3 py-1.5 rounded-md text-xs text-white/50 hover:text-white hover:bg-white/10 transition-colors text-left"
      >
        {t.user.signOut}
      </button>
    </div>
  );
}
