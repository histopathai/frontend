import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useToast } from 'vue-toastification';

export function useRegistration() {
  // --- State ---
  const displayName = ref('');
  const email = ref('');
  const password = ref('');
  const confirmPassword = ref('');
  const loading = ref(false);
  const error = ref<string | null>(null);
  const successMessage = ref<string | null>(null);

  // --- Bağımlılıklar ---
  const authStore = useAuthStore();
  const toast = useToast();

  async function handleRegister() {
    loading.value = true;
    error.value = null;
    successMessage.value = null;

    if (password.value !== confirmPassword.value) {
      error.value = 'Şifreler uyuşmuyor.';
      toast.error(error.value);
      loading.value = false;
      return;
    }

    try {
      await authStore.register({
        email: email.value,
        password: password.value,
        displayName: displayName.value,
      });

      successMessage.value =
        'Kayıt başarılı! Hesabınız bir yönetici tarafından onaylandıktan sonra giriş yapabilirsiniz.';
      toast.success('Kayıt başarılı!');
      displayName.value = '';
      email.value = '';
      password.value = '';
      confirmPassword.value = '';
    } catch (err: any) {
      console.error('Kayıt hatası:', err);
      if (err.response?.data?.message === 'Email already in use') {
        error.value = 'Bu e-posta adresi zaten kullanılıyor.';
      } else {
        error.value =
          err.response?.data?.message || 'Kayıt sırasında bir hata oluştu. Lütfen tekrar deneyin.';
      }
      toast.error(error.value);
    } finally {
      loading.value = false;
    }
  }

  return {
    displayName,
    email,
    password,
    confirmPassword,
    loading,
    error,
    successMessage,
    handleRegister,
  };
}
