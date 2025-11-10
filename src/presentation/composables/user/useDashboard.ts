import { computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useToast } from 'vue-toastification';

/**
 * DashboardView için gerekli state ve mantığı sağlar.
 */
export function useDashboard() {
  const authStore = useAuthStore();
  const toast = useToast();

  const user = computed(() => authStore.user);

  const welcomeMessage = computed(() => {
    if (user.value) {
      return user.value.displayName || user.value.email;
    }
    return 'Kullanıcı';
  });

  const loadProfile = async () => {
    if (authStore.isAuthenticated && !authStore.user) {
      try {
        await authStore.getProfile();
      } catch (err: any) {
        toast.error(err.message || 'Profil bilgileri yüklenemedi.');
      }
    }
  };

  onMounted(loadProfile);

  return {
    welcomeMessage,
  };
}
