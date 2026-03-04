import { defineStore } from 'pinia';
import { ref, computed, shallowRef, watch } from 'vue';
import { repositories } from '@/services';
import { useToast } from 'vue-toastification';
import { useI18n } from 'vue-i18n';
import type { Image } from '@/core/entities/Image';
import { Workspace } from '@/core/entities/Workspace';
import { useWorkspaceStore } from './workspace';
import { useAuthStore } from './auth';
import { usePatientStore } from './patient';
import type {
  CreateNewImageRequest,
  ImageUploadPayload,
  UploadImageParams,
  UpdateImageRequest,
} from '@/core/repositories/IImageRepository';
import type { Pagination, PaginatedResult } from '@/core/types/common';
import type { BatchTransfer } from '@/core/repositories/common';

interface ImageState {
  images: Image[];
  imagesByPatient: Map<string, Image[]>;
  currentImage: Image | null;
  loading: boolean;
  uploading: boolean;
  actionLoading: boolean;
  uploadProgress: number;
  error: string | null;
  pagination: Pagination;
}

interface FetchOptions {
  refresh?: boolean;
  showToast?: boolean;
}

interface UploadOptions {
  onProgress?: (percentage: number) => void;
}

const MIME_TYPES: Record<string, string> = {
  svs: 'image/x-aperio-svs',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  ndpi: 'image/x-ndpi',
  vms: 'image/x-vms',
  vmu: 'image/x-vmu',
  scn: 'image/x-scn',
  mrz: 'image/x-mirax',
  bif: 'image/x-bif',
  dng: 'image/x-adobe-dng',
  bmp: 'image/bmp',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
};

export const useImageStore = defineStore('image', () => {
  const { t } = useI18n();
  const toast = useToast();
  const imageRepo = repositories.image;

  // --- STATE ---
  const images = shallowRef<Image[]>([]);
  const imagesByPatient = ref<Map<string, Image[]>>(new Map());
  const currentImage = ref<Image | null>(null);
  const loading = ref(false);
  const uploading = ref(false);
  const actionLoading = ref(false);
  const uploadProgress = ref(0);
  const error = ref<string | null>(null);
  // Explicit default states requested by user
  const hideCompleted = ref<boolean>(false); // Biten hastaları gizle -> KAPALI
  const hideCompletedWorkspaces = ref<boolean>(true); // Biten veri setlerini gizle -> AÇIK

  // Watch for changes and persist
  watch(hideCompleted, (val) => localStorage.setItem('histo_hide_completed', String(val)));
  watch(hideCompletedWorkspaces, (val) =>
    localStorage.setItem('histo_hide_completed_ws', String(val))
  );

  // Frontend-only tracking of completed entities (persisted to localStorage)
  const LOCAL_STORAGE_WS_KEY = 'histo_completed_workspaces';

  const localCompletedWorkspaces = ref<Set<string>>(
    new Set(JSON.parse(localStorage.getItem(LOCAL_STORAGE_WS_KEY) || '[]'))
  );

  const markWorkspaceCompleted = (workspaceId: string) => {
    localCompletedWorkspaces.value.add(workspaceId);
    localStorage.setItem(
      LOCAL_STORAGE_WS_KEY,
      JSON.stringify(Array.from(localCompletedWorkspaces.value))
    );
  };

  const markWorkspaceIncomplete = (workspaceId: string) => {
    localCompletedWorkspaces.value.delete(workspaceId);
    localStorage.setItem(
      LOCAL_STORAGE_WS_KEY,
      JSON.stringify(Array.from(localCompletedWorkspaces.value))
    );
  };

  const isWorkspaceCompleted = (workspaceId: string) => {
    return localCompletedWorkspaces.value.has(workspaceId);
  };

  // Smart background scanner to evaluate completion status without crashing the backend
  const scanWorkspacesForCompletion = async (workspaces: any[], apiClient: any) => {
    for (const ws of workspaces) {
      if (isWorkspaceCompleted(ws.id)) continue;

      try {
        let offset = 0;
        let limit = 100;
        let hasMore = true;
        let hasActiveUncompleted = false;
        let hasAnyActive = false;

        while (hasMore) {
          const res = await apiClient.get(`/api/v1/proxy/images/workspace/${ws.id}`, {
            limit,
            offset,
          });
          let images = res.data?.data || res.data || [];
          if (!Array.isArray(images) || images.length === 0) break;

          const activeImages = images.filter((img: any) => img.is_deleted !== true);
          if (activeImages.length > 0) hasAnyActive = true;

          const uncompleted = activeImages.filter((img: any) => !img.marked_as_completed);
          if (uncompleted.length > 0) {
            hasActiveUncompleted = true;
            break; // Stop scanning this workspace immediately! It's not finished.
          }

          const paginationData = res.data?.pagination || res.pagination;
          if (paginationData && paginationData.has_more === false) {
            hasMore = false;
          } else if (images.length < limit) {
            hasMore = false;
          } else {
            offset += limit;
          }
        }

        if (hasAnyActive && !hasActiveUncompleted) {
          console.log(`Smart Scan: Workspace ${ws.name} is fully completed!`);
          markWorkspaceCompleted(ws.id);
        } else if (!hasAnyActive) {
          console.log(`Smart Scan: Workspace ${ws.name} only has deleted/no images!`);
          markWorkspaceCompleted(ws.id);
        }
      } catch (e) {
        console.error(`Smart Scan failed for workspace ${ws.id}:`, e);
      }
    }
  };

  const pagination = ref<Pagination>({
    limit: 100,
    offset: 0,
    hasMore: false,
  });

  // Keep track of sort separately since it was removed from Pagination
  const sort = ref({
    by: 'created_at',
    dir: 'desc' as 'asc' | 'desc',
  });

  // --- GETTERS ---
  const isLoading = computed(() => loading.value);
  const isUploading = computed(() => uploading.value);
  const isActionLoading = computed(() => actionLoading.value);
  const hasError = computed(() => !!error.value);
  const hasImages = computed(() => images.value.length > 0);
  const totalImages = computed(() => images.value.length);
  const hasMore = computed(() => pagination.value.hasMore ?? false);

  const getImageById = computed(() => {
    return (id: string) => images.value.find((img) => img.id === id);
  });

  const getImagesByPatientId = computed(() => {
    return (patientId: string) => imagesByPatient.value.get(patientId) || [];
  });

  const processedImages = computed(() => {
    return images.value.filter((img) => img.isProcessed());
  });

  // --- HELPER FUNCTIONS ---
  const handleError = (err: any, defaultMessage: string, showToast = true): void => {
    const errorMessage = err.response?.data?.message || err.message || defaultMessage;
    error.value = errorMessage;
    if (showToast) toast.error(errorMessage);
  };

  const resetError = (): void => {
    error.value = null;
  };
  const resetUploadProgress = (): void => {
    uploadProgress.value = 0;
  };

  const updateImageInState = (updatedImage: Image): void => {
    const index = images.value.findIndex((img) => img.id === updatedImage.id);
    if (index !== -1) {
      images.value = [
        ...images.value.slice(0, index),
        updatedImage,
        ...images.value.slice(index + 1),
      ];
    }
    const patientImages = imagesByPatient.value.get(updatedImage.parentId);
    if (patientImages) {
      const ptIndex = patientImages.findIndex((img) => img.id === updatedImage.id);
      if (ptIndex !== -1) {
        const newPatientImages = [...patientImages];
        newPatientImages[ptIndex] = updatedImage;
        const newMap = new Map(imagesByPatient.value);
        newMap.set(updatedImage.parentId, newPatientImages);
        imagesByPatient.value = newMap;
      }
    }
    if (currentImage.value?.id === updatedImage.id) {
      currentImage.value = updatedImage;
    }
  };

  const removeImageFromState = (imageId: string, patientId?: string): void => {
    images.value = images.value.filter((img) => img.id !== imageId);
    if (patientId) {
      const patientImages = imagesByPatient.value.get(patientId);
      if (patientImages) {
        const newMap = new Map(imagesByPatient.value);
        newMap.set(
          patientId,
          patientImages.filter((img) => img.id !== imageId)
        );
        imagesByPatient.value = newMap;
      }
    } else {
      const newMap = new Map(imagesByPatient.value);
      newMap.forEach((images, ptId) => {
        newMap.set(
          ptId,
          images.filter((img) => img.id !== imageId)
        );
      });
      imagesByPatient.value = newMap;
    }
    if (currentImage.value?.id === imageId) currentImage.value = null;
  };

  // --- ACTIONS ---

  const fetchImageById = async (
    imageId: string,
    options: FetchOptions = {}
  ): Promise<Image | null> => {
    const { showToast: showErrorToast = true } = options;
    loading.value = true;
    resetError();
    try {
      const image = await imageRepo.getById(imageId);
      if (image) {
        currentImage.value = image;
        updateImageInState(image);
      }
      return image;
    } catch (err: any) {
      handleError(err, t('image.messages.fetch_error'), showErrorToast);
      return null;
    } finally {
      loading.value = false;
    }
  };

  const fetchImagesByPatient = async (
    patientId: string,
    paginationOptions?: Partial<Pagination>,
    options: FetchOptions & { append?: boolean } = {}
  ): Promise<void> => {
    const { refresh = false, showToast: showErrorToast = true, append = false } = options;
    if (loading.value && !refresh && !append) return;

    loading.value = true;
    resetError();

    try {
      const paginationParams: Pagination = {
        ...pagination.value,
        ...paginationOptions,
      };

      const result: PaginatedResult<Image> = await imageRepo.listByPatient(patientId, {
        pagination: paginationParams,
        sort: [{ field: sort.value.by, direction: sort.value.dir }],
        filters: hideCompleted.value ? [{ field: 'marked_as_completed', operator: 'eq', value: false }] : undefined,
      });
      const currentList = imagesByPatient.value.get(patientId) || [];
      const newList = append ? [...currentList, ...result.data] : result.data;
      const newMap = new Map(imagesByPatient.value);
      newMap.set(patientId, newList);
      imagesByPatient.value = newMap;

      if (!append) {
        images.value = result.data;
      } else {
        images.value = [...images.value, ...result.data];
      }

      pagination.value = {
        ...paginationParams,
        ...result.pagination,
        hasMore: result.pagination?.hasMore ?? result.data.length === paginationParams.limit,
      };
    } catch (err: any) {
      handleError(err, t('image.messages.fetch_error'), showErrorToast);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const loadMoreImages = async (patientId: string): Promise<void> => {
    if (!hasMore.value || loading.value) return;
    const currentImages = imagesByPatient.value.get(patientId) || [];
    await fetchImagesByPatient(patientId, {
      offset: currentImages.length,
    });
  };

  const uploadImage = async (
    patientId: string,
    file: File,
    options: UploadOptions = {}
  ): Promise<boolean> => {
    uploading.value = true;
    resetError();
    resetUploadProgress();
    try {
      const extension = file.name.split('.').pop()?.toLowerCase() || 'unknown';

      // Extension-based MIME takes priority over file.type because browsers may
      // report incorrect types for raw/scientific formats (e.g. DNG → "image/dng").
      const contentType = MIME_TYPES[extension] || file.type || 'application/octet-stream';

      const workspaceStore = useWorkspaceStore();
      const wsId = workspaceStore.currentWorkspace?.id;

      if (!wsId) {
        throw new Error('Görüntü yüklemek için önce bir workspace seçmelisiniz.');
      }

      const createRequest: CreateNewImageRequest = {
        parent: { id: patientId, type: 'patient' },
        ws_id: wsId,
        name: file.name,
        format: file.name.split('.').pop() || 'unknown',
        contents: [
          {
            content_type: contentType,
            name: file.name,
            size: file.size,
          },
        ],
      };

      const uploadPayloads: ImageUploadPayload[] = await imageRepo.create(createRequest);

      const uploadPayload = uploadPayloads[0];

      if (!uploadPayload) {
        throw new Error('No upload payload received from server');
      }

      const uploadParams: UploadImageParams = {
        payload: uploadPayload,
        file,
        contentType,
        onUploadProgress: (percentage: number) => {
          uploadProgress.value = percentage;
          options.onProgress?.(percentage);
        },
      };

      await imageRepo.upload(uploadParams);

      const paginationParams: Pagination = { ...pagination.value };
      await fetchImagesByPatient(patientId, paginationParams, { showToast: false });

      toast.success(t('image.messages.upload_success'));
      return true;
    } catch (err: any) {
      handleError(err, t('image.messages.upload_error'));
      return false;
    } finally {
      uploading.value = false;
      resetUploadProgress();
    }
  };

  const deleteImage = async (imageId: string, patientId: string): Promise<boolean> => {
    actionLoading.value = true;
    resetError();
    try {
      await imageRepo.delete(imageId);
      removeImageFromState(imageId, patientId);
      toast.success(t('image.messages.delete_success'));
      return true;
    } catch (err: any) {
      handleError(err, t('image.messages.delete_error'));
      return false;
    } finally {
      actionLoading.value = false;
    }
  };

  const markAsCompleted = async (imageId: string): Promise<boolean> => {
    const authStore = useAuthStore();

    if (!authStore.user?.userId) {
      toast.error('Oturum bilgisi bulunamadı. Lütfen tekrar giriş yapın.');
      return false;
    }

    actionLoading.value = true;
    resetError();
    try {
      const payload: UpdateImageRequest = {
        creator_id: authStore.user.userId,
        marked_as_completed: true,
      };

      const updatedImage = await imageRepo.update(imageId, payload);
      updateImageInState(updatedImage);

      // Update patient stats in store
      const patientStore = usePatientStore();
      const currentStats = patientStore.getPatientStats(updatedImage.parentId);
      if (currentStats && updatedImage.markedAsCompleted) {
        patientStore.updatePatientStats(
          updatedImage.parentId,
          currentStats.total,
          currentStats.annotated + 1
        );
      }

      // Update workspace stats in store
      const workspaceStore = useWorkspaceStore();
      const ws = workspaceStore.getWorkspaceById(
        updatedImage.wsId || workspaceStore.currentWorkspace?.id || ''
      );
      if (ws && updatedImage.markedAsCompleted) {
        const rawData = (ws as any).toJSON();
        rawData.completed_image_count = (ws.completedImageCount || 0) + 1;
        workspaceStore.updateWorkspaceInState(Workspace.create(rawData));
      }

      // If hiding completed, remove from current list view
      if (hideCompleted.value) {
        removeImageFromState(imageId, updatedImage.parentId);
      }

      toast.success(
        t('image.messages.mark_as_completed_success') || 'Tamamlandı olarak işaretlendi'
      );
      return true;
    } catch (err: any) {
      handleError(
        err,
        t('image.messages.mark_as_completed_error') || 'İşlem sırasında hata oluştu'
      );
      return false;
    } finally {
      actionLoading.value = false;
    }
  };

  const softDeleteManyImages = async (imageIds: string[], patientId: string): Promise<boolean> => {
    actionLoading.value = true;
    resetError();
    try {
      await imageRepo.softDeleteMany(imageIds);
      imageIds.forEach((id) => removeImageFromState(id, patientId));
      toast.success(t('image.messages.batch_delete_success'));
      return true;
    } catch (err: any) {
      handleError(err, t('image.messages.batch_delete_error'));
      return false;
    } finally {
      actionLoading.value = false;
    }
  };

  const transferImage = async (
    imageId: string,
    currentPatientId: string,
    targetPatientId: string
  ): Promise<boolean> => {
    actionLoading.value = true;
    resetError();
    try {
      await imageRepo.transfer(imageId, targetPatientId);
      removeImageFromState(imageId, currentPatientId);
      await fetchImagesByPatient(currentPatientId, undefined, { showToast: false });
      await fetchImagesByPatient(targetPatientId, undefined, { showToast: false });
      toast.success(t('image.messages.transfer_success'));
      return true;
    } catch (err: any) {
      handleError(err, t('image.messages.transfer_error'));
      return false;
    } finally {
      actionLoading.value = false;
    }
  };

  const transferManyImages = async (data: BatchTransfer): Promise<boolean> => {
    actionLoading.value = true;
    resetError();
    try {
      await imageRepo.transferMany(data);
      toast.success(t('image.messages.batch_transfer_success'));
      return true;
    } catch (err: any) {
      handleError(err, t('image.messages.batch_transfer_error'));
      return false;
    } finally {
      actionLoading.value = false;
    }
  };

  const setCurrentImage = (image: Image | null): void => {
    currentImage.value = image;
  };
  const clearCurrentImage = (): void => {
    currentImage.value = null;
  };
  const clearImages = (): void => {
    images.value = [];
    imagesByPatient.value.clear();
    currentImage.value = null;
    error.value = null;
  };
  const clearPatientImages = (patientId: string): void => {
    imagesByPatient.value.delete(patientId);
  };
  const refreshImage = async (imageId: string): Promise<void> => {
    await fetchImageById(imageId, { showToast: false });
  };
  const pollImageStatus = async (imageId: string, interval = 2000): Promise<void> => {
    const poll = async () => {
      const image = await fetchImageById(imageId, { showToast: false });
      if (!image) return;
      if (image.status.isProcessed() || image.status.isFailed()) return;
      setTimeout(poll, interval);
    };
    await poll();
  };
  const getImageCount = async (): Promise<number> => {
    try {
      return await imageRepo.count();
    } catch (err: any) {
      handleError(err, 'Failed to get image count', false);
      return 0;
    }
  };

  return {
    images,
    imagesByPatient,
    currentImage,
    loading,
    uploading,
    actionLoading,
    uploadProgress,
    error,
    pagination,
    isLoading,
    isUploading,
    isActionLoading,
    hasError,
    hasImages,
    totalImages,
    hasMore,
    getImageById,
    getImagesByPatientId,
    processedImages,
    fetchImageById,
    localCompletedWorkspaces,
    markWorkspaceCompleted,
    markWorkspaceIncomplete,
    isWorkspaceCompleted,
    scanWorkspacesForCompletion,
    fetchImagesByPatient,
    loadMoreImages,
    uploadImage,
    deleteImage,
    softDeleteManyImages,
    transferImage,
    transferManyImages,
    setCurrentImage,
    clearCurrentImage,
    clearImages,
    clearPatientImages,
    refreshImage,
    pollImageStatus,
    getImageCount,
    resetError,
    hideCompleted,
    hideCompletedWorkspaces,
    markAsCompleted,
  };
});
