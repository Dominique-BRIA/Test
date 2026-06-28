'use client';

import { useState, useEffect, useRef } from 'react';
import { getToken } from '@/lib/auth';
import { useLang, Lang } from '@/lib/i18n';

// ── Watts-Strogatz generator ──────────────────────────────────────────────────

interface WsNode { id: number; x: number; y: number }
interface WsEdge { s: number; t: number; rewired: boolean }

function buildWS(n: number, k: number, p: number): { nodes: WsNode[]; edges: WsEdge[]; rewiredCount: number } {
  const R = 115, cx = 155, cy = 155;
  const nodes: WsNode[] = Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * i) / n - Math.PI / 2;
    return { id: i, x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
  });
  const existing = new Set<string>();
  const lattice: WsEdge[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = 1; j <= Math.floor(k / 2); j++) {
      const t = (i + j) % n;
      const key = `${Math.min(i, t)}-${Math.max(i, t)}`;
      if (!existing.has(key)) { existing.add(key); lattice.push({ s: i, t, rewired: false }); }
    }
  }
  let rewiredCount = 0;
  const edges = lattice.map(e => {
    if (Math.random() >= p) return e;
    const oldKey = `${Math.min(e.s, e.t)}-${Math.max(e.s, e.t)}`;
    for (let a = 0; a < 30; a++) {
      const newT = Math.floor(Math.random() * n);
      const newKey = `${Math.min(e.s, newT)}-${Math.max(e.s, newT)}`;
      if (newT !== e.s && !existing.has(newKey)) {
        existing.delete(oldKey); existing.add(newKey); rewiredCount++;
        return { s: e.s, t: newT, rewired: true };
      }
    }
    return e;
  });
  return { nodes, edges, rewiredCount };
}

// ── Intersection visibility hook ──────────────────────────────────────────────

function useVisible(ref: React.RefObject<HTMLElement | null>, threshold = 0.15) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return visible;
}

// ── Domain data ───────────────────────────────────────────────────────────────

const DOMAINS = {
  education: {
    label: 'Education',
    desc: 'Connect students to courses, skills, and mentors. YowLinker models academic profiles, enrollment history, and skill mastery as a rich directed graph.',
    nodeTypes: ['Student', 'Course', 'Skill', 'Instructor'],
    edgeTypes: ['enrolled_in', 'MASTERED', 'mentors', 'teaches'],
    exampleSource: 'Student: Alice', exampleTarget: 'Course: ML-301',
    exampleRelation: 'enrolled_in', exampleScore: 0.91,
    graphNodes: [
      { id: 0, label: 'Alice', type: 'Student', x: 60, y: 105, c: '#FECC00' },
      { id: 1, label: 'ML-301', type: 'Course', x: 200, y: 45, c: '#22313F' },
      { id: 2, label: 'Python', type: 'Skill', x: 212, y: 148, c: '#22313F' },
      { id: 3, label: 'Prof. Chen', type: 'Instructor', x: 60, y: 190, c: '#22313F' },
    ],
    graphEdges: [
      { s: 0, t: 1, label: 'enrolled_in', c: '#FECC00' },
      { s: 0, t: 2, label: 'MASTERED', c: 'rgba(34,49,63,.18)' },
      { s: 3, t: 1, label: 'teaches', c: 'rgba(34,49,63,.18)' },
    ],
  },
  renting: {
    label: 'Renting',
    desc: 'Match tenants to properties using location proximity, budget fit, availability windows, and aggregated trust signals from review history.',
    nodeTypes: ['Tenant', 'Property', 'Owner', 'Location'],
    edgeTypes: ['VISITED', 'RENTED', 'REJECTED', 'OWNS'],
    exampleSource: 'Tenant: Marc', exampleTarget: 'Villa Beau Rivage',
    exampleRelation: 'RENTED', exampleScore: 0.87,
    graphNodes: [
      { id: 0, label: 'Marc', type: 'Tenant', x: 60, y: 105, c: '#FECC00' },
      { id: 1, label: 'Villa Beau', type: 'Property', x: 200, y: 45, c: '#22313F' },
      { id: 2, label: 'Marie', type: 'Owner', x: 212, y: 148, c: '#22313F' },
      { id: 3, label: 'Lyon', type: 'Location', x: 60, y: 190, c: '#22313F' },
    ],
    graphEdges: [
      { s: 0, t: 1, label: 'VISITED', c: '#FECC00' },
      { s: 2, t: 1, label: 'OWNS', c: 'rgba(34,49,63,.18)' },
      { s: 1, t: 3, label: 'located_in', c: 'rgba(34,49,63,.18)' },
    ],
  },
  bookstore: {
    label: 'BookStore',
    desc: 'Recommend books by modelling readers, authors, genres, and purchase history. Cross-pollinate recommendations across reader communities.',
    nodeTypes: ['Reader', 'Book', 'Author', 'Genre'],
    edgeTypes: ['PURCHASED', 'REVIEWED', 'WROTE', 'belongs_to'],
    exampleSource: 'Reader: Emma', exampleTarget: 'Book: Sapiens',
    exampleRelation: 'PURCHASED', exampleScore: 0.94,
    graphNodes: [
      { id: 0, label: 'Emma', type: 'Reader', x: 60, y: 105, c: '#FECC00' },
      { id: 1, label: 'Sapiens', type: 'Book', x: 200, y: 45, c: '#22313F' },
      { id: 2, label: 'Harari', type: 'Author', x: 212, y: 148, c: '#22313F' },
      { id: 3, label: 'History', type: 'Genre', x: 60, y: 190, c: '#22313F' },
    ],
    graphEdges: [
      { s: 0, t: 1, label: 'PURCHASED', c: '#FECC00' },
      { s: 2, t: 1, label: 'WROTE', c: 'rgba(34,49,63,.18)' },
      { s: 1, t: 3, label: 'belongs_to', c: 'rgba(34,49,63,.18)' },
    ],
  },
  manufacturing: {
    label: 'Manufacturing',
    desc: 'Optimise production by linking components, machines, operators, and quality checkpoints. Predict the next optimal machine for each part.',
    nodeTypes: ['Component', 'Machine', 'Operator', 'Process'],
    edgeTypes: ['PROCESSED_BY', 'OPERATES', 'REQUIRES', 'PRODUCES'],
    exampleSource: 'Part: Shaft-A', exampleTarget: 'Machine: Lathe-7',
    exampleRelation: 'PROCESSED_BY', exampleScore: 0.78,
    graphNodes: [
      { id: 0, label: 'Shaft-A', type: 'Component', x: 60, y: 105, c: '#FECC00' },
      { id: 1, label: 'Lathe-7', type: 'Machine', x: 200, y: 45, c: '#22313F' },
      { id: 2, label: 'Karim', type: 'Operator', x: 212, y: 148, c: '#22313F' },
      { id: 3, label: 'Turning', type: 'Process', x: 60, y: 190, c: '#22313F' },
    ],
    graphEdges: [
      { s: 0, t: 1, label: 'PROCESSED_BY', c: '#FECC00' },
      { s: 2, t: 1, label: 'OPERATES', c: 'rgba(34,49,63,.18)' },
      { s: 1, t: 3, label: 'RUNS', c: 'rgba(34,49,63,.18)' },
    ],
  },
} as const;

type DomainKey = keyof typeof DOMAINS;

// ── Ranking demo data ─────────────────────────────────────────────────────────

const RANKING_DATA = {
  education: {
    label: 'Student: Alice', relation: 'enrolled_in', strategy: 'promising_node',
    results: [
      { id: 'ml-301', label: 'Machine Learning 301', type: 'Course', score: 0.95, why: { community_overlap: 0.89, feature_score: 0.94, pagerank: 0.71 } },
      { id: 'stats-202', label: 'Statistics 202', type: 'Course', score: 0.88, why: { community_overlap: 0.82, feature_score: 0.87, pagerank: 0.64 } },
      { id: 'python-adv', label: 'Advanced Python', type: 'Skill', score: 0.81, why: { community_overlap: 0.75, feature_score: 0.80, pagerank: 0.58 } },
      { id: 'prof-chen', label: 'Prof. Chen', type: 'Instructor', score: 0.74, why: { community_overlap: 0.68, feature_score: 0.73, pagerank: 0.52 } },
      { id: 'dl-workshop', label: 'DL Workshop', type: 'Course', score: 0.66, why: { community_overlap: 0.60, feature_score: 0.65, pagerank: 0.44 } },
    ],
  },
  renting: {
    label: 'Tenant: Marc', relation: 'RENTED', strategy: 'promising_node',
    results: [
      { id: 'villa-azure', label: 'Villa Azure', type: 'Property', score: 0.93, why: { location_score: 0.95, trust_score: 0.88, availability_score: 1.0 } },
      { id: 'appart-19', label: 'Appartement 19', type: 'Property', score: 0.84, why: { location_score: 0.79, trust_score: 0.92, availability_score: 0.82 } },
      { id: 'loft-cv', label: 'Loft Centre-Ville', type: 'Property', score: 0.77, why: { location_score: 0.70, trust_score: 0.85, availability_score: 0.79 } },
      { id: 'chambre-eco', label: 'Chambre Economique', type: 'Property', score: 0.69, why: { location_score: 0.65, trust_score: 0.74, availability_score: 0.71 } },
      { id: 'studio-gare', label: 'Studio Gare', type: 'Property', score: 0.58, why: { location_score: 0.53, trust_score: 0.62, availability_score: 0.68 } },
    ],
  },
} as const;

type RankingKey = keyof typeof RANKING_DATA;

// ── API Console tabs ──────────────────────────────────────────────────────────

const API_TABS = [
  {
    label: '/ranking/top-k', method: 'POST',
    desc: 'Two-stage pipeline: candidate generation from graph structure, then multi-provider scoring. Returns ranked candidates with final scores.',
    req: `{
  "source":   "student-alice",
  "relation": "enrolled_in",
  "k":        5,
  "strategy": "promising_node"
}`,
    res: `{
  "data": {
    "results": [
      { "id": "ml-course-301", "score": 0.95, "rank": 1 },
      { "id": "stats-202",     "score": 0.88, "rank": 2 },
      { "id": "python-adv",    "score": 0.81, "rank": 3 }
    ]
  }
}`,
  },
  {
    label: '/prediction/link', method: 'POST',
    desc: 'Predict link probability for one (source, target) pair. Runs all registered providers, aggregates their scores, returns a value in [0, 1].',
    req: `{
  "source":        "student-alice",
  "target":        "ml-course-301",
  "relation_type": "enrolled_in"
}`,
    res: `{
  "data": {
    "score": 0.843
  }
}`,
  },
  {
    label: '/prediction/explain', method: 'POST',
    desc: 'Returns the top contributing features by marginal importance. Use to surface "why was X recommended?" explanations in your product UI.',
    req: `{
  "source": "student-alice",
  "target": "ml-course-301"
}`,
    res: `{
  "data": {
    "top_features": [
      "skill_overlap",
      "community_overlap",
      "level_match"
    ]
  }
}`,
  },
  {
    label: '/features/composite', method: 'POST',
    desc: 'Runs multiple providers in parallel and merges results into one feature vector. Cached in Redis for 5 minutes per (workspace, source, target).',
    req: `{
  "providers": [
    "community_overlap",
    "feature_score",
    "location_score"
  ],
  "source": "tenant-marc",
  "target": "villa-azure"
}`,
    res: `{
  "data": {
    "features": {
      "community_overlap": 0.72,
      "feature_score":     0.88,
      "location_score":    0.95
    }
  }
}`,
  },
  {
    label: '/graph/query', method: 'POST',
    desc: 'BFS traversal in Neo4j up to a specified depth. Filter by relation type and node type. Returns UUIDs of all reachable nodes.',
    req: `{
  "rootNode":      "student-alice",
  "depth":         2,
  "relationTypes": ["enrolled_in", "MASTERED"],
  "nodeTypes":     ["course"]
}`,
    res: `{
  "data": [
    "ml-course-301",
    "stats-202",
    "data-viz-101"
  ]
}`,
  },
  {
    label: '/usage/stats', method: 'GET',
    desc: 'Aggregated workspace metrics: total requests, average latency, and per-endpoint breakdowns. Polled every 5s by the live dashboard.',
    req: `— no body (GET request) —
?workspace_id=c0473e6e-a61e-...`,
    res: `{
  "data": {
    "request_count":  14200,
    "avg_latency_ms": 38,
    "by_endpoint": {
      "POST /ranking/top-k":   { "count": 8100, "avg_latency_ms": 41 },
      "POST /prediction/link": { "count": 3400, "avg_latency_ms": 29 },
      "POST /graph/nodes":     { "count": 2700, "avg_latency_ms": 18 }
    }
  }
}`,
  },
];

// ── Services for status section ───────────────────────────────────────────────


// ═══════════════════════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════════════════════

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!getToken());
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <>
      <style>{`
        html { scroll-behavior: smooth; }
        @keyframes floatA {
          0%,100%{transform:translateY(0);}
          50%{transform:translateY(-14px);}
        }
        @keyframes floatB {
          0%,100%{transform:translateY(0);}
          50%{transform:translateY(-8px);}
        }
        @keyframes fadeSlideUp {
          from{opacity:0;transform:translateY(18px);}
          to{opacity:1;transform:translateY(0);}
        }
        @keyframes growBar {
          from{width:0%;}
          to{width:var(--bar-w);}
        }
        @keyframes pulseRing {
          0%{transform:scale(1);opacity:.8;}
          100%{transform:scale(2.2);opacity:0;}
        }
        .float-a{animation:floatA 4s ease-in-out infinite;}
        .float-b{animation:floatB 5.5s ease-in-out infinite;}
        .fade-up{animation:fadeSlideUp .5s ease forwards;}
        .bar-grow{animation:growBar .95s cubic-bezier(.4,0,.2,1) forwards;}
        .pulse-ring{animation:pulseRing 2s ease-out infinite;}
      `}</style>
      <div style={{ background: '#fff', color: '#22313F', overflowX: 'hidden' }}>
        <Navbar isLoggedIn={isLoggedIn} scrolled={scrolled} />
        <Hero isLoggedIn={isLoggedIn} />
        <TrustMetrics />
        <GraphSandbox />
        <DomainShowcase />
        <RankingPreview />
        <ApiConsole />
        <SystemStatus />
        <CallToAction isLoggedIn={isLoggedIn} />
        <PageFooter />
      </div>
    </>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar({ isLoggedIn, scrolled }: { isLoggedIn: boolean; scrolled: boolean }) {
  const [open, setOpen] = useState(false);
  const { lang, t, setLang } = useLang();
  const hn = t.home.nav;
  const tc = scrolled ? '#22313F' : '#fff';
  const mc = scrolled ? 'rgba(34,49,63,.5)' : 'rgba(255,255,255,.5)';
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');

  const desktopLinks = [
    { href: '#sandbox', label: hn.algorithm },
    { href: '#domains', label: hn.useCases },
    { href: '#ranking', label: hn.ranking },
    { href: '#api', label: hn.api },
    { href: '/examples', label: t.nav.examples },
    { href: `${apiUrl}/docs`, label: t.nav.apiDocs, ext: true },
  ];

  const mobileLinks = [
    ...desktopLinks.slice(0, 4),
    { href: '/examples', label: t.nav.examples },
    { href: `${apiUrl}/docs`, label: t.nav.apiDocs, ext: true },
  ];

  const LangToggle = ({ dark }: { dark?: boolean }) => (
    <div className="flex items-center gap-px">
      {(['en', 'fr'] as Lang[]).map(l => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className="text-[11px] font-bold px-2 py-1 rounded-md transition-colors"
          style={{
            background: lang === l ? (dark ? 'rgba(34,49,63,.12)' : 'rgba(255,255,255,.15)') : 'transparent',
            color: lang === l ? (dark ? '#22313F' : '#fff') : (dark ? 'rgba(34,49,63,.35)' : 'rgba(255,255,255,.35)'),
          }}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );

  return (
    <header
      className="fixed top-0 inset-x-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? 'rgba(255,255,255,.97)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: `1px solid ${scrolled ? '#E8EAED' : 'transparent'}`,
      }}
    >
      <div className="max-w-6xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-black" style={{ background: '#FECC00', color: '#22313F' }}>
            YL
          </div>
          <span className="font-bold text-[15px] tracking-tight transition-colors duration-300" style={{ color: tc }}>
            YowLinker
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-0.5 flex-1 justify-center">
          {desktopLinks.map(l => (
            <a
              key={l.href}
              href={l.href}
              target={l.ext ? '_blank' : undefined}
              rel={l.ext ? 'noopener noreferrer' : undefined}
              className="px-3.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 hover:opacity-100"
              style={{ color: mc }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.color = tc;
                (e.currentTarget as HTMLElement).style.background = scrolled ? '#F5F5F6' : 'rgba(255,255,255,.08)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.color = mc;
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* Auth + lang toggle */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <LangToggle dark={scrolled} />
          {isLoggedIn ? (
            <a href="/overview" className="px-4 py-2 rounded-lg text-[13px] font-semibold hover:opacity-90 transition-opacity" style={{ background: '#FECC00', color: '#22313F' }}>
              {hn.dashboard}
            </a>
          ) : (
            <>
              <a
                href="/login"
                className="px-3.5 py-2 rounded-lg text-[13px] font-medium transition-all"
                style={{ color: mc }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = tc)}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = mc)}
              >
                {hn.signIn}
              </a>
              <a href="/login" className="px-4 py-2 rounded-lg text-[13px] font-semibold hover:opacity-90 transition-opacity" style={{ background: '#FECC00', color: '#22313F' }}>
                {hn.getStarted}
              </a>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(p => !p)}
          className="md:hidden flex flex-col items-center justify-center w-9 h-9 gap-[5px]"
          aria-label="Toggle navigation"
        >
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-5 rounded-full transition-all duration-300"
              style={{
                height: '1.5px',
                background: tc,
                opacity: open && i === 1 ? 0 : 1,
                transform: open && i === 0 ? 'rotate(45deg) translateY(6.5px)' : open && i === 2 ? 'rotate(-45deg) translateY(-6.5px)' : 'none',
              }}
            />
          ))}
        </button>
      </div>

      {/* Mobile menu */}
      <div
        className="md:hidden overflow-hidden transition-all duration-300"
        style={{ maxHeight: open ? '520px' : '0', background: '#fff', borderBottom: open ? '1px solid #E8EAED' : 'none' }}
      >
        <div className="px-5 py-4 flex flex-col gap-1">
          {mobileLinks.map(l => (
            <a
              key={l.href}
              href={l.href}
              target={l.ext ? '_blank' : undefined}
              rel={l.ext ? 'noopener noreferrer' : undefined}
              onClick={() => !l.ext && setOpen(false)}
              className="px-3 py-2.5 rounded-lg text-sm font-medium"
              style={{ color: 'rgba(34,49,63,.6)' }}
            >
              {l.label}
            </a>
          ))}
          <div className="border-t border-[#F0F0F0] mt-2 pt-3 flex flex-col gap-2">
            {isLoggedIn ? (
              <a href="/overview" className="px-3 py-2.5 rounded-lg text-sm font-semibold text-center" style={{ background: '#FECC00', color: '#22313F' }}>
                {hn.dashboard}
              </a>
            ) : (
              <>
                <a href="/login" className="px-3 py-2.5 rounded-lg text-sm font-medium text-center" style={{ color: 'rgba(34,49,63,.7)' }}>{hn.signIn}</a>
                <a href="/login" className="px-3 py-2.5 rounded-lg text-sm font-semibold text-center" style={{ background: '#FECC00', color: '#22313F' }}>{hn.getStarted}</a>
              </>
            )}
            <div className="flex justify-center pt-1">
              <LangToggle dark />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

const HERO_NODES = [
  { x: 8, y: 18, r: 3, d: '0s', cls: 'float-a' },
  { x: 22, y: 8, r: 4, d: '.9s', cls: 'float-b' },
  { x: 38, y: 22, r: 2.5, d: '1.8s', cls: 'float-a' },
  { x: 55, y: 10, r: 4.5, d: '.4s', cls: 'float-b' },
  { x: 68, y: 25, r: 3, d: '2.2s', cls: 'float-a' },
  { x: 82, y: 12, r: 3.5, d: '1.1s', cls: 'float-b' },
  { x: 94, y: 22, r: 2.5, d: '.6s', cls: 'float-a' },
  { x: 14, y: 48, r: 4, d: '1.5s', cls: 'float-b' },
  { x: 30, y: 56, r: 3, d: '.2s', cls: 'float-a' },
  { x: 48, y: 44, r: 5, d: '2.0s', cls: 'float-b' },
  { x: 62, y: 58, r: 3, d: '1.3s', cls: 'float-a' },
  { x: 76, y: 45, r: 4, d: '.7s', cls: 'float-b' },
  { x: 90, y: 55, r: 3, d: '1.9s', cls: 'float-a' },
  { x: 6, y: 75, r: 3.5, d: '.3s', cls: 'float-b' },
  { x: 22, y: 82, r: 3, d: '1.7s', cls: 'float-a' },
  { x: 42, y: 78, r: 4.5, d: '.8s', cls: 'float-b' },
  { x: 58, y: 86, r: 3, d: '2.4s', cls: 'float-a' },
  { x: 74, y: 76, r: 4, d: '1.2s', cls: 'float-b' },
  { x: 88, y: 84, r: 3, d: '.5s', cls: 'float-a' },
];

const HERO_EDGES: [number, number][] = [
  [0,1],[1,2],[2,3],[3,4],[4,5],[5,6],
  [0,7],[7,8],[8,9],[9,10],[10,11],[11,12],
  [7,13],[13,14],[14,15],[15,16],[16,17],[17,18],
  [1,8],[3,9],[5,11],[4,10],[2,9],[6,12],
  [8,14],[10,16],[9,15],[12,18],
];

function Hero({ isLoggedIn }: { isLoggedIn: boolean }) {
  const { t } = useLang();
  const h = t.home.hero;
  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: '#22313F' }}
    >
      {/* Floating graph background */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        style={{ opacity: 0.13 }}
      >
        {HERO_EDGES.map(([s, t], i) => (
          <line
            key={i}
            x1={HERO_NODES[s].x} y1={HERO_NODES[s].y}
            x2={HERO_NODES[t].x} y2={HERO_NODES[t].y}
            stroke="#FECC00" strokeWidth="0.25" opacity="0.6"
          />
        ))}
        {HERO_NODES.map((n, i) => (
          <circle
            key={i}
            cx={n.x} cy={n.y} r={n.r * 0.4}
            fill="#FECC00"
            className={n.cls}
            style={{ animationDelay: n.d, animationDuration: n.cls === 'float-a' ? '4s' : '5.5s' }}
          />
        ))}
      </svg>

      {/* Radial gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(34,49,63,.15) 0%, rgba(34,49,63,.7) 60%, rgba(34,49,63,.95) 100%)' }}
      />

      {/* Content */}
      <div className="relative z-10 text-center px-5 max-w-4xl mx-auto pt-20">
       

        {/* Heading */}
        <h1 className="text-4xl sm:text-5xl md:text-[62px] font-bold leading-[1.08] tracking-tight text-white mb-6">
          {h.headline[0]}<br />{h.headline[1]}{' '}
          <span style={{ color: '#FECC00' }}>{h.highlight}</span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg leading-relaxed mb-10 mx-auto max-w-2xl" style={{ color: 'rgba(255,255,255,.5)' }}>
          {h.subtitle}
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
          <a
            href={isLoggedIn ? '/overview' : '/login'}
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl text-[14px] font-semibold transition-all hover:scale-[1.02] active:scale-[.98]"
            style={{ background: '#FECC00', color: '#22313F' }}
          >
            {isLoggedIn ? t.home.nav.dashboard : h.ctaPrimary}
          </a>
          <a
            href="#sandbox"
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl text-[14px] font-medium transition-all hover:border-white/20"
            style={{ background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.7)', border: '1px solid rgba(255,255,255,.1)' }}
          >
            {h.ctaSecondary}
          </a>
        </div>

        {/* Code preview card */}
        <div
          className="rounded-2xl overflow-hidden text-left mx-auto max-w-2xl"
          style={{ background: 'rgba(0,0,0,.4)', border: '1px solid rgba(255,255,255,.08)' }}
        >
          {/* Title bar */}
          <div className="flex items-center gap-3 px-4 py-3" style={{ background: 'rgba(0,0,0,.25)', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(239,68,68,.5)' }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(234,179,8,.5)' }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(34,197,94,.5)' }} />
            </div>
            <div className="flex items-center gap-2 ml-1">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded" style={{ background: 'rgba(254,204,0,.15)', color: '#FECC00' }}>POST</span>
              <span className="text-[11px] font-mono" style={{ color: 'rgba(255,255,255,.3)' }}>/ranking/top-k</span>
            </div>
          </div>
          {/* Request */}
          <div className="grid grid-cols-1 sm:grid-cols-2">
            <div className="px-5 py-4" style={{ borderRight: '1px solid rgba(255,255,255,.05)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,.2)' }}>{h.reqLabel}</p>
              <pre className="text-[12px] font-mono leading-relaxed" style={{ color: 'rgba(255,255,255,.55)' }}>{`{
  "source":   "student-alice",
  "relation": "enrolled_in",
  "k":        5,
  "strategy": "promising_node"
}`}</pre>
            </div>
            <div className="px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,.2)' }}>{h.resLabel}</p>
              <pre className="text-[12px] font-mono leading-relaxed" style={{ color: '#FECC00' }}>{`{
  "data": {
    "results": [
      { "id": "ml-301",  "score": 0.95 },
      { "id": "stats-202","score": 0.88 },
      { "id": "python",   "score": 0.81 }
    ]
  }
}`}</pre>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5" style={{ opacity: 0.35 }}>
        <span className="text-[10px] text-white font-medium tracking-[.15em] uppercase">{h.scroll}</span>
        <div className="w-px h-7" style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,.5), transparent)' }} />
      </div>
    </section>
  );
}

// ─── Trust metrics ────────────────────────────────────────────────────────────

function TrustMetrics() {
  const { t } = useLang();
  const m = t.home.metrics;
  const metrics = [
    { value: '38ms', label: m.avgLatency },
    { value: '98.7%', label: m.successRate },
    { value: '4', label: m.domains },
    { value: '5', label: m.strategies },
  ];
  return (
    <section className="py-10 border-b border-[#E8EAED]" style={{ background: '#fff' }}>
      <div className="max-w-5xl mx-auto px-5 md:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {metrics.map(item => (
            <div key={item.label} className="text-center">
              <p className="text-3xl md:text-4xl font-bold tracking-tight" style={{ color: '#22313F' }}>{item.value}</p>
              <p className="text-sm mt-1" style={{ color: 'rgba(34,49,63,.45)' }}>{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Graph Sandbox ────────────────────────────────────────────────────────────

function GraphSandbox() {
  const { t } = useLang();
  const sb = t.home.sandbox;
  const [n, setN] = useState(14);
  const [p, setP] = useState(0.15);
  const [seed, setSeed] = useState(0);

  const [graph, setGraph] = useState<{ nodes: WsNode[]; edges: WsEdge[]; rewiredCount: number }>({ nodes: [], edges: [], rewiredCount: 0 });

  useEffect(() => {
    setGraph(buildWS(n, 4, p));
  }, [n, p, seed]);

  const totalEdges = graph.edges.length;
  const rewiredPct = totalEdges > 0 ? Math.round((graph.rewiredCount / totalEdges) * 100) : 0;

  return (
    <section id="sandbox" className="py-20 md:py-28" style={{ background: '#F5F5F6' }}>
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        {/* Header */}
        <div className="max-w-2xl mb-14">
          <span className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: '#FECC00', background: '#22313F', padding: '3px 10px', borderRadius: 4 }}>
            {sb.tag}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mt-4 mb-4 tracking-tight" style={{ color: '#22313F' }}>
            {sb.title}
          </h2>
          <p className="text-base leading-relaxed" style={{ color: 'rgba(34,49,63,.55)' }}>
            {sb.desc}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* SVG canvas */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#E8EAED]">
            <svg viewBox="0 0 310 310" className="w-full" style={{ maxHeight: 340 }}>
              {/* Original edges */}
              {graph.edges.filter(e => !e.rewired).map((e, i) => (
                <line
                  key={`orig-${i}`}
                  x1={graph.nodes[e.s].x} y1={graph.nodes[e.s].y}
                  x2={graph.nodes[e.t].x} y2={graph.nodes[e.t].y}
                  stroke="#22313F" strokeWidth="1" opacity="0.18"
                />
              ))}
              {/* Rewired edges */}
              {graph.edges.filter(e => e.rewired).map((e, i) => (
                <line
                  key={`rew-${i}`}
                  x1={graph.nodes[e.s].x} y1={graph.nodes[e.s].y}
                  x2={graph.nodes[e.t].x} y2={graph.nodes[e.t].y}
                  stroke="#FECC00" strokeWidth="1.5" opacity="0.75"
                />
              ))}
              {/* Nodes */}
              {graph.nodes.map(node => (
                <circle key={node.id} cx={node.x} cy={node.y} r={4.5} fill="#22313F" stroke="#fff" strokeWidth="1.5" />
              ))}
            </svg>

            {/* Legend */}
            <div className="flex items-center gap-6 mt-3 px-1">
              <div className="flex items-center gap-2">
                <span className="w-5 h-[1.5px] rounded inline-block" style={{ background: '#22313F', opacity: .4 }} />
                <span className="text-xs" style={{ color: 'rgba(34,49,63,.5)' }}>{sb.ringLattice}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-[2px] rounded inline-block" style={{ background: '#FECC00' }} />
                <span className="text-xs" style={{ color: 'rgba(34,49,63,.5)' }}>{sb.rewiredShortcut}</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-6">
            {/* Sliders */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E8EAED]">
              <div className="mb-5">
                <div className="flex justify-between items-baseline mb-2">
                  <label className="text-sm font-semibold" style={{ color: '#22313F' }}>{sb.nodesLabel}</label>
                  <span className="text-lg font-bold font-mono" style={{ color: '#22313F' }}>{n}</span>
                </div>
                <input
                  type="range" min={8} max={22} step={1} value={n}
                  onChange={e => setN(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, #FECC00 ${((n - 8) / 14) * 100}%, #E8EAED ${((n - 8) / 14) * 100}%)` }}
                />
                <div className="flex justify-between text-[11px] mt-1" style={{ color: 'rgba(34,49,63,.35)' }}>
                  <span>8</span><span>22</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-baseline mb-2">
                  <label className="text-sm font-semibold" style={{ color: '#22313F' }}>{sb.rewiringLabel}</label>
                  <span className="text-lg font-bold font-mono" style={{ color: '#22313F' }}>{p.toFixed(2)}</span>
                </div>
                <input
                  type="range" min={0} max={1} step={0.01} value={p}
                  onChange={e => setP(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, #FECC00 ${p * 100}%, #E8EAED ${p * 100}%)` }}
                />
                <div className="flex justify-between text-[11px] mt-1" style={{ color: 'rgba(34,49,63,.35)' }}>
                  <span>0 — Ring lattice</span><span>1 — Random graph</span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E8EAED] flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: 'rgba(34,49,63,.55)' }}>Total edges</span>
                <span className="font-semibold font-mono">{totalEdges}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: 'rgba(34,49,63,.55)' }}>Rewired shortcuts</span>
                <span className="font-semibold font-mono" style={{ color: '#FECC00', textShadow: '0 0 0 #22313F', WebkitTextStroke: '0' }}>
                  <span style={{ color: '#22313F' }}>{graph.rewiredCount} </span>
                  <span style={{ color: 'rgba(34,49,63,.4)', fontWeight: 400 }}>({rewiredPct}%)</span>
                </span>
              </div>
              <div className="h-px" style={{ background: '#F0F0F0' }} />
              <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(34,49,63,.45)' }}>
                Even a small p creates dramatic shortcuts. This is what allows YowLinker's BFS (POST /graph/query) to find connections across large graphs in milliseconds.
              </p>
            </div>

            <button
              onClick={() => setSeed(s => s + 1)}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-[.98]"
              style={{ background: '#22313F', color: '#FECC00' }}
            >
              {sb.reshuffle}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Domain showcase ──────────────────────────────────────────────────────────

function DomainShowcase() {
  const { t } = useLang();
  const d = t.home.domains;
  const [active, setActive] = useState<DomainKey>('education');
  const domain = DOMAINS[active];
  const domainInfo = d.domainData[active] ?? { label: domain.label ?? active, desc: '' };

  return (
    <section id="domains" className="py-20 md:py-28" style={{ background: '#fff' }}>
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        {/* Header */}
        <div className="max-w-2xl mb-14">
          <span className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: '#FECC00', background: '#22313F', padding: '3px 10px', borderRadius: 4 }}>
            {d.tag}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mt-4 mb-4 tracking-tight" style={{ color: '#22313F' }}>
            {d.title}
          </h2>
          <p className="text-base leading-relaxed" style={{ color: 'rgba(34,49,63,.55)' }}>
            {d.subtitle}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {(Object.keys(DOMAINS) as DomainKey[]).map(key => (
            <button
              key={key}
              onClick={() => setActive(key)}
              className="px-5 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: active === key ? '#22313F' : '#F5F5F6',
                color: active === key ? '#FECC00' : 'rgba(34,49,63,.6)',
              }}
            >
              {(d.domainData[key] ?? { label: key }).label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div
          key={active}
          className="rounded-2xl overflow-hidden border border-[#E8EAED] fade-up"
          style={{ background: '#fff' }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Left: graph + info */}
            <div className="p-8 border-b md:border-b-0 md:border-r border-[#E8EAED]" style={{ background: '#F8F8F9' }}>
              {/* Mini graph SVG */}
              <svg viewBox="0 0 290 240" className="w-full max-w-xs mx-auto mb-6">
                {/* Edges */}
                {domain.graphEdges.map((e, i) => {
                  const s = domain.graphNodes[e.s];
                  const t = domain.graphNodes[e.t];
                  const mx = (s.x + t.x) / 2;
                  const my = (s.y + t.y) / 2;
                  return (
                    <g key={i}>
                      <line x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke={e.c} strokeWidth="1.5" opacity="0.5" />
                      {/* Edge label */}
                      <text x={mx} y={my - 4} textAnchor="middle" fontSize="8" fill={e.c} fontFamily="monospace" opacity="0.8">{e.label}</text>
                    </g>
                  );
                })}
                {/* Nodes */}
                {domain.graphNodes.map(node => (
                  <g key={node.id}>
                    {node.c === '#FECC00' && <circle cx={node.x} cy={node.y} r={20} fill="#FECC00" opacity="0.18" />}
                    <circle cx={node.x} cy={node.y} r={8} fill={node.c} stroke="#fff" strokeWidth="1.5" />
                    <text x={node.x} y={node.y + 22} textAnchor="middle" fontSize="9" fill="#22313F" fontWeight="600">{node.label}</text>
                    <text x={node.x} y={node.y + 33} textAnchor="middle" fontSize="7.5" fill="rgba(34,49,63,.4)">{node.type}</text>
                  </g>
                ))}
              </svg>

              {/* Predicted link */}
              <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,.8)', border: '1px solid rgba(254,204,0,.4)' }}>
                <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(34,49,63,.45)' }}>{d.predicted}</p>
                <div className="flex items-center gap-2 text-sm font-mono" style={{ color: '#22313F' }}>
                  <span className="truncate">{domain.exampleSource}</span>
                  <span style={{ color: '#FECC00' }}>→</span>
                  <span className="truncate">{domain.exampleTarget}</span>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[11px]" style={{ color: 'rgba(34,49,63,.5)' }}>{d.confidence}</span>
                  <span className="text-[15px] font-bold" style={{ color: '#22313F' }}>{(domain.exampleScore * 100).toFixed(0)}%</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full" style={{ background: 'rgba(254,204,0,.2)' }}>
                  <div className="h-full rounded-full" style={{ width: `${domain.exampleScore * 100}%`, background: '#FECC00' }} />
                </div>
              </div>
            </div>

            {/* Right: details */}
            <div className="p-8 flex flex-col gap-6">
              <div>
                <h3 className="text-xl font-bold mb-3" style={{ color: '#22313F' }}>{domainInfo.label}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(34,49,63,.55)' }}>{domainInfo.desc}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(34,49,63,.4)' }}>{d.nodeTypes}</p>
                  <div className="flex flex-col gap-1.5">
                    {domain.nodeTypes.map(t => (
                      <span key={t} className="text-sm font-mono px-2.5 py-1 rounded-md inline-block" style={{ background: '#F5F5F6', color: '#22313F' }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(34,49,63,.4)' }}>{d.edgeTypes}</p>
                  <div className="flex flex-col gap-1.5">
                    {domain.edgeTypes.map(t => (
                      <span key={t} className="text-sm font-mono px-2.5 py-1 rounded-md inline-block" style={{ background: '#22313F', color: '#FECC00' }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Snippet */}
              <div className="rounded-xl p-4" style={{ background: '#22313F' }}>
                <p className="text-[10px] font-mono mb-2" style={{ color: 'rgba(255,255,255,.3)' }}>POST /ranking/top-k</p>
                <pre className="text-[11px] font-mono leading-relaxed" style={{ color: 'rgba(255,255,255,.6)' }}>{`{
  "source":   "${domain.exampleSource.split(': ')[1].toLowerCase().replace(' ', '-')}",
  "relation": "${domain.exampleRelation}",
  "k":        5
}`}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Ranking preview ──────────────────────────────────────────────────────────

function RankingPreview() {
  const { t } = useLang();
  const rk = t.home.ranking;
  const [scenario, setScenario] = useState<RankingKey>('education');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [strategy, setStrategy] = useState('promising_node');
  const sectionRef = useRef<HTMLDivElement>(null);
  const visible = useVisible(sectionRef);

  const data = RANKING_DATA[scenario];
  const strategies = rk.strategies;

  return (
    <section id="ranking" className="py-20 md:py-28" style={{ background: '#F5F5F6' }} ref={sectionRef}>
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <div className="max-w-2xl mb-14">
          <span className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: '#FECC00', background: '#22313F', padding: '3px 10px', borderRadius: 4 }}>
            {rk.tag}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mt-4 mb-4 tracking-tight" style={{ color: '#22313F' }}>
            {rk.title}
          </h2>
          <p className="text-base leading-relaxed" style={{ color: 'rgba(34,49,63,.55)' }}>
            {rk.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls */}
          <div className="flex flex-col gap-4">
            {/* Scenario */}
            <div className="bg-white rounded-2xl p-5 border border-[#E8EAED] shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'rgba(34,49,63,.4)' }}>{rk.sourceNode}</p>
              {(Object.entries(RANKING_DATA) as [RankingKey, typeof RANKING_DATA[RankingKey]][]).map(([key, d]) => (
                <button
                  key={key}
                  onClick={() => { setScenario(key); setExpandedId(null); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-left transition-all mb-1"
                  style={{
                    background: scenario === key ? '#22313F' : 'transparent',
                    color: scenario === key ? '#fff' : 'rgba(34,49,63,.6)',
                  }}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: scenario === key ? '#FECC00' : 'rgba(34,49,63,.25)' }} />
                  {d.label}
                </button>
              ))}
            </div>

            {/* Strategy */}
            <div className="bg-white rounded-2xl p-5 border border-[#E8EAED] shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'rgba(34,49,63,.4)' }}>{rk.strategy}</p>
              {strategies.map(s => (
                <button
                  key={s.value}
                  onClick={() => setStrategy(s.value)}
                  className="w-full px-3 py-2.5 rounded-lg text-left mb-1 transition-all"
                  style={{ background: strategy === s.value ? '#FECC00' : 'transparent' }}
                >
                  <p className="text-sm font-semibold" style={{ color: strategy === s.value ? '#22313F' : 'rgba(34,49,63,.6)' }}>{s.label}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: strategy === s.value ? 'rgba(34,49,63,.65)' : 'rgba(34,49,63,.35)' }}>{s.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-2 flex flex-col gap-3">
            {data.results.map((r, i) => {
              const isExpanded = expandedId === r.id;
              const whyEntries = Object.entries(r.why);
              return (
                <div
                  key={r.id}
                  className="bg-white rounded-2xl border border-[#E8EAED] shadow-sm overflow-hidden transition-all"
                  style={{ animationDelay: `${i * .1}s` }}
                >
                  <div className="px-5 py-4">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0" style={{ background: '#F5F5F6', color: '#22313F' }}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: '#22313F' }}>{r.label}</p>
                        <p className="text-[11px]" style={{ color: 'rgba(34,49,63,.4)' }}>{r.type}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[15px] font-bold" style={{ color: '#22313F' }}>{(r.score * 100).toFixed(0)}%</span>
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : r.id)}
                          className="text-[11px] font-semibold px-2.5 py-1 rounded-md transition-all"
                          style={{ background: isExpanded ? '#22313F' : '#F5F5F6', color: isExpanded ? '#FECC00' : 'rgba(34,49,63,.5)' }}
                        >
                          {rk.why}
                        </button>
                      </div>
                    </div>
                    {/* Score bar */}
                    <div className="h-1.5 rounded-full" style={{ background: '#F0F0F0' }}>
                      {visible && (
                        <div
                          className="h-full rounded-full bar-grow"
                          style={{ '--bar-w': `${r.score * 100}%`, background: 'linear-gradient(to right, #22313F, #FECC00)' } as React.CSSProperties}
                        />
                      )}
                    </div>
                  </div>

                  {/* Explanation panel */}
                  {isExpanded && (
                    <div className="px-5 pb-4 pt-0 border-t border-[#F0F0F0]">
                      <p className="text-[11px] font-semibold uppercase tracking-wider mb-3 pt-3" style={{ color: 'rgba(34,49,63,.4)' }}>{rk.features} — POST /prediction/explain</p>
                      <div className="flex flex-col gap-2.5">
                        {whyEntries.map(([feat, score]) => (
                          <div key={feat}>
                            <div className="flex justify-between text-[12px] mb-1">
                              <span className="font-mono" style={{ color: '#22313F' }}>{feat}</span>
                              <span className="font-semibold" style={{ color: '#22313F' }}>{(score * 100).toFixed(0)}%</span>
                            </div>
                            <div className="h-1 rounded-full" style={{ background: '#F0F0F0' }}>
                              <div className="h-full rounded-full" style={{ width: `${score * 100}%`, background: '#FECC00' }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Request summary */}
            <div className="rounded-2xl p-4" style={{ background: '#22313F' }}>
              <pre className="text-[11px] font-mono leading-relaxed" style={{ color: 'rgba(255,255,255,.55)' }}>{`POST /ranking/top-k
{
  "source":   "${data.results[0].id.split('-')[0]}-source",
  "relation": "${data.relation}",
  "k":        5,
  "strategy": "${strategy}"
}`}</pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── API Console ──────────────────────────────────────────────────────────────

function ApiConsole() {
  const { t } = useLang();
  const a = t.home.api;
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const tab = API_TABS[active];

  const handleCopy = () => {
    navigator.clipboard.writeText(tab.req).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <section id="api" className="py-20 md:py-28" style={{ background: '#fff' }}>
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <div className="max-w-2xl mb-14">
          <span className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: '#FECC00', background: '#22313F', padding: '3px 10px', borderRadius: 4 }}>
            {a.tag}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mt-4 mb-4 tracking-tight" style={{ color: '#22313F' }}>
            {a.title}
          </h2>
          <p className="text-base leading-relaxed" style={{ color: 'rgba(34,49,63,.55)' }}>
            {a.subtitle}
          </p>
        </div>

        {/* Tab strip */}
        <div className="flex flex-wrap gap-2 mb-6">
          {API_TABS.map((t, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-[12px] font-medium transition-all"
              style={{
                background: active === i ? '#22313F' : '#F5F5F6',
                color: active === i ? '#fff' : 'rgba(34,49,63,.55)',
              }}
            >
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: active === i ? 'rgba(254,204,0,.2)' : 'rgba(34,49,63,.08)', color: active === i ? '#FECC00' : 'rgba(34,49,63,.4)' }}
              >
                {t.method}
              </span>
              <span className="font-mono">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Console */}
        <div className="rounded-2xl overflow-hidden border border-[#E8EAED]" style={{ background: '#1a2433' }}>
          {/* Title bar */}
          <div className="flex items-center justify-between px-5 py-3" style={{ background: 'rgba(0,0,0,.25)', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(239,68,68,.4)' }} />
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(234,179,8,.4)' }} />
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(34,197,94,.4)' }} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: 'rgba(254,204,0,.15)', color: '#FECC00' }}>{tab.method}</span>
                <span className="text-[12px] font-mono" style={{ color: 'rgba(255,255,255,.35)' }}>{tab.label}</span>
              </div>
            </div>
            <button
              onClick={handleCopy}
              className="text-[11px] font-medium px-3 py-1.5 rounded-md transition-all"
              style={{ background: copied ? 'rgba(254,204,0,.15)' : 'rgba(255,255,255,.06)', color: copied ? '#FECC00' : 'rgba(255,255,255,.4)' }}
            >
              {copied ? a.copied : a.copy}
            </button>
          </div>

          {/* Description */}
          <div className="px-5 py-3" style={{ background: 'rgba(255,255,255,.03)', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
            <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,.4)' }}>{tab.desc}</p>
          </div>

          {/* Code panes */}
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-5" style={{ borderRight: '1px solid rgba(255,255,255,.05)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,.2)' }}>{a.requestBody}</p>
              <pre className="text-[12px] font-mono leading-relaxed overflow-x-auto" style={{ color: 'rgba(255,255,255,.65)' }}>{tab.req}</pre>
            </div>
            <div className="p-5">
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,.2)' }}>{a.response}</p>
              <pre className="text-[12px] font-mono leading-relaxed overflow-x-auto" style={{ color: '#FECC00' }}>{tab.res}</pre>
            </div>
          </div>
        </div>

        {/* Docs link */}
        <div className="mt-5 text-center">
          <a
            href={`${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '')}/docs`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium transition-colors"
            style={{ color: 'rgba(34,49,63,.45)' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#22313F')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'rgba(34,49,63,.45)')}
          >
            {a.fullDocs}
          </a>
        </div>
      </div>
    </section>
  );
}

// ─── System status ────────────────────────────────────────────────────────────

function SystemStatus() {
  const { t } = useLang();
  const st = t.home.status;
  const [failedIndex, setFailedIndex] = useState<number | null>(null);

  const toggle = (i: number) => setFailedIndex(prev => prev === i ? null : i);

  return (
    <section id="status" className="py-20 md:py-28" style={{ background: '#F5F5F6' }}>
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <div className="max-w-2xl mb-14">
          <span className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: '#FECC00', background: '#22313F', padding: '3px 10px', borderRadius: 4 }}>
            {st.tag}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mt-4 mb-4 tracking-tight" style={{ color: '#22313F' }}>
            {st.title}
          </h2>
          <p className="text-base leading-relaxed" style={{ color: 'rgba(34,49,63,.55)' }}>
            {st.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {st.services.map((svc, i) => {
            const isFailed = failedIndex === i;
            return (
              <button
                key={svc.name}
                onClick={() => toggle(i)}
                className="text-left rounded-2xl p-5 border transition-all duration-300"
                style={{
                  background: isFailed ? '#FEF2F2' : '#fff',
                  border: `1px solid ${isFailed ? '#FECACA' : '#E8EAED'}`,
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="font-bold text-[15px]" style={{ color: '#22313F' }}>{svc.name}</p>
                  <div className="relative w-3 h-3">
                    <span className="absolute inset-0 rounded-full" style={{ background: isFailed ? '#EF4444' : '#22C55E' }} />
                    {!isFailed && <span className="absolute inset-0 rounded-full pulse-ring" style={{ background: '#22C55E', animationDelay: `${i * .4}s` }} />}
                  </div>
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(34,49,63,.4)' }}>{svc.role}</p>
                <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(34,49,63,.55)' }}>
                  {isFailed ? svc.fallback : svc.desc}
                </p>
                {isFailed && (
                  <p className="text-[10px] font-semibold mt-3 uppercase tracking-wider" style={{ color: '#EF4444' }}>
                    {st.degraded}
                  </p>
                )}
              </button>
            );
          })}
        </div>

        {/* Architecture callout */}
        <div className="bg-white rounded-2xl p-6 border border-[#E8EAED]">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-semibold" style={{ color: '#22313F' }}>{st.infra}</p>
            <div className="flex flex-wrap gap-2">
              {['PostgreSQL', 'Neo4j', 'Redis', 'Kafka', 'NestJS'].map(tech => (
                <span key={tech} className="text-[12px] font-mono px-3 py-1 rounded-md" style={{ background: '#F5F5F6', color: 'rgba(34,49,63,.6)' }}>
                  {tech}
                </span>
              ))}
            </div>
            <p className="text-sm ml-auto" style={{ color: 'rgba(34,49,63,.4)' }}>
              {st.multiDb}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────

function CallToAction({ isLoggedIn }: { isLoggedIn: boolean }) {
  const { t } = useLang();
  const c = t.home.cta;
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');
  return (
    <section className="py-20 md:py-28" style={{ background: '#22313F' }}>
      <div className="max-w-3xl mx-auto px-5 md:px-8 text-center">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-4">
          {c.title}
        </h2>
        <p className="text-base leading-relaxed mb-10" style={{ color: 'rgba(255,255,255,.45)' }}>
          {c.subtitle}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {isLoggedIn ? (
            <a href="/overview" className="w-full sm:w-auto px-7 py-3.5 rounded-xl text-[14px] font-semibold hover:opacity-90 transition-opacity" style={{ background: '#FECC00', color: '#22313F' }}>
              {c.goToDashboard}
            </a>
          ) : (
            <>
              <a href="/login" className="w-full sm:w-auto px-7 py-3.5 rounded-xl text-[14px] font-semibold hover:opacity-90 transition-opacity" style={{ background: '#FECC00', color: '#22313F' }}>
                {c.createAccount}
              </a>
              <a
                href={`${apiUrl}/docs`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl text-[14px] font-medium transition-all"
                style={{ background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.6)', border: '1px solid rgba(255,255,255,.1)' }}
              >
                {c.readDocs}
              </a>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function PageFooter() {
  const { t } = useLang();
  const f = t.home.footer;
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');
  return (
    <footer className="py-10 border-t border-[#E8EAED]" style={{ background: '#fff' }}>
      <div className="max-w-6xl mx-auto px-5 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-black" style={{ background: '#FECC00', color: '#22313F' }}>YL</div>
          <span className="font-bold text-sm tracking-tight" style={{ color: '#22313F' }}>YowLinker</span>
          <span className="text-sm ml-2" style={{ color: 'rgba(34,49,63,.3)' }}>{f.tagline}</span>
        </div>
        <nav className="flex items-center gap-6">
          {[
            { href: `${apiUrl}/docs`, label: t.nav.apiDocs, ext: true },
            { href: '/examples', label: t.nav.examples },
            { href: '/onboarding', label: f.getStarted },
            { href: '#status', label: f.status },
          ].map(l => (
            <a
              key={l.label}
              href={l.href}
              target={l.ext ? '_blank' : undefined}
              rel={l.ext ? 'noopener noreferrer' : undefined}
              className="text-sm transition-colors"
              style={{ color: 'rgba(34,49,63,.4)' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#22313F')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'rgba(34,49,63,.4)')}
            >
              {l.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
