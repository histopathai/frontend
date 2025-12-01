import { defineStore } from 'pinia';
import { ref, computed, shallowRef } from 'vue';
import { repositories } from '@/services';
import { useToast } from 'vue-toastification';
import { useI18n } from 'vue-i18n';
import type { Annotation } from '@/core/entities/Annotation';
import type { CreateNewAnnotationRequest } from '@/core/repositories/IAnnotation';
import type { Pagination, PaginatedResult } from '@/core/types/common';

// ===========================
// Types & Interfaces
// ===========================

interface AnnotationState {
  annotations: Annotation[];
  annotationsByImage: Map<string, Annotation[]>;
  currentAnnotation: Annotation | null;
  selectedAnnotations: Set<string>;
  loading: boolean;
  actionLoading: boolean;
  error: string | null;
  pagination: Pagination;
}

interface FetchOptions {
  refresh?: boolean;
  showToast?: boolean;
}

// ===========================
// Store Definition
// ===========================

export const useAnnotationStore = defineStore('annotation', () => {
  const { t } = useI18n();
  const toast = useToast();
  const annotationRepo = repositories.annotation;

  // ===========================
  // State
  // ===========================

  const annotations = shallowRef<Annotation[]>([]);
  const annotationsByImage = ref<Map<string, Annotation[]>>(new Map());
  const currentAnnotation = ref<Annotation | null>(null);
  const selectedAnnotations = ref<Set<string>>(new Set());
  const loading = ref(false);
  const actionLoading = ref(false);
  const error = ref<string | null>(null);
  const pagination = ref<Pagination>({
    limit: 100,
    offset: 0,
    sortBy: 'created_at',
    sortDir: 'desc',
    hasMore: false,
  });

  // ===========================
  // Getters
  // ===========================

  const isLoading = computed(() => loading.value);
  const isActionLoading = computed(() => actionLoading.value);
  const hasError = computed(() => !!error.value);
  const hasAnnotations = computed(() => annotations.value.length > 0);
  const totalAnnotations = computed(() => annotations.value.length);
  const hasMore = computed(() => pagination.value.hasMore ?? false);
  const selectedCount = computed(() => selectedAnnotations.value.size);
  const hasSelection = computed(() => selectedAnnotations.value.size > 0);

  // Get annotation by ID
  const getAnnotationById = computed(() => {
    return (id: string) => annotations.value.find((ann) => ann.id === id);
  });

  // Get annotations by image ID
  const getAnnotationsByImageId = computed(() => {
    return (imageId: string) => annotationsByImage.value.get(imageId) || [];
  });

  // Get annotations with score
  const annotationsWithScore = computed(() => {
    return annotations.value.filter((ann) => ann.hasScore());
  });

  // Get annotations with classification
  const annotationsWithClass = computed(() => {
    return annotations.value.filter((ann) => ann.hasClassification());
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

  const updateAnnotationInState = (updatedAnnotation: Annotation): void => {
    // Update in main annotations array
    const index = annotations.value.findIndex((ann) => ann.id === updatedAnnotation.id);
    if (index !== -1) {
      annotations.value = [
        ...annotations.value.slice(0, index),
        updatedAnnotation,
        ...annotations.value.slice(index + 1),
      ];
    }

    // Note: We can't determine imageId from annotation entity directly
    // So we update in all image-specific annotations where it exists
    annotationsByImage.value.forEach((anns, imageId) => {
      const imgIndex = anns.findIndex((ann) => ann.id === updatedAnnotation.id);
      if (imgIndex !== -1) {
        const newImageAnnotations = [...anns];
        newImageAnnotations[imgIndex] = updatedAnnotation;
        annotationsByImage.value.set(imageId, newImageAnnotations);
      }
    });

    // Update current annotation if it matches
    if (currentAnnotation.value?.id === updatedAnnotation.id) {
      currentAnnotation.value = updatedAnnotation;
    }
  };

  const removeAnnotationFromState = (annotationId: string, imageId?: string): void => {
    // Remove from main annotations array
    annotations.value = annotations.value.filter((ann) => ann.id !== annotationId);

    // Remove from image-specific annotations
    if (imageId) {
      const imageAnnotations = annotationsByImage.value.get(imageId);
      if (imageAnnotations) {
        annotationsByImage.value.set(
          imageId,
          imageAnnotations.filter((ann) => ann.id !== annotationId)
        );
      }
    } else {
      // Remove from all images if imageId not provided
      annotationsByImage.value.forEach((anns, imgId) => {
        annotationsByImage.value.set(
          imgId,
          anns.filter((ann) => ann.id !== annotationId)
        );
      });
    }

    // Clear current annotation if it matches
    if (currentAnnotation.value?.id === annotationId) {
      currentAnnotation.value = null;
    }

    // Remove from selection
    selectedAnnotations.value.delete(annotationId);
  };

  // ===========================
  // Actions - Fetch
  // ===========================

  const fetchAnnotationById = async (
    annotationId: string,
    options: FetchOptions = {}
  ): Promise<Annotation | null> => {
    const { showToast: showErrorToast = true } = options;

    loading.value = true;
    resetError();

    try {
      const annotation = await annotationRepo.getById(annotationId);

      if (annotation) {
        currentAnnotation.value = annotation;
        updateAnnotationInState(annotation);
      }

      return annotation;
    } catch (err: any) {
      handleError(err, t('annotation.messages.fetch_error'), showErrorToast);
      return null;
    } finally {
      loading.value = false;
    }
  };

  const fetchAnnotationsByImage = async (
    imageId: string,
    paginationOptions?: Partial<Pagination>,
    options: FetchOptions = {}
  ): Promise<void> => {
    const { refresh = false, showToast: showErrorToast = true } = options;

    if (loading.value && !refresh) return;

    loading.value = true;
    resetError();

    try {
      const paginationParams: Pagination = {
        limit: 100,
        offset: 0,
        sortBy: 'created_at',
        sortDir: 'desc',
        ...paginationOptions,
      };

      const result: PaginatedResult<Annotation> = await annotationRepo.getByImageId(
        imageId,
        paginationParams
      );

      // Store in image-specific map
      annotationsByImage.value.set(imageId, result.data);

      // Also update main annotations array
      annotations.value = result.data;

      // Update pagination
      pagination.value = {
        ...paginationParams,
        ...result.pagination,
        hasMore: result.pagination?.hasMore ?? result.data.length === paginationParams.limit,
      };
    } catch (err: any) {
      handleError(err, t('annotation.messages.fetch_error'), showErrorToast);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const loadMoreAnnotations = async (imageId: string): Promise<void> => {
    if (!hasMore.value || loading.value) return;

    const currentAnnotations = annotationsByImage.value.get(imageId) || [];

    await fetchAnnotationsByImage(imageId, {
      offset: currentAnnotations.length,
    });
  };

  // ===========================
  // Actions - Create
  // ===========================

  const createAnnotation = async (
    imageId: string,
    data: Omit<CreateNewAnnotationRequest, 'image_id'>
  ): Promise<Annotation | null> => {
    actionLoading.value = true;
    resetError();

    try {
      const createRequest: CreateNewAnnotationRequest = {
        ...data,
        image_id: imageId,
      };

      const newAnnotation = await annotationRepo.create(createRequest);

      // Add to main annotations array
      annotations.value = [newAnnotation, ...annotations.value];

      // Add to image-specific annotations
      const imageAnnotations = annotationsByImage.value.get(imageId) || [];
      annotationsByImage.value.set(imageId, [newAnnotation, ...imageAnnotations]);

      toast.success(t('annotation.messages.create_success'));
      return newAnnotation;
    } catch (err: any) {
      handleError(err, t('annotation.messages.create_error'));
      throw err;
    } finally {
      actionLoading.value = false;
    }
  };

  // ===========================
  // Actions - Update
  // ===========================

  const updateAnnotation = async (
    annotationId: string,
    data: Partial<Omit<CreateNewAnnotationRequest, 'image_id' | 'annotator_id'>>
  ): Promise<boolean> => {
    actionLoading.value = true;
    resetError();

    try {
      await annotationRepo.update(annotationId, data);

      // Fetch updated annotation
      const updatedAnnotation = await annotationRepo.getById(annotationId);

      if (updatedAnnotation) {
        updateAnnotationInState(updatedAnnotation);
      }

      toast.success(t('annotation.messages.update_success'));
      return true;
    } catch (err: any) {
      handleError(err, t('annotation.messages.update_error'));
      return false;
    } finally {
      actionLoading.value = false;
    }
  };

  // ===========================
  // Actions - Delete
  // ===========================

  const deleteAnnotation = async (annotationId: string, imageId: string): Promise<boolean> => {
    actionLoading.value = true;
    resetError();

    try {
      await annotationRepo.delete(annotationId);

      removeAnnotationFromState(annotationId, imageId);

      toast.success(t('annotation.messages.delete_success'));
      return true;
    } catch (err: any) {
      handleError(err, t('annotation.messages.delete_error'));
      return false;
    } finally {
      actionLoading.value = false;
    }
  };

  const batchDeleteAnnotations = async (
    annotationIds: string[],
    imageId: string
  ): Promise<boolean> => {
    actionLoading.value = true;
    resetError();

    try {
      await annotationRepo.batchDelete(annotationIds);

      // Remove all deleted annotations from state
      annotationIds.forEach((id) => removeAnnotationFromState(id, imageId));

      toast.success(t('annotation.messages.batch_delete_success'));
      return true;
    } catch (err: any) {
      handleError(err, t('annotation.messages.batch_delete_error'));
      return false;
    } finally {
      actionLoading.value = false;
    }
  };

  // ===========================
  // Actions - Selection
  // ===========================

  const selectAnnotation = (annotationId: string): void => {
    selectedAnnotations.value.add(annotationId);
  };

  const deselectAnnotation = (annotationId: string): void => {
    selectedAnnotations.value.delete(annotationId);
  };

  const toggleAnnotationSelection = (annotationId: string): void => {
    if (selectedAnnotations.value.has(annotationId)) {
      selectedAnnotations.value.delete(annotationId);
    } else {
      selectedAnnotations.value.add(annotationId);
    }
  };

  const selectAllAnnotations = (): void => {
    annotations.value.forEach((ann) => selectedAnnotations.value.add(ann.id));
  };

  const clearSelection = (): void => {
    selectedAnnotations.value.clear();
  };

  const deleteSelectedAnnotations = async (imageId: string): Promise<boolean> => {
    if (selectedAnnotations.value.size === 0) return false;

    const ids = Array.from(selectedAnnotations.value);
    const success = await batchDeleteAnnotations(ids, imageId);

    if (success) {
      clearSelection();
    }

    return success;
  };

  // ===========================
  // Actions - Utility
  // ===========================

  const setCurrentAnnotation = (annotation: Annotation | null): void => {
    currentAnnotation.value = annotation;
  };

  const clearCurrentAnnotation = (): void => {
    currentAnnotation.value = null;
  };

  const clearAnnotations = (): void => {
    annotations.value = [];
    annotationsByImage.value.clear();
    currentAnnotation.value = null;
    selectedAnnotations.value.clear();
    error.value = null;
  };

  const clearImageAnnotations = (imageId: string): void => {
    annotationsByImage.value.delete(imageId);
  };

  const refreshAnnotation = async (annotationId: string): Promise<void> => {
    await fetchAnnotationById(annotationId, { showToast: false });
  };

  const getAnnotationCount = async (): Promise<number> => {
    try {
      return await annotationRepo.count();
    } catch (err: any) {
      handleError(err, 'Failed to get annotation count', false);
      return 0;
    }
  };

  // ===========================
  // Return
  // ===========================

  return {
    // State
    annotations,
    annotationsByImage,
    currentAnnotation,
    selectedAnnotations,
    loading,
    actionLoading,
    error,
    pagination,

    // Getters
    isLoading,
    isActionLoading,
    hasError,
    hasAnnotations,
    totalAnnotations,
    hasMore,
    selectedCount,
    hasSelection,
    getAnnotationById,
    getAnnotationsByImageId,
    annotationsWithScore,
    annotationsWithClass,

    // Actions - Fetch
    fetchAnnotationById,
    fetchAnnotationsByImage,
    loadMoreAnnotations,

    // Actions - Create
    createAnnotation,

    // Actions - Update
    updateAnnotation,

    // Actions - Delete
    deleteAnnotation,
    batchDeleteAnnotations,

    // Actions - Selection
    selectAnnotation,
    deselectAnnotation,
    toggleAnnotationSelection,
    selectAllAnnotations,
    clearSelection,
    deleteSelectedAnnotations,

    // Actions - Utility
    setCurrentAnnotation,
    clearCurrentAnnotation,
    clearAnnotations,
    clearImageAnnotations,
    refreshAnnotation,
    getAnnotationCount,
    resetError,
  };
});
