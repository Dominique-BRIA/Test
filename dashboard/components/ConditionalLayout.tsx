'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import UserNav from './UserNav';
import { useLang, Lang } from '@/lib/i18n';
import { getToken } from '@/lib/auth';

const NO_SIDEBAR_PATHS = ['/', '/login'];

function NavItem({
  href,
  label,
  isActive,
  external,
  small,
  onClick,
}: {
  href: string;
  label: string;
  isActive: boolean;
  external?: boolean;
  small?: boolean;
  onClick?: () => void;
}) {
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      onClick={onClick}
      className={`relative flex items-center px-3 py-[7px] rounded-lg transition-colors ${
        small ? 'text-xs' : 'text-sm'
      } font-medium ${
        isActive
          ? 'bg-white/[0.09] text-white'
          : 'text-white/40 hover:text-white/75 hover:bg-white/[0.05]'
      }`}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-accent rounded-r-full" />
      )}
      {label}
    </a>
  );
}

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      {open ? (
        <>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </>
      ) : (
        <>
          <line x1="3" y1="7" x2="21" y2="7" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="17" x2="21" y2="17" />
        </>
      )}
    </svg>
  );
}

function Sidebar({
  navLinks,
  secondaryLinks,
  pathname,
  lang,
  setLang,
  onNavClick,
}: {
  navLinks: { href: string; label: string }[];
  secondaryLinks: { href: string; label: string; external?: boolean }[];
  pathname: string;
  lang: Lang;
  setLang: (l: Lang) => void;
  onNavClick?: () => void;
}) {
  return (
    <div className="flex flex-col h-full py-5 px-2.5">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 mb-7">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 font-black text-[10px] text-primary leading-none"
          style={{ background: '#FECC00' }}
        >
          YL
        </div>
        <span className="font-display font-bold text-sm tracking-tight text-white/90">
          YowLinker
        </span>
      </div>

      {/* Primary nav */}
      <nav className="flex flex-col gap-px">
        {navLinks.map((link) => (
          <NavItem
            key={link.href}
            href={link.href}
            label={link.label}
            isActive={pathname === link.href}
            onClick={onNavClick}
          />
        ))}
      </nav>

      {/* Secondary nav */}
      <div className="mt-5 pt-5 border-t border-white/[0.06] flex flex-col gap-px">
        {secondaryLinks.map((link) => (
          <NavItem
            key={link.href}
            href={link.href}
            label={link.label}
            isActive={pathname === link.href}
            external={link.external}
            small
            onClick={onNavClick}
          />
        ))}
      </div>

      {/* Language toggle */}
      <div className="mt-5 px-3 flex items-center gap-1">
        {(['en', 'fr'] as Lang[]).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`text-[11px] font-bold px-2.5 py-1 rounded-md transition-colors ${
              lang === l
                ? 'bg-white/10 text-white'
                : 'text-white/25 hover:text-white/55 hover:bg-white/[0.05]'
            }`}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      {/* User */}
      <div className="mt-auto pt-4 border-t border-white/[0.06]">
        <UserNav />
      </div>
    </div>
  );
}

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, t, setLang } = useLang();
  const [checked, setChecked] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isPublic = NO_SIDEBAR_PATHS.includes(pathname);

  useEffect(() => {
    if (isPublic) { setChecked(true); return; }
    if (!getToken()) { router.replace('/login'); } else { setChecked(true); }
  }, [isPublic, router]);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const navLinks = [
    { href: '/overview', label: t.nav.overview },
    { href: '/workspaces', label: t.nav.workspaces },
    { href: '/api-keys', label: t.nav.apiKeys },
    { href: '/logs', label: t.nav.activity },
  ];

  const secondaryLinks = [
    { href: '/onboarding', label: t.nav.getStarted },
    { href: '/examples', label: t.nav.examples },
    {
      href: `${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '')}/docs`,
      label: t.nav.apiDocs,
      external: true,
    },
  ];

  const sidebarProps = { navLinks, secondaryLinks, pathname, lang, setLang };

  if (isPublic) return <>{children}</>;
  if (!checked) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Desktop sidebar ────────────────────────────────────────── */}
      <aside
        className="hidden md:flex md:flex-col w-52 shrink-0 h-screen sticky top-0"
        style={{
          background: '#1E2D3B',
          borderRight: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <Sidebar {...sidebarProps} />
      </aside>

      {/* ── Mobile: backdrop + slide-in drawer ─────────────────────── */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          background: '#1E2D3B',
          borderRight: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <Sidebar {...sidebarProps} onNavClick={() => setSidebarOpen(false)} />
      </aside>

      {/* ── Main content area ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header
          className="md:hidden flex items-center gap-3 px-4 py-3 shrink-0"
          style={{
            background: '#1E2D3B',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-white/60 hover:text-white transition-colors p-1 -ml-1"
            aria-label="Open menu"
          >
            <HamburgerIcon open={false} />
          </button>
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded-md flex items-center justify-center font-black text-[9px] text-primary leading-none"
              style={{ background: '#FECC00' }}
            >
              YL
            </div>
            <span className="font-display font-bold text-sm tracking-tight text-white/90">
              YowLinker
            </span>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-[#F5F5F6]">{children}</main>
      </div>
    </div>
  );
}
