import { fileURLToPath, URL } from 'node:url';
import fs from 'fs';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueDevTools from 'vite-plugin-vue-devtools';
import { configDefaults } from 'vitest/config';

export default defineConfig({
  plugins: [vue(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    exclude: [...configDefaults.exclude, 'node_modules/**'],
  },
  server: {
    https: {
      key: fs.readFileSync('/Users/yasin/.certs/localhost+2-key.pem'),
      cert: fs.readFileSync('/Users/yasin/.certs/localhost+2.pem'),
    },
    port: 5173,
  },
});
