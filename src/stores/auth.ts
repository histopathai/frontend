import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { repositories } from '@/services';
import { Session } from '@/core/entities/Session';
import { User } from '@/core/entities/User';
import type { RegisterRequest, ChangePasswordRequest } from '@/core/repositories/IAuthRepository';
import router from '@/router';
import { useToast } from 'vue-toastification';

const authRepo = repositories.auth;

function getSessionFromStorage(): Session | null {
  const stored = localStorage.getItem('auth_session');
  if (!stored) return null;
  try {
    return Session.create(JSON.parse(stored));
  } catch {
    localStorage.removeItem('auth_session');
    return null;
  }
}

function getUserFromStorage(): User | null {
  const stored = localStorage.getItem('auth_user');
  if (!stored) return null;
  try {
    return User.create(JSON.parse(stored));
  } catch {
    localStorage.removeItem('auth_user');
    return null;
  }
}

export const useAuthStore = defineStore('auth', () => {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const session = ref<Session | null>(null);
  const user = ref<User | null>(null);

  const toast = useToast();

  // === GETTERS ===
  const isAuthenticated = computed(() => !!session.value && !!user.value);
  const isLoading = computed(() => loading.value);
  const isAdmin = computed(() => user.value?.role.isAdmin() ?? false);

  const userInitials = computed(() => {
    if (user.value?.displayName) {
      return user.value.displayName.charAt(0).toUpperCase();
    }
    if (user.value?.email) {
      return user.value.email.charAt(0).toUpperCase();
    }
    return '?';
  });

  // ---

  // === ACTIONS ===

  /**
   * Oturum verilerini yerelden temizler.
   */
  function clearAuthData() {
    session.value = null;
    user.value = null;
    localStorage.removeItem('auth_session');
    localStorage.removeItem('auth_user');
  }

  /**
   * (YENİ) Uygulama başladığında veya sayfa yenilendiğinde
   * localStorage'daki oturum bilgilerini yükler.
   */
  async function initializeAuth() {
    loading.value = true;
    try {
      const storedSession = getSessionFromStorage();
      const storedUser = getUserFromStorage();

      if (storedSession && storedUser) {
        session.value = storedSession;
        user.value = storedUser;
        // İsteğe bağlı: Token'ı backend'de hızlıca doğrulayabilirsiniz
        // await getProfile();
      }
    } catch (err: any) {
      console.error('Auth initialization error:', err);
      clearAuthData();
    } finally {
      loading.value = false;
    }
  }

  /**
   * KAYIT: Firebase KULLANMAZ.
   * Doğrudan backend'e e-posta/şifre yollar.
   */
  async function register(payload: RegisterRequest): Promise<User> {
    loading.value = true;
    error.value = null;
    try {
      const newUser = await authRepo.register(payload);
      return newUser;
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * GİRİŞ: Firebase token'ı alır, backend'e yollar.
   * (useLoginForm'daki verifyToken'ın gerçek karşılığı)
   */
  async function login(token: string): Promise<Session> {
    loading.value = true;
    error.value = null;
    try {
      const newSession = await authRepo.login(token);

      session.value = newSession;
      localStorage.setItem('auth_session', JSON.stringify(newSession.toJSON()));
      await getProfile();
      return newSession;
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function getProfile(): Promise<User> {
    loading.value = true;
    try {
      const profile = await authRepo.getProfile();
      user.value = profile;
      localStorage.setItem('auth_user', JSON.stringify(profile.toJSON()));
      return profile;
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message;
      if (err.response?.status === 401) {
        handleUnauthorized();
      }
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function logout() {
    loading.value = true;
    error.value = null;
    try {
      if (session.value) {
        await authRepo.revokeSession(session.value.id);
      }
    } catch (err: any) {
      console.error('Logout error:', err);
    } finally {
      clearAuthData();
      loading.value = false;
    }
  }

  async function changePassword(newPassword: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const payload: ChangePasswordRequest = { new_password: newPassword };
      await authRepo.changePassword(payload);
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Şifre değiştirilemedi.';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * (YENİ) 401 - Yetkisiz hatası alındığında merkezi olarak çağrılır.
   * Oturumu temizler ve kullanıcıyı girişe yönlendirir.
   */
  function handleUnauthorized() {
    if (isAuthenticated.value) {
      clearAuthData();
      toast.error('Oturumunuzun süresi doldu. Lütfen tekrar giriş yapın.');
      router.push('/auth/login');
    }
  }
  // ---

  return {
    loading,
    error,
    session,
    user,
    isAuthenticated,
    isLoading,
    isAdmin,
    userInitials,
    register,
    login,
    logout,
    getProfile,
    changePassword,
    initializeAuth, // <-- EKLENDİ
    handleUnauthorized, // <-- EKLENDİ
  };
});
