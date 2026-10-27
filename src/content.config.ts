import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Case studies. Adding a new one means adding one Markdown file to
// src/content/work/ with this frontmatter.
const work = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/work' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    org: z.string(),
    context: z.string(),
    order: z.number(),
    // Set to false to keep a case study live but off the homepage
    onHomepage: z.boolean().default(true),
  }),
});

export const collections = { work };
