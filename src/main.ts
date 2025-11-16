import { createApp } from 'vue';
import { createPinia } from 'pinia';
import Toast, { type PluginOptions } from 'vue-toastification';
import './assets/main.css';
import 'vue-toastification/dist/index.css';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
// --- GEÇİCİ KOD İÇİN IMPORTLAR ---
import { useAuthStore } from '@/stores/auth';
import { User } from '@/core/entities/User';
import { Session } from '@/core/entities/Session';

import { i18n } from './i18n';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);

import App from './App.vue';
import router from './router';

const pinia = createPinia();
const app = createApp(App);

app.use(pinia);

// --- BAŞLANGIÇ: TEST İÇİN GEÇİCİ GİRİŞ KODU ---
// Bu blok, backend'i atlayarak sizi 'admin' olarak giriş yapmış sayar.
// Testleriniz bittiğinde bu bloğu sildiğinizden emin olun!
try {
  const authStore = useAuthStore();

  const mockUserData = {
    user_id: 'mock-admin-id-123',
    email: 'admin@test.com',
    display_name: 'Test Admin',
    status: 'active', // Hesabın 'active' olması önemli
    role: 'admin', // Admin sayfalarını test etmek için 'admin'
    admin_approved: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockSessionData = {
    id: 'mock-session-id-123',
    user_id: 'mock-admin-id-123',
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // 1 gün geçerli
    last_used_at: new Date().toISOString(),
  };

  // Store'daki 'user' ve 'session' state'lerini manuel olarak doldur
  authStore.user = User.create(mockUserData);
  console.warn(
    '!!! UYARI: Backend login atlandı. "Test Admin" olarak manuel giriş yapıldı. (src/main.ts) !!!'
  );
} catch (e) {
  console.error('Manuel giriş mock hatası:', e);
}
// --- BİTİŞ: TEST İÇİN GEÇİCİ GİRİŞ KODU ---
app.use(router);
app.use(i18n);

const toastOptions: PluginOptions = {
  timeout: 3000,
  position: 'top-right',
};
app.use(Toast, toastOptions);
app.mount('#app');
