# Body Atmosphere — "The Long Night"

**Date:** 2026-07-14
**Status:** Approved (Option A + ghost year numeral from Option C)
**Proposal artifact:** https://claude.ai/code/artifact/a13d98ce-31f0-4f8d-a7c5-8d15ac181555

## Problem

The home hero builds a complete blue-hour scene (sky, lodge, lamplight,
snowfall), but every body section — Currently, Writing, Projects, the index
and detail pages — sits on one flat swatch of `--bg` indigo. The atmosphere
ends exactly where the content begins.

## Design

The premise: **the sky doesn't end at the treeline.** The page ground keeps
telling the night story at whisper volume; the text always wins.

1. **Descending night gradient.** The body background becomes a page-length
   gradient from `--bg` down into `--bg-zenith`, meeting the footer's
   existing zenith-colored valley floor seamlessly. (Deviation from the
   mockup: no horizon-warmth bookend at the bottom — the footer treeline is
   already the bookend, and it is zenith-dark.) `html` gets a `--bg-zenith`
   background so overscroll matches.

2. **Ambient layer** (in `BaseLayout`, `aria-hidden`, `pointer-events: none`,
   behind all content): two amber "lamplight pools" and one alpenglow pool —
   huge radial gradients at 5–7% alpha — plus ~14 deterministic gutter stars
   (same mulberry32 PRNG pattern as `HeroScene`), a few twinkling. Stars hide
   below 900px viewports (no gutters); twinkle is disabled under
   `prefers-reduced-motion`. `main`/`footer` gain `position: relative;
   z-index: var(--z-base)` so content stacks above the layer.

3. **Aurora hairlines.** A `.rule-aurora` utility replaces the flat frost
   `border-top` on the home page's section blocks: a 1px gradient line
   (frost → aurora teal → alpenglow → frost) at ≤22% alpha. New token:
   `--aurora: oklch(0.75 0.14 165)`.

4. **The log becomes a trail.** `.log` gains a faint vertical spine to the
   left of the date column with a small lamplit waypoint node per entry;
   the existing hover accent rule repositions to overlay the spine exactly,
   so hovering an entry "lights up" its segment. Entry frost borders are
   removed — spine rhythm carries separation. Applies everywhere `.log` is
   used (home, writing index, topic pages). Collapses cleanly under 560px
   (single-column entries; spine and nodes hidden).

5. **Ghost year numeral** (from Option C). A huge serif `’26`-style numeral
   at ~4.5% opacity in the right margin of the writing log — home Writing
   section and the writing index — derived from the newest post's date.
   `aria-hidden`, `user-select: none`, `z-index: -1`, hidden below 900px.

6. **Header halo.** A `.halo` utility puts a soft amber radial glow
   (≤7% alpha) behind the post and project detail headers.

## Constraints

- No new JavaScript. All motion is CSS `opacity` only, honoring
  `prefers-reduced-motion`.
- Contrast tokens untouched; glows under running text stay ≤7% alpha, so AA
  ratios hold.
- All decorative elements `aria-hidden="true"` and non-interactive.
- No layout shift: ambient layer is absolutely positioned; spine/nodes are
  pseudo-elements.

## Files

- `src/styles/global.css` — gradient ground, ambient/pool/star styles,
  `.rule-aurora`, trail spine, `.ghost-year`, `.halo`, `--aurora` token.
- `src/layouts/BaseLayout.astro` — ambient layer markup + star generation.
- `src/pages/index.astro` — `rule-aurora` on blocks, ghost year numeral.
- `src/pages/writing/index.astro` — ghost year numeral.
- `src/pages/writing/[...slug].astro`, `src/pages/projects/[...slug].astro`
  — `halo` on headers.

## Out of scope

Option B (raised panels) rejected. Hero, nav, footer, prose styles unchanged.
