import { fileURLToPath, URL } from 'node:url';
import fs from 'fs';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueDevTools from 'vite-plugin-vue-devtools';
import dotenv from 'dotenv';

// .env dosyasını yükle
dotenv.config();

export default defineConfig(({ command, mode }) => {
  // HTTPS konfigürasyonunu hazırlayalım
  let httpsConfig = undefined;

  // Sadece key ve cert yolları tanımlıysa VE dosyalar diskte mevcutsa HTTPS'i aktif et
  const keyPath = process.env.VITE_TLS_KEY_PATH;
  const certPath = process.env.VITE_TLS_CERT_PATH;

  if (keyPath && certPath && fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    httpsConfig = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };
  } else {
    // Docker build sırasında veya sertifika yoksa burası çalışır
    // console.log('⚠️ SSL sertifikaları bulunamadı veya tanımlı değil, HTTP modunda devam ediliyor.');
  }

  return {
    plugins: [vue(), vueDevTools()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      // Dinamik https ayarı
      https: httpsConfig,
      port: 5173,
      proxy: {
        '/microscope-proxy': {
          target: 'http://192.168.7.2:8080',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/microscope-proxy/, ''),
        },
      },
    },
  };
});
