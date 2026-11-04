import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import sitePlugin from './scripts/site-plugin.mjs';

export default defineConfig({
  plugins: [sitePlugin()],
  build: {
    target: 'es2020',
    cssMinify: true,
    assetsInlineLimit: 2048,
    rollupOptions: {
      input: {
        sr: resolve(import.meta.dirname, 'index.html'),
        en: resolve(import.meta.dirname, 'en/index.html'),
      },
    },
  },
  server: { host: true },
});
