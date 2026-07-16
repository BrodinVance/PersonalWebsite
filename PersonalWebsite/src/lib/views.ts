import { getSecret } from 'astro:env/server';
import { Redis } from '@upstash/redis';
import {
  DAY_TTL_SECONDS,
  SEEN_TTL_SECONDS,
  TOTAL_KEY,
  dayHashKey,
  dayKey,
  fieldFor,
  lastNDays,
  seenHash,
  seenKey,
  type ViewType,
} from './views-core';

// The Vercel Marketplace Upstash integration injects KV_-prefixed names;
// standalone Upstash uses UPSTASH_REDIS_-prefixed ones. Accept either.
function creds(): { url: string; token: string } | null {
  const url = getSecret('UPSTASH_REDIS_REST_URL') || getSecret('KV_REST_API_URL');
  const token = getSecret('UPSTASH_REDIS_REST_TOKEN') || getSecret('KV_REST_API_TOKEN');
  return url && token ? { url, token } : null;
}

function client(): Redis | null {
  const c = creds();
  return c ? new Redis(c) : null;
}

export function viewsConfigured(): boolean {
  return creds() !== null;
}

export interface ViewStats {
  totals: Record<string, number>;
  daily: { day: string; counts: Record<string, number> }[];
}

function toCounts(hash: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (hash && typeof hash === 'object') {
    for (const [k, v] of Object.entries(hash as Record<string, unknown>)) {
      const n = Number(v);
      if (Number.isFinite(n)) out[k] = n;
    }
  }
  return out;
}

// Counts one qualified read: dedupes per visitor/post/day, then bumps the
// all-time and per-day hashes. Returns false when unconfigured or a repeat.
export async function recordView(type: ViewType, slug: string, ip: string): Promise<boolean> {
  const redis = client();
  if (!redis) return false;
  const field = fieldFor(type, slug);
  const day = dayKey(new Date());
  const hash = await seenHash(ip, field);
  const first = await redis.set(seenKey(day, hash), 1, { nx: true, ex: SEEN_TTL_SECONDS });
  if (first === null) return false;
  const dk = dayHashKey(day);
  const p = redis.pipeline();
  p.hincrby(TOTAL_KEY, field, 1);
  p.hincrby(dk, field, 1);
  p.expire(dk, DAY_TTL_SECONDS);
  await p.exec();
  return true;
}

export async function getStats(days = 30): Promise<ViewStats | null> {
  const redis = client();
  if (!redis) return null;
  const dayKeys = lastNDays(days, new Date());
  const p = redis.pipeline();
  p.hgetall(TOTAL_KEY);
  for (const d of dayKeys) p.hgetall(dayHashKey(d));
  const res = await p.exec();
  return {
    totals: toCounts(res[0]),
    daily: dayKeys.map((day, i) => ({ day, counts: toCounts(res[i + 1]) })),
  };
}
