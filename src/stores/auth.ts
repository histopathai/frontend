import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { repositories } from '@/services';
import type { Session } from '@/core/entities/Session';
import type { User } from '@/core/entities/User';
import type { RegisterRequest } from '@/core/repositories/IAuthRepository';

const authRepo = repositories.auth;

export const useAuthStore = defineStore('auth', () => {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const session = ref<Session | null>(null);
  const user = ref<User | null>(null);

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
   * KAYIT: Firebase KULLANMAZ.
   * Doğrudan backend'e e-posta/şifre yollar.
   */
  async function register(payload: RegisterRequest): Promise<User> {
    loading.value = true;
    error.value = null;
    try {
      // infrastructure/repositories/AuthRepository.ts içindeki 'register'ı çağır
      const newUser = await authRepo.register(payload);
      user.value = newUser;
      return newUser;
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message;
      throw err; // Hatanın composable'da yakalanması için fırlat
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
      // infrastructure/repositories/AuthRepository.ts içindeki 'login'i çağır
      const newSession = await authRepo.login(token);
      session.value = newSession;

      // Oturum açıldıktan sonra profili de çekelim
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
      return profile;
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message;
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
        // Backend'deki oturumu da sonlandır
        await authRepo.revokeSession(session.value.id);
      }
    } catch (err: any) {
      console.error('Logout error:', err);
      // Çıkışta hata olsa bile client tarafını temizle
    } finally {
      session.value = null;
      user.value = null;
      loading.value = false;
      // Firebase'den de çıkış yap (isteğe bağlı, ama önerilir)
      // auth.signOut(); // 'auth'u main.ts'den import etmen gerekir
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
  };
});
