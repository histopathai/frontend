import { defineStore } from 'pinia';
import { ref, computed, shallowRef } from 'vue';
import { repositories } from '@/services';
import { useToast } from 'vue-toastification';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';
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
  const dirtyAnnotations = ref<Map<string, any>>(new Map());
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
            polygon: (pending.polygon || []).map(p => ({ x: p.x, y: p.y })),
            parent: {
              id: pending.imageId,
              type: 'image',
            },
          };

          const newAnnotation = await repositories.annotation.create(createRequest);

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
      const annotation = await repositories.annotation.getById(annotationId);

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

      const result = await repositories.annotation.listByImage(imageId, {
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

      const currentUserId = String(useAuthStore().user?.userId || '');
      const entityAnnotationsWithReviewFlag = entityAnnotations.map((ann: any) => {
        ann.isReview = String(ann.creatorId) !== currentUserId;
        return ann;
      });

      annotationsByImage.value.set(imageId, entityAnnotationsWithReviewFlag);
      annotations.value = entityAnnotationsWithReviewFlag;

      // PARALEL REVIEW YÜKLEME (Gecikmesiz)
      const annotationsToCheck = entityAnnotationsWithReviewFlag.filter((ann: any) => (ann.isReview) || (ann.reviewIds && ann.reviewIds.length > 0));
      console.log(`🔍 [MAIN FETCH] Checking ${annotationsToCheck.length} annotations for potential reviews...`);

      if (annotationsToCheck.length > 0) {
        // Tarayıcıyı kilitlememek için arka planda sırayla çekiyoruz
        setTimeout(async () => {
          const chunkSize = 5;
          for (let i = 0; i < annotationsToCheck.length; i += chunkSize) {
            const chunk = annotationsToCheck.slice(i, i + chunkSize);
            await Promise.all(chunk.map(ann => fetchAndApplyReview(ann.id)));
          }
        }, 100);
      }

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

  const fetchAnnotationsByImageId = async (
    imageId: string,
    options: FetchOptions = { showToast: true }
  ): Promise<boolean> => {
    loading.value = true;
    resetError();
    try {
      const results = await repositories.annotation.listByImage(imageId);
      const currentUserId = String(useAuthStore().user?.userId || '');

      // Performans için: Şimdilik sadece sonuçları ham haliyle koyuyoruz.
      // Review'ları her anotasyon için tek tek çekmek yerine, 
      // ileride tek bir toplu istek (bulk) ile çekmek daha sağlıklı olacaktır.
      const annotationsWithMetadata = results.map(ann => {
        const isReview = String(ann.creatorId) !== currentUserId;
        (ann as any).isReview = isReview;
        return ann;
      });

      annotations.value = annotationsWithMetadata;

      // PARALEL REVIEW YÜKLEME (Daha Geniş Kapsamlı)
      // Sadece reviewIds olanlar değil, başkasına ait (isReview: true) olan her şeyi kontrol edelim
      const annotationsToCheck = annotationsWithMetadata.filter(ann => (ann.isReview) || (ann.reviewIds && ann.reviewIds.length > 0));
      
      console.log(`🔍 Checking ${annotationsToCheck.length} annotations for potential reviews...`);

      if (annotationsToCheck.length > 0) {
        const chunkSize = 5; // Hız için paket büyüklüğünü ayarlıyoruz
        for (let i = 0; i < annotationsToCheck.length; i += chunkSize) {
          const chunk = annotationsToCheck.slice(i, i + chunkSize);
          await Promise.all(chunk.map(ann => fetchAndApplyReview(ann.id)));
        }
      }

      return true;
    } catch (err: any) {
      handleError(err, t('annotation.messages.fetch_error'), options.showToast);
      return false;
    } finally {
      loading.value = false;
    }
  };

  const createAnnotation = async (
    imageId: string,
    data: Omit<CreateNewAnnotationRequest, 'parent'>,
    options: FetchOptions = { showToast: true }
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

      const responseData = await repositories.annotation.create(createRequest);
      // responseData is already an Annotation instance from the repository
      const newAnnotation = responseData;

      annotations.value = [newAnnotation, ...annotations.value];
      const imageAnnotations = annotationsByImage.value.get(imageId) || [];
      annotationsByImage.value.set(imageId, [newAnnotation, ...imageAnnotations]);

      if (options.showToast) {
        toast.success(t('annotation.messages.create_success'));
      }
      return newAnnotation;
    } catch (err: any) {
      handleError(err, t('annotation.messages.create_error'), options.showToast);
      throw err;
    } finally {
      actionLoading.value = false;
    }
  };

  const updateAnnotation = async (
    annotationId: string,
    data: Partial<Omit<CreateNewAnnotationRequest, 'image_id' | 'annotator_id'>>,
    options: FetchOptions = { showToast: true }
  ): Promise<boolean> => {
    actionLoading.value = true;
    resetError();

    try {
      const existingAnnotation = annotations.value.find((a) => a.id === annotationId);
      if (!existingAnnotation) {
        throw new Error('Annotation not found');
      }

      const currentUserId = String(useAuthStore().user?.userId || '');
      const creatorId = String(existingAnnotation.creatorId || '');

      // SAHİPLİK KONTROLÜ: Eğer yaratıcı biz değilsek Review oluştur!
      if (creatorId !== currentUserId || creatorId === '') {
        console.log(`📡 [REDIRECT TO REVIEW] Global/Modal update for ${annotationId}. Routing to Review...`);
        const payload: any = {
          annotation_id: annotationId,
          status: 'modified',
          comments: 'Modified via tagging modal or global tags.',
          modified_value: data.value,
        };
        
        if (data.polygon) {
          payload.modified_polygon = data.polygon;
        }

        await repositories.annotationReview.create(payload as any);
        
        if (options.showToast) {
          toast.success(t('annotation.messages.update_success') + ' (İnceleme olarak kaydedildi)');
        }
        
        await fetchAnnotationById(annotationId, { showToast: false });
        return true;
      }

      // Biz yaratıcıyız, orijinal veriyi güncelle
      const updatePayload: any = {
        creator_id: creatorId || '1',
      };
      
      if (data.value !== undefined) updatePayload.value = data.value;
      if (data.color !== undefined) updatePayload.color = data.color;
      if (data.is_global !== undefined) updatePayload.is_global = data.is_global;
      if (data.polygon !== undefined) updatePayload.polygon = data.polygon;

      await repositories.annotation.update(annotationId, updatePayload);
      const updatedAnnotationResult = await repositories.annotation.getById(annotationId);

      if (updatedAnnotationResult) {
        updateAnnotationInState(updatedAnnotationResult);
      }

      if (options.showToast) {
        toast.success(t('annotation.messages.update_success'));
      }
      return true;
    } catch (err: any) {
      handleError(err, t('annotation.messages.update_error'), options.showToast);
      return false;
    } finally {
      actionLoading.value = false;
    }
  };

  const deleteAnnotation = async (
    annotationId: string,
    imageId: string,
    options: FetchOptions = { showToast: true }
  ): Promise<boolean> => {
    actionLoading.value = true;
    resetError();

    try {
      await repositories.annotation.delete(annotationId);
      removeAnnotationFromState(annotationId, imageId);
      if (options.showToast) {
        toast.success(t('annotation.messages.delete_success'));
      }
      return true;
    } catch (err: any) {
      handleError(err, t('annotation.messages.delete_error'), options.showToast);
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
      await repositories.annotation.softDeleteMany(annotationIds);
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
      return await repositories.annotation.count();
    } catch (err: any) {
      handleError(err, 'Failed to get annotation count', false);
      return 0;
    }
  };

  const addDirtyAnnotation = (annotationId: string, updates: any): void => {
    const newMap = new Map(dirtyAnnotations.value);
    const existing = newMap.get(annotationId) || {};
    newMap.set(annotationId, { ...existing, ...updates });
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
          console.log(`[saveAllDirtyAnnotations] Processing ID: ${annotationId}`, data);
          const existing = annotations.value.find((a) => String(a.id) === String(annotationId));
          
          if (!existing) {
            console.error(`[saveAllDirtyAnnotations] FAILED: Annotation ${annotationId} not found in state!`, annotations.value);
            continue;
          }

          const currentUserId = String(useAuthStore().user?.userId || '');
          const creatorId = String(existing.creatorId || '');
          
          console.log(`🔍 [CHECK] ID: ${annotationId} | CurrentUser: "${currentUserId}" | Creator: "${creatorId}"`);

          if (creatorId !== currentUserId || creatorId === '') {
            console.group(`🚀 [ROUTING TO REVIEW] Annotation: ${annotationId}`);
            
            const payload: any = {
              annotation_id: annotationId,
              parent_id: annotationId,
              status: 'modified',
              comments: 'Expert modified geometry and/or value directly via UI.',
              // HER ZAMAN tam durumu gönderiyoruz (Orijinal anotasyon yapısı gibi)
              modified_polygon: data.polygon || existing.polygon.map((p: any) => ({ x: Number(p.x), y: Number(p.y) })),
              modified_value: data.value !== undefined ? data.value : existing.value
            };

            console.log('📤 [FINAL FULL-STATE PAYLOAD]:', JSON.stringify(payload, null, 2));
            await repositories.annotationReview.create(payload as any);
            
            // Bayrakları temizle
            existing.isDirty = false;
            existing.isPolygonDirty = false;

            // Veriyi yenile
            await fetchAnnotationById(annotationId, { showToast: false });
            await fetchAndApplyReview(annotationId);
            
            console.groupEnd();
            continue; 
          }

          // Biz yaratıcıyız, orijinal veriyi PUT request ile güncelle!
          const updatePayload: any = {
            creator_id: String(existing.creatorId || '1'),
            polygon: (data.polygon || existing.polygon || []).map((p: any) => ({ x: Number(p.x), y: Number(p.y) })),
          };

          if (data.value !== undefined) updatePayload.value = data.value;
          if (data.color !== undefined) updatePayload.color = data.color;
          if (data.is_global !== undefined) updatePayload.is_global = data.is_global;
          if (data.polygon !== undefined) updatePayload.polygon = data.polygon;

          console.log(`[FRONTEND] 1. Preparing PUT Request Payload for Annotation ID: ${annotationId}`);
          console.log(`[FRONTEND] 2. Payload Polygon length: ${updatePayload.polygon?.length}`);
          console.log(`[FRONTEND] 3. Payload JSON:`, JSON.stringify(updatePayload));
          
          await repositories.annotation.update(annotationId, updatePayload);
          console.log(`[FRONTEND] 4. PUT Request finished without errors. Backend accepted the request.`);
          
          // Wait a bit before fetching
          await new Promise(r => setTimeout(r, 1000));
          
          console.log(`[FRONTEND] 5. Fetching the updated annotation from backend...`);
          const updated = await repositories.annotation.getById(annotationId);
          console.log(`[FRONTEND] 6. Fetched Polygon from Backend:`, JSON.stringify(updated.polygon));
          
          if (updated) {
            updateAnnotationInState(updated);
            console.log(`[FRONTEND] 7. State updated with backend's response.`);
          }
        } catch (err: any) {
          console.error(`[saveAllDirtyAnnotations] Error updating ${annotationId}:`, err);
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

  const isReviewModeActive = computed(() => {
    const selected = currentAnnotation.value;
    if (!selected) return false;
    
    const currentUserId = String(useAuthStore().user?.userId || '');
    const creatorId = String(selected.creatorId || '');
    
    return creatorId !== currentUserId || creatorId === '';
  });

  const createReview = async (
    data: import('@/core/repositories/IAnnotationReviewRepository').CreateAnnotationReviewRequest
  ) => {
    actionLoading.value = true;
    resetError();
    try {
      await repositories.annotationReview.create(data);
      // Refresh the annotation to get updated review_ids
      await fetchAnnotationById(data.annotation_id, { showToast: false });
      return true;
    } catch (err: any) {
      handleError(err, t('annotation.messages.review_error'));
      return false;
    } finally {
      actionLoading.value = false;
    }
  };

  const approveAnnotation = async (annotationId: string): Promise<boolean> => {
    return await createReview({
      annotation_id: annotationId,
      status: 'approved',
      comments: 'Expert approved.',
    });
  };

  const rejectAnnotation = async (annotationId: string, imageId: string): Promise<boolean> => {
    // According to user requirement: "bu poligon doğru değil yalnızca bu poligonu sil"
    // We first mark as rejected, then delete it.
    await createReview({
      annotation_id: annotationId,
      status: 'rejected',
      comments: 'Expert rejected and deleted.',
    });
    return await deleteAnnotation(annotationId, imageId);
  };

  const editAndApproveAnnotation = async (annotationId: string, polygon: any[]): Promise<boolean> => {
    // 1. Get the modified polygon and value from dirtyAnnotations if they were changed
    let finalPolygon = polygon;
    let finalValue = undefined;

    const dirty = dirtyAnnotations.value.get(annotationId);
    if (dirty && dirty.polygon) {
      finalPolygon = dirty.polygon;
    }
    if (dirty && dirty.value !== undefined) {
      finalValue = dirty.value;
    }

    // 2. Prepare the review payload (ALWAYS full state)
    const payload: any = {
      annotation_id: annotationId,
      parent_id: annotationId,
      status: 'modified',
      comments: 'Expert modified and approved.',
      modified_polygon: finalPolygon.map((p: any) => ({ x: Number(p.x), y: Number(p.y) })),
      modified_value: finalValue
    };

    // 3. Send the review
    const success = await createReview(payload as any);

    if (success) {
      // 4. Remove from dirty annotations so we DON'T try to update the original later!
      const newMap = new Map(dirtyAnnotations.value);
      newMap.delete(annotationId);
      dirtyAnnotations.value = newMap;
    }

    return success;
  };

  const deleteReview = async (reviewId: string, annotationId: string) => {
    actionLoading.value = true;
    resetError();
    try {
      await repositories.annotationReview.delete(reviewId);
      // Refresh the annotation to get updated review_ids
      await fetchAnnotationById(annotationId, { showToast: false });
      toast.success(t('annotation.messages.review_delete_success'));
      return true;
    } catch (err: any) {
      handleError(err, t('annotation.messages.review_delete_error'));
      return false;
    } finally {
      actionLoading.value = false;
    }
  };

  const fetchAndApplyReview = async (annotationId: string) => {
    try {
      console.log(`📡 Fetching reviews for: ${annotationId}`);
      const reviews = await repositories.annotationReview.getByAnnotationId(annotationId);
      
      if (!reviews || reviews.length === 0) {
        console.log(`⚪ No reviews found for: ${annotationId}`);
        return false;
      }

      console.log(`📥 Received ${reviews.length} reviews for: ${annotationId}`);

      const latestModified = reviews
        .filter(r => r.status === 'modified' && (r.modifiedPolygon || r.modifiedValue))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

      if (latestModified) {
        console.log(`✨ Applying LATEST modified review for: ${annotationId}`, latestModified);
        const index = annotations.value.findIndex(a => a.id === annotationId);
        if (index !== -1) {
          const ann = annotations.value[index]!;
          
          if (latestModified.modifiedPolygon) {
            const pts = latestModified.modifiedPolygon.map(p => {
              const x = p.x !== undefined ? p.x : (p as any).X;
              const y = p.y !== undefined ? p.y : (p as any).Y;
              return { x: Number(x), y: Number(y) };
            }).filter(p => !isNaN(p.x) && !isNaN(p.y));

            if (pts.length >= 3) {
              // Reaktiviteyi bozmadan poligonu güncelle
              ann.polygon = pts;
              console.log(`✅ Polygon updated for: ${annotationId}`, pts);
            }
          }
          
          if (latestModified.modifiedValue !== undefined) {
            ann.value = latestModified.modifiedValue;
          }
          
          (ann as any).isReview = true;
          
          // Tüm diziyi yenileyerek watcher'ı tetikle
          annotations.value = [...annotations.value];
          return true;
        }
      }
    } catch (e) {
      console.warn(`❌ Review fetch error for ${annotationId}:`, e);
    }
    return false;
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

    // Actions - Review
    createReview,
    deleteReview,
    fetchAnnotationsByImageId,
    fetchAndApplyReview,
  };
})
