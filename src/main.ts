import { createApp } from 'vue';
import { createPinia } from 'pinia';
import Toast, { type PluginOptions } from 'vue-toastification';
import 'vue-toastification/dist/index.css';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

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

// Gerekli infrastructure sınıflarını import et
import { ApiClient } from '@/infrastructure/api/ApiClient';
import { AuthRepository } from '@/infrastructure/repositories/AuthRepository';
import { WorkspaceRepository } from '@/infrastructure/repositories/WorkspaceRepository';
import { PatientRepository } from '@/infrastructure/repositories/PatientRepository';
import { ImageRepository } from '@/infrastructure/repositories/ImageRepository';
import { AnnotationRepository } from '@/infrastructure/repositories/AnnotationRepository';
import { AnnotationTypeRepository } from '@/infrastructure/repositories/AnnotationTypeRepository';

// 2a. Ana API İstemcisini oluştur (.env'den okuyor)
const apiClient = new ApiClient(import.meta.env.VITE_API_BASE_URL);

// 2b. Tüm Repository'leri oluştur ve export et
// Pinia store'ları (örn: useAuthStore) bu 'repositories' nesnesini import edecek.
export const repositories = {
  auth: new AuthRepository(apiClient),
  workspace: new WorkspaceRepository(apiClient),
  patient: new PatientRepository(apiClient),
  image: new ImageRepository(apiClient),
  annotation: new AnnotationRepository(apiClient),
  annotationType: new AnnotationTypeRepository(apiClient),
};
// --- MİMARİ KURULUMU BİTTİ ---

// --- 3. Vue Uygulamasını Başlatma ---
import App from './App.vue';
import router from './router';

const pinia = createPinia();
const app = createApp(App);

// Eklentileri (Plugin) kur
app.use(pinia);
app.use(router);

const toastOptions: PluginOptions = {
  timeout: 3000,
  position: 'top-right',
};
app.use(Toast, toastOptions);
app.mount('#app');
