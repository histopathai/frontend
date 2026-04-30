import { defineStore } from 'pinia';
import { ref, computed, shallowRef } from 'vue';
import { repositories } from '@/services';
import { useToast } from 'vue-toastification';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';
import { Annotation } from '@/core/entities/Annotation';
import type { CreateNewAnnotationRequest } from '@/core/repositories/IAnnotation';
import type { Pagination, PaginatedResult } from '@/core/types/common';
import { useAnnotationTypeStore } from '@/stores/annotation_type';

const SUBTYPE_COLORS = [
  '#8b5cf6', // Mor
  '#f59e0b', // Turuncu
  '#ec4899', // Pembe
  '#06b6d4', // Turkuaz
  '#f43f5e', // Gül
  '#6366f1', // Indigo
  '#d946ef', // Fuşya
  '#14b8a6', // Teal
  '#eab308', // Hardal
  '#0ea5e9'  // Sky
];
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
  const loadingReviews = new Set<string>(); // Cache for ongoing review fetches
  const userNames = ref<Record<string, string>>({}); // ID -> Display Name cache
  const tagIndexMap = ref<Record<string, Record<string, number>>>({}); // typeId -> { tagName -> index }
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
          const { color: _, ...cleanPending } = pending as any;
          const createRequest: CreateNewAnnotationRequest = {
            ...cleanPending,
            polygon: (pending.polygon || []).map(p => ({ x: Number(p.x), y: Number(p.y) })) as any,
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
        return ann;
      });


      const currentUserId = String(useAuthStore().user?.userId || '');
      const entityAnnotationsWithReviewFlag = entityAnnotations.map((ann: any) => {
        ann.isReview = String(ann.creatorId) !== currentUserId;
        return ann;
      });

      annotationsByImage.value.set(imageId, entityAnnotationsWithReviewFlag);
      annotations.value = entityAnnotationsWithReviewFlag;

      // RESOLVE USER NAMES
      const uids = entityAnnotationsWithReviewFlag.map(ann => ann.creatorId).filter(Boolean);
      resolveCreatorNames(uids);

      // PARALEL REVIEW YÜKLEME (Gecikmesiz)
      const annotationsToCheck = entityAnnotationsWithReviewFlag.filter((ann: any) => (ann.isReview) || (ann.reviewIds && ann.reviewIds.length > 0));

      if (annotationsToCheck.length > 0) {
        // Tarayıcıyı kilitlememek için arka planda sırayla çekiyoruz
        setTimeout(async () => {
          const chunkSize = 3; // Reduced chunk size for better rate limiting
          for (let i = 0; i < annotationsToCheck.length; i += chunkSize) {
            const chunk = annotationsToCheck.slice(i, i + chunkSize);
            await Promise.all(chunk.map((ann: any) => fetchAndApplyReview(ann.id)));
            // Small delay between chunks
            await new Promise(r => setTimeout(r, 200));
          }
        }, 300);
      }

      pagination.value = {
        ...paginationParams,
        ...(result?.pagination || {}),
        hasMore: result?.pagination?.hasMore ?? rawData.length === paginationParams.limit,
      };
    } catch (err: any) {
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
      const annotationsWithMetadata = results.data.map((ann: any) => {
        const isReview = String(ann.creatorId) !== currentUserId;
        (ann as any).isReview = isReview;
        return ann;
      });

      annotations.value = annotationsWithMetadata;

      // RESOLVE USER NAMES
      const uids = annotationsWithMetadata.map(ann => ann.creatorId).filter(Boolean);
      resolveCreatorNames(uids);

      // PARALEL REVIEW YÜKLEME (Daha Geniş Kapsamlı)
      // Sadece reviewIds olanlar değil, başkasına ait (isReview: true) olan her şeyi kontrol edelim
      const annotationsToCheck = annotationsWithMetadata.filter((ann: any) => (ann.isReview) || (ann.reviewIds && ann.reviewIds.length > 0));
      

      if (annotationsToCheck.length > 0) {
        const chunkSize = 5; // Hız için paket büyüklüğünü ayarlıyoruz
        for (let i = 0; i < annotationsToCheck.length; i += chunkSize) {
          const chunk = annotationsToCheck.slice(i, i + chunkSize);
          await Promise.all(chunk.map((ann: any) => fetchAndApplyReview(ann.id)));
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
      const { color: _, ...cleanData } = data as any;
      const createRequest: CreateNewAnnotationRequest = {
        ...cleanData,
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
        
        // HER ZAMAN tam durumu gönderiyoruz
        const payload: any = {
          annotation_id: annotationId,
          status: 'modified',
          comments: 'Modified via tagging modal or global tags.',
          modified_value: data.value !== undefined ? data.value : existingAnnotation.value,
          modified_polygon: (data.polygon || existingAnnotation.polygon || [])
            .map((p: any) => {
              const x = Number(p.x !== undefined ? p.x : p.X);
              const y = Number(p.y !== undefined ? p.y : p.Y);
              return { X: x, Y: y };
            })
            .filter((p: any) => !isNaN(p.X) && !isNaN(p.Y))
        };

        const success = await createReview(payload as any);
        
        if (success && options.showToast) {
          toast.success(t('annotation.messages.update_success') + ' (İnceleme olarak kaydedildi)');
        }
        
        return success;
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
    pendingAnnotations.value = [];
    dirtyAnnotations.value = new Map();
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
    if (dirtyAnnotations.value.size === 0) return true;

    actionLoading.value = true;
    let allSuccess = true;
    const entries = Array.from(dirtyAnnotations.value.entries());

    try {
      for (const [annotationId, data] of entries) {
        try {
          const existing = annotations.value.find((a) => String(a.id) === String(annotationId));
          if (!existing) {
            continue;
          }

          const currentUserId = String(useAuthStore().user?.userId || '');
          const creatorId = String(existing.creatorId || '');
          
          if (creatorId !== currentUserId || creatorId === '') {
            
            const payload: any = {
              annotation_id: annotationId,
              status: 'modified',
              comments: 'Expert modified geometry and/or value directly via UI.',
              // HER ZAMAN tam durumu gönderiyoruz (Orijinal anotasyon yapısı gibi)
              modified_polygon: (data.polygon || existing.polygon || [])
                .map((p: any) => {
                  const x = Number(p.x !== undefined ? p.x : p.X);
                  const y = Number(p.y !== undefined ? p.y : p.Y);
                  return { X: x, Y: y };
                })
                .filter((p: any) => !isNaN(p.X) && !isNaN(p.Y)),
              modified_value: data.value !== undefined ? data.value : existing.value
            };

            await createReview(payload as any);
            
            // Bayrakları temizle
            existing.isDirty = false;
            existing.isPolygonDirty = false;

            // createReview zaten fetchAnnotationById yapıyor, ama biz review'ı da hemen uygulayalım
            await fetchAndApplyReview(annotationId);
            
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

          await repositories.annotation.update(annotationId, updatePayload);
          
          // Wait a bit before fetching
          await new Promise(r => setTimeout(r, 1000));
          
          const updated = await repositories.annotation.getById(annotationId);
          
          if (updated) {
            updateAnnotationInState(updated);
          }
        } catch (err: any) {
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
      const currentUserId = String(useAuthStore().user?.userId || '');
      
      // 1. Mevcut review'ları kontrol et
      const reviews = await repositories.annotationReview.getByAnnotationId(data.annotation_id);
      
      // Bu kullanıcıya ait herhangi bir inceleme var mı?
      const existingReview = reviews.find(r => 
        String(r.reviewerId) === currentUserId
      );

      // annotation_id is enough for the backend to link to the parent annotation
      if (existingReview) {
        await repositories.annotationReview.update(existingReview.id, data);
      } else {
        await repositories.annotationReview.create(data);
      }

      // Refresh the annotation to get updated review_ids
      await fetchAnnotationById(data.annotation_id, { showToast: false });
      // Apply the review results (colors, modifications) to the local state
      await fetchAndApplyReview(data.annotation_id);
      return true;
    } catch (err: any) {
      handleError(err, t('annotation.messages.review_error'));
      return false;
    } finally {
      actionLoading.value = false;
    }
  };

  const approveAnnotation = async (annotationId: string): Promise<boolean> => {
    const existing = annotations.value.find(a => String(a.id) === String(annotationId));
    
    const success = await createReview({
      annotation_id: annotationId,
      status: 'approved',
      comments: 'Expert approved.'
    } as any);
    
    if (success) {
      // fetchAndApplyReview already called inside createReview, so the color is already green
      return true;
    }
    return false;
  };

  const rejectAnnotation = async (annotationId: string, imageId: string): Promise<boolean> => {
    // According to user requirement: "bu poligon doğru değil yalnızca bu poligonu sil"
    // We first mark as rejected, then delete it.
    const existing = annotations.value.find(a => String(a.id) === String(annotationId));

    await createReview({
      annotation_id: annotationId,
      status: 'rejected',
      comments: 'Expert rejected and hidden.'
    } as any);

    // According to user requirement: "arkaplanda db de silinmesin sadece gizlensin"
    // Just remove from local state
    removeAnnotationFromState(annotationId, imageId);
    return true;
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
      status: 'modified',
      comments: 'Expert modified and approved.',
      modified_polygon: (finalPolygon || [])
        .map((p: any) => {
          const x = Number(p.x !== undefined ? p.x : p.X);
          const y = Number(p.y !== undefined ? p.y : p.Y);
          return { X: x, Y: y };
        })
        .filter((p: any) => !isNaN(p.X) && !isNaN(p.Y)),
      modified_value: finalValue
    };

    // 3. Send the review
    const success = await createReview(payload as any);

    if (success) {
      // Color update for feedback
      const ann = annotations.value.find(a => String(a.id) === String(annotationId));
      if (ann) {
        ann.color = '#10b981'; // Expert Approved Green
        annotations.value = [...annotations.value];
      }

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
    if (loadingReviews.has(annotationId)) return false;
    loadingReviews.add(annotationId);

    try {
      const reviews = await repositories.annotationReview.getByAnnotationId(annotationId);
      const currentUserId = String(useAuthStore().user?.userId || '');
      
      const index = annotations.value.findIndex(a => a.id === annotationId);
      if (index === -1) return false;
      const ann = annotations.value[index]!;

      // Reset to base state before checking reviews
      (ann as any).isReview = String(ann.creatorId) !== currentUserId;
      const baseColor = getTagColor(ann.annotationTypeId, ann.value);

      if (!reviews || reviews.length === 0) {
        ann.color = baseColor;
        return false;
      }

      const getSafeTime = (d: any) => {
        if (!d) return 0;
        const t = new Date(d).getTime();
        return isNaN(t) ? 0 : t;
      };

      const latestReview = reviews
        .sort((a, b) => {
          const timeA = Math.max(getSafeTime(a.updatedAt), getSafeTime(a.createdAt));
          const timeB = Math.max(getSafeTime(b.updatedAt), getSafeTime(b.createdAt));
          return timeB - timeA;
        })[0];

      const annUpdateTime = Math.max(getSafeTime(ann.updatedAt), getSafeTime(ann.createdAt));

      if (latestReview && latestReview.status === 'rejected') {
        // Eğer reject varsa ve en son yapılan işlem (update dahil) annotation'dan yeniyse veya aynıysa gizle
        const latestReviewTime = Math.max(getSafeTime(latestReview.updatedAt), getSafeTime(latestReview.createdAt));
        if (latestReviewTime >= annUpdateTime) {
          removeAnnotationFromState(annotationId);
          return true;
        }
      }

      const latestModified = reviews
        .filter(r => r.status === 'modified' || r.status === 'approved')
        .filter(r => r.modifiedPolygon || r.modifiedValue)
        .sort((a, b) => {
          const timeA = Math.max(getSafeTime(a.updatedAt), getSafeTime(a.createdAt));
          const timeB = Math.max(getSafeTime(b.updatedAt), getSafeTime(b.createdAt));
          return timeB - timeA;
        })[0];

      if (latestModified) {
        const reviewTime = Math.max(getSafeTime(latestModified.updatedAt), getSafeTime(latestModified.createdAt));

        // KRİTİK KONTROL: En son hangisi yapıldıysa (veya aynı andaysa) onu göster!
        if (reviewTime >= annUpdateTime) {
          if (latestModified.modifiedPolygon) {
            const pts = (latestModified.modifiedPolygon as any[]).map((p: any) => {
              const x = p.x !== undefined ? p.x : p.X;
              const y = p.y !== undefined ? p.y : p.Y;
              return { x: Number(x), y: Number(y) };
            }).filter((p: any) => !isNaN(p.x) && !isNaN(p.y));

            if (pts.length >= 3) {
              ann.polygon = pts as any;
            }
          }
          
          if (latestModified.modifiedValue !== undefined) {
            ann.value = latestModified.modifiedValue;
          }
          
          (ann as any).isReview = true;
          // Status'e göre renk ata: approved -> Yeşil, modified -> Mavi
          ann.color = latestModified.status === 'approved' ? '#10b981' : '#3b82f6';
          
          annotations.value = [...annotations.value];
          return true;
        } else {
          // Orijinal daha yeni, ama bir inceleme var. 
          // Orijinal renk ve flag'i koruyoruz (zaten yukarıda resetledik)
          ann.color = baseColor;
          annotations.value = [...annotations.value];
        }
      } else if (latestReview && latestReview.status === 'approved') {
        // Modifikasyon yok ama onay var ve onay daha yeni veya aynı anda
        const latestReviewTime = Math.max(getSafeTime(latestReview.updatedAt), getSafeTime(latestReview.createdAt));
        if (latestReviewTime >= annUpdateTime) {
          ann.color = '#10b981'; // Yeşil
          annotations.value = [...annotations.value];
        } else {
          ann.color = baseColor;
          annotations.value = [...annotations.value];
        }
      } else {
        // Hiçbir geçerli review yok veya hepsi eski
        ann.color = baseColor;
        annotations.value = [...annotations.value];
      }
    } catch (e) {
      console.error('fetchAndApplyReview failed', e);
    } finally {
      loadingReviews.delete(annotationId);
    }
    return false;
  };

  const resolveCreatorNames = async (uids: string[]): Promise<void> => {
    const uniqueUids = [...new Set(uids)].filter(uid => uid && !userNames.value[uid]);
    if (uniqueUids.length === 0) return;

    await Promise.all(uniqueUids.map(async (uid) => {
      try {
        const data = await repositories.auth.getPublicUser(uid);
        const name = data?.display_name || (data as any)?.displayName || (data as any)?.user?.display_name || (data as any)?.user?.displayName;
        
        if (name && name !== uid) {
          userNames.value = { 
            ...userNames.value, 
            [uid]: name 
          };
        }
      } catch (err) {
        // Silently fail for public lookup
      }
    }));
  };

  const getTagIndex = (annotationTypeId: string, tagValue: string): number => {
    const typeStore = useAnnotationTypeStore();
    const type = typeStore.annotationTypes.find(t => t.id === annotationTypeId);
    if (!type || !type.options) return -1;
    
    const normalizedTag = String(tagValue || '').trim().toLowerCase();
    return type.options.findIndex(opt => String(opt).trim().toLowerCase() === normalizedTag);
  };

  const getTagColor = (annotationTypeId: string, tagValue: string): string => {
    const index = getTagIndex(annotationTypeId, tagValue);
    
    if (index === -1) {
      // Fallback hash for tags not in formal options
      const normalizedTag = String(tagValue || '').trim().toLowerCase();
      if (!normalizedTag) return '#ec4899';
      let hash = 0;
      for (let i = 0; i < normalizedTag.length; i++) {
        hash = normalizedTag.charCodeAt(i) + ((hash << 5) - hash);
      }
      return SUBTYPE_COLORS[Math.abs(hash) % SUBTYPE_COLORS.length] || '#ec4899';
    }
    
    return SUBTYPE_COLORS[index % SUBTYPE_COLORS.length] || '#ec4899';
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
    approveAnnotation,
    rejectAnnotation,
    editAndApproveAnnotation,
    fetchAndApplyReview,
    deleteReview,
    fetchAnnotationsByImageId,
    userNames,
    resolveCreatorNames,
    getTagColor,
    getTagIndex,
  };
})
