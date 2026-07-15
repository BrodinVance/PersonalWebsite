import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { renderOgCard, OG_HEADERS } from '../../../lib/og';

export async function getStaticPaths() {
  const projects = await getCollection('projects', ({ data }) =>
    import.meta.env.PROD ? !data.draft : true
  );
  return projects.map((project) => ({
    params: { slug: project.id },
    props: {
      title: project.data.title,
      stack: project.data.stack,
      year: project.data.year,
    },
  }));
}

export const GET: APIRoute = async ({ props }) => {
  const { title, stack, year } = props as { title: string; stack: string[]; year: number };
  return new Response(
    await renderOgCard({
      title,
      kind: 'Project',
      meta: stack.length > 0 ? stack.join(' · ') : String(year),
    }),
    { headers: OG_HEADERS }
  );
};
