import { useEffect, useState } from 'react';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';
import type { CSSProperties } from 'react';
import { remarkBlankLineSpacing } from '../../lib/remark-blank-line-spacing.mjs';

// Mirrors the production pipeline (remark-math + blank-line spacing + rehype-katex)
// plus rehype-raw so inline <span style="color:…"> and blank-line spacers render
// exactly as they will on the live post.
const processor = unified()
  .use(remarkParse)
  .use(remarkGfm) // production renders GFM (footnotes, strikethrough, tables)
  .use(remarkMath)
  .use(remarkBlankLineSpacing)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeKatex)
  .use(rehypeStringify, { allowDangerousHtml: true });

export function Preview({ body, accent }: { body: string; accent?: string }) {
  const [html, setHtml] = useState('');

  useEffect(() => {
    let active = true;
    const id = setTimeout(async () => {
      try {
        const out = String(await processor.process(body));
        if (active) setHtml(out);
      } catch {
        /* ignore transient parse errors while typing */
      }
    }, 200);
    return () => {
      active = false;
      clearTimeout(id);
    };
  }, [body]);

  const style = accent
    ? ({ '--accent': accent, '--accent-dim': accent } as CSSProperties)
    : undefined;

  return (
    <div className="adm-preview prose" style={style} dangerouslySetInnerHTML={{ __html: html }} />
  );
}
