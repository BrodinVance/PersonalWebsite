import type { AstroCookies } from 'astro';
import { getSecret } from 'astro:env/server';

export interface Session {
  login: string;
  token: string; // GitHub access token (kept server-side only)
  iat: number;
}

const COOKIE = '__session';
const STATE_COOKIE = '__oauth_state';
const MAX_AGE = 60 * 60 * 8; // 8 hours
// localhost dev runs over http, where Secure cookies are dropped by the browser.
const SECURE = import.meta.env.PROD;

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64urlEncode(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function getKey(): Promise<CryptoKey> {
  const secret = getSecret('SESSION_SECRET');
  if (!secret) throw new Error('SESSION_SECRET is not set');
  // Derive a 256-bit AES-GCM key from the secret of any length.
  const hash = await crypto.subtle.digest('SHA-256', enc.encode(secret));
  return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

// AES-GCM is authenticated encryption: it provides both secrecy (hides the
// GitHub token) and integrity (tampering fails decryption), so no separate
// HMAC is needed.
export async function seal(session: Session): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = enc.encode(JSON.stringify(session));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)
  );
  const combined = new Uint8Array(iv.length + ct.length);
  combined.set(iv, 0);
  combined.set(ct, iv.length);
  return b64urlEncode(combined);
}

export async function open(value: string): Promise<Session | null> {
  try {
    const key = await getKey();
    const combined = b64urlDecode(value);
    const iv = combined.slice(0, 12);
    const ct = combined.slice(12);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    const session = JSON.parse(dec.decode(pt)) as Session;
    if (!session.login || !session.token) return null;
    if (Date.now() - session.iat > MAX_AGE * 1000) return null;
    return session;
  } catch {
    return null;
  }
}

export async function setSessionCookie(cookies: AstroCookies, session: Session) {
  cookies.set(COOKIE, await seal(session), {
    httpOnly: true,
    secure: SECURE,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export function clearSessionCookie(cookies: AstroCookies) {
  cookies.delete(COOKIE, { path: '/' });
}

export async function getSession(cookies: AstroCookies): Promise<Session | null> {
  const v = cookies.get(COOKIE)?.value;
  return v ? open(v) : null;
}

// CSRF protection for the OAuth round-trip: a random nonce in an httpOnly
// cookie, echoed in the `state` param and compared on callback.
export function setStateCookie(cookies: AstroCookies): string {
  const state = b64urlEncode(crypto.getRandomValues(new Uint8Array(16)));
  cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: SECURE,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  return state;
}

export function checkStateCookie(
  cookies: AstroCookies,
  state: string | null
): boolean {
  const expected = cookies.get(STATE_COOKIE)?.value;
  cookies.delete(STATE_COOKIE, { path: '/' });
  return !!state && !!expected && state === expected;
}

export function isAllowed(login: string): boolean {
  const allowed = getSecret('ALLOWED_GITHUB_LOGIN');
  return !!allowed && login.toLowerCase() === allowed.toLowerCase();
}
