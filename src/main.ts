import { createApp } from 'vue';
import { createPinia } from 'pinia';
import Toast, { type PluginOptions, POSITION } from 'vue-toastification';
import './assets/main.css';
import 'vue-toastification/dist/index.css';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { useAuthStore } from '@/stores/auth';
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
const authStore = useAuthStore();

app.use(router);
app.use(i18n);

const toastOptions: PluginOptions = {
  timeout: 3000,
  position: POSITION.TOP_RIGHT,
};
app.use(Toast, toastOptions);
app.mount('#app');
