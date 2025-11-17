import { ref } from 'vue';
import { auth } from '@/main';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useToast } from 'vue-toastification';
import { useI18n } from 'vue-i18n';

export function usePasswordReset() {
  const email = ref('');
  const loading = ref(false);
  const error = ref<string | null>(null);
  const successMessage = ref<string | null>(null);

  const toast = useToast();
  const { t } = useI18n();

  async function handlePasswordReset() {
    loading.value = true;
    error.value = null;
    successMessage.value = null;

    try {
      await sendPasswordResetEmail(auth, email.value);

      successMessage.value = t('auth.password_reset_email_sent', { email: email.value });
      toast.success(t('auth.password_reset_success'));

      email.value = '';
    } catch (err: any) {
      console.error('Password reset error:', err);

      if (err.code === 'auth/user-not-found') {
        error.value = t('auth.user_not_found');
      } else if (err.code === 'auth/invalid-email') {
        error.value = t('auth.invalid_email');
      } else {
        error.value = t('auth.password_reset_failed');
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
