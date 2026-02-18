import { defineStore } from 'pinia';
import { ref, computed, shallowRef } from 'vue';
import { repositories } from '@/services';
import { useToast } from 'vue-toastification';
import { useI18n } from 'vue-i18n';
import { Annotation } from '@/core/entities/Annotation';
import type { CreateNewAnnotationRequest } from '@/core/repositories/IAnnotation';
import type { Pagination, PaginatedResult } from '@/core/types/common';

interface PendingAnnotation {
  tempId: string;
  imageId: string;
  ws_id: string;
  name: string;
  tag_type: string;
  value: any;
  color: string;
  is_global: boolean;
  data?: Array<{ tagName: string; value: string }>;
  polygon?: Array<{ x: number; y: number }>;
}

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

export const useAnnotationStore = defineStore('annotation', () => {
  const { t } = useI18n();
  const toast = useToast();
  const annotationRepo = repositories.annotation;
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
    hasMore: false,
  });

  const sort = ref({
    by: 'created_at',
    dir: 'desc' as 'asc' | 'desc',
  });

  const pendingAnnotations = ref<PendingAnnotation[]>([]);
  const dirtyAnnotations = ref<Map<string, { polygon: { x: number; y: number }[] }>>(new Map());
  const isLoading = computed(() => loading.value);
  const isActionLoading = computed(() => actionLoading.value);
  const hasError = computed(() => !!error.value);
  const hasAnnotations = computed(() => annotations.value.length > 0);
  const totalAnnotations = computed(() => annotations.value.length);
  const hasMore = computed(() => pagination.value.hasMore ?? false);
  const selectedCount = computed(() => selectedAnnotations.value.size);
  const hasSelection = computed(() => selectedAnnotations.value.size > 0);
  const pendingCount = computed(() => pendingAnnotations.value.length);
  const dirtyCount = computed(() => dirtyAnnotations.value.size);
  const hasPendingChanges = computed(
    () => pendingAnnotations.value.length > 0 || dirtyAnnotations.value.size > 0
  );

  const getAnnotationById = computed(() => {
    return (id: string) => annotations.value.find((ann) => ann.id === id);
  });

  const getAnnotationsByImageId = computed(() => {
    return (imageId: string) => annotationsByImage.value.get(imageId) || [];
  });

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
    const index = annotations.value.findIndex((ann) => ann.id === updatedAnnotation.id);
    if (index !== -1) {
      annotations.value = [
        ...annotations.value.slice(0, index),
        updatedAnnotation,
        ...annotations.value.slice(index + 1),
      ];
    }

    annotationsByImage.value.forEach((anns, imageId) => {
      const imgIndex = anns.findIndex((ann) => ann.id === updatedAnnotation.id);
      if (imgIndex !== -1) {
        const newImageAnnotations = [...anns];
        newImageAnnotations[imgIndex] = updatedAnnotation;
        annotationsByImage.value.set(imageId, newImageAnnotations);
      }
    });

    if (currentAnnotation.value?.id === updatedAnnotation.id) {
      currentAnnotation.value = updatedAnnotation;
    }
  };

  const removeAnnotationFromState = (annotationId: string, imageId?: string): void => {
    annotations.value = annotations.value.filter((ann) => ann.id !== annotationId);
    if (imageId) {
      const imageAnnotations = annotationsByImage.value.get(imageId);
      if (imageAnnotations) {
        annotationsByImage.value.set(
          imageId,
          imageAnnotations.filter((ann) => ann.id !== annotationId)
        );
      }
    } else {
      annotationsByImage.value.forEach((anns, imgId) => {
        annotationsByImage.value.set(
          imgId,
          anns.filter((ann) => ann.id !== annotationId)
        );
      });
    }

    if (currentAnnotation.value?.id === annotationId) {
      currentAnnotation.value = null;
    }

    selectedAnnotations.value.delete(annotationId);
  };

  const addPendingAnnotation = (annotation: PendingAnnotation): void => {
    pendingAnnotations.value.push(annotation);
  };

  const updatePendingAnnotation = (tempId: string, updates: Partial<PendingAnnotation>): void => {
    const index = pendingAnnotations.value.findIndex((a) => a.tempId === tempId);
    if (index !== -1) {
      const current = pendingAnnotations.value[index];
      if (current) {
        pendingAnnotations.value[index] = {
          ...current,
          ...updates,
        } as PendingAnnotation;
      }
    }
  };

  const removePendingAnnotation = (tempId: string): void => {
    const index = pendingAnnotations.value.findIndex((a) => a.tempId === tempId);
    if (index !== -1) {
      pendingAnnotations.value.splice(index, 1);
    }
  };

  const clearPendingAnnotations = (): void => {
    pendingAnnotations.value = [];
  };

  const saveAllPendingAnnotations = async (): Promise<boolean> => {
    if (pendingAnnotations.value.length === 0) {
      return true;
    }

    actionLoading.value = true;
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const pending of pendingAnnotations.value) {
        try {
          const createRequest: CreateNewAnnotationRequest = {
            ws_id: pending.ws_id,
            name: pending.name,
            tag_type: pending.tag_type,
            value: pending.value,
            color: pending.color,
            is_global: pending.is_global,
            polygon: pending.polygon as any,
            parent: {
              id: pending.imageId,
              type: 'image',
            },
          };

          const newAnnotation = await annotationRepo.create(createRequest);

          annotations.value = [newAnnotation, ...annotations.value];
          const imageAnnotations = annotationsByImage.value.get(pending.imageId) || [];
          annotationsByImage.value.set(pending.imageId, [newAnnotation, ...imageAnnotations]);

          successCount++;
        } catch (err: any) {
          errorCount++;
          console.error('❌ Annotation kaydetme hatası:', err);
          handleError(err, `${pending.name} kaydedilemedi`, false);
        }
      }
      if (successCount > 0) {
        clearPendingAnnotations();
        toast.success(`${successCount} adet annotation başarıyla kaydedildi`);
      }

      if (errorCount > 0) {
        toast.warning(`${errorCount} adet annotation kaydedilemedi`);
      }

      return errorCount === 0;
    } catch (err: any) {
      handleError(err, 'Toplu kaydetme sırasında hata oluştu');
      return false;
    } finally {
      actionLoading.value = false;
    }
  };

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
        ...paginationOptions,
      };

      const result = await annotationRepo.listByImage(imageId, {
        pagination: paginationParams,
        sort: [{ field: sort.value.by, direction: sort.value.dir }],
      });
      const rawData = result?.data || [];

      const entityAnnotations = rawData.map((item: any) => {
        const ann = item; // Already an instance
        if (!(ann as any).annotationTypeId) {
          console.warn(`⚠️ Annotation ${ann.id} has NO AnnotationType ID!`, item);
        }
        return ann;
      });

      console.groupEnd();

      annotationsByImage.value.set(imageId, entityAnnotations);
      annotations.value = entityAnnotations;

      pagination.value = {
        ...paginationParams,
        ...(result?.pagination || {}),
        hasMore: result?.pagination?.hasMore ?? rawData.length === paginationParams.limit,
      };
    } catch (err: any) {
      console.error('10. [Store] Fetch hatası:', err);
      if (err.response?.status === 404) {
        annotations.value = [];
        annotationsByImage.value.set(imageId, []);
      } else {
        handleError(err, t('annotation.messages.fetch_error'), showErrorToast);
      }
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

  const createAnnotation = async (
    imageId: string,
    data: Omit<CreateNewAnnotationRequest, 'parent'>
  ): Promise<Annotation | null> => {
    actionLoading.value = true;
    resetError();

    try {
      const createRequest: CreateNewAnnotationRequest = {
        ...data,
        parent: {
          id: imageId,
          type: 'image',
        },
      };

      const responseData = await annotationRepo.create(createRequest);
      // responseData is already an Annotation instance from the repository
      const newAnnotation = responseData;

      annotations.value = [newAnnotation, ...annotations.value];
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

  const updateAnnotation = async (
    annotationId: string,
    data: Partial<Omit<CreateNewAnnotationRequest, 'image_id' | 'annotator_id'>>
  ): Promise<boolean> => {
    actionLoading.value = true;
    resetError();

    try {
      // Backend requires full object or specific fields like creator_id for validation
      const existingAnnotation = annotations.value.find((a) => a.id === annotationId);
      if (!existingAnnotation) {
        throw new Error('Annotation not found');
      }

      const updatePayload: any = {
        ...data,
        id: annotationId,
        creator_id: existingAnnotation.creatorId,
        workspace_id: existingAnnotation.workspaceId,
        annotation_type_id: existingAnnotation.annotationTypeId,
      };

      await annotationRepo.update(annotationId, updatePayload);
      const updatedAnnotationResult = await annotationRepo.getById(annotationId);

      if (updatedAnnotationResult) {
        updateAnnotationInState(updatedAnnotationResult);
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

  const softDeleteManyAnnotations = async (
    annotationIds: string[],
    imageId: string
  ): Promise<boolean> => {
    actionLoading.value = true;
    resetError();

    try {
      await annotationRepo.softDeleteMany(annotationIds);
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

  const selectAnnotation = (annotationId: string | null) => {
    if (!annotationId) {
      currentAnnotation.value = null;
      return;
    }
    const found = annotations.value.find((a) => a.id === annotationId);
    if (found) {
      currentAnnotation.value = found;
    }
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
    const success = await softDeleteManyAnnotations(ids, imageId);

    if (success) {
      clearSelection();
    }

    return success;
  };

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

  const addDirtyAnnotation = (annotationId: string, polygon: { x: number; y: number }[]): void => {
    const newMap = new Map(dirtyAnnotations.value);
    newMap.set(annotationId, { polygon });
    dirtyAnnotations.value = newMap;
  };

  const saveAllDirtyAnnotations = async (): Promise<boolean> => {
    console.log('[saveAllDirtyAnnotations] called, dirtyCount:', dirtyAnnotations.value.size);
    if (dirtyAnnotations.value.size === 0) return true;

    actionLoading.value = true;
    let allSuccess = true;
    const entries = Array.from(dirtyAnnotations.value.entries());

    try {
      for (const [annotationId, data] of entries) {
        try {
          const existing = annotations.value.find((a) => a.id === annotationId);
          if (!existing) continue;

          // Workaround: DELETE + CREATE because PUT is broken on backend

          const createPayload: any = {
            name: existing.name,
            tag_type: existing.type,
            value: existing.value,
            polygon: data.polygon, // Updated polygon
            color: existing.color,
            is_global: existing.isGlobal,
            parent: {
              id: existing.imageId,
              type: 'image',
            },
            ws_id: existing.workspaceId,
            annotation_type_id: existing.annotationTypeId,
          };

          // 1. Delete old annotation
          await annotationRepo.delete(annotationId);

          // 2. Create new annotation
          const newAnnotation = await annotationRepo.create(createPayload);

          // 3. Update State
          // Remove old
          removeAnnotationFromState(annotationId, existing.imageId);

          // Add new
          annotations.value = [newAnnotation, ...annotations.value];
          const imageAnnotations = annotationsByImage.value.get(existing.imageId) || [];
          annotationsByImage.value.set(existing.imageId, [newAnnotation, ...imageAnnotations]);

          // Restore selection if needed
          if (currentAnnotation.value?.id === annotationId) {
            currentAnnotation.value = newAnnotation;
          }
          if (selectedAnnotations.value.has(annotationId)) {
            selectedAnnotations.value.delete(annotationId);
            selectedAnnotations.value.add(newAnnotation.id);
          }
        } catch (err: any) {
          console.error(
            `[saveAllDirtyAnnotations] Failed to save dirty annotation ${annotationId}:`,
            err
          );
          allSuccess = false;
        }
      }

      if (allSuccess) {
        dirtyAnnotations.value = new Map();
      }
      return allSuccess;
    } finally {
      actionLoading.value = false;
    }
  };

  const clearDirtyAnnotations = (): void => {
    dirtyAnnotations.value = new Map();
  };

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

    pendingAnnotations,
    pendingCount,
    hasPendingChanges,

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
    softDeleteManyAnnotations,

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

    addPendingAnnotation,
    updatePendingAnnotation,
    removePendingAnnotation,
    clearPendingAnnotations,
    saveAllPendingAnnotations,

    dirtyAnnotations,
    dirtyCount,
    addDirtyAnnotation,
    saveAllDirtyAnnotations,
    clearDirtyAnnotations,
  };
});
