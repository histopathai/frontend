import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { User } from '@/core/entities/User';
import type { RegisterRequest, ChangePasswordRequest } from '@/core/repositories/IAuthRepository';
import { repositories } from '@/services';
import router from '@/router';
import { useToast } from 'vue-toastification';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const loading = ref(false);

  const isAuthenticated = computed(() => !!user.value);
  const isAdmin = computed(() => user.value?.isAdmin() ?? false);

  const userInitials = computed(() => {
    if (user.value?.displayName) {
      return user.value.displayName.charAt(0).toUpperCase();
    }
    if (user.value?.email) {
      return user.value.email.charAt(0).toUpperCase();
    }
    return '?';
  });

  const toast = useToast();
  const authRepo = repositories.auth;

  async function register(payload: RegisterRequest): Promise<User> {
    loading.value = true;
    try {
      const response = await authRepo.register(payload);
      toast.success('Kayıt başarılı! Hesabınız onay bekliyor.');
      return response;
    } catch (err: any) {
      console.error('Register Error:', err);
      toast.error(err.response?.data?.message || 'Kayıt sırasında bir hata oluştu.');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function login(token: string): Promise<User> {
    loading.value = true;
    try {
      await authRepo.login(token);
      const loggedInUser = await getProfile();

      toast.success(`Hoş geldiniz, ${loggedInUser.displayName}!`);
      return loggedInUser;
    } catch (err: any) {
      console.error('Login Error:', err);
      toast.error(err.response?.data?.message || 'Giriş sırasında bir hata oluştu.');
      user.value = null;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function getProfile(): Promise<User> {
    const profileData = await authRepo.getProfile();
    user.value = profileData;
    return profileData;
  }

  async function checkAuth() {
    try {
      await getProfile();
    } catch (err) {
      user.value = null;
    }
  }

  async function changePassword(newPassword: string): Promise<void> {
    loading.value = true;
    try {
      const payload: ChangePasswordRequest = { new_password: newPassword };
      await authRepo.changePassword(payload);
      toast.success('Şifreniz başarıyla değiştirildi.');
    } catch (err: any) {
      console.error('Change Password Error:', err);
      toast.error(err.response?.data?.message || 'Şifre değiştirilemedi.');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function logout() {
    loading.value = true;
    try {
      await authRepo.logout();
    } catch (err: any) {
      console.error('Logout API Error:', err);
    } finally {
      user.value = null;
      loading.value = false;
      toast.info('Başarıyla çıkış yapıldı.');
      router.push({ name: 'Login' });
    }
  }

  function handleUnauthorized() {
    if (!isAuthenticated.value) {
      return;
    }

    user.value = null;
    toast.error('Oturumunuzun süresi doldu. Lütfen tekrar giriş yapın.');
    router.push({ name: 'Login' });
  }

  return {
    // State
    user,
    loading,

    // Getters
    isAuthenticated,
    isAdmin,
    userInitials,

    // Actions
    register,
    login,
    logout,
    getProfile,
    checkAuth,
    changePassword,
    handleUnauthorized,
  };
});
