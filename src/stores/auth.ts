import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { User } from '@/core/entities/User';
import type { RegisterRequest, ChangePasswordRequest } from '@/core/repositories/IAuthRepository';
import { repositories } from '@/services';
import router from '@/router';
import { useToast } from 'vue-toastification';
import { i18n } from '@/i18n';

const t = i18n.global.t;
const authRepo = repositories.auth;

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const session = ref<Session | null>(null);
  const isInitialized = ref(false);

  const toast = useToast();

  const isAuthenticated = computed(() => !!user.value && !!session.value);
  const isLoading = computed(() => loading.value);
  const isAdmin = computed(() => user.value?.role.isAdmin() ?? false);
  const isApproved = computed(() => user.value?.adminApproved ?? false);

  const userInitials = computed(() => {
    if (user.value?.displayName) {
      return user.value.displayName.charAt(0).toUpperCase();
    }
    if (user.value?.email) {
      return user.value.email.charAt(0).toUpperCase();
    }
    return '?';
  });

  function clearAuthData() {
    user.value = null;
    session.value = null;
    error.value = null;
  }

  async function initializeAuth(): Promise<void> {
    if (isInitialized.value) return;

    loading.value = true;
    try {
      const currentSession = await authRepo.checkSession();

      if (currentSession) {
        session.value = currentSession;

        const profile = await authRepo.getProfile();
        user.value = profile;

        console.log('Session restored successfully');
      } else {
        console.log('No active session found');
        clearAuthData();
      }
    } catch (err: any) {
      console.error('Auth initialization error:', err);
      clearAuthData();
    } finally {
      loading.value = false;
      isInitialized.value = true;
    }
  }

  async function register(payload: RegisterRequest): Promise<User> {
    loading.value = true;
    try {
      const newUser = await authRepo.register(payload);
      toast.success(t('auth.register_success'));
      return newUser;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || t('auth.register_failed');
      error.value = errorMessage;
      toast.error(errorMessage);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function login(token: string): Promise<void> {
    loading.value = true;
    try {
      const createdSession = await authRepo.login(token);
      session.value = createdSession;

      const profile = await authRepo.getProfile();
      user.value = profile;

      if (!profile.adminApproved) {
        toast.warning(t('auth.login_not_approved'));
      } else {
        toast.success(t('auth.login_success'));
      }

      console.log('Login successful');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || t('auth.login_failed');
      error.value = errorMessage;
      toast.error(errorMessage);
      clearAuthData();
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function getProfile(): Promise<User> {
    loading.value = true;
    error.value = null;
    try {
      const profile = await authRepo.getProfile();
      user.value = profile;
      return profile;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || t('auth.profile_failed');
      error.value = errorMessage;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function refreshProfile(): Promise<void> {
    if (!isAuthenticated.value) return;

    try {
      const profile = await authRepo.getProfile();
      user.value = profile;
    } catch (err: any) {
      console.error('Profile refresh failed:', err);
      // Silent fail - UI'ı bozmayalım
    }
  }

  async function logout(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await authRepo.logout();
      toast.success(t('auth.logout_success'));
    } catch (err: any) {
      console.error('Logout error:', err);
      toast.warning(t('auth.logout_failed'));
    } finally {
      clearAuthData();
      loading.value = false;
      router.push('/auth/login');
    }
  }

  async function checkAuth(): Promise<boolean> {
    try {
      if (isInitialized.value && isAuthenticated.value) {
        return true;
      }

      if (!isInitialized.value) {
        await initializeAuth();
      }

      return isAuthenticated.value;
    } catch (err) {
      console.error('Auth check failed:', err);
      return false;
    }
  }

  async function changePassword(newPassword: string): Promise<void> {
    loading.value = true;
    try {
      const payload: ChangePasswordRequest = { new_password: newPassword };
      await authRepo.changePassword(payload);
      toast.success(t('auth.change_password_success'));
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || t('auth.change_password_failed');
      error.value = errorMessage;
      toast.error(errorMessage);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteAccount(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await authRepo.deleteAccount();
      toast.success(t('auth.delete_account_success'));
      clearAuthData();
      router.push('/auth/login');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || t('auth.delete_account_failed');
      error.value = errorMessage;
      toast.error(errorMessage);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function listSessions(): Promise<Session[]> {
    loading.value = true;
    error.value = null;
    try {
      return await authRepo.listMySessions();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || t('auth.list_sessions_failed');
      error.value = errorMessage;
      toast.error(errorMessage);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function revokeSession(sessionId: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await authRepo.revokeSession(sessionId);
      toast.success(t('auth.revoke_session_success'));
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || t('auth.revoke_session_failed');
      error.value = errorMessage;
      toast.error(errorMessage);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function handleUnauthorized(): void {
    console.warn('Unauthorized - clearing auth state');

    if (isAuthenticated.value) {
      clearAuthData();
      toast.error(t('auth.session_expired'));
      router.push('/auth/login');
    }

    user.value = null;
    toast.error('Oturumunuzun süresi doldu. Lütfen tekrar giriş yapın.');
    router.push({ name: 'Login' });
  }

  return {
    // State
    loading,
    error,
    user,
    session,
    isInitialized,

    // Getters
    isAuthenticated,
    isAdmin,
    isApproved,
    userInitials,

    // Actions
    initializeAuth,
    register,
    login,
    logout,
    getProfile,
    refreshProfile,
    checkAuth,
    changePassword,
    deleteAccount,
    listSessions,
    revokeSession,
    handleUnauthorized,
    clearAuthData,
  };
});
