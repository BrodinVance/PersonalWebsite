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
