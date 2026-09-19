import { ref, shallowRef } from 'vue';
import { defineStore } from 'pinia';
import { repositories } from '@/services';
import type { User } from '@/core/entities/User';
import type { UserRoleValue } from '@/core/value-objects/UserRole';
import { useToast } from 'vue-toastification';
import type { Pagination } from '@/core/types/common';
import { i18n } from '@/i18n';

const t = i18n.global.t;
const adminRepo = repositories.admin;

export const useAdminStore = defineStore('admin', () => {
  const users = shallowRef<User[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const toast = useToast();

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

  async function fetchAllUsers(pagination: Pagination = { limit: 100, offset: 0 }) {
    loading.value = true;
    error.value = null;
    try {
      // auth-service caps a page at 100: keep asking until a page comes back short,
      // or users beyond the first hundred would never show up.
      const all: User[] = [];
      for (let offset = pagination.offset; ; offset += pagination.limit) {
        const page = await adminRepo.getAllUsers({ ...pagination, offset });
        all.push(...page.data);
        if (page.data.length < pagination.limit) break;
      }
      users.value = all;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || t('admin.users_fetch_failed');
      error.value = errorMessage;
      toast.error(errorMessage);
    } finally {
      loading.value = false;
    }
  }

  /** `role` places a new user in a group; omit it to reactivate a suspended one. */
  async function approveUser(uid: string, role?: 'pathologist' | 'datascientist') {
    loading.value = true;
    error.value = null;
    try {
      const updatedUser = await adminRepo.approveUser(uid, role);
      updateUserInState(updatedUser);
      toast.success(t('admin.user_approved'));
    } catch (err: any) {
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
      const errorMessage = err.response?.data?.message || t('admin.user_suspend_failed');
      error.value = errorMessage;
      toast.error(errorMessage);
    } finally {
      loading.value = false;
    }
  }

  async function setRole(uid: string, role: Exclude<UserRoleValue, 'unassigned'>) {
    loading.value = true;
    error.value = null;
    try {
      const updatedUser = await adminRepo.setRole(uid, role);
      updateUserInState(updatedUser);
      toast.success(t('admin.user_role_changed'));
    } catch (err: any) {
      // The server says why (own role, inactive user); ApiClient rejects with { message, status }.
      const errorMessage = err?.message || t('admin.user_role_change_failed');
      error.value = errorMessage;
      toast.error(errorMessage);
    } finally {
      loading.value = false;
    }
  }

  /**
   * Adds/removes the user in the readers group, which is what grants read-only
   * access to the research data from outside the platform. Deliberately separate
   * from the platform role: a viewer need not have data access and vice versa.
   */
  async function setDataAccess(uid: string, grant: boolean) {
    loading.value = true;
    error.value = null;
    try {
      const updatedUser = grant
        ? await adminRepo.grantDataAccess(uid)
        : await adminRepo.revokeDataAccess(uid);
      updateUserInState(updatedUser);
      toast.success(grant ? t('admin.data_access_granted') : t('admin.data_access_revoked'));
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || t('admin.data_access_failed');
      error.value = errorMessage;
      toast.error(errorMessage);
    } finally {
      loading.value = false;
    }
  }

  /** Re-reads the group; use when the group may have been edited elsewhere. */
  async function refreshDataAccess(uid: string) {
    try {
      updateUserInState(await adminRepo.refreshDataAccess(uid));
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('admin.data_access_failed'));
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
    setRole,
    deleteUser,
    setDataAccess,
    refreshDataAccess,
  };
});
