import { ref } from 'vue';
import { createUserWithEmailAndPassword, updateProfile, deleteUser } from 'firebase/auth';
import { i18n } from '@/i18n';
import { validatePassword } from '@/utils/ValidatePassword';
import { useAuthStore } from '@/stores/auth';
import { auth } from '@/main';

export function useRegistration() {
  const displayName = ref('');
  const email = ref('');
  const password = ref('');
  const confirmPassword = ref('');
  const error = ref<string | null>(null);
  const successMessage = ref<string | null>(null);

  const loading = ref(false);

  const authStore = useAuthStore();
  const t = i18n.global.t;

  async function handleRegister() {
    error.value = null;
    successMessage.value = null;

    if (password.value !== confirmPassword.value) {
      error.value = t('auth.register_password_mismatch');
      return;
    }

    const check = validatePassword(password.value);
    if (!check.valid) {
      error.value = check.errors.join(', ');
      return;
    }

    loading.value = true;
    let firebaseUser = null;

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.value,
        password.value
      );

      firebaseUser = userCredential.user;

      await updateProfile(firebaseUser, {
        displayName: displayName.value,
      });

      const token = await firebaseUser.getIdToken();

      try {
        await authStore.register({
          token: token,
          display_name: displayName.value,
          email: email.value,
        });

        successMessage.value = t('auth.register_success');
      } catch (backendError: any) {
        console.error('Backend registration failed, rolling back Firebase user:', backendError);

        try {
          await deleteUser(firebaseUser);
        } catch (deleteError) {
          console.error('❌ Failed to delete Firebase user during rollback:', deleteError);
        }

        error.value = backendError.message || t('auth.register_failed');
        throw backendError;
      }
    } catch (err: any) {
      let msg = t('auth.register_failed');

      if (err.code === 'auth/email-already-in-use') {
        msg = t('auth.register_email_in_use');
      } else if (err.code === 'auth/invalid-email') {
        msg = t('auth.register_invalid_email');
      } else if (err.code === 'auth/weak-password') {
        msg = t('auth.register_weak_password');
      } else if (error.value) {
        msg = error.value;
      }

      if (!error.value) {
        error.value = msg;
      }
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
