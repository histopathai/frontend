import { computed, onMounted } from 'vue';
import { useAdminStore } from '@/stores/admin';
import { useToast } from 'vue-toastification';

export function useUserManagement() {
  const adminStore = useAdminStore();
  const toast = useToast();

  const users = computed(() => adminStore.users);
  const isLoading = computed(() => adminStore.loading);
  const error = computed(() => adminStore.error);

  const handleRefresh = async () => {
    try {
      await adminStore.fetchAllUsers();
      toast.success('Kullanıcı listesi güncellendi.');
    } catch {
      toast.error(adminStore.error || 'Kullanıcılar yüklenemedi.');
    }
  };

  onMounted(handleRefresh);

  const handleApprove = async (uid: string) => {
    try {
      await adminStore.approveUser(uid);
      toast.success('Kullanıcı onaylandı.');
    } catch {
      toast.error(adminStore.error || 'İşlem başarısız.');
    }
  };

  const handleSuspend = async (uid: string) => {
    try {
      await adminStore.suspendUser(uid);
      toast.success('Kullanıcı askıya alındı.');
    } catch {
      toast.error(adminStore.error || 'İşlem başarısız.');
    }
  };

  const handleMakeAdmin = async (uid: string) => {
    try {
      await adminStore.makeAdmin(uid);
      toast.success('Kullanıcı yönetici yapıldı.');
    } catch {
      toast.error(adminStore.error || 'İşlem başarısız.');
    }
  };

  return {
    users,
    isLoading,
    error,
    handleRefresh,
    handleApprove,
    handleSuspend,
    handleMakeAdmin,
  };
}
