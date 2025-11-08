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

  return {
    loading,
    error,
    session,
    user,
    isAuthenticated,
    isLoading,
    register,
    login,
    getProfile,
  };
});
