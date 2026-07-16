// Pure key/date/hash logic for the read-count system. No astro:* imports so
// this stays loadable by Vitest; the Redis glue lives in views.ts.

export const VIEW_TYPES = ['writing', 'projects'] as const;
export type ViewType = (typeof VIEW_TYPES)[number];

export const TOTAL_KEY = 'views:total';
export const DAY_TTL_SECONDS = 400 * 86400;
export const SEEN_TTL_SECONDS = 86400;

export function fieldFor(type: ViewType, slug: string): string {
  return `${type}/${slug}`;
}

export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function dayHashKey(day: string): string {
  return `views:day:${day}`;
}

export function seenKey(day: string, hash: string): string {
  return `views:seen:${day}:${hash}`;
}

export function lastNDays(n: number, today: Date): string[] {
  const days: string[] = [];
  const t = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  for (let i = n - 1; i >= 0; i--) {
    days.push(dayKey(new Date(t - i * 86400 * 1000)));
  }
  return days;
}

// Only this hash is ever stored — never the raw IP.
export async function seenHash(ip: string, field: string): Promise<string> {
  const data = new TextEncoder().encode(`${ip}|${field}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
