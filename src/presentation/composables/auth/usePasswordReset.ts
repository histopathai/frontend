import { ref } from 'vue';
import { auth } from '@/main'; // Firebase auth instance
import { sendPasswordResetEmail } from 'firebase/auth';
import { useToast } from 'vue-toastification';

export function usePasswordReset() {
  // --- State ---
  const email = ref('');
  const loading = ref(false);
  const error = ref<string | null>(null);
  const successMessage = ref<string | null>(null);

  // --- Bağımlılıklar ---
  const toast = useToast();

  /**
   * Firebase'e şifre sıfırlama e-postası gönderme talebi yollar.
   */
  async function handlePasswordReset() {
    loading.value = true;
    error.value = null;
    successMessage.value = null;

    try {
      await sendPasswordResetEmail(auth, email.value);

      successMessage.value = `Şifre sıfırlama linki ${email.value} adresine gönderildi. Lütfen e-postanızı kontrol edin.`;
      toast.success('Sıfırlama linki gönderildi!');
      email.value = '';
    } catch (err: any) {
      console.error('Password reset error:', err);
      if (err.code === 'auth/user-not-found') {
        error.value = 'Bu e-posta adresi ile kayıtlı bir kullanıcı bulunamadı.';
      } else {
        error.value = 'Şifre sıfırlama linki gönderilemedi. Lütfen tekrar deneyin.';
      }
      toast.error(error.value);
    } finally {
      loading.value = false;
    }
  }

  return {
    email,
    loading,
    error,
    successMessage,
    handlePasswordReset,
  };
}
