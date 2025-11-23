import { fileURLToPath, URL } from 'node:url';
import fs from 'fs';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueDevTools from 'vite-plugin-vue-devtools';
import { configDefaults } from 'vitest/config';
import { dot } from 'node:test/reporters';

import dotenv from 'dotenv';
dotenv.config();
export default defineConfig({
  plugins: [vue(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    https: {
      key: fs.readFileSync(process.env.KEY_PATH as string),
      cert: fs.readFileSync(process.env.CERT_PATH as string),
    },
    port: 5173,
  },
});
