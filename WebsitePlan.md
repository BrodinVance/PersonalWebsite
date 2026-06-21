# Build Spec — brodinvance.com

A personal site + writing log, built in **Astro** (static), authored in **Markdown/MDX**, deployed to **Vercel**. This document is the build instruction set for Claude Code. Work it **phase by phase** and verify each phase's *Done when* checklist before moving on — do **not** one-shot the whole thing, or the design will drift away from the approved direction.

---

## 0. Operating rules for the build

Read these before starting. They are the difference between a distinctive site and generic output.

1. **The approved preview is the visual source of truth.** Save the provided `brodin-site-preview.html` into the repo at `/reference/preview.html`. Every component's markup and styling is ported from it. Do **not** invent new layouts, colors, or type — replicate what's there, then componentize.
2. **No Tailwind, no UI kit, no CSS framework.** Hand-written CSS only: one global token sheet + scoped `<style>` blocks co-located in each `.astro` component. Frameworks are the main cause of the templated look this site must avoid.
3. **The design tokens in Appendix D are locked.** Every color, font, and spacing value derives from them. No new hex values outside the token set.
4. **Avoid the AI-default looks** listed in Appendix E. After each visual phase, check the work against that list.
5. **Verify API surface against the installed Astro version.** This spec targets Astro 5 (Content Layer API). If a newer major version is installed, follow its current content-collections docs; the *data model* below stays the same even if the loader syntax changes.
6. **TypeScript strict mode on.** Content schemas are the typed contract for the whole site.
7. **Mobile-first.** The primary viewport is a phone. Build the narrow layout first, enhance upward. Breakpoint from the preview: `560px`.

---

## Phase 1 — Project setup & tooling

**Goal:** an empty Astro + TypeScript project that runs, with all integrations installed and configured.

**Steps**
1. Scaffold with the **minimal/empty** template (not a starter theme): `npm create astro@latest` → Empty, TypeScript **Strict**, install deps, init git.
2. Install integrations and plugins:
   - `@astrojs/mdx` — MDX support
   - `@astrojs/sitemap` — sitemap
   - `@astrojs/rss` — feed
   - `remark-math` + `rehype-katex` + `katex` — LaTeX rendering
   - `reading-time` — post read-time (used by the small remark plugin in Phase 4)
   - Fonts via Fontsource (prefer variable packages; **verify exact names on npm**):
     `@fontsource-variable/fraunces`, `@fontsource-variable/newsreader`, `@fontsource/ibm-plex-mono` (weights 400, 500)
   - *(Optional, can defer)* `astro-og-canvas` + `canvaskit-wasm` — build-time OG images
3. Configure `astro.config.mjs`:
   - Set `site: 'https://brodinvance.com'` (placeholder until the domain is live — needed for sitemap/RSS/canonical URLs).
   - Add integrations: `mdx()`, `sitemap()`.
   - `markdown.remarkPlugins: [remarkMath]`, `markdown.rehypePlugins: [rehypeKatex]`. MDX inherits markdown config by default — confirm it does, or pass the same plugins to the MDX integration.
   - `markdown.shikiConfig.theme: 'vesper'` (warm dark; tune later — see Appendix E). Disable Shiki's own background so the site's `--bg-raise` shows: set `shikiConfig.transformers` or wrap code blocks; simplest is to override `pre.astro-code` background in CSS to `var(--bg-raise)`.
4. Tooling: install `prettier` + `prettier-plugin-astro`, add a `.prettierrc`, a `.gitignore` (node_modules, dist, .vercel), and an `.nvmrc` pinning the Node version (Node 20 LTS or newer).
5. Copy the approved preview to `/reference/preview.html`.

**Done when**
- [ ] `npm run dev` serves a blank page with no console errors
- [ ] `npm run build` completes clean
- [ ] All deps installed; `astro.config.mjs` has MDX, sitemap, math plugins, and a dark Shiki theme

---

## Phase 2 — Design system foundation

**Goal:** the locked token system and global base styles, with self-hosted fonts rendering correctly.

**Steps**
1. Create `src/styles/global.css` from **Appendix D** verbatim: `:root` tokens, reset, `body` base, the matte grain overlay, `::selection`, the `.wrap` container, and link defaults.
2. Import the Fontsource font CSS once, globally (in the base layout or `global.css`). **Match the `font-family` names to the Fontsource packages** — variable packages register names like `"Fraunces Variable"` and `"Newsreader Variable"`; the tokens in Appendix D already reference these. Import `katex/dist/katex.min.css` globally too.
3. Build a quick throwaway test route that prints headings (Fraunces), body text (Newsreader), and a `<code>` span (Plex Mono) on `--bg`, to confirm fonts, colors, and grain all render. Delete it after.

**Done when**
- [ ] Headings render in Fraunces, body in Newsreader, mono in IBM Plex Mono — all self-hosted (no Google Fonts network request)
- [ ] Background is warm-dark `#15120D` with the faint grain overlay visible
- [ ] No flash of unstyled/fallback text on reload

---

## Phase 3 — Base layout & site chrome

**Goal:** the shared shell every page uses — head/meta, nav, footer, grain.

**Steps**
1. `src/components/SEO.astro` — props: `title`, `description`, `image?`, `article?`. Outputs `<title>`, meta description, canonical, Open Graph + Twitter card tags. Title pattern: `Brodin Vance` on home, `{page} — Brodin Vance` elsewhere.
2. `src/layouts/BaseLayout.astro` — props: SEO fields + optional `wide?` flag. Renders: `<head>` (charset, viewport, SEO component, global styles, fonts, KaTeX CSS), a visible **skip-to-content link**, `<Nav />`, `<main id="main">` with `<slot />`, `<Footer />`. Include the grain overlay (it's in `global.css` via `body::before`, so nothing extra needed here).
3. `src/components/Nav.astro` and `src/components/Footer.astro` — port markup + scoped styles from `/reference/preview.html` (`<nav>` and `<footer>` blocks). Nav links: Writing, Projects, About. Wordmark "Brodin Vance" with the honey dot.
4. Page-load animation: port the `.fx` rise animation classes into `global.css`; respect `prefers-reduced-motion` (already in the preview).

**Done when**
- [ ] A page wrapped in `BaseLayout` shows nav + footer matching the preview
- [ ] Meta tags render correctly (check page source for OG/canonical)
- [ ] Skip link is keyboard-focusable; nav links have visible `:focus-visible` states
- [ ] Reduced-motion disables the load animation

---

## Phase 4 — Content collections & the Writing engine (priority #1)

This is the core. Spend the most care here.

### 4a. Define the collections

`src/content.config.ts` (Astro 5 Content Layer; adjust loader to installed version):

```ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Single source of truth for topics — filter chips, archive pages,
// and post tags all derive from this. Add a topic here, it propagates.
export const TOPICS = ['quantum', 'math', 'gamedev', 'cooking'] as const;

const writing = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/writing' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      date: z.coerce.date(),
      topics: z.array(z.enum(TOPICS)).default([]),
      draft: z.boolean().default(false),
      cover: image().optional(),
    }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    status: z.enum(['building', 'planned', 'ongoing', 'shipped']),
    stack: z.array(z.string()).default([]),
    year: z.number(),
    featured: z.boolean().default(false),
    order: z.number().default(0), // manual sort override
    links: z
      .object({ github: z.string().url().optional(), demo: z.string().url().optional() })
      .default({}),
  }),
});

export const collections = { writing, projects };
```

Define a `TOPIC_LABELS` map (`quantum → 'Quantum'`, `gamedev → 'Game Dev'`, etc.) in a small `src/lib/topics.ts` so display names live in one place.

### 4b. Seed content

Create starter files so the site isn't empty and you have copy-paste templates. Port the four sample posts and four projects from the preview:
- `src/content/writing/`: `reading-griffiths-ch3.mdx`, `designing-the-mimic.md`, `what-mantecatura-does.md`, `eigenvalues-without-handwaving.md`
- Make `reading-griffiths-ch3.mdx` a **feature-exercising post**: include one display equation (e.g. an inner product / eigenvalue expression in `$$...$$`), one inline `$...$`, a fenced code block, and a footnote — so KaTeX, Shiki, and footnotes are all proven in one file.
- `src/content/projects/`: `echo-hunt.md`, `bb84-simulator.md`, `helioseismology-sonification.md`, `qm-foundations.md` with the metadata from the preview.

### 4c. Reading-time remark plugin

`src/lib/remark-reading-time.mjs`:

```js
import getReadingTime from 'reading-time';
import { toString } from 'mdast-util-to-string';

export function remarkReadingTime() {
  return (tree, file) => {
    const minutes = Math.max(1, Math.round(getReadingTime(toString(tree)).minutes));
    file.data.astro.frontmatter.minutesRead = `${minutes} min read`;
  };
}
```

Register it in `astro.config.mjs` `markdown.remarkPlugins` (install `mdast-util-to-string`).

### 4d. Writing index — `src/pages/writing/index.astro`

- `getCollection('writing', ({ data }) => import.meta.env.PROD ? !data.draft : true)` — drafts visible in dev, hidden in prod.
- Sort by `date` descending.
- Render the **log layout** from the preview: monospaced date rail + serif title + dek, hairline-separated rows.
- **Topic filter:** port the client-side chip filter JS from the preview (data-attribute based, instant, no reload). Chips are generated from `TOPICS` + `TOPIC_LABELS`.

### 4e. Topic archive pages — `src/pages/writing/topics/[topic].astro`

- `getStaticPaths` over `TOPICS`, filtering posts whose `topics` include it. Gives shareable, indexable URLs (`/writing/topics/quantum`) that complement the on-page filter.

### 4f. Post page — `src/pages/writing/[...slug].astro`

- `getStaticPaths` over the collection. Render body with Astro 5's `render(entry)` → `<Content />`, plus `headings` for the TOC.
- **Reading layout:** single column at `--measure` width, generous line-height (Newsreader body). Pull KaTeX and Shiki output into the dark theme — override `pre.astro-code` background to `--bg-raise`, ensure KaTeX inherits `--ink`.
- **Table of contents:** `src/components/TableOfContents.astro` built from `headings` (depths 2–3 only). Show only on posts above a length threshold (e.g. minutesRead ≥ 4) or with ≥ 3 headings.
- **Prev/next nav:** compute from the date-sorted list (find current index, link neighbors). Component at the foot of the post.
- **Post header:** title, date, `minutesRead`, topic tags (mono, linking to archive pages).

**Done when**
- [ ] Adding a `.md` file to `src/content/writing/` and pushing makes a live post — confirm the full author workflow (Appendix B)
- [ ] Equations, code blocks, and footnotes all render styled to the dark theme
- [ ] Index filter switches topics instantly; archive pages exist at `/writing/topics/<topic>`
- [ ] Drafts hidden in build, shown in dev; posts sorted newest-first; prev/next + TOC + reading-time all work

---

## Phase 5 — Projects

**Goal:** project index + per-project detail pages.

**Steps**
1. `src/pages/projects/index.astro` — `getCollection('projects')`, sort `featured` first, then by `order` desc, then `year` desc. Render the project-row layout from the preview: title + status tag + stack (mono) + summary. Status tag colors per Appendix D (`building` = honey, `ongoing` = muted sage, others = faint).
2. `src/pages/projects/[...slug].astro` — detail page: project body (MDX), metadata block, and `links` rendered as mono underline links (only render a link if present).

**Done when**
- [ ] Project cards link to working detail pages
- [ ] Status tags styled correctly; missing links don't render empty elements

---

## Phase 6 — Home & About

**Goal:** the homepage wired to live content, plus the About page.

**Steps**
1. `src/pages/index.astro` — port the hero + **Currently** block from the preview (static copy for now). Below it, query and render the **latest 3–4 posts** and **featured projects** live from the collections. The "Read the latest →" link points to the newest post.
2. `src/pages/about.astro` — port the About copy + links block. Wire real GitHub URL and a `mailto:` once available; leave clearly-marked placeholders otherwise.

**Done when**
- [ ] Home shows live latest posts (not hard-coded) and updates when a post is added
- [ ] About renders with working links or obvious placeholders

---

## Phase 7 — Feeds, sitemap, 404, OG

**Goal:** the standard production surface.

**Steps**
1. `src/pages/rss.xml.js` via `@astrojs/rss` — title, description, `site`, items from the writing collection (exclude drafts), sorted by date.
2. Confirm `@astrojs/sitemap` outputs `sitemap-index.xml` on build.
3. `src/pages/404.astro` — on-brand, using `BaseLayout`; a quiet line + a link home. Treat it as direction, not decoration (Appendix E).
4. Favicon + a minimal web manifest.
5. *(Optional within v1)* OG images via `astro-og-canvas`: a build-time endpoint generating per-post cards using the token palette + Fraunces. If it adds friction, ship a single well-made static default OG image and defer dynamic generation.

**Done when**
- [ ] `/rss.xml` validates and lists non-draft posts
- [ ] Sitemap present; 404 styled; favicon set
- [ ] OG image (dynamic or a good default) resolves for posts

---

## Phase 8 — Quality & accessibility pass

**Goal:** clear the quality floor that separates "designed" from "generated."

**Checklist**
- [ ] Responsive from 320px up; the date rail collapses correctly on mobile (per the preview's `560px` rules)
- [ ] Full keyboard nav; visible `:focus-visible` on every interactive element; working skip link
- [ ] Color contrast: body text passes WCAG AA on `--bg`; check `--ink-dim` on small text and bump if it fails
- [ ] `prefers-reduced-motion` respected everywhere
- [ ] Semantic landmarks (`header`/`main`/`footer`/`nav`), one `<h1>` per page, sane heading order
- [ ] Lighthouse ≥ 95 on Performance / Accessibility / Best Practices / SEO (static Astro should hit this easily)
- [ ] Final **anti-slop critique** against Appendix E — then remove one decorative thing that isn't earning its place

---

## Phase 9 — Deploy

**Steps**
1. Push the repo to GitHub.
2. Import into Vercel — it auto-detects Astro (build `astro build`, output `dist`). No adapter needed (static).
3. Set the production domain once purchased; update `site` in `astro.config.mjs` to match.
4. Confirm push-to-`main` triggers a deploy.

**Done when**
- [ ] Live URL builds and serves; pushing a new post file auto-deploys it

---

## Appendix A — Target folder structure

```
src/
  components/   Nav, Footer, SEO, TableOfContents, PostCard, ProjectRow, Prose, etc.
  content/
    writing/    *.md / *.mdx   ← blog posts
    projects/   *.md / *.mdx   ← projects
  layouts/      BaseLayout.astro
  lib/          topics.ts, remark-reading-time.mjs
  pages/
    index.astro
    about.astro
    404.astro
    rss.xml.js
    writing/    index.astro, [...slug].astro, topics/[topic].astro
    projects/   index.astro, [...slug].astro
  styles/       global.css
  content.config.ts
reference/      preview.html   ← visual source of truth
public/         favicon, og default, fonts handled by Fontsource
```

## Appendix B — How to publish a post (the day-to-day workflow)

1. Create `src/content/writing/my-post.md` (or `.mdx` if it needs equations/components).
2. Frontmatter template:
   ```yaml
   ---
   title: "Post title"
   description: "One-sentence dek shown in the log and meta."
   date: 2026-06-21
   topics: ["quantum"]   # any of: quantum, math, gamedev, cooking
   draft: false          # true = hidden in production, visible in dev
   ---
   ```
3. Write Markdown below. For math, use `$inline$` and `$$display$$`. Code in fenced blocks. Footnotes with `[^1]`.
4. `git add . && git commit && git push` → Vercel deploys it. The home page, writing list, relevant topic archives, and RSS all update automatically.

To **sort/organize**: ordering is automatic by `date`. To feature something, that's projects-only (`featured: true`). To retire a post, set `draft: true` or delete the file.

## Appendix C — How to add a whole new section later (extensibility)

Example — adding a **Reading** list:
1. Add a `reading` collection to `content.config.ts` with its own schema (e.g. `title`, `author`, `status`, `rating`, `notes`).
2. Create `src/content/reading/` and drop entries in.
3. Add `src/pages/reading/index.astro` (and `[...slug].astro` if entries need detail pages), reusing `BaseLayout` and existing styled primitives.
4. Add a `Reading` link to `Nav.astro`.

That's the whole pattern: **new content type = new collection + new route + nav entry**, reusing the layout and tokens. No core changes. The same recipe covers a cooking gallery, a "uses" page, or an interactive-demos section (the latter just embeds a component island in MDX).

## Appendix D — Locked design tokens & base (`global.css`)

```css
:root{
  /* color — warm dark, matte */
  --bg:#15120D;
  --bg-raise:#1C1813;
  --ink:#ECE3D4;
  --ink-dim:#A89A85;
  --ink-faint:#6E6453;
  --accent:#CB8E42;
  --accent-dim:#9C6B2F;
  --line:rgba(236,227,212,0.09);
  --line-soft:rgba(236,227,212,0.05);

  /* status accents */
  --status-sage:#8FA98C;

  /* type — names must match the Fontsource packages imported */
  --serif:"Fraunces Variable","Fraunces",Georgia,serif;
  --body:"Newsreader Variable","Newsreader",Georgia,serif;
  --mono:"IBM Plex Mono",ui-monospace,monospace;

  /* layout */
  --measure:34rem;   /* reading width */
  --shell:46rem;     /* page shell width */
}

*{box-sizing:border-box;margin:0;padding:0}
html{-webkit-text-size-adjust:100%}
body{
  background:var(--bg);
  color:var(--ink);
  font-family:var(--body);
  font-size:18px;
  line-height:1.6;
  -webkit-font-smoothing:antialiased;
  text-rendering:optimizeLegibility;
  overflow-x:hidden;
}
/* matte grain — subtle, fixed, non-interactive */
body::before{
  content:"";position:fixed;inset:0;z-index:9999;pointer-events:none;opacity:.035;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}
a{color:inherit;text-decoration:none}
::selection{background:var(--accent-dim);color:var(--ink)}
.wrap{max-width:var(--shell);margin:0 auto;padding:0 1.5rem}

/* page-load rise */
.fx{opacity:0;transform:translateY(14px);animation:rise .8s cubic-bezier(.2,.7,.2,1) forwards}
.fx.d1{animation-delay:.05s}.fx.d2{animation-delay:.15s}
.fx.d3{animation-delay:.28s}.fx.d4{animation-delay:.42s}
@keyframes rise{to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.fx{animation:none;opacity:1;transform:none}}
```

All component-level styles (nav, hero, currently, log entries, chips, project rows, status tags, about, footer) are ported from `/reference/preview.html` into each component's scoped `<style>`, preserving exact values. Mobile rules from the preview's `@media (max-width:560px)` block move with them.

## Appendix E — Anti-AI-slop checklist

Do **not** drift into the three default looks AI design clusters around:
1. Cream background + high-contrast serif + terracotta accent.
2. Near-black + a single **bright** acid-green or vermilion accent.
3. Broadsheet layout: hairline rules everywhere, zero radius, dense newspaper columns.

This site deliberately sits near #2 but is **not** it — the differentiators that must survive the build:
- The dark is **warm** (brown undertone `#15120D`), never neutral black.
- The accent is **muted honey**, desaturated and matte — never a bright glow. Used sparingly: hover states, the "Currently" label, active filter chip, one status tag. If the accent appears more than a handful of times per screen, cut some.
- **Matte** means flat: no glossy gradients, no drop-shadows-as-decoration, no glow.
- Rules are used **sparingly** to separate log entries — not as an all-over grid. This is an open-notebook, not a newspaper.

Quality markers that signal "designed":
- Self-hosted fonts, zero layout shift, instant load (static).
- Real type hierarchy: Fraunces display / Newsreader reading / Plex Mono data — each doing one job.
- The signature device — monospaced timestamps alongside serif titles — applied consistently across Writing and Projects.
- Copy in a dry, understated, first-person voice. No marketing adjectives, no "passionate aspiring founder." Undersell.

Shiki theme note: `vesper` is the starting point. If code blocks clash with the warm palette, switch to `rose-pine-moon` or hand-author a theme JSON keyed to the tokens. The code background must read as `--bg-raise`, not Shiki's default.