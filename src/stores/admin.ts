import { ref, shallowRef } from 'vue';
import { defineStore } from 'pinia';
import { repositories } from '@/services';
import type { User } from '@/core/entities/User';
import { UserRole } from '@/core/value-objects/UserRole';
import { useToast } from 'vue-toastification';
import type { Pagination } from '@/core/types/common';
import { i18n } from '@/i18n';

// i18n global t fonksiyonunu alıyoruz
const t = i18n.global.t;
const adminRepo = repositories.admin;

export const useAdminStore = defineStore('admin', () => {
  // --- STATE ---
  const users = shallowRef<User[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // --- DEPENDENCIES ---
  const toast = useToast();

  // Helper: State güncelleme
  function updateUserInState(updatedUser: User) {
    const index = users.value.findIndex((u) => u.userId === updatedUser.userId);
    if (index !== -1) {
      const newUsers = [...users.value];
      newUsers[index] = updatedUser;
      users.value = newUsers;
    } else {
      users.value = [updatedUser, ...users.value];
    }
  }

  // --- ACTIONS ---

  async function fetchAllUsers(pagination: Pagination = { limit: 100, offset: 0 }) {
    loading.value = true;
    error.value = null;
    try {
      const result = await adminRepo.getAllUsers(pagination);
      console.log('API Response for getAllUsers:', result);

      users.value = result.data;
    } catch (err: any) {
      console.error('Fetch Users Error:', err);
      const errorMessage = err.response?.data?.message || t('admin.users_fetch_failed');
      error.value = errorMessage;
      toast.error(errorMessage);
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
      toast.success(t('admin.user_approved'));
    } catch (err: any) {
      console.error('Approve User Error:', err);
      const errorMessage = err.response?.data?.message || t('admin.user_approval_failed');
      error.value = errorMessage;
      toast.error(errorMessage);
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
      toast.success(t('admin.user_suspended'));
    } catch (err: any) {
      console.error('Suspend User Error:', err);
      const errorMessage = err.response?.data?.message || t('admin.user_suspend_failed');
      error.value = errorMessage;
      toast.error(errorMessage);
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
      toast.success(t('admin.user_made_admin'));
    } catch (err: any) {
      console.error('Make Admin Error:', err);
      const errorMessage = err.response?.data?.message || t('admin.user_make_admin_failed');
      error.value = errorMessage;
      toast.error(errorMessage);
    } finally {
      loading.value = false;
    }
  }

  async function deleteUser(uid: string) {
    loading.value = true;
    error.value = null;
    try {
      await adminRepo.deleteUser(uid);
      users.value = users.value.filter((user) => user.userId !== uid);
      toast.success(t('admin.user_deleted'));
    } catch (err: any) {
      console.error('Delete User Error:', err);
      const errorMessage = err.response?.data?.message || t('admin.user_delete_failed');
      error.value = errorMessage;
      toast.error(errorMessage);
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
    makeAdmin,
    deleteUser,
  };
});
