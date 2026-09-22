import { defineStore } from 'pinia';
import { ref, computed, shallowRef } from 'vue';
import { repositories } from '@/services';
import { useToast } from 'vue-toastification';
import { useI18n } from 'vue-i18n';
import type { Workspace } from '@/core/entities/Workspace';
import type {
  CreateNewWorkspaceRequest,
  UpdateWorkspaceRequest,
} from '@/core/repositories/IWorkspaceRepository';
import type { Pagination, PaginatedResult } from '@/core/types/common';

// =============================
// Types & Interfaces
// =============================

interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  loading: boolean;
  actionLoading: boolean;
  error: string | null;
  paginationMeta: Pagination;
}
interface FetchOptions {
  refresh?: boolean;
  showToast?: boolean;
}

// =============================
// Store Definition
// =============================

export const useWorkspaceStore = defineStore('workspace', () => {
  const { t } = useI18n();
  const toast = useToast();
  

  // ===========================
  // State
  // ===========================

  const workspaces = shallowRef<Workspace[]>([]);
  // Every workspace, for pickers. `workspaces` above is only the page the list view shows.
  const allWorkspaces = shallowRef<Workspace[]>([]);
  const allLoading = ref(false);
  let allRequest: Promise<Workspace[]> | null = null;
  const currentWorkspace = ref<Workspace | null>(null);
  const loading = ref(false);
  const actionLoading = ref(false);
  const error = ref<string | null>(null);
  const pagination = ref<Pagination>({
    limit: 10,
    offset: 0,
    hasMore: false,
  });

  const sort = ref({
    by: 'created_at',
    dir: 'desc' as 'asc' | 'desc',
  });

  // ===========================
  // Getters
  // ===========================

  const isLoading = computed(() => loading.value);
  const isActionLoading = computed(() => actionLoading.value);
  const hasError = computed(() => !!error.value);
  const hasWorkspaces = computed(() => workspaces.value.length > 0);
  const totalWorkspaces = computed(() => workspaces.value.length);
  const hasMore = computed(() => pagination.value.hasMore ?? false);
  const getWorkspaceById = computed(() => {
    return (id: string) => workspaces.value.find((w) => w.id === id);
  });

  // ===========================
  // Helper Functions
  // ===========================

  const handleError = (err: any, defaultMessage: string, showToast = true): void => {
    const errorMessage = err.response?.data?.message || err.message || defaultMessage;
    error.value = errorMessage;

    if (showToast) {
      toast.error(errorMessage);
    }
  };

  const resetError = (): void => {
    error.value = null;
  };

  const updateWorkspaceInState = (updatedWorkspace: Workspace): void => {
    const index = workspaces.value.findIndex((w) => w.id === updatedWorkspace.id);

    if (index !== -1) {
      workspaces.value = [
        ...workspaces.value.slice(0, index),
        updatedWorkspace,
        ...workspaces.value.slice(index + 1),
      ];
    }
    if (allWorkspaces.value.some((w) => w.id === updatedWorkspace.id)) {
      allWorkspaces.value = allWorkspaces.value.map((w) =>
        w.id === updatedWorkspace.id ? updatedWorkspace : w
      );
    }

    if (currentWorkspace.value?.id === updatedWorkspace.id) {
      currentWorkspace.value = updatedWorkspace;
    }
  };

  const removeWorkspaceFromState = (workspaceId: string): void => {
    workspaces.value = workspaces.value.filter((w) => w.id !== workspaceId);
    allWorkspaces.value = allWorkspaces.value.filter((w) => w.id !== workspaceId);

    if (currentWorkspace.value?.id === workspaceId) {
      currentWorkspace.value = null;
    }
  };

  // ===========================
  // Actions - Fetch
  // ===========================

  const fetchWorkspaces = async (
    paginationOptions?: Partial<Pagination>,
    options: FetchOptions = {}
  ): Promise<void> => {
    const { refresh = false, showToast: showErrorToast = true } = options;
    if (loading.value && !refresh) return;

    loading.value = true;
    resetError();

    try {
      const paginationParams: Pagination = {
        ...pagination.value,
        ...paginationOptions,
      };

      const result: PaginatedResult<Workspace> = await repositories.workspace.list({
        pagination: paginationParams,
        sort: [{ field: sort.value.by, direction: sort.value.dir }],
      });
      console.log('Workspaces Fetch Result:', result.data);
      if (result.data.length > 0) {
        console.log('Sample Workspace Raw Props:', (result.data[0] as any).props);
      }
      workspaces.value = result.data;
      pagination.value = {
        ...paginationParams,
        ...result.pagination,
        hasMore: result.pagination?.hasMore ?? result.data.length === paginationParams.limit,
      };
    } catch (err: any) {
      handleError(err, t('workspace.messages.fetch_error'), showErrorToast);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchWorkspaceById = async (
    workspaceId: string,
    options: FetchOptions = {}
  ): Promise<Workspace | null> => {
    const { showToast: showErrorToast = true } = options;

    loading.value = true;
    resetError();

    try {
      const workspace = await repositories.workspace.getById(workspaceId);

      if (workspace) {
        currentWorkspace.value = workspace;
        updateWorkspaceInState(workspace);
      }

      return workspace;
    } catch (err: any) {
      handleError(err, t('workspace.messages.fetch_error'), showErrorToast);
      return null;
    } finally {
      loading.value = false;
    }
  };

  // main-service caps `limit` at 100, so page until a short page comes back.
  const ALL_PAGE_SIZE = 100;

  // Callers that ask while a load is running share it.
  const fetchAllWorkspaces = (options: FetchOptions = {}): Promise<Workspace[]> => {
    const { showToast: showErrorToast = true } = options;
    if (allRequest) return allRequest;

    allLoading.value = true;
    allRequest = (async () => {
      try {
        const collected: Workspace[] = [];
        for (let offset = 0; ; offset += ALL_PAGE_SIZE) {
          const result = await repositories.workspace.list({
            pagination: { limit: ALL_PAGE_SIZE, offset, hasMore: false },
            sort: [{ field: sort.value.by, direction: sort.value.dir }],
          });
          collected.push(...result.data);
          if (result.data.length < ALL_PAGE_SIZE) break;
        }
        allWorkspaces.value = collected;
        return collected;
      } catch (err: any) {
        handleError(err, t('workspace.messages.fetch_error'), showErrorToast);
        throw err;
      } finally {
        allRequest = null;
        allLoading.value = false;
      }
    })();
    return allRequest;
  };

  const loadMore = async (): Promise<void> => {
    if (!hasMore.value || loading.value) return;

    await fetchWorkspaces({
      offset: pagination.value.offset + pagination.value.limit,
    });
  };

  // ===========================
  // Actions - Create
  // ===========================

  const createWorkspace = async (data: CreateNewWorkspaceRequest): Promise<Workspace | null> => {
    actionLoading.value = true;
    resetError();

    try {
      const newWorkspace = await repositories.workspace.create(data);
      workspaces.value = [newWorkspace, ...workspaces.value];
      allWorkspaces.value = [newWorkspace, ...allWorkspaces.value];

      toast.success(t('workspace.messages.create_success'));
      return newWorkspace;
    } catch (err: any) {
      handleError(err, t('workspace.messages.create_error'));
      throw err;
    } finally {
      actionLoading.value = false;
    }
  };

  // ===========================
  // Actions - Update
  // ===========================

  const updateWorkspace = async (
    workspaceId: string,
    data: UpdateWorkspaceRequest
  ): Promise<boolean> => {
    actionLoading.value = true;
    resetError();

    try {
      await repositories.workspace.update(workspaceId, data);
      const updatedWorkspace = await repositories.workspace.getById(workspaceId);

      if (updatedWorkspace) {
        updateWorkspaceInState(updatedWorkspace);
      }

      toast.success(t('workspace.messages.update_success'));
      return true;
    } catch (err: any) {
      handleError(err, t('workspace.messages.update_error'));
      return false;
    } finally {
      actionLoading.value = false;
    }
  };

  // ===========================
  // Actions - Delete
  // ===========================

  const deleteWorkspace = async (workspaceId: string): Promise<boolean> => {
    actionLoading.value = true;
    resetError();

    try {
      await repositories.workspace.delete(workspaceId);

      removeWorkspaceFromState(workspaceId);

      toast.success(t('workspace.messages.delete_success'));
      return true;
    } catch (err: any) {
      handleError(err, t('workspace.messages.delete_error'));
      return false;
    } finally {
      actionLoading.value = false;
    }
  };

  const softDeleteManyWorkspaces = async (workspaceIds: string[]): Promise<boolean> => {
    actionLoading.value = true;
    resetError();

    try {
      await repositories.workspace.softDeleteMany(workspaceIds);

      // Remove all deleted workspaces from state
      workspaces.value = workspaces.value.filter((w) => !workspaceIds.includes(w.id));
      allWorkspaces.value = allWorkspaces.value.filter((w) => !workspaceIds.includes(w.id));

      toast.success(t('workspace.messages.delete_success'));
      return true;
    } catch (err: any) {
      handleError(err, t('workspace.messages.delete_error'));
      return false;
    } finally {
      actionLoading.value = false;
    }
  };

  // ===========================
  // Actions - Utility
  // ===========================

  const setCurrentWorkspace = (workspace: Workspace | null): void => {
    currentWorkspace.value = workspace;
  };

  const clearCurrentWorkspace = (): void => {
    currentWorkspace.value = null;
  };

  const clearWorkspaces = (): void => {
    workspaces.value = [];
    allWorkspaces.value = [];
    currentWorkspace.value = null;
    error.value = null;
    pagination.value = {
      limit: 10,
      offset: 0,
      hasMore: false,
    };
  };

  const refreshWorkspace = async (workspaceId: string): Promise<void> => {
    await fetchWorkspaceById(workspaceId, { showToast: false });
  };

  const getWorkspaceCount = async (): Promise<number> => {
    try {
      return await repositories.workspace.count();
    } catch (err: any) {
      handleError(err, 'Failed to get workspace count', false);
      return 0;
    }
  };

  return {
    // State
    workspaces,
    allWorkspaces,
    allLoading,
    currentWorkspace,
    loading,
    actionLoading,
    error,
    pagination,

    // Getters
    isLoading,
    isActionLoading,
    hasError,
    hasWorkspaces,
    totalWorkspaces,
    hasMore,
    getWorkspaceById,

    // Actions - Fetch
    fetchWorkspaces,
    fetchAllWorkspaces,
    fetchWorkspaceById,
    loadMore,

    // Actions - Create
    createWorkspace,

    // Actions - Update
    updateWorkspace,

    // Actions - Delete
    deleteWorkspace,
    softDeleteManyWorkspaces,

    // Actions - Utility
    setCurrentWorkspace,
    clearCurrentWorkspace,
    clearWorkspaces,
    refreshWorkspace,
    getWorkspaceCount,
    resetError,
    updateWorkspaceInState,
  };
});
