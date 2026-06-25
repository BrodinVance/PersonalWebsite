import type { APIRoute } from 'astro';
import { getSecret } from 'astro:env/server';
import { createGitHub, type Collection } from '../../../lib/github';

export const prerender = false;

const COLLECTIONS: Collection[] = ['writing', 'projects'];

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

interface DeleteBody {
  collection: Collection;
  filename: string;
  sha?: string;
  title?: string;
}

export const POST: APIRoute = async ({ locals, request }) => {
  const token = locals.session?.token;
  if (!token) return json({ error: 'Unauthorized' }, 401);

  let payload: DeleteBody;
  try {
    payload = (await request.json()) as DeleteBody;
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const { collection, filename, sha, title } = payload;
  if (!COLLECTIONS.includes(collection)) return json({ error: 'Invalid collection' }, 400);
  if (!filename) return json({ error: 'filename is required' }, 400);

  const gh = createGitHub(token);
  const label = collection === 'writing' ? 'Writing' : 'Project';
  const message = `${label} "${title ?? filename}" Delete`;

  try {
    // Look up the current sha if the client didn't supply one.
    let useSha = sha;
    if (!useSha) {
      const entries = await gh.listEntries(collection);
      const found = entries.find((e) => e.name === filename);
      if (!found) return json({ error: 'Not found' }, 404);
      useSha = found.sha;
    }
    await gh.deleteEntry(collection, filename, useSha, message);
  } catch (e: any) {
    if (e?.status === 409) {
      return json({ error: 'This entry changed on the server. Reload and try again.' }, 409);
    }
    return json({ error: e?.message ?? 'Failed to delete' }, 500);
  }

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

  return json({ ok: true, deployTriggered });
};
