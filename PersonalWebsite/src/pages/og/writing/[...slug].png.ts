import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { renderOgCard, OG_HEADERS } from '../../../lib/og';
import { TOPIC_LABELS } from '../../../lib/topics';

// One share card per post, generated at build. Same draft filter as the
// post pages themselves, so the set of cards always matches the set of pages.
export async function getStaticPaths() {
  const posts = await getCollection('writing', ({ data }) =>
    import.meta.env.PROD ? !data.draft : true
  );
  return posts.map((post) => ({
    params: { slug: post.id },
    props: {
      title: post.data.title,
      date: post.data.date,
      topic: post.data.topics[0] ? TOPIC_LABELS[post.data.topics[0]] : undefined,
    },
  }));
}

export const GET: APIRoute = async ({ props }) => {
  const { title, date, topic } = props as { title: string; date: Date; topic?: string };
  const when = date.toLocaleDateString('en-CA', { year: 'numeric', month: 'long' });
  return new Response(
    await renderOgCard({
      title,
      kind: 'Writing',
      meta: topic ? `${when} · ${topic}` : when,
    }),
    { headers: OG_HEADERS }
  );
};
