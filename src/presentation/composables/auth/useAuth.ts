import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { auth } from '@/main';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useToast } from 'vue-toastification';

export function useAuth() {
  // --- State (Reaktif Değişkenler) ---
  const email = ref('');
  const password = ref('');
  const loading = ref(false);
  const error = ref<string | null>(null);

  // --- Bağımlılıklar ---
  const router = useRouter();
  const authStore = useAuthStore();
  const toast = useToast();

  // --- Fonksiyonlar ---
  async function handleLogin() {
    loading.value = true;
    error.value = null;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.value, password.value);
      const token = await userCredential.user.getIdToken();
      await authStore.login(token);
      toast.success('Giriş başarılı!');
      router.push({ name: 'DashboardHome' });
    } catch (err: any) {
      console.error('Giriş hatası:', err);
      loading.value = false;

      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential'
      ) {
        error.value = 'E-posta veya şifre hatalı.';
      } else {
        error.value = 'Giriş yapılırken bir hata oluştu. Lütfen tekrar deneyin.';
      }
      toast.error(error.value);
    }
  }

  return {
    // State
    email,
    password,
    loading,
    error,
    // Fonksiyon
    handleLogin,
  };
}
