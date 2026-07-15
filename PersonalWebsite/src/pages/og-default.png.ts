import type { APIRoute } from 'astro';
import { renderOgCard, OG_HEADERS } from '../lib/og';

// The site-wide share card — referenced as the fallback og:image in SEO.astro.
export const GET: APIRoute = async () =>
  new Response(
    await renderOgCard({
      title: 'Games, software, and whatever I’m learning.',
      kind: 'brodinvance.com',
      meta: 'Honours Math · University of Waterloo',
    }),
    { headers: OG_HEADERS }
  );
