import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
//import { useAuthStore } from '@/stores/auth';

import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/main';

interface LoginErrors {
  email: string | null;
  password: string | null;
}

export function useLoginForm() {
  //const authStore = useAuthStore();
  const router = useRouter();
  const toast = useToast();

  const email = ref('');
  const password = ref('');

  const errors = reactive<LoginErrors>({
    email: null,
    password: null,
  });

  // --- Doğrulama Mantığı ---
  const validateForm = (): boolean => {
    errors.email = null;
    errors.password = null;
    let isValid = true;

    if (!email.value) {
      errors.email = 'E-posta adresi gerekli.';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email.value)) {
      errors.email = 'Geçerli bir e-posta adresi girin.';
      isValid = false;
    }

    if (!password.value) {
      errors.password = 'Şifre gerekli.';
      isValid = false;
    }
    return isValid;
  };

  // --- Giriş İşlemi Mantığı (Use Case) ---
  const handleLogin = async () => {
    if (!validateForm()) return;

    //authStore.loading = true;
    //authStore.error = null;

    try {
      // 1. Dış sağlayıcıdan (Firebase) token al
      const userCredential = await signInWithEmailAndPassword(auth, email.value, password.value);
      const idToken = await userCredential.user.getIdToken();

      // 2. Token'ı 'core' katmanının beklediği şekilde store üzerinden sisteme login et
      //await authStore.verifyToken(idToken); // Bu fonksiyonu authStore'da tanımlayacağız

      toast.success('Giriş başarılı!');
      router.push('/dashboard'); // Başarı durumunda yönlendirme
    } catch (error: any) {
      // Hata yönetimi
      console.error('Giriş Hatası:', error);
      let errorMessage = 'Giriş başarısız oldu. Lütfen bilgilerinizi kontrol edin.';

      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          errorMessage = 'Geçersiz e-posta veya şifre.';
          errors.email = ' ';
          errors.password = ' ';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Geçersiz e-posta formatı.';
          errors.email = errorMessage;
          break;
        case 'auth/user-disabled':
          errorMessage = 'Hesabınız devre dışı bırakılmış.';
          errors.email = ' ';
          break;
        default:
          errorMessage = error.response?.data?.message || error.message || errorMessage;
      }

      toast.error(errorMessage);
      //authStore.error = errorMessage;
    } finally {
      //authStore.loading = false;
    }
  };

  return {
    email,
    password,
    errors,
    //isLoading: authStore.loading,
    handleLogin,
  };
}
