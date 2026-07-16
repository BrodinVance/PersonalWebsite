import { defineMiddleware } from 'astro:middleware';
import { getSession, isAllowed } from './lib/auth';

const AUTH_PATHS = ['/api/auth/login', '/api/auth/callback', '/api/auth/logout'];
// The read-count beacon posts from public (unauthenticated) pages.
const PUBLIC_API_PATHS = ['/api/views/hit'];

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');
  const isApi = pathname.startsWith('/api/');
  const isAuthRoute = AUTH_PATHS.includes(pathname) || PUBLIC_API_PATHS.includes(pathname);

  // Public pages never match these prefixes, so they pass straight through
  // (no cookie read, no secret access at build time).
  if ((isAdmin || isApi) && !isAuthRoute) {
    const session = await getSession(context.cookies);
    if (!session || !isAllowed(session.login)) {
      if (isAdmin) return context.redirect('/api/auth/login', 302);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    context.locals.session = { login: session.login, token: session.token };
  }

  return next();
});
