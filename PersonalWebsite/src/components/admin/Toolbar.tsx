import type { RefObject } from 'react';
import type { EditorHandle } from './MarkdownEditor';
import { ColorPicker } from './ColorPicker';

const isMac =
  typeof navigator !== 'undefined' && /Mac|iP(hone|ad|od)/.test(navigator.platform);
const MOD = isMac ? '⌘' : 'Ctrl+';

export function Toolbar({ editor }: { editor: RefObject<EditorHandle | null> }) {
  const e = () => editor.current;
  const link = () => {
    const url = window.prompt('Link URL:');
    if (!url) return;
    e()?.wrapSelection('[', `](${url})`, 'text');
  };

  return (
    <div className="adm-toolbar" role="toolbar" aria-label="Formatting">
      <button
        type="button"
        title={`Bold — ${MOD}B`}
        onClick={() => e()?.wrapSelection('**', '**', 'bold')}
      >
        <b>B</b>
      </button>
      <button
        type="button"
        title={`Italic — ${MOD}I`}
        onClick={() => e()?.wrapSelection('*', '*', 'italic')}
      >
        <i>I</i>
      </button>
      <button
        type="button"
        title="Strikethrough"
        onClick={() => e()?.wrapSelection('~~', '~~', 'gone')}
      >
        <s>S</s>
      </button>
      <span className="adm-divider" />
      <button type="button" title="Section heading" onClick={() => e()?.prefixLines('## ')}>
        H2
      </button>
      <button type="button" title="Sub-heading" onClick={() => e()?.prefixLines('### ')}>
        H3
      </button>
      <span className="adm-divider" />
      <button type="button" title="Quote" onClick={() => e()?.prefixLines('> ')}>
        &ldquo;&rdquo;
      </button>
      <button type="button" title="Bullet list" onClick={() => e()?.prefixLines('- ')}>
        &bull;&ndash;
      </button>
      <button type="button" title="Numbered list" onClick={() => e()?.prefixLines('1. ')}>
        1.
      </button>
      <button type="button" title="Divider rule" onClick={() => e()?.insertBlock('---')}>
        &mdash;
      </button>
      <span className="adm-divider" />
      <button type="button" title={`Link — ${MOD}K`} onClick={link}>
        Link
      </button>
      <button
        type="button"
        title="Inline math (KaTeX) — renders in Preview"
        onClick={() => e()?.wrapSelection('$', '$', 'x^2')}
      >
        &fnof;x
      </button>
      <button
        type="button"
        title="Code block"
        onClick={() => e()?.insertBlock('```\ncode\n```')}
      >
        &lt;/&gt;
      </button>
      <button type="button" title="Footnote" onClick={() => e()?.insertFootnote()}>
        [^]
      </button>
      <span className="adm-divider" />
      <ColorPicker
        onPick={(val) => e()?.wrapSelection(`<span style="color: ${val}">`, '</span>', 'text')}
      />
      <span className="adm-hints" aria-hidden="true">
        <span><u>{MOD}B</u> bold</span>
        <span><u>{MOD}I</u> italic</span>
        <span><u>{MOD}K</u> link</span>
        <span><u>{MOD}E</u> preview</span>
      </span>
    </div>
  );
}
