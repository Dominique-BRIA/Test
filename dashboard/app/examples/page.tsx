'use client';

import { useState } from 'react';
import { useLang } from '@/lib/i18n';

// ── helpers ───────────────────────────────────────────────────────────────────

function Tag({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span className={`inline-block font-mono text-[10px] font-semibold px-2 py-0.5 rounded border ${
      accent
        ? 'bg-accent/15 text-primary border-accent/30'
        : 'bg-primary/[0.05] text-primary/50 border-primary/10'
    }`}>
      {children}
    </span>
  );
}

function Method({ m }: { m: string }) {
  const styles: Record<string, string> = {
    POST:   'text-primary',
    GET:    'text-primary/60',
    DELETE: 'text-primary/40',
    PUT:    'text-primary/50',
  };
  return (
    <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/[0.06] ${styles[m] ?? 'text-primary/50'}`}>
      {m}
    </span>
  );
}

function SectionTitle({ step, title, subtitle }: { step: string; title: string; subtitle?: string }) {
  return (
    <div className="flex gap-4 items-start mb-4">
      <span className="shrink-0 w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-mono text-xs font-bold text-accent">
        {step}
      </span>
      <div>
        <h2 className="font-display font-bold text-lg text-primary leading-tight">{title}</h2>
        {subtitle && <p className="text-xs text-primary/50 mt-0.5 leading-relaxed">{subtitle}</p>}
      </div>
    </div>
  );
}

function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div className="relative rounded-xl bg-primary overflow-hidden mb-3">
      {label && (
        <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-white/10">
          <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">{label}</span>
        </div>
      )}
      <button
        onClick={copy}
        className="absolute top-2.5 right-3 text-[10px] font-mono text-white/30 hover:text-white/70 transition-colors"
      >
        {copied ? '✓ copied' : 'copy'}
      </button>
      <pre className="text-xs font-mono text-accent/90 leading-relaxed px-4 py-3 overflow-x-auto whitespace-pre">
        {code}
      </pre>
    </div>
  );
}

function EndpointRow({ method, path, desc }: { method: string; path: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-muted last:border-none">
      <Method m={method} />
      <code className="font-mono text-xs text-primary shrink-0 mt-0.5">{path}</code>
      <span className="text-xs text-primary/50 leading-relaxed">{desc}</span>
    </div>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl bg-white border border-muted shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function Callout({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-accent/25 bg-accent/[0.04] p-5 mb-8">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">{icon}</span>
        <p className="text-xs font-semibold text-primary uppercase tracking-wide">{title}</p>
      </div>
      <div className="text-xs text-primary/60 leading-relaxed space-y-2">{children}</div>
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function ExamplesPage() {
  const { t } = useLang();
  const te = t.examples;
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/$/, '');

  return (
    <div className="max-w-3xl pb-16">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Tag accent>{te.integrationTag}</Tag>
          <Tag>VillaBook · Guest-house rental</Tag>
        </div>
        <h1 className="font-display font-bold text-3xl text-primary leading-tight mb-3">
          {te.title}
        </h1>
        <p className="text-sm text-primary/60 leading-relaxed max-w-2xl">
          {te.subtitlePre}{' '}
          <strong className="text-primary">VillaBook</strong>{' '}
          {te.subtitlePost}
        </p>
      </div>

      {/* Architecture overview */}
      <Card className="mb-8 p-5">
        <p className="text-xs font-semibold text-primary/40 uppercase tracking-widest mb-4">{te.pipelineOverview}</p>
        <div className="flex items-center gap-1 flex-wrap text-xs font-mono text-primary/70">
          {te.pipelineSteps.map((s, i) => (
            <span
              key={i}
              className={`px-2.5 py-1 rounded-lg ${
                i === 0 || i === 5
                  ? 'bg-primary text-accent font-semibold'
                  : 'bg-muted text-primary/60'
              }`}
            >
              {s}
            </span>
          ))}
        </div>
        <p className="text-xs text-primary/40 mt-3 leading-relaxed">
          YowLinker stores entities as graph nodes in PostgreSQL, indexes relationships in Neo4j,
          and caches feature scores in Redis. Your only interface is a REST API — you send node
          attributes and relation events; YowLinker handles all graph storage, traversal, and ranking.
        </p>
      </Card>

      {/* Step 01 */}
      <div className="mb-8">
        <SectionTitle
          step="01"
          title={te.steps[0].title}
          subtitle={te.steps[0].subtitle}
        />
        <Card className="p-4">
          <CodeBlock
            label="Register"
            code={`curl -X POST ${apiBase}/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{"email":"you@yourapp.com","password":"yourpassword"}'`}
          />
          <CodeBlock
            label="Login → get session token"
            code={`curl -X POST ${apiBase}/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"you@yourapp.com","password":"yourpassword"}'

# Response
{ "data": { "token": "cmdkE59ND71Z..." } }`}
          />
          <CodeBlock
            label="Create workspace"
            code={`curl -X POST ${apiBase}/workspaces \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "villabook-renting",
    "adapter_name": "renting",
    "description": "Graph for the VillaBook recommendation engine"
  }'

# Response
{ "data": { "id": "c691099c-0fb2-4728-9ecd-04786fb6b7c5", "adapter_name": "renting" } }`}
          />
          <div className="rounded-lg bg-primary/[0.04] border-l-2 border-l-primary/20 px-4 py-3 text-xs text-primary/60 leading-relaxed">
            <strong>adapter_name</strong> labels the domain. Built-in options:{' '}
            <code>renting</code>, <code>education</code>, <code>bookstore</code>,{' '}
            <code>manufacturing</code>. Pass any string for a fully custom domain.
          </div>
        </Card>
      </div>

      {/* Step 02 */}
      <div className="mb-8">
        <SectionTitle
          step="02"
          title={te.steps[1].title}
          subtitle={te.steps[1].subtitle}
        />
        <Card className="p-4">
          <CodeBlock
            label="Generate key (shown once)"
            code={`curl -X POST ${apiBase}/workspaces/<workspace-id>/api-keys \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "production"}'

# Response
{ "data": { "key": "o5Ye9BvxiuUbUlt..." } }`}
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted px-3 py-2.5 text-xs">
              <p className="font-semibold text-primary mb-1">{te.dashboardRoutes}</p>
              <code className="text-primary/50">Authorization: Bearer &lt;token&gt;</code>
              <p className="text-primary/40 mt-1">auth · workspaces · usage</p>
            </div>
            <div className="rounded-lg bg-muted px-3 py-2.5 text-xs">
              <p className="font-semibold text-primary mb-1">{te.apiRoutes}</p>
              <code className="text-primary/50">X-API-Key: &lt;key&gt;</code>
              <p className="text-primary/40 mt-1">graph · features · prediction · ranking</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Step 03 */}
      <div className="mb-8">
        <SectionTitle
          step="03"
          title={te.steps[2].title}
          subtitle={te.steps[2].subtitle}
        />
        <Card className="p-4">
          <p className="text-xs text-primary/50 mb-3 leading-relaxed">
            VillaBook mapped its MongoDB collections like this — use any <code>type</code> string
            that suits your domain:
          </p>

          <div className="rounded-lg border border-muted overflow-hidden mb-4">
            <div className="grid grid-cols-3 gap-x-4 px-4 py-2 bg-muted text-[10px] font-semibold text-primary/40 uppercase tracking-wider">
              <span>{te.domainTable.appEntity}</span><span>{te.domainTable.nodeType}</span><span>{te.domainTable.keyAttributes}</span>
            </div>
            {[
              ['User (guest)',  'tenant',   'avg_booking_price, preferred_amenities, booking_count'],
              ['User (host)',   'owner',    'name, rating'],
              ['Listing',      'property', 'price, amenities, location, status, maxGuests'],
              ['Location',     'location', 'name, region'],
            ].map(([app, type, attrs]) => (
              <div key={type} className="grid grid-cols-3 gap-x-4 px-4 py-2.5 border-t border-muted text-xs">
                <span className="text-primary/70">{app}</span>
                <code className="font-mono text-accent bg-primary px-1.5 py-0.5 rounded self-start text-[10px]">{type}</code>
                <span className="text-primary/40">{attrs}</span>
              </div>
            ))}
          </div>

          <CodeBlock
            label="POST /graph/nodes — upsert a tenant"
            code={`curl -X POST ${apiBase}/graph/nodes \\
  -H "X-API-Key: <key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "workspace_id": "<workspace-id>",
    "type": "tenant",
    "attributes": {
      "name": "Sophie Martin",
      "avg_booking_price": 45000,
      "preferred_amenities": ["Piscine privée", "Wi-Fi haut débit"],
      "booking_count": 3
    }
  }'`}
          />
          <CodeBlock
            label="POST /graph/nodes — upsert a property"
            code={`curl -X POST ${apiBase}/graph/nodes \\
  -H "X-API-Key: <key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "workspace_id": "<workspace-id>",
    "type": "property",
    "attributes": {
      "title": "Villa Ebenezer",
      "location": "Kribi, Cameroun",
      "price": 45000,
      "amenities": ["Piscine privée", "Wi-Fi haut débit", "Climatisation"],
      "status": "disponible",
      "rating": 4.8,
      "maxGuests": 8
    }
  }'`}
          />

          <p className="text-xs font-semibold text-primary/40 uppercase tracking-widest mb-2 mt-4">{te.edgeTypesHeader}</p>
          <div className="rounded-lg border border-muted overflow-hidden mb-4">
            {([ ['VISITED','1.0'], ['RENTED','2.0'], ['REJECTED','0.2'], ['OWNS','1.0'] ] as [string,string][]).map(([type, w]) => (
              <div key={type} className="grid grid-cols-[120px_50px_1fr] gap-x-4 px-4 py-2.5 border-b border-muted last:border-none text-xs">
                <code className="font-mono text-primary font-semibold">{type}</code>
                <span className="text-accent font-mono font-bold">{w}</span>
                <span className="text-primary/50">{te.edgeDesc[type]}</span>
              </div>
            ))}
          </div>

          <CodeBlock
            label="POST /graph/edges — record a booking"
            code={`curl -X POST ${apiBase}/graph/edges \\
  -H "X-API-Key: <key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "workspace_id": "<workspace-id>",
    "source_id": "<tenant-uuid>",
    "target_id": "<property-uuid>",
    "type": "RENTED",
    "weight": 2.0
  }'`}
          />
          <div className="rounded-lg bg-primary/[0.04] border-l-2 border-l-primary/20 px-4 py-3 text-xs text-primary/60 leading-relaxed">
            <strong>MongoDB ObjectId → UUID mapping:</strong> YowLinker requires UUID v4/v5 for
            node IDs. VillaBook uses deterministic UUID v5 — SHA-1 over a fixed namespace + the
            MongoDB <code>_id</code> hex string. Same input always produces the same UUID, so no
            extra storage is needed.
            <br /><br />
            <code className="bg-primary/[0.08] px-1 py-0.5 rounded">
              {`import { v5 as uuidv5 } from 'uuid';
const NS = '7a8b9c0d-1e2f-5a6b-8c9d-0e1f2a3b4c5d';
const toUUID = (mongoId) => uuidv5(String(mongoId), NS);`}
            </code>
          </div>
        </Card>
      </div>

      {/* Step 04 */}
      <div className="mb-8">
        <SectionTitle
          step="04"
          title={te.steps[3].title}
          subtitle={te.steps[3].subtitle}
        />
        <Card className="p-4">
          <p className="text-xs text-primary/50 mb-4 leading-relaxed">
            YowLinker sends <code>{`{ source: uuid, target: uuid }`}</code> to your endpoint.
            Return <code>{`{ features: { providerName: score } }`}</code>.
          </p>

          <div className="rounded-lg border border-muted overflow-hidden mb-4">
            <div className="grid grid-cols-[180px_80px_1fr] gap-x-4 px-4 py-2 bg-muted text-[10px] font-semibold text-primary/40 uppercase tracking-wider">
              <span>{te.providerCols.provider}</span><span>{te.providerCols.category}</span><span>{te.providerCols.whatMeasures}</span>
            </div>
            {[
              ['price_budget_match',  'external', 0],
              ['amenity_similarity',  'external', 1],
              ['availability_score',  'external', 2],
              ['guest_capacity_match','external', 3],
              ['rating_quality',      'external', 4],
            ].map(([name, cat, idx]) => (
              <div key={name} className="grid grid-cols-[180px_80px_1fr] gap-x-4 px-4 py-2.5 border-t border-muted text-xs items-start">
                <code className="font-mono text-primary text-[11px] font-medium">{name}</code>
                <Tag accent={false}>{cat}</Tag>
                <span className="text-primary/50 leading-relaxed">{te.providerDescs[idx as number]}</span>
              </div>
            ))}
          </div>

          <CodeBlock
            label="POST /features/providers — register"
            code={`curl -X POST ${apiBase}/features/providers \\
  -H "X-API-Key: <key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "price_budget_match",
    "category": "external",
    "remoteUrl": "http://127.0.0.1:5000/api/yowlinker/features/price_budget_match"
  }'

# Use 127.0.0.1 not localhost — the URL validator rejects unqualified hostnames.`}
          />

          <CodeBlock
            label="Your callback (Express.js)"
            code={`// POST /api/yowlinker/features/price_budget_match
// YowLinker sends: { source: "<uuid>", target: "<uuid>" }

app.post('/api/yowlinker/features/price_budget_match', async (req, res) => {
  const { source, target } = req.body;

  const [srcAttrs, tgtAttrs] = await Promise.all([
    fetchNodeAttributes(source),   // GET /graph/nodes/:uuid
    fetchNodeAttributes(target),
  ]);

  const budget  = srcAttrs.avg_booking_price;
  const price   = tgtAttrs.price;
  const ratio   = price / budget;
  const score   = ratio <= 1
    ? Math.max(0, 1 - (1 - ratio) * 0.5)
    : Math.max(0, 1 - (ratio - 1) * 0.8);

  res.json({ features: { price_budget_match: score } });
});`}
          />

          <div className="rounded-lg bg-primary/[0.04] border-l-2 border-l-primary/20 px-4 py-3 text-xs text-primary/60 leading-relaxed">
            <strong>Providers are in-memory only.</strong> After a YowLinker server restart you
            must re-register them. Call <code>POST /features/providers</code> during your
            application startup (or put it in your server boot sequence).
          </div>
        </Card>
      </div>

      {/* Step 05 */}
      <div className="mb-8">
        <SectionTitle
          step="05"
          title={te.steps[4].title}
          subtitle={te.steps[4].subtitle}
        />
        <Card className="p-4">
          <CodeBlock
            label="POST /features/composite"
            code={`curl -X POST ${apiBase}/features/composite \\
  -H "X-API-Key: <key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "providers": [
      "price_budget_match",
      "amenity_similarity",
      "availability_score",
      "guest_capacity_match",
      "rating_quality"
    ],
    "source": "<tenant-uuid>",
    "target": "<property-uuid>"
  }'

# Response — real values from VillaBook:
{
  "data": {
    "features": {
      "price_budget_match":   0.97,
      "amenity_similarity":   0.33,
      "availability_score":   1.00,
      "guest_capacity_match": 1.00,
      "rating_quality":       0.84
    }
  }
}`}
          />
          <p className="text-xs text-primary/50 leading-relaxed">
            Use individual feature scores as "why this property" explanations in your UI:
            budget-friendly (0.97), available (1.00), amenities partial match (0.33).
          </p>
        </Card>
      </div>

      {/* Redis best-practice callout */}
      <Callout icon="" title={te.redisCalloutTitle}>
        <p>
          YowLinker caches composite scores in Redis, keyed by{' '}
          <code>(workspace_id, source_uuid, target_uuid, providers)</code>. The same pair
          scored a second time returns instantly from cache.
        </p>
        <p>
          <strong className="text-primary">What invalidates the cache:</strong> calling{' '}
          <code>POST /graph/nodes</code> (node upsert) re-writes that node's record and can
          evict related cache entries. This matters in high-frequency paths.
        </p>
        <p>
          <strong className="text-primary">VillaBook pattern — what we do:</strong> run a
          single <code>bulkSyncNodes()</code> at server startup to upsert all nodes. Hot paths
          (search, similar listings) skip the upsert and call <code>/features/composite</code>{' '}
          directly. The cache stays warm across requests.
        </p>
        <CodeBlock
          label="server.js — sync once at startup, skip in hot paths"
          code={`// server.js — called after MongoDB connects
import { bulkSyncNodes } from './services/yowlinker-sync.js';
// Re-registers providers + upserts all nodes (idempotent, no duplicate edges)
await bulkSyncNodes();

// listings.js search route — NO syncListing inside the scoring loop
const scored = await Promise.all(
  listings.map(async listing => {
    // ✗ Don't do this — fires POST /graph/nodes on every request:
    //   await syncListing(listing);

    // ✓ Nodes already synced at startup — go straight to scoring:
    const result = await computeComposite(PROVIDER_NAMES, userId, listing._id);
    return { ...listing, score: avg(result.features) };
  })
);`}
        />
      </Callout>

      {/* Step 06 */}
      <div className="mb-8">
        <SectionTitle
          step="06"
          title={te.steps[5].title}
          subtitle={te.steps[5].subtitle}
        />
        <Card className="p-4">
          <p className="text-xs text-primary/50 mb-4 leading-relaxed">
            VillaBook exposes category tabs (Villas, Bord de mer, Piscine…). Each click calls the
            backend with a <code>?category=</code> param; the backend maps it to a MongoDB filter,
            fetches matching listings, then scores them via YowLinker for authenticated users.
          </p>

          <CodeBlock
            label="Backend — listings.js: category param → MongoDB filter → YowLinker ranking"
            code={`// GET /api/listings/search?category=villa&q=optional
router.get('/search', optionalProtect, async (req, res) => {
  const { q, category } = req.query;
  const filter = {};

  if (q) filter.$text = { $search: q };

  // Map frontend category IDs to MongoDB conditions
  switch (category) {
    case 'villa':    filter.title     = { $regex: 'villa|résidence', $options: 'i' }; break;
    case 'appart':   filter.title     = { $regex: 'appartement|studio', $options: 'i' }; break;
    case 'mer':      filter.location  = { $regex: 'kribi|limb', $options: 'i' }; break;
    case 'piscine':  filter.amenities = { $elemMatch: { $regex: 'piscine', $options: 'i' } }; break;
    case 'famille':  filter.maxGuests = { $gte: 5 }; break;
    case 'luxe':     filter.price     = { $gte: 40000 }; break;
  }

  const listings = await Listing.find(filter).limit(20).lean();

  if (req.user && listings.length > 0) {
    await syncUser(req.user).catch(() => {});
    const scored = await Promise.all(
      listings.map(async listing => {
        const result = await computeComposite(
          PROVIDER_NAMES, req.user._id, String(listing._id)
        ).catch(() => ({ features: {} }));
        const vals = Object.values(result.features || {})
          .filter(v => typeof v === 'number');
        const avg = vals.length
          ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        return { ...listing, yowlinker: { score: avg, features: result.features } };
      })
    );
    return res.json(scored.sort((a, b) => b.yowlinker.score - a.yowlinker.score));
  }
  res.json(listings);
});`}
          />

          <CodeBlock
            label="Frontend — Listings.jsx: category click → backend call"
            code={`// When category changes (no text search), fetch from backend.
// YowLinker re-ranks for authenticated users; anonymous get MongoDB order.
useEffect(() => {
  if (activeCategory === 'all' || searchQuery.trim()) {
    setCategoryResults(null);
    return;
  }
  const token = localStorage.getItem('token');
  fetch(\`/api/listings/search?category=\${activeCategory}\`, {
    headers: token ? { Authorization: \`Bearer \${token}\` } : {},
  })
    .then(r => r.json())
    .then(data => {
      const enriched = data.map(apiListing => {
        const staticMatch = LISTINGS_DATA.find(
          s => s.title.toLowerCase() === apiListing.title.toLowerCase()
        );
        return staticMatch
          ? { ...staticMatch, ...apiListing, id: String(apiListing._id) }
          : { ...apiListing, id: String(apiListing._id) };
      });
      setCategoryResults(enriched);
    });
}, [activeCategory, searchQuery, isLoggedIn]);

// Display priority: text search > category results > default listings
const baseListings = searchResults ?? categoryResults ?? listings;`}
          />
        </Card>
      </div>

      {/* Step 07 */}
      <div className="mb-8">
        <SectionTitle
          step="07"
          title={te.steps[6].title}
          subtitle={te.steps[6].subtitle}
        />
        <Card className="p-4">
          <CodeBlock
            label="POST /ranking/top-k — personalized recommendations"
            code={`curl -X POST ${apiBase}/ranking/top-k \\
  -H "X-API-Key: <key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "source":   "<tenant-uuid>",
    "relation": "RENTED",
    "k":        10,
    "strategy": "promising_node"
  }'

# Response
{
  "data": [
    { "id": "<property-uuid>", "score": 0.91, "explanations": ["budget_match", "amenity_overlap"] },
    { "id": "<property-uuid>", "score": 0.87, "explanations": ["high_rating"] }
  ]
}`}
          />

          <div className="rounded-lg border border-muted overflow-hidden mt-3">
            <div className="px-4 py-2 bg-muted text-[10px] font-semibold text-primary/40 uppercase tracking-wider">
              {te.rankingStrategiesTitle}
            </div>
            {te.rankingStrategies.map(([strat, desc, use]) => (
              <div key={strat} className="grid grid-cols-[140px_1fr_1fr] gap-x-4 px-4 py-2.5 border-t border-muted text-xs items-start">
                <code className="font-mono text-primary font-medium text-[11px]">{strat}</code>
                <span className="text-primary/50 leading-relaxed">{desc}</span>
                <span className="text-primary/40 italic">{use}</span>
              </div>
            ))}
          </div>

          <div className="rounded-lg bg-primary/[0.04] border-l-2 border-l-primary/20 px-4 py-3 text-xs text-primary/60 leading-relaxed mt-4">
            <strong>{te.scaleNote}</strong> {te.scaleNoteText}
          </div>
        </Card>
      </div>

      {/* Step 08 */}
      <div className="mb-8">
        <SectionTitle
          step="08"
          title={te.steps[7].title}
          subtitle={te.steps[7].subtitle}
        />
        <Card className="p-4">
          <CodeBlock
            label="Backend — recommendations.js: score all candidates against source"
            code={`// GET /api/recommendations/similar/:listingId
router.get('/similar/:listingId', async (req, res) => {
  const { listingId } = req.params;
  const k = Math.min(parseInt(req.query.k) || 4, 20);

  const [sourceListing, allListings] = await Promise.all([
    Listing.findById(listingId),
    Listing.find({ _id: { $ne: listingId } }).limit(20).lean(),
  ]);

  // Nodes pre-synced at startup — skip upserts to keep Redis cache warm
  const scored = await Promise.all(
    allListings.map(async candidate => {
      const result = await computeComposite(
        PROVIDER_NAMES, listingId, String(candidate._id)
      ).catch(() => ({ features: {} }));
      const vals = Object.values(result.features || {})
        .filter(v => typeof v === 'number');
      const avg = vals.length
        ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      return { listing: candidate, score: avg, features: result.features };
    })
  );

  const similar = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(({ listing, score, features }) => ({
      ...listing, yowlinker: { score, features }
    }));

  res.json({ similar, source: listingId });
});`}
          />
          <CodeBlock
            label="Frontend — ListingDetail.jsx: static listings also get YowLinker similar"
            code={`// For static listings (integer IDs), resolve the MongoDB counterpart first,
// then upgrade from local similarity to YowLinker scores.
const found = LISTINGS_DATA.find(l => String(l.id) === String(id));
if (found) {
  setListing({ ...found });
  // Show local similarity immediately (placeholder)
  setSimilarListings(localSimilarity(found));

  // Resolve MongoDB ID by title → call YowLinker similar
  fetch(\`/api/listings/search?q=\${encodeURIComponent(found.title)}\`)
    .then(r => r.json())
    .then(results => {
      const match = results.find(
        r => r.title?.toLowerCase() === found.title.toLowerCase()
      );
      if (!match?._id) return;
      return fetch(\`/api/recommendations/similar/\${match._id}\`);
    })
    .then(r => r?.json())
    .then(json => {
      if (json?.similar?.length) {
        setSimilarListings(json.similar.map(l => ({
          // merge with static data for images/amenity icons
          ...LISTINGS_DATA.find(s => s.title?.toLowerCase() === l.title?.toLowerCase()),
          ...l,
          yowlinker: l.yowlinker,  // keeps the % similaire badge
        })));
      }
    });
}`}
          />
        </Card>
      </div>

      {/* Step 09 */}
      <div className="mb-8">
        <SectionTitle
          step="09"
          title={te.steps[8].title}
          subtitle={te.steps[8].subtitle}
        />
        <Card className="p-4">
          <div className="rounded-lg bg-primary/[0.04] border-l-2 border-l-accent/40 px-4 py-3 text-xs text-primary/60 leading-relaxed mb-4">
            <strong>DTO uses camelCase.</strong> The correct field names are{' '}
            <code>rootNode</code>, <code>nodeTypes</code> (optional), and{' '}
            <code>relationTypes</code> (required array). The API will reject snake_case equivalents.
          </div>
          <CodeBlock
            label="POST /graph/query — 2-hop neighbourhood of a property"
            code={`curl -X POST ${apiBase}/graph/query \\
  -H "X-API-Key: <key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "rootNode":      "<property-uuid>",
    "depth":         2,
    "nodeTypes":     ["property"],
    "relationTypes": ["OWNS", "RENTED", "VISITED"]
  }'

# Returns a flat string[] of reachable node UUIDs:
["<uuid-A>", "<uuid-B>", "<uuid-C>", ...]

# nodeTypes is optional — omit to return all node types.
# relationTypes is REQUIRED — always provide at least one.`}
          />
          <p className="text-xs text-primary/50 leading-relaxed">
            Walk from a property up to its owner (OWNS edge, depth 1), then back down to all
            other properties that owner has (OWNS edges from owner, depth 2). Result: the same
            owner's other listings.
          </p>
        </Card>
      </div>

      {/* Step 10 */}
      <div className="mb-8">
        <SectionTitle
          step="10"
          title={te.steps[9].title}
          subtitle={te.steps[9].subtitle}
        />
        <Card className="p-4">
          <div className="rounded-lg bg-primary/[0.04] border-l-2 border-l-accent/40 px-4 py-3 text-xs text-primary/60 leading-relaxed mb-4">
            <strong>ExplainDto only takes <code>source</code> and <code>target</code>.</strong>{' '}
            Do not pass <code>workspace_id</code> — it is inferred from the API key and will
            cause a validation error if included.
          </div>
          <CodeBlock
            label="POST /prediction/explain"
            code={`curl -X POST ${apiBase}/prediction/explain \\
  -H "X-API-Key: <key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "source": "<tenant-uuid>",
    "target": "<property-uuid>"
  }'

# Response
{
  "data": {
    "top_features": ["price_budget_match", "availability_score", "rating_quality"]
  }
}

# Display: "Recommended because: budget-friendly · available · highly rated"`}
          />
          <CodeBlock
            label="POST /prediction/link — probability of a future booking"
            code={`curl -X POST ${apiBase}/prediction/link \\
  -H "X-API-Key: <key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "source":        "<tenant-uuid>",
    "target":        "<property-uuid>",
    "relation_type": "RENTED"
  }'

# Response
{ "data": { "probability": 0.73, "confidence": "high" } }

# relation_type is REQUIRED — omitting it will return a 400 error.`}
          />
        </Card>
      </div>

      {/* Real-time dashboard callout */}
      <Callout icon="📡" title={te.realTimeCalloutTitle}>
        <p>
          The <strong className="text-primary">Activity</strong> and{' '}
          <strong className="text-primary">Dashboard</strong> pages in this panel update
          automatically — no page refresh needed.
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>Activity polls <code>GET /usage/logs</code> every <strong className="text-primary">3 seconds</strong>. New entries appear with a pulsing accent dot. Click any row to expand it and see the documented request/response schema for that endpoint type.</li>
          <li>Dashboard polls <code>GET /usage/stats</code> every <strong className="text-primary">5 seconds</strong>. All four MetricCards (total requests, success rate, avg latency, workspaces) and the Top Endpoints table stay current.</li>
        </ul>
        <p>
          Note: <code>usage_logs</code> only records{' '}
          <code>endpoint, method, status_code, latency_ms, created_at</code> — request/response
          bodies are not persisted. The expandable schemas in Activity are illustrative
          documentation, not captured payloads.
        </p>
      </Callout>

      {/* Flexibility section */}
      <div className="mb-8">
        <Card className="p-5 border-accent/30 bg-accent/[0.03]">
          <p className="text-xs font-semibold text-primary/40 uppercase tracking-widest mb-3">
            {te.flexLabel}
          </p>
          <h3 className="font-display font-bold text-lg text-primary mb-2">
            {te.flexTitle}
          </h3>
          <p className="text-xs text-primary/60 leading-relaxed mb-4">
            {te.flexDesc} <Tag accent={false}>external</Tag> {te.flexDescEnd}
          </p>
          <p className="text-xs font-semibold text-primary mb-2">{te.flexAddCriterion}</p>
          <ol className="space-y-2 mb-4">
            {te.flexSteps.map((s, i) => (
              <li key={i} className="flex gap-3 text-xs text-primary/60 leading-relaxed">
                <span className="shrink-0 w-5 h-5 rounded-full bg-accent text-primary font-bold text-[10px] flex items-center justify-center">
                  {i + 1}
                </span>
                {s}
              </li>
            ))}
          </ol>
          <CodeBlock
            label="New provider — location text match"
            code={`// Add to CUSTOM_PROVIDERS in yowlinker-providers.js
{
  name: 'location_text_match',
  category: 'external',
  // YowLinker will call this handler:
  handler(sourceAttrs, targetAttrs) {
    const pref = (sourceAttrs.preferred_location || '').toLowerCase();
    const loc  = (targetAttrs.location           || '').toLowerCase();
    if (!pref) return 0.5;  // neutral — no preference stored
    return loc.includes(pref) ? 1.0 : 0.0;
  },
}`}
          />
        </Card>
      </div>

      {/* Endpoint reference */}
      <div className="mb-8">
        <h2 className="font-display font-bold text-lg text-primary mb-4">{te.endpointRef}</h2>
        <Card>
          <div className="px-4 py-3 border-b border-muted">
            <p className="text-xs font-semibold text-primary/40 uppercase tracking-widest">{te.authSection}</p>
          </div>
          <div className="px-4">
            <EndpointRow method="POST" path="/auth/register" desc={te.endpointDescs.register} />
            <EndpointRow method="POST" path="/auth/login"    desc={te.endpointDescs.login} />
            <EndpointRow method="POST" path="/workspaces"    desc={te.endpointDescs.createWorkspace} />
            <EndpointRow method="POST" path="/workspaces/:id/api-keys" desc={te.endpointDescs.createApiKey} />
          </div>
          <div className="px-4 py-3 border-t border-b border-muted mt-1">
            <p className="text-xs font-semibold text-primary/40 uppercase tracking-widest">{te.graphSection}</p>
          </div>
          <div className="px-4">
            <EndpointRow method="POST" path="/graph/nodes"     desc={te.endpointDescs.upsertNode} />
            <EndpointRow method="GET"  path="/graph/nodes/:id" desc={te.endpointDescs.getNode} />
            <EndpointRow method="POST" path="/graph/edges"     desc={te.endpointDescs.createEdge} />
            <EndpointRow method="POST" path="/graph/query"     desc={te.endpointDescs.graphQuery} />
          </div>
          <div className="px-4 py-3 border-t border-b border-muted mt-1">
            <p className="text-xs font-semibold text-primary/40 uppercase tracking-widest">{te.featuresSection}</p>
          </div>
          <div className="px-4">
            <EndpointRow method="POST" path="/features/providers" desc={te.endpointDescs.registerProvider} />
            <EndpointRow method="POST" path="/features/compute"   desc={te.endpointDescs.computeFeature} />
            <EndpointRow method="POST" path="/features/composite" desc={te.endpointDescs.compositeFeature} />
          </div>
          <div className="px-4 py-3 border-t border-b border-muted mt-1">
            <p className="text-xs font-semibold text-primary/40 uppercase tracking-widest">{te.rankingSection}</p>
          </div>
          <div className="px-4">
            <EndpointRow method="POST" path="/ranking/top-k"      desc={te.endpointDescs.topK} />
            <EndpointRow method="POST" path="/prediction/link"     desc={te.endpointDescs.predLink} />
            <EndpointRow method="POST" path="/prediction/explain"  desc={te.endpointDescs.predExplain} />
            <EndpointRow method="POST" path="/prediction/rank"     desc={te.endpointDescs.predRank} />
          </div>
          <div className="px-4 py-3 border-t border-b border-muted mt-1">
            <p className="text-xs font-semibold text-primary/40 uppercase tracking-widest">{te.usageSection}</p>
          </div>
          <div className="px-4">
            <EndpointRow method="GET" path="/usage/logs"  desc={te.endpointDescs.usageLogs} />
            <EndpointRow method="GET" path="/usage/stats" desc={te.endpointDescs.usageStats} />
          </div>
        </Card>
      </div>

      {/* Footer */}
      <div className="flex gap-3">
        <a
          href="/onboarding"
          className="rounded-xl bg-accent text-primary px-5 py-2.5 text-sm font-semibold hover:bg-accent/90 transition-colors"
        >
          {te.createWorkspaceCta}
        </a>
        <a
          href="http://localhost:3001/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl border border-muted bg-white text-primary px-5 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
        >
          {te.fullApiDocs}
        </a>
      </div>
    </div>
  );
}
