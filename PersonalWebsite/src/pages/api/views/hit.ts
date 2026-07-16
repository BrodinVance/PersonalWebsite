import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { recordView } from '../../../lib/views';
import { VIEW_TYPES, type ViewType } from '../../../lib/views-core';

export const prerender = false;

const SLUG_RE = /^[a-z0-9][a-z0-9/_-]{0,127}$/i;

function isViewType(v: unknown): v is ViewType {
  return typeof v === 'string' && (VIEW_TYPES as readonly string[]).includes(v);
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  let body: { type?: unknown; slug?: unknown };
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  const { type, slug } = body ?? {};
  if (!isViewType(type) || typeof slug !== 'string' || !SLUG_RE.test(slug)) {
    return new Response(null, { status: 400 });
  }
  // Only real entries may create counter fields.
  const entries = await getCollection(type);
  if (!entries.some((e) => e.id === slug)) {
    return new Response(null, { status: 400 });
  }
  let ip = 'unknown';
  try {
    ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || clientAddress || 'unknown';
  } catch {
    // clientAddress can throw outside request context; hash 'unknown' instead.
  }
  await recordView(type, slug, ip);
  return new Response(null, { status: 204 });
};
