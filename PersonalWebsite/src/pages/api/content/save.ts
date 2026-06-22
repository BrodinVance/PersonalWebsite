import type { APIRoute } from 'astro';
import { getSecret } from 'astro:env/server';
import { createGitHub, type Collection } from '../../../lib/github';
import { serialize } from '../../../lib/frontmatter';
import { slugify, extensionFor } from '../../../lib/slug';

export const prerender = false;

const COLLECTIONS: Collection[] = ['writing', 'projects'];

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

interface SaveBody {
  collection: Collection;
  data: Record<string, any>;
  body: string;
  slug?: string;
  originalFilename?: string;
  sha?: string;
}

export const POST: APIRoute = async ({ locals, request }) => {
  const token = locals.session?.token;
  if (!token) return json({ error: 'Unauthorized' }, 401);

  let payload: SaveBody;
  try {
    payload = (await request.json()) as SaveBody;
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const { collection, data, body, slug: providedSlug, originalFilename, sha } = payload;
  if (!COLLECTIONS.includes(collection)) return json({ error: 'Invalid collection' }, 400);
  if (!data?.title) return json({ error: 'Title is required' }, 400);
  if (typeof body !== 'string') return json({ error: 'Body is required' }, 400);

  const slug = (providedSlug && slugify(providedSlug)) || slugify(data.title);
  if (!slug) return json({ error: 'Could not derive a slug from the title' }, 400);

  const ext = extensionFor(body);
  const filename = `${slug}.${ext}`;
  const renamed = !!originalFilename && originalFilename !== filename;

  const gh = createGitHub(token);
  const fileContent = serialize(data, body);
  let newSha: string | undefined;

  try {
    const result = await gh.saveEntry({
      collection,
      filename,
      body: fileContent,
      // Only pass sha when updating the same file in place.
      sha: renamed ? undefined : sha,
      message: `${sha && !renamed ? 'Update' : 'Create'} ${collection}/${filename}`,
    });
    newSha = result.content?.sha;

    // If the filename changed (rename or md<->mdx), remove the old file.
    if (renamed) {
      const entries = await gh.listEntries(collection);
      const old = entries.find((e) => e.name === originalFilename);
      if (old) await gh.deleteEntry(collection, originalFilename!, old.sha);
    }
  } catch (e: any) {
    if (e?.status === 409 || e?.status === 422) {
      return json(
        { error: 'This entry changed on the server (or the slug already exists). Reload and try again.' },
        409
      );
    }
    return json({ error: e?.message ?? 'Failed to save' }, 500);
  }

  // The GitHub -> Vercel webhook is unreliable here, so trigger a deploy directly.
  let deployTriggered = false;
  const hook = getSecret('VERCEL_DEPLOY_HOOK_URL');
  if (hook) {
    try {
      await fetch(hook, { method: 'POST' });
      deployTriggered = true;
    } catch {
      /* non-fatal */
    }
  }

  const base = collection === 'writing' ? '/writing/' : '/projects/';
  return json({ ok: true, filename, slug, sha: newSha, url: base + slug, deployTriggered });
};
