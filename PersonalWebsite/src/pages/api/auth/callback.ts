import type { APIRoute } from 'astro';
import { getSecret } from 'astro:env/server';
import { Octokit } from '@octokit/rest';
import { checkStateCookie, setSessionCookie, isAllowed } from '../../../lib/auth';

export const prerender = false;

export const GET: APIRoute = async ({ cookies, url, redirect }) => {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!checkStateCookie(cookies, state)) {
    return new Response('Invalid OAuth state', { status: 400 });
  }
  if (!code) return new Response('Missing code', { status: 400 });

  const clientId = getSecret('GITHUB_CLIENT_ID');
  const clientSecret = getSecret('GITHUB_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    return new Response('OAuth is not configured', { status: 500 });
  }

  // Exchange the code for an access token.
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
  });
  const tokenJson = (await tokenRes.json()) as { access_token?: string };
  const token = tokenJson.access_token;
  if (!token) return new Response('Failed to obtain access token', { status: 401 });

  // Identify the user and enforce the single-user allowlist.
  const octokit = new Octokit({ auth: token });
  const { data: user } = await octokit.users.getAuthenticated();
  if (!isAllowed(user.login)) {
    return new Response('Not authorized', { status: 403 });
  }

  await setSessionCookie(cookies, { login: user.login, token, iat: Date.now() });
  return redirect('/admin', 302);
};
