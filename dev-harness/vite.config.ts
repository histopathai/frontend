// The patch grid without a backend: `npm run harness`, then open
// http://localhost:5199/dev-harness/patch-grid.html
//
// Tiles come from dev-harness/data (python dev-harness/generate_data.py); the
// API answers are faked in main.ts. Nothing here is part of the production build.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const root = fileURLToPath(new URL('..', import.meta.url));
const tiles = path.join(root, 'dev-harness/data/tiles');
const TYPES: Record<string, string> = { '.dzi': 'application/xml', '.jpg': 'image/jpeg' };

export default defineConfig({
  root,
  plugins: [
    vue(),
    {
      name: 'harness-tiles',
      configureServer(server) {
        // What the tile proxy serves in production: /api/v1/proxy/{image}/image.dzi and its tiles.
        server.middlewares.use('/api/v1/proxy', (req, res, next) => {
          const file = path.normalize(
            path.join(tiles, decodeURIComponent((req.url ?? '').split('?')[0]!))
          );
          if (!file.startsWith(tiles) || !fs.existsSync(file) || !fs.statSync(file).isFile())
            return next();
          res.setHeader('Content-Type', TYPES[path.extname(file)] ?? 'application/octet-stream');
          fs.createReadStream(file).pipe(res);
        });
      },
    },
  ],
  resolve: { alias: { '@': path.join(root, 'src') } },
  // Same origin as the page, so the viewer asks this server for its tiles.
  define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('') },
  server: { port: 5199, strictPort: true },
});
