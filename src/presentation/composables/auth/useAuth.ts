import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { auth } from '@/main';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useToast } from 'vue-toastification';
import { i18n } from '@/i18n';

const t = i18n.global.t;

export function useAuth() {
  const email = ref('');
  const password = ref('');
  const error = ref<string | null>(null);

  const router = useRouter();
  const authStore = useAuthStore();
  const toast = useToast();

  async function handleLogin() {
    error.value = null;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.value, password.value);
      const token = await userCredential.user.getIdToken();
      await authStore.login(token);
      router.push({ name: 'Home' });
    } catch (err: any) {
      if (err.code?.startsWith('auth/')) {
        error.value = getFirebaseErrorMessage(err.code);
        toast.error(error.value);
      } else {
        console.log('Auth login error:', err);
        error.value = authStore.error || t('auth.login_failed');
      }
    }
  }

  return {
    email,
    password,
    loading: computed(() => authStore.isLoading),
    error,
    handleLogin,
  };
}

function getFirebaseErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    'auth/user-not-found': t('auth.user_not_found'),
    'auth/wrong-password': t('auth.wrong_password'),
    'auth/invalid-credential': t('auth.invalid_credentials'),
    'auth/too-many-requests': t('auth.too_many_attempts'),
    'auth/invalid-email': t('auth.invalid_email'),
  };
  return messages[code] || t('auth.firebase_error');
}
