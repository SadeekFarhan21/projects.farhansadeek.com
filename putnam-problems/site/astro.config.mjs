// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // Needed for canonical and og:url, which have to be absolute.
  site: 'https://putnam-archive.vercel.app',
});
