import { useEffect, useImperativeHandle, useRef, forwardRef } from 'react';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';

export interface EditorHandle {
  wrapSelection: (before: string, after: string, placeholder?: string) => void;
  prefixLines: (prefix: string) => void;
}

const theme = EditorView.theme(
  {
    '&': {
      color: '#ECE3D4',
      backgroundColor: '#1C1813',
      fontSize: '15px',
      height: '100%',
    },
    '.cm-content': {
      fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
      caretColor: '#CB8E42',
      padding: '1rem 0',
      lineHeight: '1.7',
    },
    '.cm-cursor': { borderLeftColor: '#CB8E42' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
      backgroundColor: 'rgba(203,142,66,0.25)',
    },
    '.cm-gutters': { backgroundColor: '#1C1813', color: '#6E6453', border: 'none' },
    '.cm-activeLine': { backgroundColor: 'rgba(236,227,212,0.03)' },
    '.cm-activeLineGutter': { backgroundColor: 'transparent' },
    '.cm-scroller': { overflow: 'auto' },
  },
  { dark: true }
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
    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        markdown(),
        theme,
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
  }));

  return <div ref={host} className="adm-cm" />;
});

MarkdownEditor.displayName = 'MarkdownEditor';
