import type { APIRoute } from 'astro';
import { getSecret } from 'astro:env/server';
import { setStateCookie } from '../../../lib/auth';

export const prerender = false;

export const GET: APIRoute = ({ cookies, url, redirect }) => {
  const clientId = getSecret('GITHUB_CLIENT_ID');
  if (!clientId) return new Response('GITHUB_CLIENT_ID is not set', { status: 500 });

  const state = setStateCookie(cookies);
  const redirectUri = new URL('/api/auth/callback', url.origin).toString();

  const ghUrl = new URL('https://github.com/login/oauth/authorize');
  ghUrl.searchParams.set('client_id', clientId);
  ghUrl.searchParams.set('redirect_uri', redirectUri);
  // public_repo is enough because the content repo is public.
  ghUrl.searchParams.set('scope', 'public_repo');
  ghUrl.searchParams.set('state', state);
  ghUrl.searchParams.set('allow_signup', 'false');

  return redirect(ghUrl.toString(), 302);
};
