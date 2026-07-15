# Admin Editor — "The Page Is the Editor"

**Date:** 2026-07-15
**Status:** Approved
**Proposal artifact:** https://claude.ai/code/artifact/330bf461-43da-40ec-a42b-ef55395cccb2

## Problem

Writing happens in a mono-spaced CodeMirror source pane (off-palette warm-brown
theme) beside a live preview. The author never writes "in" the post, the
editing surface shares none of the site's typography, and formatting requires
memorizing markdown syntax.

## Design

Keep CodeMirror — the document stays plain markdown, byte-for-byte, so the
GitHub save pipeline, KaTeX math, footnotes, inline HTML spans, and the
meaningful-blank-line feature are never re-serialized. Change what it looks
and feels like:

1. **The surface is the post.** Site theme on the editor: Literata at
   1.05rem/1.75, Marcellus headings sized by level, ink/accent colors, the
   night ground, content centered at the post's `--measure`. Line numbers
   removed.

2. **Live rendering with an active-line escape hatch.** A ViewPlugin walks
   the Lezer syntax tree over visible ranges and: styles strong/em/strike,
   headings, links, inline code, blockquotes, list markers, fenced code, and
   horizontal rules; **hides** the formatting marks (`**`, `##`, `[](url)`,
   backticks) — except on lines the selection touches, where raw markdown
   shows. Regex decorations tint `$…$` math and `[^n]` footnote markers
   (rendered math stays a preview concern). Decorations are styling only;
   the document text is never altered.

3. **No syntax to memorize.** Toolbar rebuilt: bold, italic, strikethrough,
   H2/H3, quote, bullet/numbered list, horizontal rule, link, inline math,
   code block, footnote, color picker — each with its shortcut in the
   tooltip; ⌘B/⌘I/⌘K keymaps in the editor; a right-aligned hint strip.
   Footnote button auto-numbers (next unused `[^n]`) and appends the
   definition at the end.

4. **Preview is a toggle, not a pane.** Write ⇄ Preview tabs (⌘E) replace
   the split grid. Preview renders the existing production-mirroring
   pipeline at post measure.

Unchanged: frontmatter form, save/publish/hide/delete, GitHub API routes,
auth.

## Files

- `src/components/admin/MarkdownEditor.tsx` — theme, live-render plugin,
  keymaps, handle extensions.
- `src/components/admin/Toolbar.tsx` — rebuilt controls + hints.
- `src/components/admin/Editor.tsx` — Write/Preview mode state, ⌘E.
- `src/components/admin/admin.css` — surface/tab/toolbar styles; split-pane
  styles removed.

## Out of scope / rejected

Milkdown/TipTap WYSIWYG rejected: round-trip serialization collapses
meaningful blank lines, needs custom plugins for math/footnotes, and rewrites
hand-authored files in the editor's dialect.
