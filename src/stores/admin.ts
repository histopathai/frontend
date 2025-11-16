import { defineStore } from 'pinia';
import { ref } from 'vue';
import { repositories } from '@/services';
import type { User } from '@/core/entities/User';
import { UserRole } from '@/core/value-objects/UserRole';

const adminRepo = repositories.admin;

export const useAdminStore = defineStore('admin', () => {
  // === STATE ===
  const users = ref<User[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // === ACTIONS ===

  function updateUserInState(updatedUser: User) {
    const index = users.value.findIndex((u) => u.userId === updatedUser.userId);
    if (index !== -1) {
      users.value[index] = updatedUser;
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
      error.value = err.response?.data?.message || 'Kullanıcılar alınamadı.';
      throw err;
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
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Kullanıcı onaylanamadı.';
      throw err;
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
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Kullanıcı askıya alınamadı.';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function makeAdmin(uid: string) {
    loading.value = true;
    error.value = null;
    try {
      const updatedUser = await adminRepo.makeAdmin(uid);
      updateUserInState(updatedUser);
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Admin yapılamadı.';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    users,
    loading,
    error,
    fetchAllUsers,
    approveUser,
    suspendUser,
    makeAdmin,
  };
});
