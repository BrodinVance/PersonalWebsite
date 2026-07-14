# Product

## Register

brand

## Platform

web

## Users

The primary reader is Brodin himself: the site is a working logbook, a personal record of ongoing work across math, game development, a quantum-mechanics self-study track, and the occasional kitchen experiment. A wider audience — peers, the technically curious, anyone who wanders in — is welcome and second, but the writing is not shaped to court them. The bar for what gets published is "would I want this in my own record," not "will this perform."

## Product Purpose

A personal site that collects Brodin's writing and projects in one considered place. It exists to give the work a home and a through-line: a place where essays and projects accumulate over time into something with shape. Success is the site being worth returning to — for its author first, and for a reader who lands on a piece and stays to read the next one.

## Positioning

An honest, ongoing logbook of a curious mind at work — real projects and real thinking as they happen, not a polished highlight reel. Every screen should feel like a record being kept, not a résumé being sold.

## Brand Personality

Quiet craft and depth, set at blue hour. The identity is a scene: outside a grand mountain lodge (Banff Springs) on a snowy winter night at blue hour — deep twilight-indigo sky, snow-white ink, and lamplight amber glowing in the windows. The voice is plain and a little dry (the about page's "the occasional kitchen experiment… this site is the logbook"), confident without performing confidence. The home hero renders the scene literally (ridgelines, lodge, snowfall); every other surface carries it through palette and type alone. Type is inscriptional Marcellus for display (the engraved plaque), Literata for long-form body, Spline Sans Mono for logbook metadata. The scene may be vivid; the reading surfaces stay hushed.

## Anti-references

Not the generic developer-portfolio template — no hero-with-skill-bars, project-card grid, and contact form. Not a SaaS or startup landing page — no gradient hero, feature grid, or marketing CTAs. Not loud or trend-chasing — no glassmorphism, neon gradients, or look-at-me motion. The existing design is already a deliberate rejection of these; keep it that way.

## Design Principles

The site is the logbook. Every design decision serves the accumulation and reading of the work, not the promotion of its author. When in doubt, favor the record over the pitch.

One bold scene, then hush. The blue-hour world is allowed one theatrical surface — the home hero. Past it, reach for typography, spacing, and material (the grain, the twilight indigo, the frost lines) before color, motion, or effect. If an element draws attention to itself rather than to the writing, cut it.

Reading is the primary act. Long-form text is the main surface; protect the reading experience — measure, rhythm, contrast, and hierarchy — above all else.

Craft in the details. The care shows in the small things: letter-spacing, the weight of a rule, how a link behaves on hover. Battle-test each surface rather than shipping a first pass.

Honest, not polished. The tone is a record kept in good faith, not a highlight reel. Prefer plainness and substance over gloss.

## Accessibility & Inclusion

Readability is the point, so text should hold WCAG AA contrast against the warm-dark background as a baseline (watch the dimmer ink tokens on tinted surfaces). Motion is already gated behind `prefers-reduced-motion` in the global styles — keep every future animation behind that same guard, with a crossfade or instant fallback. Keep focus states visible and navigation keyboard-reachable.
