import { ref, computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useToast } from 'vue-toastification';

/**
 * Profil sayfası formları (örn: şifre değiştirme) için mantığı yönetir.
 */
export function useProfileForm() {
  const authStore = useAuthStore();
  const toast = useToast();

  const newPassword = ref('');
  const confirmNewPassword = ref('');

  const errors = ref({
    newPassword: null as string | null,
    confirmNewPassword: null as string | null,
  });

  const isLoading = computed(() => authStore.loading);

  const validateForm = (): boolean => {
    errors.value.newPassword = null;
    errors.value.confirmNewPassword = null;
    let isValid = true;

    if (!newPassword.value) {
      errors.value.newPassword = 'Yeni şifre gerekli.';
      isValid = false;
    } else if (newPassword.value.length < 8) {
      errors.value.newPassword = 'Yeni şifre en az 8 karakter olmalı.';
      isValid = false;
    }

    if (newPassword.value !== confirmNewPassword.value) {
      errors.value.confirmNewPassword = 'Şifreler eşleşmiyor.';
      isValid = false;
    }
    return isValid;
  };

  const handleChangePassword = async () => {
    if (!validateForm()) return;

    try {
      await authStore.changePassword(newPassword.value);
      toast.success('Şifre başarıyla değiştirildi.');
      newPassword.value = '';
      confirmNewPassword.value = '';
    } catch (err: any) {
      toast.error(authStore.error || 'Beklenmeyen bir hata oluştu.');
      console.error('Şifre değiştirme hatası:', err);
    }
  };

  return {
    newPassword,
    confirmNewPassword,
    errors,
    isLoading,
    handleChangePassword,
  };
}
