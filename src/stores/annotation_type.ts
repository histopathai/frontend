import { defineStore } from 'pinia';
import { ref, computed, shallowRef } from 'vue';
import { repositories } from '@/services';
import { useToast } from 'vue-toastification';
import { useI18n } from 'vue-i18n';
import type { AnnotationType } from '@/core/entities/AnnotationType';
import type {
  CreateNewAnnotationTypeRequest,
  UpdateAnnotationTypeRequest,
} from '@/core/repositories/IAnnotationType';
import type { Pagination, PaginatedResult } from '@/core/types/common';

// ===========================
// Types & Interfaces
// ===========================

interface AnnotationTypeState {
  annotationTypes: AnnotationType[];
  currentAnnotationType: AnnotationType | null;
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

export const useAnnotationTypeStore = defineStore('annotationType', () => {
  const { t } = useI18n();
  const toast = useToast();
  const annotationTypeRepo = repositories.annotationType;

  // ===========================
  // State
  // ===========================

  const annotationTypes = shallowRef<AnnotationType[]>([]);
  const currentAnnotationType = ref<AnnotationType | null>(null);
  const loading = ref(false);
  const actionLoading = ref(false);
  const error = ref<string | null>(null);
  const pagination = ref<Pagination>({
    limit: 100,
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
  const hasAnnotationTypes = computed(() => annotationTypes.value.length > 0);
  const totalAnnotationTypes = computed(() => annotationTypes.value.length);
  const hasMore = computed(() => pagination.value.hasMore ?? false);

  // Get annotation type by ID
  const getAnnotationTypeById = computed(() => {
    return (id: string) => annotationTypes.value.find((at) => at.id === id);
  });

  // Get annotation types with scoring enabled
  const annotationTypesWithScoring = computed(() => {
    return annotationTypes.value.filter((at) => at.supportsScoring());
  });

  // Get annotation types with classification enabled
  const annotationTypesWithClassification = computed(() => {
    return annotationTypes.value.filter((at) => at.supportsClassification());
  });

  // Get annotation type options for select/dropdown
  const annotationTypeOptions = computed(() => {
    return annotationTypes.value.map((at) => ({
      value: at.id,
      label: at.name,
      scoreEnabled: at.scoreEnabled,
      classificationEnabled: at.classificationEnabled,
    }));
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

  const updateAnnotationTypeInState = (updatedAnnotationType: AnnotationType): void => {
    const index = annotationTypes.value.findIndex((at) => at.id === updatedAnnotationType.id);

    if (index !== -1) {
      annotationTypes.value = [
        ...annotationTypes.value.slice(0, index),
        updatedAnnotationType,
        ...annotationTypes.value.slice(index + 1),
      ];
    }

    if (currentAnnotationType.value?.id === updatedAnnotationType.id) {
      currentAnnotationType.value = updatedAnnotationType;
    }
  };

  const removeAnnotationTypeFromState = (annotationTypeId: string): void => {
    annotationTypes.value = annotationTypes.value.filter((at) => at.id !== annotationTypeId);

    if (currentAnnotationType.value?.id === annotationTypeId) {
      currentAnnotationType.value = null;
    }
  };

  // ===========================
  // Actions - Fetch
  // ===========================

  const fetchAnnotationTypes = async (
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

      const result: PaginatedResult<AnnotationType> =
        await annotationTypeRepo.list(paginationParams);

      annotationTypes.value = result.data;

      // Update pagination metadata
      pagination.value = {
        ...paginationParams,
        ...result.pagination,
        hasMore: result.pagination?.hasMore ?? result.data.length === paginationParams.limit,
      };
    } catch (err: any) {
      handleError(err, t('annotation_type.messages.fetch_error'), showErrorToast);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchAnnotationTypeById = async (
    annotationTypeId: string,
    options: FetchOptions = {}
  ): Promise<AnnotationType | null> => {
    const { showToast: showErrorToast = true } = options;

    loading.value = true;
    resetError();

    try {
      const annotationType = await annotationTypeRepo.getById(annotationTypeId);

      if (annotationType) {
        currentAnnotationType.value = annotationType;
        updateAnnotationTypeInState(annotationType);
      }

      return annotationType;
    } catch (err: any) {
      handleError(err, t('annotation_type.messages.fetch_error'), showErrorToast);
      return null;
    } finally {
      loading.value = false;
    }
  };

  const loadMore = async (): Promise<void> => {
    if (!hasMore.value || loading.value) return;

    await fetchAnnotationTypes({
      offset: pagination.value.offset + pagination.value.limit,
    });
  };

  // ===========================
  // Actions - Create
  // ===========================

  const createAnnotationType = async (
    data: CreateNewAnnotationTypeRequest
  ): Promise<AnnotationType | null> => {
    actionLoading.value = true;
    resetError();

    try {
      // Validate business rules
      if (data.score_enabled) {
        if (!data.score_name || data.score_min === undefined || data.score_max === undefined) {
          throw new Error(t('annotation_type.validation.score_name_required'));
        }
        if (data.score_min >= data.score_max) {
          throw new Error(t('annotation_type.validation.score_range_invalid'));
        }
      }

      if (data.classification_enabled) {
        if (!data.class_list || data.class_list.length === 0) {
          throw new Error(t('annotation_type.validation.class_list_required'));
        }
      }

      const newAnnotationType = await annotationTypeRepo.create(data);

      // Add to beginning of list
      annotationTypes.value = [newAnnotationType, ...annotationTypes.value];

      toast.success(t('annotation_type.messages.create_success'));
      return newAnnotationType;
    } catch (err: any) {
      handleError(err, t('annotation_type.messages.create_error'));
      throw err;
    } finally {
      actionLoading.value = false;
    }
  };

  // ===========================
  // Actions - Update
  // ===========================

  const updateAnnotationType = async (
    annotationTypeId: string,
    data: UpdateAnnotationTypeRequest
  ): Promise<boolean> => {
    actionLoading.value = true;
    resetError();

    try {
      // Validate score range if both values are provided
      if (data.score_min !== undefined && data.score_max !== undefined) {
        if (data.score_min >= data.score_max) {
          throw new Error(t('annotation_type.validation.score_range_invalid'));
        }
      }

      // Validate class list if provided
      if (data.class_list !== undefined && data.class_list.length === 0) {
        throw new Error(t('annotation_type.validation.class_list_empty'));
      }

      await annotationTypeRepo.update(annotationTypeId, data);

      // Fetch updated annotation type
      const updatedAnnotationType = await annotationTypeRepo.getById(annotationTypeId);

      if (updatedAnnotationType) {
        updateAnnotationTypeInState(updatedAnnotationType);
      }

      toast.success(t('annotation_type.messages.update_success'));
      return true;
    } catch (err: any) {
      handleError(err, t('annotation_type.messages.update_error'));
      return false;
    } finally {
      actionLoading.value = false;
    }
  };

  // ===========================
  // Actions - Delete
  // ===========================

  const deleteAnnotationType = async (annotationTypeId: string): Promise<boolean> => {
    actionLoading.value = true;
    resetError();

    try {
      await annotationTypeRepo.delete(annotationTypeId);

      removeAnnotationTypeFromState(annotationTypeId);

      toast.success(t('annotation_type.messages.delete_success'));
      return true;
    } catch (err: any) {
      handleError(err, t('annotation_type.messages.delete_error'));
      return false;
    } finally {
      actionLoading.value = false;
    }
  };

  const batchDeleteAnnotationTypes = async (annotationTypeIds: string[]): Promise<boolean> => {
    actionLoading.value = true;
    resetError();

    try {
      await annotationTypeRepo.batchDelete(annotationTypeIds);

      // Remove all deleted annotation types from state
      annotationTypes.value = annotationTypes.value.filter(
        (at) => !annotationTypeIds.includes(at.id)
      );

      toast.success(t('annotation_type.messages.batch_delete_success'));
      return true;
    } catch (err: any) {
      handleError(err, t('annotation_type.messages.batch_delete_error'));
      return false;
    } finally {
      actionLoading.value = false;
    }
  };

  // ===========================
  // Actions - Utility
  // ===========================

  const setCurrentAnnotationType = (annotationType: AnnotationType | null): void => {
    currentAnnotationType.value = annotationType;
  };

  const clearCurrentAnnotationType = (): void => {
    currentAnnotationType.value = null;
  };

  const clearAnnotationTypes = (): void => {
    annotationTypes.value = [];
    currentAnnotationType.value = null;
    error.value = null;
    pagination.value = {
      limit: 100,
      offset: 0,
      sortBy: 'created_at',
      sortOrder: 'desc',
      hasMore: false,
    };
  };

  const refreshAnnotationType = async (annotationTypeId: string): Promise<void> => {
    await fetchAnnotationTypeById(annotationTypeId, { showToast: false });
  };

  const getAnnotationTypeCount = async (): Promise<number> => {
    try {
      return await annotationTypeRepo.count();
    } catch (err: any) {
      handleError(err, 'Failed to get annotation type count', false);
      return 0;
    }
  };

  // ===========================
  // Business Logic Helpers
  // ===========================

  const validateScoreForType = (
    annotationTypeId: string,
    score: number
  ): { valid: boolean; message?: string } => {
    const annotationType = getAnnotationTypeById.value(annotationTypeId);

    if (!annotationType) {
      return { valid: false, message: 'Annotation type not found' };
    }

    if (!annotationType.supportsScoring()) {
      return { valid: false, message: 'This annotation type does not support scoring' };
    }

    const range = annotationType.scoreRange();
    if (!range) {
      return { valid: false, message: 'Score range not configured' };
    }

    if (score < range.min || score > range.max) {
      return {
        valid: false,
        message: t('annotation.messages.score_out_of_range', { min: range.min, max: range.max }),
      };
    }

    return { valid: true };
  };

  const validateClassForType = (
    annotationTypeId: string,
    className: string
  ): { valid: boolean; message?: string } => {
    const annotationType = getAnnotationTypeById.value(annotationTypeId);

    if (!annotationType) {
      return { valid: false, message: 'Annotation type not found' };
    }

    if (!annotationType.supportsClassification()) {
      return { valid: false, message: 'This annotation type does not support classification' };
    }

    const classList = annotationType.classListForSerialization();
    if (!classList || !classList.includes(className)) {
      return { valid: false, message: 'Invalid class name for this annotation type' };
    }

    return { valid: true };
  };

  // ===========================
  // Return
  // ===========================

  return {
    // State
    annotationTypes,
    currentAnnotationType,
    loading,
    actionLoading,
    error,
    pagination,

    // Getters
    isLoading,
    isActionLoading,
    hasError,
    hasAnnotationTypes,
    totalAnnotationTypes,
    hasMore,
    getAnnotationTypeById,
    annotationTypesWithScoring,
    annotationTypesWithClassification,
    annotationTypeOptions,

    // Actions - Fetch
    fetchAnnotationTypes,
    fetchAnnotationTypeById,
    loadMore,

    // Actions - Create
    createAnnotationType,

    // Actions - Update
    updateAnnotationType,

    // Actions - Delete
    deleteAnnotationType,
    batchDeleteAnnotationTypes,

    // Actions - Utility
    setCurrentAnnotationType,
    clearCurrentAnnotationType,
    clearAnnotationTypes,
    refreshAnnotationType,
    getAnnotationTypeCount,
    resetError,

    // Business Logic Helpers
    validateScoreForType,
    validateClassForType,
  };
});
