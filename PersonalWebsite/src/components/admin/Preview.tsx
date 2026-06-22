import { useEffect, useState } from 'react';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';
import type { CSSProperties } from 'react';

// Mirrors the production pipeline (remark-math + rehype-katex) plus rehype-raw
// so inline <span style="color:…"> renders exactly as it will on the live post.
const processor = unified()
  .use(remarkParse)
  .use(remarkMath)
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
