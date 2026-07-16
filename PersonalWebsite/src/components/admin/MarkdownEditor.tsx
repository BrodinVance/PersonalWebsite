import { useEffect, useImperativeHandle, useRef, forwardRef } from 'react';
import { EditorView, keymap, Decoration, ViewPlugin, WidgetType } from '@codemirror/view';
import type { DecorationSet, ViewUpdate } from '@codemirror/view';
import { EditorState, type Range } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { syntaxTree } from '@codemirror/language';

export interface EditorHandle {
  wrapSelection: (before: string, after: string, placeholder?: string) => void;
  prefixLines: (prefix: string) => void;
  insertBlock: (text: string) => void;
  insertFootnote: () => void;
}

/* ---------------------------------------------------------------------------
   The page is the editor.

   The document never stops being plain markdown — everything below is
   styling. A ViewPlugin walks the syntax tree over the visible ranges,
   dresses the text in the site's prose styles, and hides formatting marks
   (**, ##, [](url), backticks) on every line the selection does NOT touch.
   The line under the caret always shows raw markdown, so what's in the file
   is never a mystery.
   --------------------------------------------------------------------------- */

/* the surface: a post, not a terminal */
const theme = EditorView.theme(
  {
    /* auto-height: the page scrolls, not the pane — it's a post, not a terminal */
    '&': {
      color: 'var(--ink)',
      backgroundColor: 'transparent',
      fontSize: '1.05rem',
    },
    '.cm-scroller': {
      overflow: 'auto',
      fontFamily: 'var(--body)',
      lineHeight: '1.75',
    },
    '.cm-content': {
      maxWidth: 'var(--measure)',
      margin: '0 auto',
      padding: '2.25rem 1.5rem 6rem',
      caretColor: 'var(--accent)',
    },
    '.cm-line': { padding: '0' },
    '.cm-cursor': { borderLeftColor: 'var(--accent)', borderLeftWidth: '2px' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
      backgroundColor: 'oklch(0.66 0.1 315 / 0.35)',
    },
    '.cm-activeLine': { backgroundColor: 'oklch(0.95 0.01 250 / 0.03)' },
    '&.cm-focused': { outline: 'none' },

    /* inline */
    '.cm-live-strong': { fontWeight: '700' },
    '.cm-live-em': { fontStyle: 'italic' },
    '.cm-live-strike': { textDecoration: 'line-through', opacity: '0.75' },
    '.cm-live-code': {
      fontFamily: 'var(--mono)',
      fontSize: '0.88em',
      background: 'var(--bg-raise)',
      borderRadius: '2px',
      padding: '0.08em 0.3em',
    },
    '.cm-live-link': {
      color: 'var(--accent)',
      borderBottom: '1px solid var(--accent-dim)',
    },
    '.cm-live-url': { color: 'var(--ink-faint)', fontFamily: 'var(--mono)', fontSize: '0.85em' },
    '.cm-live-mark': { color: 'var(--accent-dim)' },
    '.cm-live-math': {
      fontFamily: 'var(--mono)',
      fontSize: '0.88em',
      color: 'oklch(0.75 0.14 165)',
    },
    '.cm-live-foot': {
      fontFamily: 'var(--mono)',
      fontSize: '0.8em',
      color: 'var(--accent-text)',
    },

    /* lines */
    '.cm-live-h1': { fontFamily: 'var(--serif)', fontSize: '1.8rem', lineHeight: '1.25', paddingTop: '1.2rem' },
    '.cm-live-h2': { fontFamily: 'var(--serif)', fontSize: '1.55rem', lineHeight: '1.25', paddingTop: '1.1rem' },
    '.cm-live-h3': { fontFamily: 'var(--serif)', fontSize: '1.1rem', lineHeight: '1.3', paddingTop: '0.8rem' },
    '.cm-live-h4, .cm-live-h5, .cm-live-h6': {
      fontFamily: 'var(--serif)',
      fontSize: '1rem',
      paddingTop: '0.6rem',
    },
    '.cm-live-quote': {
      borderLeft: '2px solid var(--accent-dim)',
      paddingLeft: '1.1rem',
      fontStyle: 'italic',
      color: 'var(--ink-dim)',
    },
    '.cm-live-codeblock': {
      fontFamily: 'var(--mono)',
      fontSize: '0.85em',
      background: 'var(--bg-raise)',
      padding: '0 0.75rem',
    },

    '.cm-live-hr-widget': {
      display: 'inline-block',
      width: '100%',
      verticalAlign: 'middle',
      borderTop: '1px solid var(--line)',
    },
  },
  { dark: true }
);

class HrWidget extends WidgetType {
  toDOM() {
    const span = document.createElement('span');
    span.className = 'cm-live-hr-widget';
    return span;
  }
  ignoreEvent() {
    return false;
  }
}

const INLINE_MATH = /\$[^$\n]+\$/g;
const FOOTNOTE_REF = /\[\^[^\]\s]+\](?::)?/g;

const livePreview = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.build(view);
    }

    update(u: ViewUpdate) {
      if (u.docChanged || u.selectionSet || u.viewportChanged) {
        this.decorations = this.build(u.view);
      }
    }

    build(view: EditorView): DecorationSet {
      const decos: Range<Decoration>[] = [];
      const { state } = view;
      const doc = state.doc;

      // every line the selection touches shows raw markdown
      const activeLines = new Set<number>();
      for (const r of state.selection.ranges) {
        const a = doc.lineAt(r.from).number;
        const b = doc.lineAt(r.to).number;
        for (let n = a; n <= b; n++) activeLines.add(n);
      }
      const touchesSelection = (from: number, to: number) => {
        const a = doc.lineAt(from).number;
        const b = doc.lineAt(Math.min(to, doc.length)).number;
        for (let n = a; n <= b; n++) if (activeLines.has(n)) return true;
        return false;
      };

      const mark = (from: number, to: number, cls: string) => {
        if (from < to) decos.push(Decoration.mark({ class: cls }).range(from, to));
      };
      const line = (pos: number, cls: string) => {
        decos.push(Decoration.line({ class: cls }).range(doc.lineAt(pos).from));
      };
      const hide = (from: number, to: number) => {
        if (from < to && !touchesSelection(from, to))
          decos.push(Decoration.replace({}).range(from, to));
      };

      for (const range of view.visibleRanges) {
        syntaxTree(state).iterate({
          from: range.from,
          to: range.to,
          enter: (node) => {
            switch (node.name) {
              case 'StrongEmphasis':
                mark(node.from, node.to, 'cm-live-strong');
                break;
              case 'Emphasis':
                mark(node.from, node.to, 'cm-live-em');
                break;
              case 'Strikethrough':
                mark(node.from, node.to, 'cm-live-strike');
                break;
              case 'InlineCode':
                mark(node.from, node.to, 'cm-live-code');
                break;
              case 'EmphasisMark':
              case 'StrikethroughMark':
                hide(node.from, node.to);
                break;
              case 'CodeMark': {
                // hide inline backticks; leave fence lines visible as anchors
                const parent = node.node.parent;
                if (parent?.name === 'InlineCode') hide(node.from, node.to);
                else mark(node.from, node.to, 'cm-live-mark');
                break;
              }

              case 'ATXHeading1':
              case 'ATXHeading2':
              case 'ATXHeading3':
              case 'ATXHeading4':
              case 'ATXHeading5':
              case 'ATXHeading6':
                line(node.from, `cm-live-h${node.name.slice(-1)}`);
                break;
              case 'HeaderMark': {
                // hide "## " including the following space
                const after = doc.sliceString(node.to, node.to + 1);
                hide(node.from, after === ' ' ? node.to + 1 : node.to);
                break;
              }

              case 'Link': {
                mark(node.from, node.to, 'cm-live-link');
                break;
              }
              case 'Image': {
                mark(node.from, node.to, 'cm-live-em');
                break;
              }
              case 'LinkMark':
              case 'ImageMark':
                hide(node.from, node.to);
                break;
              case 'URL': {
                const parent = node.node.parent;
                if (parent && (parent.name === 'Link' || parent.name === 'Image')) {
                  if (touchesSelection(parent.from, parent.to)) {
                    mark(node.from, node.to, 'cm-live-url');
                  } else {
                    hide(node.from, node.to);
                  }
                }
                break;
              }

              case 'Blockquote': {
                const first = doc.lineAt(node.from).number;
                const last = doc.lineAt(node.to).number;
                for (let n = first; n <= last; n++) {
                  decos.push(Decoration.line({ class: 'cm-live-quote' }).range(doc.line(n).from));
                }
                break;
              }
              case 'QuoteMark':
                mark(node.from, node.to, 'cm-live-mark');
                break;

              case 'ListMark':
                mark(node.from, node.to, 'cm-live-mark');
                break;

              case 'FencedCode': {
                const first = doc.lineAt(node.from).number;
                const last = doc.lineAt(node.to).number;
                for (let n = first; n <= last; n++) {
                  decos.push(
                    Decoration.line({ class: 'cm-live-codeblock' }).range(doc.line(n).from)
                  );
                }
                break;
              }

              case 'HorizontalRule': {
                if (!touchesSelection(node.from, node.to)) {
                  decos.push(
                    Decoration.replace({ widget: new HrWidget() }).range(node.from, node.to)
                  );
                }
                break;
              }
            }
          },
        });

        // things the markdown grammar doesn't know: KaTeX spans, footnote refs
        for (let n = doc.lineAt(range.from).number; n <= doc.lineAt(range.to).number; n++) {
          const l = doc.line(n);
          for (const m of l.text.matchAll(INLINE_MATH)) {
            mark(l.from + m.index, l.from + m.index + m[0].length, 'cm-live-math');
          }
          for (const m of l.text.matchAll(FOOTNOTE_REF)) {
            mark(l.from + m.index, l.from + m.index + m[0].length, 'cm-live-foot');
          }
        }
      }

      return Decoration.set(decos, true);
    }
  },
  { decorations: (v) => v.decorations }
);

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export const MarkdownEditor = forwardRef<EditorHandle, Props>(({ value, onChange }, ref) => {
  const host = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!host.current) return;

    const wrap = (before: string, after: string, placeholder = '') => {
      const view = viewRef.current;
      if (!view) return true;
      const { from, to } = view.state.selection.main;
      const selected = view.state.sliceDoc(from, to) || placeholder;
      view.dispatch({
        changes: { from, to, insert: before + selected + after },
        selection: {
          anchor: from + before.length,
          head: from + before.length + selected.length,
        },
      });
      return true;
    };

    const state = EditorState.create({
      doc: value,
      extensions: [
        history(),
        keymap.of([
          // formatting first so they win over any defaults
          { key: 'Mod-b', run: () => wrap('**', '**', 'bold') },
          { key: 'Mod-i', run: () => wrap('*', '*', 'italic') },
          {
            key: 'Mod-k',
            run: () => {
              const url = window.prompt('Link URL:');
              if (url) wrap('[', `](${url})`, 'text');
              return true;
            },
          },
          ...defaultKeymap,
          ...historyKeymap,
        ]),
        // GFM grammar (strikethrough, tables) — the default is CommonMark-only
        markdown({ base: markdownLanguage }),
        theme,
        livePreview,
        EditorView.lineWrapping,
        EditorView.updateListener.of((u) => {
          if (u.docChanged) onChange(u.state.doc.toString());
        }),
      ],
    });
    const view = new EditorView({ state, parent: host.current });
    viewRef.current = view;
    return () => view.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Replace the document when a different entry is loaded.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const cur = view.state.doc.toString();
    if (value !== cur) {
      view.dispatch({ changes: { from: 0, to: cur.length, insert: value } });
    }
  }, [value]);

  useImperativeHandle(ref, () => ({
    wrapSelection(before, after, placeholder = '') {
      const view = viewRef.current;
      if (!view) return;
      const { from, to } = view.state.selection.main;
      const selected = view.state.sliceDoc(from, to) || placeholder;
      const insert = before + selected + after;
      view.dispatch({
        changes: { from, to, insert },
        selection: {
          anchor: from + before.length,
          head: from + before.length + selected.length,
        },
      });
      view.focus();
    },

    prefixLines(prefix) {
      const view = viewRef.current;
      if (!view) return;
      const { from, to } = view.state.selection.main;
      const startLine = view.state.doc.lineAt(from).number;
      const endLine = view.state.doc.lineAt(to).number;
      const changes = [];
      for (let n = startLine; n <= endLine; n++) {
        const line = view.state.doc.line(n);
        changes.push({ from: line.from, insert: prefix });
      }
      view.dispatch({ changes });
      view.focus();
    },

    // Insert a standalone block (code fence, block math, rule) on its own
    // lines at the cursor.
    insertBlock(text) {
      const view = viewRef.current;
      if (!view) return;
      const { from } = view.state.selection.main;
      const line = view.state.doc.lineAt(from);
      const before = line.text.trim() === '' ? '' : '\n\n';
      const insert = `${before}${text}\n`;
      const pos = line.to;
      view.dispatch({
        changes: { from: pos, insert },
        selection: { anchor: pos + insert.length - 1 },
      });
      view.focus();
    },

    // Reference at the cursor, definition appended at the end, numbered after
    // the highest existing footnote.
    insertFootnote() {
      const view = viewRef.current;
      if (!view) return;
      const text = view.state.doc.toString();
      let max = 0;
      for (const m of text.matchAll(/\[\^(\d+)\]/g)) {
        max = Math.max(max, parseInt(m[1], 10));
      }
      const n = max + 1;
      const { from, to } = view.state.selection.main;
      const needsGap = text.endsWith('\n\n') ? '' : text.endsWith('\n') ? '\n' : '\n\n';
      view.dispatch({
        changes: [
          { from, to, insert: `[^${n}]` },
          { from: text.length, insert: `${needsGap}[^${n}]: ` },
        ],
        selection: { anchor: view.state.doc.length + `[^${n}]`.length - (to - from) + needsGap.length + `[^${n}]: `.length },
      });
      view.focus();
    },
  }));

  return <div ref={host} className="adm-cm" />;
});

MarkdownEditor.displayName = 'MarkdownEditor';
