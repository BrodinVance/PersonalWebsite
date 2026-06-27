import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

export const TOPICS = ['quantum', 'math', 'gamedev', 'cooking'] as const;
export type Topic = (typeof TOPICS)[number];

const writing = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/writing' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      date: z.coerce.date(),
      topics: z.array(z.enum(TOPICS)).default([]),
      draft: z.boolean().default(false),
      accent: z.string().optional(),
      cover: image().optional(),
    }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    status: z.enum(['building', 'planned', 'ongoing', 'shipped']),
    stack: z.array(z.string()).default([]),
    year: z.number(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    order: z.number().default(0),
    accent: z.string().optional(),
    // Arbitrary named links (e.g. github, demo, "Trello", "Devlog").
    links: z.record(z.string(), z.string()).default({}),
  }),
});

export const collections = { writing, projects };
