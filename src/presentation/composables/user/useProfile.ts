import { computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useToast } from 'vue-toastification';

/**
 * UserProfile bileşeni için gerekli state ve mantığı sağlar.
 */
export function useProfile() {
  const authStore = useAuthStore();
  const toast = useToast();

  // Store'dan reaktif verileri al
  const user = computed(() => authStore.user);
  const isLoading = computed(() => authStore.loading);

  /**
   * Tarih formatlama (eski bileşenden taşındı)
   * z src/presentation/utils/formatters.ts gibi bir
   * dosyaya taşıyıp oradan import edebilirim.
   */
  const formatDate = (date: Date | string | undefined): string => {
    if (!date) return 'Bilinmiyor';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return 'Bilinmiyor';
    return d.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const displayStatus = computed(() => user.value?.status.toDisplayString() ?? 'Bilinmiyor');
  const statusClass = computed(() => user.value?.status.toCssClass() ?? '');
  const displayRole = computed(() => user.value?.role.toDisplayString() ?? 'Bilinmiyor');
  const roleClass = computed(() => user.value?.role.toCssClass() ?? '');

  const formattedCreatedAt = computed(() => formatDate(user.value?.createdAt));
  const formattedUpdatedAt = computed(() => formatDate(user.value?.updatedAt));
  const formattedApprovalDate = computed(() => formatDate(user.value?.approvalDate));

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
    user,
    isLoading,
    displayStatus,
    statusClass,
    displayRole,
    roleClass,
    formattedCreatedAt,
    formattedUpdatedAt,
    formattedApprovalDate,
  };
}
