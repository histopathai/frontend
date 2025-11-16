import { ref } from 'vue';
import { defineStore } from 'pinia';
import { repositories } from '@/services';
import type { User } from '@/core/entities/User';
import { UserRole } from '@/core/value-objects/UserRole';
import { useToast } from 'vue-toastification';

export const useAdminStore = defineStore('admin', () => {
  // --- STATE ---
  const users = ref<User[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // --- DEPENDENCIES ---
  const adminRepo = repositories.admin;
  const toast = useToast();

  // --- ACTIONS ---

  function updateUserInState(updatedUser: User) {
    const index = users.value.findIndex((u) => u.userId === updatedUser.userId);
    if (index !== -1) {
      users.value[index] = updatedUser;
    } else {
      users.value.push(updatedUser);
    }
  }

  async function fetchAllUsers() {
    loading.value = true;
    error.value = null;
    try {
      const result = await adminRepo.getAllUsers({
        limit: 10,
        offset: 0,
        sortBy: 'user_id',
        sortOrder: 'asc',
      });
      users.value = result.data;
    } catch (err: any) {
      console.error('Fetch Users Error:', err);
      error.value = err.response?.data?.message || 'Kullanıcılar alınamadı.';
      toast.error(error.value);
    } finally {
      loading.value = false;
    }
  }

  async function approveUser(uid: string) {
    loading.value = true;
    error.value = null;
    try {
      const updatedUser = await adminRepo.approveUser(uid, { role: UserRole.user() });
      updateUserInState(updatedUser);
      toast.success('Kullanıcı onaylandı.');
    } catch (err: any) {
      console.error('Approve User Error:', err);
      error.value = err.response?.data?.message || 'Kullanıcı onaylanamadı.';
      toast.error(error.value);
    } finally {
      loading.value = false;
    }
  }

  async function suspendUser(uid: string) {
    loading.value = true;
    error.value = null;
    try {
      const updatedUser = await adminRepo.suspendUser(uid);
      updateUserInState(updatedUser);
      toast.success('Kullanıcı askıya alındı.');
    } catch (err: any) {
      console.error('Suspend User Error:', err);
      error.value = err.response?.data?.message || 'Kullanıcı askıya alınamadı.';
      toast.error(error.value);
    } finally {
      loading.value = false;
    }
  }

  return {
    // State
    users,
    loading,
    error,
    // Actions
    fetchAllUsers,
    approveUser,
    suspendUser,
  };
});
