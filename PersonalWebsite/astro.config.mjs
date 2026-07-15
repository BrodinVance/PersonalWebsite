// @ts-check
import { defineConfig, envField } from 'astro/config';
import { unified, rehypeHeadingIds } from '@astrojs/markdown-remark';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { remarkReadingTime } from './src/lib/remark-reading-time.mjs';
import { remarkBlankLineSpacing } from './src/lib/remark-blank-line-spacing.mjs';

export default defineConfig({
  site: 'https://brodinvance.com',
  // Default output is 'static'. Adding an adapter lets individual routes
  // opt into on-demand rendering via `export const prerender = false`.
  // The whole public site stays static; only /admin and /api/* run as functions.
  adapter: vercel({
    // Requires Web Analytics to be enabled on the Vercel project dashboard.
    webAnalytics: { enabled: true },
  }),
  integrations: [mdx(), react(), sitemap()],
  // Hover-prefetch every internal link so MPA navigation resolves near-instantly.
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath, remarkReadingTime, remarkBlankLineSpacing],
      rehypePlugins: [
        rehypeKatex,
        // Astro normally injects heading ids after user plugins run, which is
        // too late for autolink — so ids are assigned explicitly first, then
        // each heading gets a hover-reveal § deep link. Styles: global.css.
        rehypeHeadingIds,
        [
          rehypeAutolinkHeadings,
          {
            behavior: 'append',
            properties: { class: 'h-anchor', ariaLabel: 'Link to this section' },
            content: { type: 'text', value: '§' },
          },
        ],
      ],
    }),
    shikiConfig: {
      // Blue-native dark theme to match the blue-hour palette.
      theme: 'night-owl',
    },
  },
  // All marked optional so the build (which loads middleware during prerender)
  // never fails when secrets are absent; presence is enforced at runtime in code.
  env: {
    schema: {
      GITHUB_CLIENT_ID: envField.string({ context: 'server', access: 'secret', optional: true }),
      GITHUB_CLIENT_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
      SESSION_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
      ALLOWED_GITHUB_LOGIN: envField.string({ context: 'server', access: 'secret', optional: true }),
      GITHUB_REPO: envField.string({ context: 'server', access: 'secret', optional: true }),
      GITHUB_BRANCH: envField.string({ context: 'server', access: 'secret', default: 'main' }),
      VERCEL_DEPLOY_HOOK_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
});
