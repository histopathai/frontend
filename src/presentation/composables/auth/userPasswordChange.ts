import { ref } from 'vue';
import { auth } from '@/main';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { useToast } from 'vue-toastification';
import { useI18n } from 'vue-i18n';
import { validatePassword } from '@/utils/ValidatePassword';

export function usePasswordChange() {
  const currentPassword = ref('');
  const newPassword = ref('');
  const confirmNewPassword = ref('');
  const loading = ref(false);
  const error = ref<string | null>(null);

  const toast = useToast();
  const { t } = useI18n();

  async function handlePasswordChange() {
    loading.value = true;
    error.value = null;

    try {
      if (newPassword.value !== confirmNewPassword.value) {
        error.value = t('auth.password_mismatch');
        toast.error(error.value);
        return;
      }

      const check = validatePassword(newPassword.value);
      if (!check.valid) {
        error.value = check.errors.join(', ');
        check.errors.forEach((err) => toast.error(err));
        return;
      }

      const user = auth.currentUser;
      if (!user || !user.email) {
        error.value = t('auth.no_user_found');
        toast.error(error.value);
        return;
      }

      const credential = EmailAuthProvider.credential(user.email, currentPassword.value);
      await reauthenticateWithCredential(user, credential);

      await updatePassword(user, newPassword.value);

      toast.success(t('auth.password_change_success'));

      currentPassword.value = '';
      newPassword.value = '';
      confirmNewPassword.value = '';
    } catch (err: any) {
      console.error('Password change error:', err);

      if (err.code === 'auth/wrong-password') {
        error.value = t('auth.wrong_current_password');
      } else if (err.code === 'auth/weak-password') {
        error.value = t('auth.password_weak');
      } else if (err.code === 'auth/requires-recent-login') {
        error.value = t('auth.requires_recent_login');
      } else {
        error.value = t('auth.password_change_failed');
      }

      toast.error(error.value);
    } finally {
      loading.value = false;
    }
  }

  return {
    currentPassword,
    newPassword,
    confirmNewPassword,
    loading,
    error,
    handlePasswordChange,
  };
}
