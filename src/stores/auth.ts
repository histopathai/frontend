import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { repositories } from '@/services';
import { Session } from '@/core/entities/Session';
import { User } from '@/core/entities/User';
import type { BackendRegisterRequest } from '@/core/repositories/IAuthRepository';
import router from '@/router';
import { useToast } from 'vue-toastification';
import { i18n } from '@/i18n';

const t = i18n.global.t;
export const useAuthStore = defineStore('auth', () => {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const user = ref<User | null>(null);
  const session = ref<Session | null>(null);
  const isInitialized = ref(false);

  const toast = useToast();

  const isAuthenticated = computed(() => !!user.value && !!session.value);
  const isLoading = computed(() => loading.value);
  const isAdmin = computed(() => user.value?.role.isAdmin() ?? false);
  const isApproved = computed(() => user.value?.adminApproved ?? false);

  // --- EKLENEN KISIM: Token Getter ---
  // Session ID'yi token olarak dışarı açıyoruz.
  // Bu sayede componentlerde authStore.token şeklinde erişebiliriz.
  const token = computed(() => session.value?.id);

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
      const currentSession = await repositories.auth.checkSession();

      if (currentSession) {
        session.value = currentSession;

        const profile = await repositories.auth.getProfile();
        user.value = profile;
      } else {
        clearAuthData();
      }
    } catch (err: any) {
      clearAuthData();
    } finally {
      loading.value = false;
      isInitialized.value = true;
    }
  }

  async function register(payload: BackendRegisterRequest): Promise<User> {
    loading.value = true;
    error.value = null;
    try {
      const newUser = await repositories.auth.register(payload);
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
    error.value = null;
    try {
      const createdSession = await repositories.auth.login(token);
      session.value = createdSession;

      const profile = await repositories.auth.getProfile();
      user.value = profile;

      if (!profile.adminApproved) {
        toast.warning(t('auth.login_not_approved'));
      } else {
        toast.success(t('auth.login_success'));
      }
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
      const profile = await repositories.auth.getProfile();
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
      const profile = await repositories.auth.getProfile();
      user.value = profile;
    } catch (err: any) {
    }
  }

  function forceLogout() {
    clearAuthData();
    router.push('/auth/login');
  }

  async function logout(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await repositories.auth.logout();
      toast.success(t('auth.logout_success'));
    } catch (err: any) {
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
      return false;
    }
  }

  async function deleteAccount(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await repositories.auth.deleteAccount();
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
      return await repositories.auth.listMySessions();
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
      await repositories.auth.revokeSession(sessionId);
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

  return {
    // State
    loading,
    error,
    user,
    session,
    isInitialized,

    // Getters
    isAuthenticated,
    isLoading,
    isAdmin,
    isApproved,
    userInitials,
    token,

    // Actions
    initializeAuth,
    register,
    login,
    logout,
    getProfile,
    refreshProfile,
    checkAuth,
    deleteAccount,
    listSessions,
    revokeSession,
    clearAuthData,
    forceLogout,
  };
});
