# Editable Home/About Pages + Perspectives Category — Design

**Date:** 2026-07-16
**Status:** Approved by Brodin (build it)

## Goal

1. The admin editor can edit the hand-written copy on the home page (hero
   intro paragraph, "Currently" list) and the entire About page (prose +
   "Elsewhere" links).
2. A new writing category **Perspectives** (slug `perspectives`) for opinion
   pieces like "Do software projects even matter anymore?".

## Context

- The editor saves content as GitHub commits under
  `PersonalWebsite/src/content/<collection>/` and fires the Vercel deploy
  hook; the public site is static and rebuilds on each save.
- Topics are defined in exactly two places — `TOPICS` in
  `src/content.config.ts` and `TOPIC_LABELS` in `src/lib/topics.ts` — and
  everything else (editor checkboxes, `/writing/topics/*` pages, labels)
  derives from them.
- Home/About copy is currently hardcoded in `index.astro` / `about.astro`.
  Raw `.astro` editing from the browser was rejected (one stray bracket
  breaks the build); a `site.json` blob was rejected (long prose in a JSON
  field). Chosen approach: a fixed-membership `pages` content collection.

## Part 1 — Perspectives category

Add `'perspectives'` to `TOPICS` and `Perspectives: 'Perspectives'`…
precisely: `perspectives: 'Perspectives'` to `TOPIC_LABELS`. No other code
changes; the editor form, topic pages, and labels all flow from these.

## Part 2 — `pages` content collection

`src/content/pages/` with exactly two entries (seeded with today's live copy):

- **`home.md`** — frontmatter only:
  - `intro: string` — hero paragraph; inline markdown (`*em*` renders in the
    accent italic style, `**bold**` as ink-bold).
  - `currently: string[]` — the "Currently" panel lines, inline markdown.
- **`about.md`**:
  - body — the whole About prose as markdown; first paragraph is styled as
    the large lead, the rest as muted body text.
  - `links: Record<string,string>` — the "Elsewhere" row (label → URL).

Schema (one permissive schema for both entries):

```ts
const pages = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/pages' }),
  schema: z.object({
    intro: z.string().optional(),
    currently: z.array(z.string()).default([]),
    links: z.record(z.string(), z.string()).default({}),
  }),
});
```

### Rendering

- New `src/lib/inline-md.ts`: `renderInline(md: string): Promise<string>` —
  unified + remark-parse + remark-rehype + rehype-stringify (all already
  installed); if output is a single `<p>…</p>`, the wrapper is stripped so
  the HTML drops into existing markup. Pure module (no astro imports),
  vitest-covered.
- `index.astro`: `getEntry('pages', 'home')`; render `intro` and each
  `currently` item via `renderInline` + `set:html`. Falls back to the
  current hardcoded copy if the entry is missing (build can never break).
  CSS: `.currently li strong` joins the existing `b` rule; `.lede strong`
  gets an ink-bold rule.
- `about.astro`: `getEntry('pages', 'about')` + `render()`; `<Content />`
  inside an `.about-prose` container with `:global` styles — first `p` gets
  the lead treatment, later `p`s the muted treatment. `links` map renders the
  Elsewhere row (seeded with GitHub / Email / "Read the latest →" → /writing).
  Same hardcoded fallback if missing.

### API / editor

- `src/lib/github.ts`: `Collection` type gains `'pages'` (path logic already
  generic).
- `GET /api/content`: allow `collection=pages`.
- `POST /api/content/save`: for `pages`, the slug must be `home` or `about`
  (nothing derived from title; title not required; body may be empty;
  filename fixed `<slug>.md`; no rename path). Commit message
  `Page "Home" Update` / `Page "About" Update`. Deploy hook fires as usual.
- `POST /api/content/delete`: unchanged — it already rejects unknown
  collections, so pages cannot be deleted from the UI.
- **Editor UI** (`Editor.tsx` + `FrontmatterForm.tsx`):
  - Third tab **Pages** listing the two entries (no "+ New" button).
  - Home edit view: form only — intro textarea + a new `StringListField`
    (add / remove / reorder lines) for `currently`. No markdown pane, no
    accent picker, no delete/hide buttons, plain Save.
  - About edit view: the normal markdown editor + `LinksField` for `links`.
    No delete/hide, plain Save.
  - `save()` skips the title requirement for pages; toasts use the page name.

## Error handling

- Missing `pages` entries → hardcoded fallback copy at build; editor list
  simply shows what exists.
- Save conflicts (sha mismatch) → existing 409 path and toast, unchanged.
- Invalid page slug to save API → 400.

## Testing

- Vitest: `renderInline` (em/strong/plain, single-paragraph unwrap,
  multi-paragraph passthrough).
- Dev verification with mocked GitHub session: pages list/read/save API
  round-trip, home + about render seeded copy, `perspectives` topic appears
  in editor form and `/writing/topics/perspectives` builds.

## Out of scope

Editing section headings/nav/footer/meta descriptions, arbitrary page
creation, image uploads, per-page accents.
