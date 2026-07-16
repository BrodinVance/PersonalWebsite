# Editable Pages + Perspectives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin-editable home-page copy (intro + Currently) and About page (markdown prose + links), plus a new `perspectives` writing topic.

**Architecture:** A fixed two-entry `pages` content collection (`home.md`, `about.md`) edited through the existing GitHub-commit admin flow (new "Pages" tab). `index.astro`/`about.astro` read the entries at build time with hardcoded fallbacks. Inline markdown renders through a small unified-pipeline helper. The topic addition is two one-line definition changes that everything else derives from.

**Tech Stack:** Astro 6 content collections, unified/remark/rehype (already installed), React admin editor, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-16-editable-pages-perspectives-design.md`

## Global Constraints

- Working dir for commands: `PersonalWebsite/` (Astro project subdir); commits from repo root.
- Topic slug is exactly `perspectives`, label exactly `Perspectives`.
- Page slugs are exactly `home` and `about`; files `home.md` / `about.md`; pages can never be created, renamed, or deleted from the UI.
- Build must succeed even if `src/content/pages/` entries are missing (hardcoded fallbacks in both pages).
- `src/lib/inline-md.ts` must not import `astro:*` (Vitest loads it).
- Seeded content must reproduce today's live copy exactly (listed in Task 3).
- Follow blue-hour tokens; never introduce new fonts/colors.

---

### Task 1: Perspectives topic

**Files:**
- Modify: `PersonalWebsite/src/content.config.ts:4`
- Modify: `PersonalWebsite/src/lib/topics.ts`

**Interfaces:**
- Produces: `'perspectives'` in `TOPICS`; `TOPIC_LABELS.perspectives === 'Perspectives'`. Editor checkboxes and `/writing/topics/perspectives` derive automatically.

- [ ] **Step 1: Add the topic**

In `content.config.ts` replace:

```ts
export const TOPICS = ['math-physics', 'games', 'food'] as const;
```

with:

```ts
export const TOPICS = ['math-physics', 'games', 'food', 'perspectives'] as const;
```

In `lib/topics.ts` add to `TOPIC_LABELS`:

```ts
  perspectives: 'Perspectives',
```

- [ ] **Step 2: Verify**

Run: `npx astro build` → succeeds and prerenders `/writing/topics/perspectives/`.

- [ ] **Step 3: Commit**

`git add PersonalWebsite/src/content.config.ts PersonalWebsite/src/lib/topics.ts && git commit -m "feat: add Perspectives writing topic"`

---

### Task 2: `inline-md.ts` (TDD)

**Files:**
- Create: `PersonalWebsite/src/lib/inline-md.ts`
- Test: `PersonalWebsite/src/lib/inline-md.test.ts`

**Interfaces:**
- Produces: `export async function renderInline(md: string): Promise<string>` — markdown → HTML string; single-paragraph output is unwrapped (no `<p>` shell); multi-block output returned as-is.

- [ ] **Step 1: Write failing tests**

`src/lib/inline-md.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { renderInline } from './inline-md';

describe('renderInline', () => {
  it('renders emphasis and strong inline without a <p> wrapper', async () => {
    expect(await renderInline('mostly *quantum mechanics*')).toBe(
      'mostly <em>quantum mechanics</em>'
    );
    expect(await renderInline('Heading into **Honours Math** this fall')).toBe(
      'Heading into <strong>Honours Math</strong> this fall'
    );
  });

  it('passes plain text through', async () => {
    expect(await renderInline('just words')).toBe('just words');
  });

  it('keeps multi-paragraph markdown wrapped', async () => {
    const out = await renderInline('one\n\ntwo');
    expect(out).toBe('<p>one</p>\n<p>two</p>');
  });

  it('handles empty input', async () => {
    expect(await renderInline('')).toBe('');
  });
});
```

- [ ] **Step 2: Run to verify failure**

`npx vitest run src/lib/inline-md.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement**

`src/lib/inline-md.ts`:

```ts
// Renders the small editable copy fields (home intro, "Currently" lines) at
// build time. No astro:* imports so Vitest can load it.
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';

const processor = unified().use(remarkParse).use(remarkRehype).use(rehypeStringify);

// Single-paragraph output loses its <p> shell so the HTML can sit inside
// existing markup (a .lede paragraph, a list item).
const SINGLE_P = /^<p>([\s\S]*)<\/p>$/;

export async function renderInline(md: string): Promise<string> {
  const html = String(await processor.process(md)).trim();
  const m = html.match(SINGLE_P);
  return m && !m[1].includes('<p>') ? m[1] : html;
}
```

- [ ] **Step 4: Run to verify pass**

`npx vitest run src/lib/inline-md.test.ts` → 4 pass.

- [ ] **Step 5: Commit**

`git add PersonalWebsite/src/lib/inline-md.ts PersonalWebsite/src/lib/inline-md.test.ts && git commit -m "feat: inline markdown renderer for page copy"`

---

### Task 3: `pages` collection + seed content

**Files:**
- Modify: `PersonalWebsite/src/content.config.ts` (add collection)
- Create: `PersonalWebsite/src/content/pages/home.md`
- Create: `PersonalWebsite/src/content/pages/about.md`

**Interfaces:**
- Produces: `getEntry('pages', 'home')` → `{ intro?: string; currently: string[]; links: {} }`; `getEntry('pages', 'about')` → `{ links: Record<string,string> }` + markdown body.

- [ ] **Step 1: Add the collection**

In `content.config.ts`, after the `projects` collection:

```ts
// Fixed-membership collection backing the admin-editable page copy
// (home intro/currently, about prose/links). Slugs: home, about.
const pages = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/pages' }),
  schema: z.object({
    intro: z.string().optional(),
    currently: z.array(z.string()).default([]),
    links: z.record(z.string(), z.string()).default({}),
  }),
});
```

and export: `export const collections = { writing, projects, pages };`

- [ ] **Step 2: Seed `home.md`**

```md
---
intro: >-
  Honours Mathematics Student at University of Waterloo. I build games and
  software, cook more than is reasonable, and write here about whatever I'm
  learning — lately, mostly *quantum mechanics*.
currently:
  - Heading into **Honours Math** at the University of Waterloo this fall
---
```

- [ ] **Step 3: Seed `about.md`**

```md
---
links:
  GitHub: https://github.com/BrodinVance
  Email: mailto:brodin.c.vance@gmail.com
  "Read the latest →": /writing
---

About me goes here

Right now that means a math degree at Waterloo, a quantum-mechanics self-study track, and a steady stream of side projects across software, games, and the occasional kitchen experiment. This site is the logbook.
```

- [ ] **Step 4: Verify**

`npx astro build` → succeeds (collection recognized, schema valid).

- [ ] **Step 5: Commit**

`git add PersonalWebsite/src/content.config.ts PersonalWebsite/src/content/pages && git commit -m "feat: pages content collection with seeded home/about copy"`

---

### Task 4: Wire `index.astro` and `about.astro` to the collection

**Files:**
- Modify: `PersonalWebsite/src/pages/index.astro` (frontmatter, hero/currently markup, two CSS rules)
- Modify: `PersonalWebsite/src/pages/about.astro` (frontmatter, prose/links markup, prose styles)

**Interfaces:**
- Consumes: `renderInline` (Task 2), `pages` collection (Task 3).

- [ ] **Step 1: index.astro frontmatter**

Add imports and data (after existing imports):

```ts
import { getEntry } from 'astro:content';
import { renderInline } from '../lib/inline-md';
```

after `featuredProjects`:

```ts
// Admin-editable copy with the original hardcoded fallbacks.
const home = await getEntry('pages', 'home');
const introHtml = await renderInline(
  home?.data.intro ??
    "Honours Mathematics Student at University of Waterloo. I build games and software, cook more than is reasonable, and write here about whatever I'm learning — lately, mostly *quantum mechanics*."
);
const currentlyItems = await Promise.all(
  (home?.data.currently?.length
    ? home.data.currently
    : ['Heading into **Honours Math** at the University of Waterloo this fall']
  ).map(renderInline)
);
```

- [ ] **Step 2: index.astro markup**

Replace the `.lede` paragraph's hardcoded children with `<p class="lede fx d2" set:html={introHtml} />` and the `.currently` `<ul>` contents with:

```astro
      <ul>
        {currentlyItems.map((item) => (
          <li><span set:html={item} /></li>
        ))}
      </ul>
```

- [ ] **Step 3: index.astro CSS**

Extend the two rules so markdown output matches the old tags:

```css
  .lede em { … }            →  .lede :global(em) { existing declarations }
  .currently li b { … }     →  .currently li :global(b), .currently li :global(strong) { … }
  .currently li b.brine     →  .currently li :global(b.brine)
```

(`set:html` content is outside the scoped-style hash, so the selectors need `:global`.)

- [ ] **Step 4: about.astro**

Frontmatter:

```ts
import { getEntry, render } from 'astro:content';

const about = await getEntry('pages', 'about');
const Content = about ? (await render(about)).Content : null;
const links = Object.entries(
  about?.data.links ?? {
    GitHub: 'https://github.com/BrodinVance',
    Email: 'mailto:brodin.c.vance@gmail.com',
    'Read the latest →': '/writing',
  }
).filter(([, url]) => url);
```

Replace the two hardcoded `<p>`s with:

```astro
      {Content ? (
        <div class="about-prose fx d2">
          <Content />
        </div>
      ) : (
        <p class="lead fx d2">About me goes here</p>
      )}
```

and the links row with:

```astro
        <div class="links">
          {links.map(([label, url]) => (
            <a href={url}>{label}</a>
          ))}
        </div>
```

Styles: keep `.lead`/`.muted` declarations but re-target rendered prose:

```css
  .about-prose :global(p) {
    font-size: 1.05rem;
    line-height: 1.7;
    color: var(--ink-dim);
    margin-bottom: 1.4rem;
  }

  .about-prose :global(p:first-of-type) {
    font-size: 1.32rem;
    line-height: 1.55;
    color: var(--ink);
  }
```

- [ ] **Step 5: Verify**

`npx astro build`, then inspect `dist/client/index.html` (or `.vercel/output/static/index.html`) for `<em>quantum mechanics</em>` and `<strong>Honours Math</strong>`, and `about/index.html` for both paragraphs + 3 links.

- [ ] **Step 6: Commit**

`git add "PersonalWebsite/src/pages/index.astro" PersonalWebsite/src/pages/about.astro && git commit -m "feat: home and about copy read from pages collection"`

---

### Task 5: API support for the pages collection

**Files:**
- Modify: `PersonalWebsite/src/lib/github.ts:8` (`Collection` type)
- Modify: `PersonalWebsite/src/pages/api/content/index.ts:7` (allow list)
- Modify: `PersonalWebsite/src/pages/api/content/save.ts` (pages branch)

**Interfaces:**
- Produces: `GET /api/content?collection=pages[&slug=home|about]`; `POST /api/content/save` accepting `{ collection: 'pages', slug: 'home'|'about', data, body, sha? }`.
- `delete.ts` untouched — its own `COLLECTIONS` still excludes pages (deletes rejected 400).

- [ ] **Step 1: Type + list**

`github.ts`: `export type Collection = 'writing' | 'projects' | 'pages';`
`api/content/index.ts`: `const COLLECTIONS: Collection[] = ['writing', 'projects', 'pages'];`

- [ ] **Step 2: save.ts pages handling**

Change the const to include pages and add the slug allowlist:

```ts
const COLLECTIONS: Collection[] = ['writing', 'projects', 'pages'];
const PAGE_SLUGS = ['home', 'about'];
```

Replace the validation/filename block (from `if (!COLLECTIONS.includes(collection))` through `const renamed = …`) with:

```ts
  if (!COLLECTIONS.includes(collection)) {
    return json({ error: 'Invalid collection' }, 400);
  }
  if (typeof body !== 'string') return json({ error: 'Body is required' }, 400);

  let slug: string;
  let filename: string;
  let renamed = false;
  if (collection === 'pages') {
    // Fixed-membership collection: slug comes from the client, never a title.
    if (!providedSlug || !PAGE_SLUGS.includes(providedSlug)) {
      return json({ error: 'Invalid page' }, 400);
    }
    slug = providedSlug;
    filename = `${slug}.md`;
  } else {
    if (!data?.title) return json({ error: 'Title is required' }, 400);
    slug = (providedSlug && slugify(providedSlug)) || slugify(data.title);
    if (!slug) return json({ error: 'Could not derive a slug from the title' }, 400);
    filename = `${slug}.${extensionFor(body)}`;
    renamed = !!originalFilename && originalFilename !== filename;
  }
```

Commit label block becomes:

```ts
  const collectionLabel =
    collection === 'writing' ? 'Writing' : collection === 'projects' ? 'Project' : 'Page';
  const commitName =
    collection === 'pages' ? slug.charAt(0).toUpperCase() + slug.slice(1) : data.title;
  const commitMessage = `${collectionLabel} "${commitName}" Update`;
```

(Note: writing/projects commit messages change from `… Upload` to `… Update`; keep `Upload` if diff-minimizing — implementer's choice, prefer keeping existing `Upload` for the two old collections:)

```ts
  const commitMessage =
    collection === 'pages'
      ? `Page "${commitName}" Update`
      : `${collectionLabel} "${data.title}" Upload`;
```

Response URL block:

```ts
  const url =
    collection === 'pages'
      ? slug === 'home' ? '/' : '/about'
      : (collection === 'writing' ? '/writing/' : '/projects/') + slug;
  return json({ ok: true, filename, slug, sha: newSha, url, deployTriggered });
```

Also update the top `SaveBody.collection` type to `Collection` from `../../../lib/github` (it already is) — no change needed beyond the type widening in Task 5 Step 1.

- [ ] **Step 3: Verify with dev + curls** (mocked session cookie from `$CLAUDE_JOB_DIR/tmp/cookie.txt`, dev server with `SESSION_SECRET=test-secret ALLOWED_GITHUB_LOGIN=testadmin`)

```bash
curl -s -b "__session=$COOKIE" "localhost:PORT/api/content?collection=pages"          # 200 or GitHub error (no token) — but NOT "Invalid collection"
curl -s -b "__session=$COOKIE" -X POST localhost:PORT/api/content/save -H 'Content-Type: application/json' -d '{"collection":"pages","slug":"nope","data":{},"body":""}'   # {"error":"Invalid page"}
```

(Real GitHub writes can't run locally without a token; the save path beyond validation is exercised by the existing writing/projects flow it shares.)

- [ ] **Step 4: Commit**

`git add PersonalWebsite/src/lib/github.ts PersonalWebsite/src/pages/api/content/index.ts PersonalWebsite/src/pages/api/content/save.ts && git commit -m "feat: pages collection support in content API"`

---

### Task 6: Editor UI — Pages tab

**Files:**
- Create: `PersonalWebsite/src/components/admin/StringListField.tsx`
- Modify: `PersonalWebsite/src/components/admin/FrontmatterForm.tsx` (pages branch, `slug` prop)
- Modify: `PersonalWebsite/src/components/admin/Editor.tsx` (Collection type, tab, list, edit-view conditionals, save())

**Interfaces:**
- Consumes: `POST /api/content/save` pages contract (Task 5).
- Produces: `<StringListField value: string[] onChange: (v: string[]) => void />`; `FrontmatterForm` gains optional `slug?: string` prop.

- [ ] **Step 1: StringListField**

`src/components/admin/StringListField.tsx`:

```tsx
import { useRef, useState } from 'react';

interface Row {
  id: number;
  text: string;
}

// Ordered list of one-line strings (the home "Currently" items).
export function StringListField({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [rows, setRows] = useState<Row[]>(() => value.map((text, id) => ({ id, text })));
  const nextId = useRef(rows.length);

  function sync(next: Row[]) {
    setRows(next);
    onChange(next.map((r) => r.text).filter((t) => t.trim()));
  }

  function move(i: number, dir: -1 | 1) {
    const next = [...rows];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    sync(next);
  }

  return (
    <div className="adm-strlist">
      {rows.map((row, i) => (
        <div key={row.id} className="adm-strlist-row">
          <input
            value={row.text}
            placeholder="Supports **bold** and *italics*"
            onChange={(e) =>
              sync(rows.map((r) => (r.id === row.id ? { ...r, text: e.target.value } : r)))
            }
          />
          <button type="button" title="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
            ↑
          </button>
          <button
            type="button"
            title="Move down"
            disabled={i === rows.length - 1}
            onClick={() => move(i, 1)}
          >
            ↓
          </button>
          <button
            type="button"
            title="Remove line"
            onClick={() => sync(rows.filter((r) => r.id !== row.id))}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        className="adm-ghost"
        onClick={() => sync([...rows, { id: nextId.current++, text: '' }])}
      >
        + Add line
      </button>
    </div>
  );
}
```

Styles in `admin.css` (match existing `.adm-*` conventions):

```css
.adm-strlist {
  display: grid;
  gap: 0.5rem;
  justify-items: start;
}

.adm-strlist-row {
  display: flex;
  gap: 0.35rem;
  width: 100%;
}

.adm-strlist-row input {
  flex: 1;
}
```

- [ ] **Step 2: FrontmatterForm pages branch**

Signature: `collection: 'writing' | 'projects' | 'pages'` and new optional prop `slug`. Add before the accent picker (and make the accent picker conditional — pages skip it):

```tsx
      {collection === 'pages' && slug === 'home' && (
        <>
          <label className="adm-field">
            <span>Hero intro (inline markdown)</span>
            <textarea
              rows={4}
              value={data.intro || ''}
              onChange={(e) => set('intro', e.target.value)}
            />
          </label>
          <div className="adm-field">
            <span>Currently</span>
            <StringListField
              value={data.currently || []}
              onChange={(v) => set('currently', v)}
            />
          </div>
        </>
      )}

      {collection === 'pages' && slug === 'about' && (
        <div className="adm-field">
          <span>Elsewhere links</span>
          <LinksField value={data.links || {}} onChange={(v) => set('links', v)} />
        </div>
      )}

      {collection !== 'pages' && (
        <div className="adm-field">
          <span className="adm-label">Accent / theme</span>
          <AccentPicker value={data.accent} onChange={(v) => set('accent', v)} />
        </div>
      )}
```

Also hide the shared Title/Description fields for pages (wrap the two existing fields in `{collection !== 'pages' && (…)}`).

- [ ] **Step 3: Editor.tsx**

1. `type Collection = 'writing' | 'projects' | 'pages';`
2. Tab row: map over `(['writing', 'projects', 'pages'] as Collection[])` with label `{c === 'writing' ? 'Writing' : c === 'projects' ? 'Projects' : 'Pages'}`.
3. List head `<h1>` uses the same three-way label; hide the "+ New" button when `collection === 'pages'`.
4. List item meta for pages shows just the filename (no draft/date).
5. Edit view: pass `slug={entry.slug}` to `FrontmatterForm`. Wrap the whole `.adm-desk` block (mode tabs + editor + preview) in `{!(collection === 'pages' && entry.slug === 'home') && (…)}` — home is form-only.
6. Actions: wrap Delete and Hide buttons in `collection !== 'pages' &&`; the save side for pages is the single plain Save button (same branch projects already use: change condition to `collection === 'writing' ? (…draft/publish…) : (…save…)`) — already true; no change.
7. `save()`: change the title guard to:

```ts
    if (collection !== 'pages' && !entry.data.title?.trim()) {
      flashToast('A title is required.');
      return;
    }
```

and the saved toast for pages: `Saved ${entry.slug}` fallback already covered by `j.filename`.

- [ ] **Step 4: Verify in dev (browser or curl)**

With mocked session: `/admin` shows a Pages tab; list shows Home and About (requires GitHub token for real listing — without one, verify the tab renders and the list request returns the GitHub-auth error rather than "Invalid collection"). Form rendering for home (intro + Currently rows, no markdown pane, no delete) and about (markdown pane + links, no delete) can be verified with React state by opening entries when a GitHub token is available — otherwise smoke-check the components compile and the list view renders.

- [ ] **Step 5: Commit**

`git add PersonalWebsite/src/components/admin && git commit -m "feat: Pages tab in admin editor"`

---

### Task 7: Final verification

- [ ] **Step 1:** `npx vitest run` → all pass (views-core 7 + inline-md 4).
- [ ] **Step 2:** `npx astro build` → succeeds; static output contains updated home/about copy and `/writing/topics/perspectives/`.
- [ ] **Step 3:** Push to origin (deploys via Vercel), remind user to hard-refresh `/admin`.
