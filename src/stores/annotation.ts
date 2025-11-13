import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { repositories } from '@/services';
import type { Annotation } from '@/core/entities/Annotation';
import type { AnnotationType } from '@/core/entities/AnnotationType';
import type { CreateAnnotationRequest } from '@/core/repositories/IAnnotation';
import type { Pagination } from '@/core/types/common';

const annotationRepo = repositories.annotation;
const annotationTypeRepo = repositories.annotationType;

export const useAnnotationStore = defineStore('annotation', () => {
  // === STATE ===
  const annotationTypes = ref<AnnotationType[]>([]);
  const annotations = ref<Annotation[]>([]);
  const imageId = ref<string | null>(null);

  const loading = ref(false);
  const error = ref<string | null>(null);

  // === GETTERS ===
  const isLoading = computed(() => loading.value);
  const getAnnotationTypes = computed(() => annotationTypes.value);
  const getAnnotations = computed(() => annotations.value);

  // === ACTIONS ===

  async function loadDataForImage(newImageId: string) {
    if (imageId.value === newImageId && annotations.value.length > 0) {
      // Zaten yüklü
      return;
    }

    imageId.value = newImageId;
    loading.value = true;
    error.value = null;

    try {
      // Eşzamanlı olarak hem tipleri hem de annotasyonları çek
      const [typesResult, annotationsResult] = await Promise.all([
        annotationTypeRepo.list(),
        annotationRepo.getByImageId(newImageId, { limit: 1000, offset: 0 }), // Limit'i yüksek tut
      ]);

      annotationTypes.value = typesResult;
      annotations.value = annotationsResult.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Annotasyon verileri alınamadı.';
      console.error(error.value);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function createAnnotation(data: CreateAnnotationRequest): Promise<Annotation> {
    loading.value = true;
    error.value = null;

    if (!imageId.value) {
      throw new Error('Annotasyon oluşturmak için imageId ayarlanmamış.');
    }

    const payload = { ...data, imageId: imageId.value };

    try {
      const newAnnotation = await annotationRepo.create(payload);
      annotations.value.push(newAnnotation);
      return newAnnotation;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Annotasyon oluşturulamadı.';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteAnnotation(id: string): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      await annotationRepo.delete(id);
      annotations.value = annotations.value.filter((ann) => ann.id !== id);
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Annotasyon silinemedi.';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function clearStore() {
    annotationTypes.value = [];
    annotations.value = [];
    imageId.value = null;
    loading.value = false;
    error.value = null;
  }

  return {
    // State
    loading,
    error,
    // Getters
    isLoading,
    getAnnotationTypes,
    getAnnotations,
    // Actions
    loadDataForImage,
    createAnnotation,
    deleteAnnotation,
    clearStore,
  };
});
