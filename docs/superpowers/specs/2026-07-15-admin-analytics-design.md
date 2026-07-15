# Admin Analytics & Per-Post Read Counts — Design

**Date:** 2026-07-15
**Status:** Approved by Brodin (build it)

## Goal

An analytics page visible only on the admin side of the site, showing how many
people have read each project and writing post. The public site stays fully
static; visitors see nothing new.

## Context & constraints

- Astro 6 site, static output; only `/admin` and `/api/*` opt into on-demand
  rendering as Vercel functions (`export const prerender = false`).
- `src/middleware.ts` already auth-gates every `/admin` and `/api` path except
  the three `/api/auth/*` routes, via encrypted session cookie + GitHub OAuth
  single-user allowlist. New admin surfaces get auth for free.
- No database exists. Vercel Web Analytics is enabled but dashboard-only (no
  usable API on Hobby), so it cannot power an in-site page.

## Decisions (made with user)

1. **Store: Upstash Redis** — free tier via the Vercel Marketplace, which
   auto-injects `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
   Chosen over GoatCounter (third-party script + external dependency) and
   "link to Vercel dashboard" (no in-site counts).
2. **A "read" is qualified, not a raw pageview** — beacon fires after the page
   has been open ~10 s **or** scrolled past 25 %, whichever comes first.
3. **Scope: leaderboard + daily trend.** Per-day buckets stored so the page can
   show 30-day sparklines. No referrers/devices/countries (Vercel covers it),
   no public view counts, no backfill.

## Data model (Redis)

| Key | Type | Purpose |
| --- | --- | --- |
| `views:total` | hash | field `writing/<slug>` or `projects/<slug>` → all-time reads (`HINCRBY`). One `HGETALL` = whole leaderboard. |
| `views:day:<YYYY-MM-DD>` | hash | same fields, per-day counts. `EXPIRE` ~400 days on first write. |
| `views:seen:<YYYY-MM-DD>:<sha256(ip + field)>` | string | `SET NX EX 86400` dedupe — a visitor counts once per post per day. Only the hash is stored, never the IP. |

Dates are UTC. All access goes through a new `src/lib/views.ts` wrapping
`@upstash/redis` (REST client, works in serverless). If the env vars are
absent, `views.ts` reports "not configured" and callers no-op — dev without
Upstash keys must never error.

## Components

### 1. Read beacon (public detail pages)

Small inline script on `src/pages/writing/[...slug].astro` and
`src/pages/projects/[...slug].astro` (shared via a `ReadBeacon.astro`
component taking `type` + `slug`):

- Arms a 10 s timer and a 25 %-scroll listener; first to fire sends
  `navigator.sendBeacon('/api/views/hit', JSON.stringify({ type, slug }))`.
- Skips entirely if `sessionStorage['bv-read:<type>/<slug>']` is set (set on
  send), or if `localStorage['bv-admin']` is set.
- The admin editor page plants `localStorage['bv-admin'] = '1'` so the owner's
  own reading never counts.
- No `prefers-reduced-data` handling — the beacon is a few bytes (YAGNI).

### 2. `POST /api/views/hit` (public endpoint)

- Added to the middleware allowlist alongside the auth routes.
- Validates body shape, `type ∈ {writing, projects}`, and that the slug exists
  in the corresponding content collection (prevents junk keys).
- Applies the dedupe key; on first sight increments `views:total` and today's
  `views:day:` hash.
- Returns 204 always (including when Redis is unconfigured or dedupe hits);
  400 only for malformed/unknown slugs.

### 3. `/admin/analytics` page (SSR Astro, no client framework)

- `export const prerender = false`; middleware handles auth.
- Server-side: `HGETALL views:total` + the last 30 `views:day:*` hashes
  (pipelined), joined against `getCollection('writing'|'projects')` for titles
  and dates.
- Renders, in blue-hour token styling:
  - Stat tiles: all-time reads, last-7-day reads, last-30-day reads.
  - Site-wide 30-day sparkline (inline SVG, no chart library).
  - Ranked table of every post/project: title (linked), type, all-time,
    30-day, per-row mini sparkline. Sorted by all-time desc; posts with zero
    reads still listed.
- Editor toolbar gets an "Analytics" link; analytics page links back to the
  editor. Both surfaces set the `bv-admin` flag.

### 4. Config

- `astro.config.mjs` env schema: add `UPSTASH_REDIS_REST_URL` and
  `UPSTASH_REDIS_REST_TOKEN` as optional server secrets (runtime-enforced,
  same pattern as existing secrets).
- New dependency: `@upstash/redis`.

## Error handling

- Redis unreachable/unconfigured: beacon endpoint returns 204; analytics page
  renders an empty state explaining Upstash isn't configured, with setup hint.
- Malformed beacon bodies: 400, no Redis touch.
- Analytics page Redis failure: surfaces a readable error panel rather than a
  500 blank.

## Testing

- Unit tests for `views.ts` key construction/date math and the hit endpoint's
  validation + dedupe logic (Redis mocked).
- Manual end-to-end in dev with real Upstash keys: visit a post, verify
  qualified-read timing, dedupe on refresh, counts on `/admin/analytics`,
  admin flag suppression.

## Out of scope

Referrer/device/country analytics, public-facing view counts, historical
backfill, per-hour granularity, bot filtering beyond JS-execution + dwell
qualification.
