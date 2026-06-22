import type { RefObject } from 'react';
import type { EditorHandle } from './MarkdownEditor';
import { ColorPicker } from './ColorPicker';

export function Toolbar({ editor }: { editor: RefObject<EditorHandle | null> }) {
  const e = () => editor.current;
  const link = () => {
    const url = window.prompt('Link URL:');
    if (!url) return;
    e()?.wrapSelection('[', `](${url})`, 'text');
  };

  return (
    <div className="adm-toolbar">
      <button type="button" title="Bold" onClick={() => e()?.wrapSelection('**', '**', 'bold')}>
        <b>B</b>
      </button>
      <button type="button" title="Italic" onClick={() => e()?.wrapSelection('*', '*', 'italic')}>
        <i>I</i>
      </button>
      <span className="adm-divider" />
      <button type="button" title="Heading 2" onClick={() => e()?.prefixLines('## ')}>
        H2
      </button>
      <button type="button" title="Heading 3" onClick={() => e()?.prefixLines('### ')}>
        H3
      </button>
      <span className="adm-divider" />
      <button type="button" title="Jot note / quote" onClick={() => e()?.prefixLines('> ')}>
        &ldquo;&rdquo;
      </button>
      <button type="button" title="Bullet list" onClick={() => e()?.prefixLines('- ')}>
        &bull; List
      </button>
      <button type="button" title="Numbered list" onClick={() => e()?.prefixLines('1. ')}>
        1. List
      </button>
      <button type="button" title="Link" onClick={link}>
        Link
      </button>
      <span className="adm-divider" />
      <ColorPicker
        onPick={(val) => e()?.wrapSelection(`<span style="color: ${val}">`, '</span>', 'text')}
      />
    </div>
  );
}
