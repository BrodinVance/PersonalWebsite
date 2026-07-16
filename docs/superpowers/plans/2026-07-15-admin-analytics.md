# Admin Analytics & Read Counts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin-only `/admin/analytics` page showing per-post read counts (all-time + 30-day trend) for projects and writing, powered by a qualified-read beacon and Upstash Redis.

**Architecture:** Public detail pages stay static and fire a `sendBeacon` to a new public `POST /api/views/hit` (Vercel function) once a read "qualifies" (10 s dwell or 25 % scroll). The endpoint dedupes per visitor/post/day and increments hash counters in Upstash Redis. The SSR admin page reads Redis directly server-side and renders a leaderboard with inline-SVG sparklines. Existing middleware auth covers everything admin-side; the hit endpoint is allowlisted.

**Tech Stack:** Astro 6 (static + Vercel serverless opt-in), `@upstash/redis` REST client, Vitest (new, unit tests only), plain Astro/CSS for the page (no chart lib, no client framework).

**Spec:** `docs/superpowers/specs/2026-07-15-admin-analytics-design.md`

## Global Constraints

- Working dir for all commands: `PersonalWebsite/` (the Astro project subdir; repo root is one level up — commits happen from repo root).
- Node >= 22.12.0. No new client-side framework code; admin page is plain Astro SSR.
- Env vars `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` are OPTIONAL in the schema; every code path must no-op or render an empty state when absent. Dev without Upstash must never error.
- All Redis access goes through `src/lib/views.ts`; pure logic (keys, dates, hashing) lives in `src/lib/views-core.ts` with **no astro:* imports** so Vitest can load it.
- Dates are UTC. Redis keys exactly as specced: `views:total`, `views:day:<YYYY-MM-DD>` (EXPIRE 400 days), `views:seen:<day>:<sha256(ip|field)>` (SET NX EX 86400). Field format: `writing/<slug>` or `projects/<slug>`.
- Styling uses existing tokens in `src/styles/global.css` (blue-hour palette: `--bg-raise`, `--ink`, `--ink-faint`, `--accent`, `--accent-text`, `--line`, fonts `--serif`/`--mono`). Never set Marcellus above weight 400.
- Before building the analytics page visuals, read the `dataviz` skill (charts) and apply the UI/UX skill guidance per user memory.
- Raw IPs are never stored — only SHA-256 hashes in dedupe keys.

---

### Task 1: Dependencies, test runner, env schema

**Files:**
- Modify: `PersonalWebsite/package.json` (deps + `test` script)
- Modify: `PersonalWebsite/astro.config.mjs` (env schema)

**Interfaces:**
- Produces: `npm test` runs Vitest; `getSecret('UPSTASH_REDIS_REST_URL' | 'UPSTASH_REDIS_REST_TOKEN')` available to later tasks.

- [ ] **Step 1: Install dependencies**

Run (in `PersonalWebsite/`): `npm install @upstash/redis && npm install -D vitest`
Expected: both added to package.json, no peer errors.

- [ ] **Step 2: Add test script**

In `package.json` scripts, after `"preview": "astro preview",`:

```json
    "test": "vitest run",
```

- [ ] **Step 3: Add env schema entries**

In `astro.config.mjs` env schema, after the `VERCEL_DEPLOY_HOOK_URL` line:

```js
      UPSTASH_REDIS_REST_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      UPSTASH_REDIS_REST_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
```

- [ ] **Step 4: Verify**

Run: `npx vitest run` → "No test files found" exit 0 or 1 is fine (no tests yet); `npx astro build` → succeeds.

- [ ] **Step 5: Commit**

From repo root: `git add -A PersonalWebsite/package.json PersonalWebsite/package-lock.json PersonalWebsite/astro.config.mjs && git commit -m "chore: add upstash/vitest deps and analytics env schema"`

---

### Task 2: `views-core.ts` — pure key/date/hash logic (TDD)

**Files:**
- Create: `PersonalWebsite/src/lib/views-core.ts`
- Test: `PersonalWebsite/src/lib/views-core.test.ts`

**Interfaces:**
- Produces (consumed by Tasks 3–4):

```ts
export const VIEW_TYPES = ['writing', 'projects'] as const;
export type ViewType = (typeof VIEW_TYPES)[number];
export const TOTAL_KEY = 'views:total';
export const DAY_TTL_SECONDS = 400 * 86400;
export const SEEN_TTL_SECONDS = 86400;
export function fieldFor(type: ViewType, slug: string): string;      // "writing/foo"
export function dayKey(date: Date): string;                          // "2026-07-15" (UTC)
export function dayHashKey(day: string): string;                     // "views:day:2026-07-15"
export function seenKey(day: string, hash: string): string;          // "views:seen:<day>:<hash>"
export function lastNDays(n: number, today: Date): string[];         // oldest→newest, ends today (UTC)
export async function seenHash(ip: string, field: string): Promise<string>; // sha256 hex of `${ip}|${field}`
```

- [ ] **Step 1: Write the failing tests**

`src/lib/views-core.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  dayKey,
  dayHashKey,
  fieldFor,
  lastNDays,
  seenHash,
  seenKey,
} from './views-core';

describe('fieldFor', () => {
  it('joins type and slug', () => {
    expect(fieldFor('writing', 'first-post')).toBe('writing/first-post');
    expect(fieldFor('projects', 'brine')).toBe('projects/brine');
  });
});

describe('dayKey', () => {
  it('formats as UTC YYYY-MM-DD', () => {
    expect(dayKey(new Date('2026-07-15T23:59:59Z'))).toBe('2026-07-15');
    // 01:00 UTC is still the same UTC day regardless of local zone
    expect(dayKey(new Date('2026-01-02T01:00:00Z'))).toBe('2026-01-02');
  });
});

describe('key builders', () => {
  it('builds redis key names', () => {
    expect(dayHashKey('2026-07-15')).toBe('views:day:2026-07-15');
    expect(seenKey('2026-07-15', 'abc')).toBe('views:seen:2026-07-15:abc');
  });
});

describe('lastNDays', () => {
  it('returns n days oldest-first ending today, crossing month boundaries', () => {
    const days = lastNDays(3, new Date('2026-07-01T12:00:00Z'));
    expect(days).toEqual(['2026-06-29', '2026-06-30', '2026-07-01']);
  });
  it('handles n=1', () => {
    expect(lastNDays(1, new Date('2026-07-15T00:30:00Z'))).toEqual(['2026-07-15']);
  });
});

describe('seenHash', () => {
  it('is a deterministic 64-char hex sha256', async () => {
    const a = await seenHash('1.2.3.4', 'writing/foo');
    const b = await seenHash('1.2.3.4', 'writing/foo');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
  it('differs for different ip or field', async () => {
    const a = await seenHash('1.2.3.4', 'writing/foo');
    expect(await seenHash('5.6.7.8', 'writing/foo')).not.toBe(a);
    expect(await seenHash('1.2.3.4', 'writing/bar')).not.toBe(a);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/views-core.test.ts`
Expected: FAIL — cannot resolve `./views-core`.

- [ ] **Step 3: Implement**

`src/lib/views-core.ts`:

```ts
// Pure key/date/hash logic for the read-count system. No astro:* imports so
// this stays loadable by Vitest; the Redis glue lives in views.ts.

export const VIEW_TYPES = ['writing', 'projects'] as const;
export type ViewType = (typeof VIEW_TYPES)[number];

export const TOTAL_KEY = 'views:total';
export const DAY_TTL_SECONDS = 400 * 86400;
export const SEEN_TTL_SECONDS = 86400;

export function fieldFor(type: ViewType, slug: string): string {
  return `${type}/${slug}`;
}

export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function dayHashKey(day: string): string {
  return `views:day:${day}`;
}

export function seenKey(day: string, hash: string): string {
  return `views:seen:${day}:${hash}`;
}

export function lastNDays(n: number, today: Date): string[] {
  const days: string[] = [];
  const t = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  for (let i = n - 1; i >= 0; i--) {
    days.push(dayKey(new Date(t - i * 86400 * 1000)));
  }
  return days;
}

// Only this hash is ever stored — never the raw IP.
export async function seenHash(ip: string, field: string): Promise<string> {
  const data = new TextEncoder().encode(`${ip}|${field}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/views-core.test.ts`
Expected: all PASS.

- [ ] **Step 5: Commit**

`git add PersonalWebsite/src/lib/views-core.ts PersonalWebsite/src/lib/views-core.test.ts && git commit -m "feat: pure key/date/hash core for read counts"`

---

### Task 3: `views.ts` — Redis glue

**Files:**
- Create: `PersonalWebsite/src/lib/views.ts`

**Interfaces:**
- Consumes: everything from `views-core.ts` (Task 2 signatures).
- Produces (consumed by Tasks 4 and 6):

```ts
export interface ViewStats {
  totals: Record<string, number>; // field -> all-time reads
  daily: { day: string; counts: Record<string, number> }[]; // oldest→newest
}
export function viewsConfigured(): boolean;
export async function recordView(type: ViewType, slug: string, ip: string): Promise<boolean>; // true if counted
export async function getStats(days?: number): Promise<ViewStats | null>; // null if unconfigured
```

- [ ] **Step 1: Implement**

`src/lib/views.ts`:

```ts
import { getSecret } from 'astro:env/server';
import { Redis } from '@upstash/redis';
import {
  DAY_TTL_SECONDS,
  SEEN_TTL_SECONDS,
  TOTAL_KEY,
  dayHashKey,
  dayKey,
  fieldFor,
  lastNDays,
  seenHash,
  seenKey,
  type ViewType,
} from './views-core';

function client(): Redis | null {
  const url = getSecret('UPSTASH_REDIS_REST_URL');
  const token = getSecret('UPSTASH_REDIS_REST_TOKEN');
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export function viewsConfigured(): boolean {
  return !!(getSecret('UPSTASH_REDIS_REST_URL') && getSecret('UPSTASH_REDIS_REST_TOKEN'));
}

export interface ViewStats {
  totals: Record<string, number>;
  daily: { day: string; counts: Record<string, number> }[];
}

function toCounts(hash: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (hash && typeof hash === 'object') {
    for (const [k, v] of Object.entries(hash as Record<string, unknown>)) {
      const n = Number(v);
      if (Number.isFinite(n)) out[k] = n;
    }
  }
  return out;
}

// Counts one qualified read: dedupes per visitor/post/day, then bumps the
// all-time and per-day hashes. Returns false when unconfigured or a repeat.
export async function recordView(type: ViewType, slug: string, ip: string): Promise<boolean> {
  const redis = client();
  if (!redis) return false;
  const field = fieldFor(type, slug);
  const day = dayKey(new Date());
  const hash = await seenHash(ip, field);
  const first = await redis.set(seenKey(day, hash), 1, { nx: true, ex: SEEN_TTL_SECONDS });
  if (first === null) return false;
  const dk = dayHashKey(day);
  const p = redis.pipeline();
  p.hincrby(TOTAL_KEY, field, 1);
  p.hincrby(dk, field, 1);
  p.expire(dk, DAY_TTL_SECONDS);
  await p.exec();
  return true;
}

export async function getStats(days = 30): Promise<ViewStats | null> {
  const redis = client();
  if (!redis) return null;
  const dayKeys = lastNDays(days, new Date());
  const p = redis.pipeline();
  p.hgetall(TOTAL_KEY);
  for (const d of dayKeys) p.hgetall(dayHashKey(d));
  const res = await p.exec();
  return {
    totals: toCounts(res[0]),
    daily: dayKeys.map((day, i) => ({ day, counts: toCounts(res[i + 1]) })),
  };
}
```

- [ ] **Step 2: Verify it typechecks/builds**

Run: `npx astro build`
Expected: success (module is unreferenced so far; this catches import/type errors).

- [ ] **Step 3: Commit**

`git add PersonalWebsite/src/lib/views.ts && git commit -m "feat: upstash redis glue for read counts"`

---

### Task 4: `POST /api/views/hit` + middleware allowlist

**Files:**
- Create: `PersonalWebsite/src/pages/api/views/hit.ts`
- Modify: `PersonalWebsite/src/middleware.ts`

**Interfaces:**
- Consumes: `recordView` (Task 3), `VIEW_TYPES`/`ViewType` (Task 2).
- Produces: public endpoint `POST /api/views/hit` accepting JSON `{ type: 'writing'|'projects', slug: string }`; 204 on accept/no-op, 400 on bad input.

- [ ] **Step 1: Allowlist the route in middleware**

In `src/middleware.ts`, replace:

```ts
const AUTH_PATHS = ['/api/auth/login', '/api/auth/callback', '/api/auth/logout'];
```

with:

```ts
const AUTH_PATHS = ['/api/auth/login', '/api/auth/callback', '/api/auth/logout'];
// The read-count beacon posts from public (unauthenticated) pages.
const PUBLIC_API_PATHS = ['/api/views/hit'];
```

and replace:

```ts
  const isAuthRoute = AUTH_PATHS.includes(pathname);
```

with:

```ts
  const isAuthRoute = AUTH_PATHS.includes(pathname) || PUBLIC_API_PATHS.includes(pathname);
```

- [ ] **Step 2: Implement the endpoint**

`src/pages/api/views/hit.ts`:

```ts
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { recordView } from '../../../lib/views';
import { VIEW_TYPES, type ViewType } from '../../../lib/views-core';

export const prerender = false;

const SLUG_RE = /^[a-z0-9][a-z0-9/_-]{0,127}$/i;

function isViewType(v: unknown): v is ViewType {
  return typeof v === 'string' && (VIEW_TYPES as readonly string[]).includes(v);
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  let body: { type?: unknown; slug?: unknown };
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  const { type, slug } = body ?? {};
  if (!isViewType(type) || typeof slug !== 'string' || !SLUG_RE.test(slug)) {
    return new Response(null, { status: 400 });
  }
  // Only real entries may create counter fields.
  const entries = await getCollection(type);
  if (!entries.some((e) => e.id === slug)) {
    return new Response(null, { status: 400 });
  }
  let ip = 'unknown';
  try {
    ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || clientAddress || 'unknown';
  } catch {
    // clientAddress can throw outside request context; hash 'unknown' instead.
  }
  await recordView(type, slug, ip);
  return new Response(null, { status: 204 });
};
```

- [ ] **Step 3: Verify in dev**

Run: `npm run dev` (background), then:

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:4321/api/views/hit -d '{"type":"writing","slug":"NOT-A-REAL-SLUG"}'   # 400
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:4321/api/views/hit -d 'not json'                                        # 400
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:4321/api/views/hit -d '{"type":"projects","slug":"brine"}'                # 204
curl -s -o /dev/null -w '%{http_code}\n' localhost:4321/api/content   # still 401 (auth intact)
```

- [ ] **Step 4: Commit**

`git add PersonalWebsite/src/pages/api/views/hit.ts PersonalWebsite/src/middleware.ts && git commit -m "feat: public read-count beacon endpoint"`

---

### Task 5: ReadBeacon component on both detail pages + admin flag

**Files:**
- Create: `PersonalWebsite/src/components/ReadBeacon.astro`
- Modify: `PersonalWebsite/src/pages/writing/[...slug].astro` (add import + element)
- Modify: `PersonalWebsite/src/pages/projects/[...slug].astro` (add import + element)
- Modify: `PersonalWebsite/src/pages/admin/index.astro` (plant `bv-admin` flag)

**Interfaces:**
- Consumes: `POST /api/views/hit` (Task 4 contract).
- Produces: `<ReadBeacon type slug />` Astro component; `localStorage['bv-admin']` convention (set by admin pages, honored by beacon).

- [ ] **Step 1: Create the component**

`src/components/ReadBeacon.astro`:

```astro
---
// Fires one qualified-read beacon per browser session: after 10 s on the page
// or 25 % scroll depth, whichever comes first. Silent no-op for the admin
// (bv-admin flag) and for repeat views in the same session.
interface Props {
  type: 'writing' | 'projects';
  slug: string;
}
const { type, slug } = Astro.props;
---

<script is:inline define:vars={{ type, slug }}>
  (() => {
    try {
      if (localStorage.getItem('bv-admin')) return;
      const key = `bv-read:${type}/${slug}`;
      if (sessionStorage.getItem(key)) return;
      let sent = false;
      const send = () => {
        if (sent) return;
        sent = true;
        clearTimeout(timer);
        removeEventListener('scroll', onScroll);
        sessionStorage.setItem(key, '1');
        navigator.sendBeacon('/api/views/hit', JSON.stringify({ type, slug }));
      };
      const onScroll = () => {
        const max = document.documentElement.scrollHeight - innerHeight;
        if (max > 0 && scrollY / max >= 0.25) send();
      };
      const timer = setTimeout(send, 10000);
      addEventListener('scroll', onScroll, { passive: true });
    } catch {
      /* storage blocked — count nothing */
    }
  })();
</script>
```

- [ ] **Step 2: Add to the writing page**

In `src/pages/writing/[...slug].astro` frontmatter, after the `vtName` import:

```ts
import ReadBeacon from '../../components/ReadBeacon.astro';
```

In the template, immediately after the opening `<BaseLayout ...>` line (before `.reading-progress`):

```astro
  <ReadBeacon type="writing" slug={post.id} />
```

- [ ] **Step 3: Add to the projects page**

In `src/pages/projects/[...slug].astro` frontmatter, after the `vtName` import:

```ts
import ReadBeacon from '../../components/ReadBeacon.astro';
```

In the template, immediately after the opening `<BaseLayout ...>` line (before `.wrap`):

```astro
  <ReadBeacon type="projects" slug={project.id} />
```

- [ ] **Step 4: Plant the admin flag**

In `src/pages/admin/index.astro`, after `<div class="admin-shell">`'s parent `<BaseLayout ...>` opening line, add:

```astro
  <script is:inline>
    // Mark this browser as the site owner so ReadBeacon never counts it.
    try { localStorage.setItem('bv-admin', '1'); } catch {}
  </script>
```

- [ ] **Step 5: Verify in dev (browser)**

`npm run dev`; open a writing post in the browser with devtools Network open:
- Fresh visit: `hit` beacon fires ~10 s in (or immediately on scrolling >25 %) → 204.
- Reload: no beacon (sessionStorage guard).
- Visit `/admin` (log in if needed), revisit the post in a new tab: no beacon (`bv-admin`).
To reset between checks: DevTools → Application → clear session/local storage.

- [ ] **Step 6: Commit**

`git add PersonalWebsite/src/components/ReadBeacon.astro "PersonalWebsite/src/pages/writing/[...slug].astro" "PersonalWebsite/src/pages/projects/[...slug].astro" PersonalWebsite/src/pages/admin/index.astro && git commit -m "feat: qualified-read beacon on post pages"`

---

### Task 6: `/admin/analytics` page + editor link

**Files:**
- Create: `PersonalWebsite/src/pages/admin/analytics.astro`
- Modify: `PersonalWebsite/src/components/admin/Editor.tsx` (header link)

**Interfaces:**
- Consumes: `getStats`, `viewsConfigured` (Task 3), `fieldFor` (Task 2), content collections.
- Produces: the admin-facing page. Middleware already gates `/admin/*`.

**NOTE for implementer:** read the `dataviz` skill before writing the sparkline/stat-tile markup, and keep the blue-hour token system (`--bg-raise`, `--line`, `--ink-faint`, `--accent`, `--serif`, `--mono`). The code below is the reference implementation; polish per those skills is expected but the data plumbing must match.

- [ ] **Step 1: Add the editor header link**

In `src/components/admin/Editor.tsx`, in the `adm-top-actions` div, before the Log out anchor:

```tsx
          <a className="adm-ghost" href="/admin/analytics">
            Analytics
          </a>
```

- [ ] **Step 2: Create the page**

`src/pages/admin/analytics.astro`:

```astro
---
export const prerender = false;
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import { getStats, viewsConfigured } from '../../lib/views';
import { fieldFor } from '../../lib/views-core';

const DAYS = 30;

let stats: Awaited<ReturnType<typeof getStats>> = null;
let loadError = false;
if (viewsConfigured()) {
  try {
    stats = await getStats(DAYS);
  } catch {
    loadError = true;
  }
}

const writing = await getCollection('writing');
const projects = await getCollection('projects');

interface Row {
  field: string;
  type: 'writing' | 'projects';
  title: string;
  href: string;
  total: number;
  last30: number;
  series: number[];
}

function seriesFor(field: string): number[] {
  return (stats?.daily ?? []).map((d) => d.counts[field] ?? 0);
}
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

const rows: Row[] = [
  ...writing.map((e) => ({ type: 'writing' as const, slug: e.id, title: e.data.title })),
  ...projects.map((e) => ({ type: 'projects' as const, slug: e.id, title: e.data.title })),
]
  .map(({ type, slug, title }) => {
    const field = fieldFor(type, slug);
    const series = seriesFor(field);
    return {
      field,
      type,
      title,
      href: `/${type}/${slug}`,
      total: stats?.totals[field] ?? 0,
      last30: sum(series),
      series,
    };
  })
  .sort((a, b) => b.total - a.total || a.title.localeCompare(b.title));

const siteSeries = (stats?.daily ?? []).map((d) => sum(Object.values(d.counts)));
const siteTotal = sum(rows.map((r) => r.total));
const site30 = sum(siteSeries);
const site7 = sum(siteSeries.slice(-7));
const days = (stats?.daily ?? []).map((d) => d.day);

// Inline-SVG sparkline path for a series (normalized into a w×h box).
function sparkPath(series: number[], w: number, h: number, pad = 2): string {
  if (series.length < 2) return '';
  const max = Math.max(...series, 1);
  const step = (w - pad * 2) / (series.length - 1);
  return series
    .map((v, i) => {
      const x = pad + i * step;
      const y = h - pad - (v / max) * (h - pad * 2);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}
---

<BaseLayout title="Analytics" description="Read counts">
  <script is:inline>
    try { localStorage.setItem('bv-admin', '1'); } catch {}
  </script>
  <div class="ana-shell">
    <header class="ana-head">
      <h1>Analytics</h1>
      <a class="ana-back" href="/admin">← Editor</a>
    </header>

    {!viewsConfigured() && (
      <p class="ana-empty">
        Upstash Redis isn’t configured. Add <code>UPSTASH_REDIS_REST_URL</code> and
        <code>UPSTASH_REDIS_REST_TOKEN</code> (Vercel Marketplace → Upstash) to start counting reads.
      </p>
    )}
    {loadError && <p class="ana-empty">Couldn’t reach Redis — counts are temporarily unavailable.</p>}

    {stats && (
      <>
        <section class="ana-tiles" aria-label="Totals">
          <div class="tile"><span class="num">{siteTotal}</span><span class="lbl">all-time reads</span></div>
          <div class="tile"><span class="num">{site30}</span><span class="lbl">last 30 days</span></div>
          <div class="tile"><span class="num">{site7}</span><span class="lbl">last 7 days</span></div>
        </section>

        <section class="ana-trend" aria-label="Site reads, last 30 days">
          <svg viewBox="0 0 600 80" role="img" aria-label={`Daily reads from ${days[0]} to ${days[days.length - 1]}`}>
            <path d={sparkPath(siteSeries, 600, 80)} fill="none" stroke="var(--accent)" stroke-width="2" />
          </svg>
        </section>

        <table class="ana-table">
          <thead>
            <tr><th>Post</th><th>Type</th><th class="n">All-time</th><th class="n">30 days</th><th>Trend</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr>
                <td><a href={r.href}>{r.title}</a></td>
                <td class="type">{r.type}</td>
                <td class="n">{r.total}</td>
                <td class="n">{r.last30}</td>
                <td>
                  <svg viewBox="0 0 120 24" aria-hidden="true">
                    <path d={sparkPath(r.series, 120, 24)} fill="none" stroke="var(--accent-dim)" stroke-width="1.5" />
                  </svg>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    )}
  </div>
</BaseLayout>

<style>
  .ana-shell { max-width: var(--shell); margin: 0 auto; padding: 2rem; }
  .ana-head { display: flex; align-items: baseline; justify-content: space-between; }
  .ana-head h1 { font-family: var(--serif); font-weight: 400; }
  .ana-back { font-family: var(--mono); font-size: 0.85rem; color: var(--ink-faint); }
  .ana-empty { color: var(--ink-faint); }
  .ana-tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin: 1.5rem 0; }
  .tile { background: var(--bg-raise); border: 1px solid var(--line); border-radius: 6px; padding: 1rem; display: grid; gap: 0.25rem; }
  .tile .num { font-family: var(--serif); font-size: 1.8rem; }
  .tile .lbl { font-family: var(--mono); font-size: 0.75rem; color: var(--ink-faint); }
  .ana-trend svg { width: 100%; height: auto; }
  .ana-table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; }
  .ana-table th, .ana-table td { padding: 0.5rem 0.6rem; border-bottom: 1px solid var(--line-soft); text-align: left; }
  .ana-table th { font-family: var(--mono); font-size: 0.72rem; color: var(--ink-faint); text-transform: uppercase; }
  .ana-table .n { text-align: right; font-variant-numeric: tabular-nums; }
  .ana-table .type { font-family: var(--mono); font-size: 0.8rem; color: var(--ink-faint); }
  .ana-table svg { width: 120px; height: 24px; display: block; }
</style>
```

- [ ] **Step 3: Verify in dev**

`npm run dev`; log in at `/admin`; click "Analytics":
- Without Upstash env: empty state renders, no error.
- With Upstash env in `.env`: tiles/table render; beacon a post (Task 5 flow, from a non-admin browser profile) and confirm the count appears on refresh.
- Logged out (private window): `/admin/analytics` redirects to GitHub login.

- [ ] **Step 4: Commit**

`git add PersonalWebsite/src/pages/admin/analytics.astro PersonalWebsite/src/components/admin/Editor.tsx && git commit -m "feat: admin analytics page with read leaderboard"`

---

### Task 7: Final verification

- [ ] **Step 1: Full test + build**

Run: `npx vitest run` → all pass. `npx astro build` → succeeds; confirm `/admin/analytics` and `/api/views/hit` are listed as on-demand (λ) routes, and writing/projects pages are still prerendered.

- [ ] **Step 2: End-to-end pass in dev**

With Upstash keys in `.env`: fresh browser profile → open a writing post → scroll past 25 % → beacon 204 → `/admin/analytics` shows the read; reload post → no double count.

- [ ] **Step 3: Deployment note**

Remind the user: provision Upstash Redis on the Vercel project (Marketplace → Upstash → free tier); it injects the two env vars automatically. Redeploy afterwards.
