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
  const workspaceRepo = repositories.workspace;

  // ===========================
  // State
  // ===========================

  const workspaces = shallowRef<Workspace[]>([]);
  const currentWorkspace = ref<Workspace | null>(null);
  const loading = ref(false);
  const actionLoading = ref(false);
  const error = ref<string | null>(null);
  const pagination = ref<Pagination>({
    limit: 10,
    offset: 0,
    sortBy: 'created_at',
    sortOrder: 'desc',
    hasMore: false,
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

  // Get workspace by ID
  const getWorkspaceById = computed(() => {
    return (id: string) => workspaces.value.find((w) => w.id === id);
  });

  // ===========================
  // Helper Functions
  // ===========================

  const handleError = (err: any, defaultMessage: string, showToast = true): void => {
    const errorMessage = err.response?.data?.message || err.message || defaultMessage;
    error.value = errorMessage;
    console.error(defaultMessage, err);

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

    if (currentWorkspace.value?.id === updatedWorkspace.id) {
      currentWorkspace.value = updatedWorkspace;
    }
  };

  const removeWorkspaceFromState = (workspaceId: string): void => {
    workspaces.value = workspaces.value.filter((w) => w.id !== workspaceId);

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

    // Don't fetch if already loading
    if (loading.value && !refresh) return;

    loading.value = true;
    resetError();

    try {
      const paginationParams: Pagination = {
        ...pagination.value,
        ...paginationOptions,
      };

      const result: PaginatedResult<Workspace> = await workspaceRepo.list(paginationParams);

      workspaces.value = result.data;

      // Update pagination metadata
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
      const workspace = await workspaceRepo.getById(workspaceId);

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
      const newWorkspace = await workspaceRepo.create(data);

      // Add to beginning of list
      workspaces.value = [newWorkspace, ...workspaces.value];

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
      await workspaceRepo.update(workspaceId, data);

      // Fetch updated workspace
      const updatedWorkspace = await workspaceRepo.getById(workspaceId);

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
      await workspaceRepo.delete(workspaceId);

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

  const cascadeDeleteWorkspace = async (workspaceId: string): Promise<boolean> => {
    actionLoading.value = true;
    resetError();

    try {
      await workspaceRepo.cascadeDelete(workspaceId);

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

  const batchDeleteWorkspaces = async (workspaceIds: string[]): Promise<boolean> => {
    actionLoading.value = true;
    resetError();

    try {
      await workspaceRepo.batchDelete(workspaceIds);

      // Remove all deleted workspaces from state
      workspaces.value = workspaces.value.filter((w) => !workspaceIds.includes(w.id));

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
    currentWorkspace.value = null;
    error.value = null;
    pagination.value = {
      limit: 10,
      offset: 0,
      sortBy: 'created_at',
      sortOrder: 'desc',
      hasMore: false,
    };
  };

  const refreshWorkspace = async (workspaceId: string): Promise<void> => {
    await fetchWorkspaceById(workspaceId, { showToast: false });
  };

  const getWorkspaceCount = async (): Promise<number> => {
    try {
      return await workspaceRepo.count();
    } catch (err: any) {
      handleError(err, 'Failed to get workspace count', false);
      return 0;
    }
  };

  // ===========================
  // Return
  // ===========================

  async function updateWorkspace(id: string, data: UpdateWorkspaceRequest): Promise<boolean> {
    loading.value = true;
    try {
      await repositories.workspace.update(id, data);
      await fetchWorkspaces({
        limit: paginationMeta.value.limit,
        offset: paginationMeta.value.offset,
        sortBy: paginationMeta.value.sortBy,
        sortOrder: paginationMeta.value.sortOrder,
      });

      toast.success('Veri seti başarıyla güncellendi.');
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Veri seti güncellenemedi.');
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function deleteWorkspace(id: string): Promise<boolean> {
    loading.value = true;
    try {
      await repositories.workspace.delete(id);

      toast.success('Veri seti silindi.');
      await fetchWorkspaces({
        limit: paginationMeta.value.limit,
        offset: paginationMeta.value.offset,
        sortBy: paginationMeta.value.sortBy,
        sortOrder: paginationMeta.value.sortOrder,
      });

      return true;
    } catch (err: any) {
      toast.error(err.message || 'Silme işlemi başarısız.');
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function createPatient(data: CreateNewPatientRequest): Promise<boolean> {
    loading.value = true;
    try {
      await repositories.patient.create(data);
      toast.success('Hasta başarıyla oluşturuldu.');

      if (patientsByWorkspace.value.has(data.workspace_id)) {
        await fetchPatientsForWorkspace(data.workspace_id);
      }

      return true;
    } catch (err: any) {
      toast.error(err.message || 'Hasta oluşturulamadı.');
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function updatePatient(
    id: string,
    data: Partial<CreateNewPatientRequest>
  ): Promise<boolean> {
    loading.value = true;
    try {
      await repositories.patient.update(id, data);
      toast.success('Hasta bilgileri güncellendi.');
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Güncelleme başarısız.');
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function deletePatient(id: string, workspaceId: string): Promise<boolean> {
    loading.value = true;
    try {
      await repositories.patient.delete(id);
      toast.success('Hasta silindi.');
      await fetchPatientsForWorkspace(workspaceId);
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Silme işlemi başarısız.');
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function transferPatient(
    id: string,
    currentWorkspaceId: string,
    targetWorkspaceId: string
  ): Promise<boolean> {
    loading.value = true;
    try {
      await repositories.patient.transfer(id, targetWorkspaceId);
      toast.success('Hasta başarıyla transfer edildi.');
      await fetchPatientsForWorkspace(currentWorkspaceId);
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Transfer işlemi başarısız.');
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function fetchImagesForPatient(patientId: string) {
    imagesLoading.value = true;
    try {
      const result = await repositories.image.getByPatientId(patientId, {
        limit: 100, // Şimdilik yüksek limit, gerekirse pagination eklenir
        offset: 0,
        sortBy: 'created_at',
        sortOrder: 'desc',
      });
      imagesByPatient.value.set(patientId, result.data);
    } catch (err: any) {
      console.error(err);
      toast.error('Görüntüler alınamadı.');
    } finally {
      imagesLoading.value = false;
    }
  }

  async function uploadImage(
    file: File,
    patientId: string,
    onProgress?: (percent: number) => void
  ): Promise<boolean> {
    try {
      const format = file.type.split('/')[1]?.toUpperCase() || 'UNKNOWN';

      const createPayload: CreateNewImageRequest = {
        patient_id: patientId,
        content_type: file.type,
        name: file.name,
        format: format,
        size: file.size,
      };

      const uploadConfig = await repositories.image.create(createPayload);
      await repositories.image.upload({
        payload: uploadConfig,
        file: file,
        onUploadProgress: onProgress,
      });

      toast.success('Görüntü yüklendi. İşleniyor...');

      setTimeout(() => {
        fetchImagesForPatient(patientId);
      }, 2000);

      return true;
    } catch (err: any) {
      console.error(err);
      toast.error('Görüntü yüklenirken hata oluştu.');
      return false;
    }
  }

  async function deleteImage(imageId: string, patientId: string) {
    try {
      await repositories.image.delete(imageId);
      toast.success('Görüntü silindi.');
      await fetchImagesForPatient(patientId);
    } catch (err: any) {
      toast.error('Silme işlemi başarısız.');
    }
  }

  return {
    // State
    workspaces,
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
    fetchWorkspaceById,
    loadMore,

    // Actions - Create
    createWorkspace,

    // Actions - Update
    updateWorkspace,

    // Actions - Delete
    deleteWorkspace,
    cascadeDeleteWorkspace,
    batchDeleteWorkspaces,

    // Actions - Utility
    setCurrentWorkspace,
    clearCurrentWorkspace,
    clearWorkspaces,
    refreshWorkspace,
    getWorkspaceCount,
    resetError,
  };
});
