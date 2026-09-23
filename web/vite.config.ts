import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const shared = fileURLToPath(new URL('../src', import.meta.url));

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: process.env.VITE_BASE ?? '/', // '/<repo>/' for GitHub Pages
  plugins: [react()],
  resolve: { alias: { '@shared': shared } }, // backend types + categories, type-only or dependency-free
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:8787' },
    fs: { allow: ['..'] },
  },
  build: { outDir: '../dist/web', emptyOutDir: true },
});
