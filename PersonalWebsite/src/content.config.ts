import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

export const TOPICS = ['math-physics', 'games', 'food', 'perspectives'] as const;
export type Topic = (typeof TOPICS)[number];

const writing = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/writing' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      // Tolerant on purpose: the editor enforces a description, but a missing
      // one must degrade to empty copy, never a failed deploy.
      description: z.string().default(''),
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
    // Same rationale as the writing schema: never fail the deploy over copy.
    description: z.string().default(''),
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

// Fixed-membership collection backing the admin-editable page copy
// (home intro/currently, about prose/links). Slugs: home, about.
const pages = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/pages' }),
  schema: z.object({
    intro: z.string().optional(),
    currently: z.array(z.string()).default([]),
    links: z.record(z.string(), z.string()).default({}),
  }),
});

export const collections = { writing, projects, pages };
