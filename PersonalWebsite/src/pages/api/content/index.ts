import type { APIRoute } from 'astro';
import { createGitHub, type Collection } from '../../../lib/github';
import { parse } from '../../../lib/frontmatter';

export const prerender = false;

const COLLECTIONS: Collection[] = ['writing', 'projects', 'pages'];

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function stripExt(name: string) {
  return name.replace(/\.(md|mdx)$/, '');
}

export const GET: APIRoute = async ({ locals, url }) => {
  const token = locals.session?.token;
  if (!token) return json({ error: 'Unauthorized' }, 401);

  const collection = url.searchParams.get('collection') as Collection | null;
  if (!collection || !COLLECTIONS.includes(collection)) {
    return json({ error: 'Invalid collection' }, 400);
  }

  const gh = createGitHub(token);
  const slug = url.searchParams.get('slug');

  try {
    const entries = await gh.listEntries(collection);

    // Read a single entry for editing.
    if (slug) {
      const file = entries.find((e) => stripExt(e.name) === slug);
      if (!file) return json({ error: 'Not found' }, 404);
      const { content, sha } = await gh.readEntry(collection, file.name);
      const { data, body } = parse(content);
      return json({ filename: file.name, slug, data, body, sha });
    }

    // List all entries with parsed frontmatter for the index view.
    const items = [];
    for (const e of entries) {
      const { content, sha } = await gh.readEntry(collection, e.name);
      const { data } = parse(content);
      items.push({ filename: e.name, slug: stripExt(e.name), data, sha });
    }
    return json({ items });
  } catch (e: any) {
    return json({ error: e?.message ?? 'GitHub request failed' }, 500);
  }
};
