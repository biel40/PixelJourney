// @ts-check
import { defineConfig } from 'astro/config';

import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';
import preact from '@astrojs/preact';

// https://astro.build/config
export default defineConfig({
  output: 'server',

  adapter: vercel({
    imageService: true,
    imagesConfig: {
      sizes: [320, 640, 1280, 1920],
      formats: ['image/avif', 'image/webp'],
    },
  }),

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [
    preact({ compat: false, include: ['**/components/photo/Lightbox.tsx'] }),
  ],

  image: {
    // Supabase Storage CDN — reemplaza <project-ref> con el ID real del proyecto
    domains: ['<project-ref>.supabase.co'],
  },
});