// @ts-check
import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import caseStudyPlugin from './src/utils/case-study-plugin.mjs';

const base = '/portfolio';

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  // The GitHub Pages address. `base` is the repo name, so every internal link
  // needs to start with it (use import.meta.env.BASE_URL rather than a bare "/").
  site: 'https://vero-romero428.github.io',
  base,
  markdown: {
    processor: satteri({ hastPlugins: [caseStudyPlugin({ base })] }),
  },
});
