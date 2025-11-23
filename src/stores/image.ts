import { defineStore } from 'pinia';
import { ref, computed, shallowRef } from 'vue';
import { repositories } from '@/services';
import { useToast } from 'vue-toastification';
import { useI18n } from 'vue-i18n';
import type { Image } from '@/core/entities/Image';
import type {
  CreateNewImageRequest,
  ImageUploadPayload,
  UploadImageParams,
} from '@/core/repositories/IImageRepository';
import type { Pagination, PaginatedResult } from '@/core/types/common';
import type { BatchTransfer } from '@/core/repositories/common';

// ===========================
// Types & Interfaces
// ===========================

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

// ===========================
// Store Definition
// ===========================

export const useImageStore = defineStore('image', () => {
  const { t } = useI18n();
  const toast = useToast();
  const imageRepo = repositories.image;

  // ===========================
  // State
  // ===========================

  const images = shallowRef<Image[]>([]);
  const imagesByPatient = ref<Map<string, Image[]>>(new Map());
  const currentImage = ref<Image | null>(null);
  const loading = ref(false);
  const uploading = ref(false);
  const actionLoading = ref(false);
  const uploadProgress = ref(0);
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
  const isUploading = computed(() => uploading.value);
  const isActionLoading = computed(() => actionLoading.value);
  const hasError = computed(() => !!error.value);
  const hasImages = computed(() => images.value.length > 0);
  const totalImages = computed(() => images.value.length);
  const hasMore = computed(() => pagination.value.hasMore ?? false);

  // Get image by ID
  const getImageById = computed(() => {
    return (id: string) => images.value.find((img) => img.id === id);
  });

  // Get images by patient ID
  const getImagesByPatientId = computed(() => {
    return (patientId: string) => imagesByPatient.value.get(patientId) || [];
  });

  // Get processed images
  const processedImages = computed(() => {
    return images.value.filter((img) => img.isProcessed());
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

  const resetUploadProgress = (): void => {
    uploadProgress.value = 0;
  };

  const updateImageInState = (updatedImage: Image): void => {
    // Update in main images array
    const index = images.value.findIndex((img) => img.id === updatedImage.id);
    if (index !== -1) {
      images.value = [
        ...images.value.slice(0, index),
        updatedImage,
        ...images.value.slice(index + 1),
      ];
    }

    // Update in patient-specific images
    const patientImages = imagesByPatient.value.get(updatedImage.patientId);
    if (patientImages) {
      const ptIndex = patientImages.findIndex((img) => img.id === updatedImage.id);
      if (ptIndex !== -1) {
        const newPatientImages = [...patientImages];
        newPatientImages[ptIndex] = updatedImage;
        imagesByPatient.value.set(updatedImage.patientId, newPatientImages);
      }
    }

    // Update current image if it matches
    if (currentImage.value?.id === updatedImage.id) {
      currentImage.value = updatedImage;
    }
  };

  const removeImageFromState = (imageId: string, patientId?: string): void => {
    // Remove from main images array
    images.value = images.value.filter((img) => img.id !== imageId);

    // Remove from patient-specific images
    if (patientId) {
      const patientImages = imagesByPatient.value.get(patientId);
      if (patientImages) {
        imagesByPatient.value.set(
          patientId,
          patientImages.filter((img) => img.id !== imageId)
        );
      }
    } else {
      // Remove from all patients if patientId not provided
      imagesByPatient.value.forEach((images, ptId) => {
        imagesByPatient.value.set(
          ptId,
          images.filter((img) => img.id !== imageId)
        );
      });
    }

    // Clear current image if it matches
    if (currentImage.value?.id === imageId) {
      currentImage.value = null;
    }
  };

  // ===========================
  // Actions - Fetch
  // ===========================

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
    options: FetchOptions = {}
  ): Promise<void> => {
    const { refresh = false, showToast: showErrorToast = true } = options;

    if (loading.value && !refresh) return;

    loading.value = true;
    resetError();

    try {
      const paginationParams: Pagination = {
        limit: 10,
        offset: 0,
        sortBy: 'created_at',
        sortOrder: 'desc',
        ...paginationOptions,
      };

      const result: PaginatedResult<Image> = await imageRepo.getByPatientId(
        patientId,
        paginationParams
      );

      // Store in patient-specific map
      imagesByPatient.value.set(patientId, result.data);

      // Also update main images array
      images.value = result.data;

      // Update pagination
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

  // ===========================
  // Actions - Upload
  // ===========================

  const uploadImage = async (
    patientId: string,
    file: File,
    options: UploadOptions = {}
  ): Promise<Image | null> => {
    uploading.value = true;
    resetError();
    resetUploadProgress();

    try {
      // Step 1: Create image metadata
      const createRequest: CreateNewImageRequest = {
        patient_id: patientId,
        content_type: file.type,
        name: file.name,
        format: file.name.split('.').pop() || 'unknown',
        size: file.size,
      };

      const uploadPayload: ImageUploadPayload = await imageRepo.create(createRequest);

      // Step 2: Upload file to storage
      const uploadParams: UploadImageParams = {
        payload: uploadPayload,
        file,
        onUploadProgress: (percentage: number) => {
          uploadProgress.value = percentage;
          options.onProgress?.(percentage);
        },
      };

      await imageRepo.upload(uploadParams);

      // Step 3: Fetch the created image (it should now have processing status)
      // We need to extract the image ID from the response
      // This might need adjustment based on your actual API response
      const newImage = await fetchImagesByPatient(patientId, undefined, { showToast: false });

      toast.success(t('image.messages.upload_success'));

      return images.value[0] || null;
    } catch (err: any) {
      handleError(err, t('image.messages.upload_error'));
      return null;
    } finally {
      uploading.value = false;
      resetUploadProgress();
    }
  };

  // ===========================
  // Actions - Delete
  // ===========================

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

  const batchDeleteImages = async (imageIds: string[], patientId: string): Promise<boolean> => {
    actionLoading.value = true;
    resetError();

    try {
      await imageRepo.batchDelete(imageIds);

      // Remove all deleted images from state
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

  // ===========================
  // Actions - Transfer
  // ===========================

  const transferImage = async (
    imageId: string,
    currentPatientId: string,
    targetPatientId: string
  ): Promise<boolean> => {
    actionLoading.value = true;
    resetError();

    try {
      await imageRepo.transfer(imageId, targetPatientId);

      // Remove from current patient
      removeImageFromState(imageId, currentPatientId);

      // Refresh both patients' images
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

  const batchTransferImages = async (data: BatchTransfer): Promise<boolean> => {
    actionLoading.value = true;
    resetError();

    try {
      await imageRepo.batchTransfer(data);

      toast.success(t('image.messages.batch_transfer_success'));
      return true;
    } catch (err: any) {
      handleError(err, t('image.messages.batch_transfer_error'));
      return false;
    } finally {
      actionLoading.value = false;
    }
  };

  // ===========================
  // Actions - Utility
  // ===========================

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

      if (image.status.isProcessed() || image.status.isFailed()) {
        return; // Stop polling
      }

      // Continue polling
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

  // ===========================
  // Return
  // ===========================

  return {
    // State
    images,
    imagesByPatient,
    currentImage,
    loading,
    uploading,
    actionLoading,
    uploadProgress,
    error,
    pagination,

    // Getters
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

    // Actions - Fetch
    fetchImageById,
    fetchImagesByPatient,
    loadMoreImages,

    // Actions - Upload
    uploadImage,

    // Actions - Delete
    deleteImage,
    batchDeleteImages,

    // Actions - Transfer
    transferImage,
    batchTransferImages,

    // Actions - Utility
    setCurrentImage,
    clearCurrentImage,
    clearImages,
    clearPatientImages,
    refreshImage,
    pollImageStatus,
    getImageCount,
    resetError,
  };
});
