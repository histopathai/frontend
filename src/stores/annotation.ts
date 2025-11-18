import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { repositories } from '@/services';
import type { Annotation } from '@/core/entities/Annotation';
import type { AnnotationType } from '@/core/entities/AnnotationType';
import type { CreateNewAnnotationRequest } from '@/core/repositories/IAnnotation';
import { useToast } from 'vue-toastification';

const annotationRepo = repositories.annotation;
const annotationTypeRepo = repositories.annotationType;

export const useAnnotationStore = defineStore('annotation', () => {
  // --- STATE ---
  const annotationTypes = ref<AnnotationType[]>([]);
  const annotations = ref<Annotation[]>([]);
  const currentImageId = ref<string | null>(null);

  const loading = ref(false);
  const error = ref<string | null>(null);

  // --- DEPENDENCIES ---
  const toast = useToast();

  // --- GETTERS ---
  const isLoading = computed(() => loading.value);

  // --- ACTIONS ---

  async function loadDataForImage(imageId: string) {
    if (currentImageId.value === imageId) return; // Zaten yüklü

    currentImageId.value = imageId;
    loading.value = true;
    error.value = null;

    try {
      const [typesResult, annotationsResult] = await Promise.all([
        annotationTypeRepo.list({ limit: 100, offset: 0 }),
        annotationRepo.getByImageId(imageId, { limit: 100, offset: 0 }),
      ]);

      annotationTypes.value = typesResult.data;
      annotations.value = annotationsResult.data;
    } catch (err: any) {
      console.error('Load Annotation Data Error:', err);
      error.value = err.response?.data?.message || 'Anotasyon verileri alınamadı.';
      toast.error(error.value);
    } finally {
      loading.value = false;
    }
  }

  async function createAnnotation(
    data: Omit<CreateNewAnnotationRequest, 'imageId' | 'annotatorId'>
  ) {
    if (loading.value) return;
    loading.value = true;
    error.value = null;

    if (!currentImageId.value) {
      toast.error('Anotasyon kaydetmek için bir görüntü seçili olmalı.');
      loading.value = false;
      return;
    }

    const payload: CreateNewAnnotationRequest = {
      ...data,
      imageId: currentImageId.value,
      annotatorId: '',
    };

    try {
      const newAnnotation = await annotationRepo.create(payload);
      annotations.value.push(newAnnotation);
      toast.success('Anotasyon kaydedildi.');
    } catch (err: any) {
      console.error('Create Annotation Error:', err);
      error.value = err.response?.data?.message || 'Anotasyon oluşturulamadı.';
      toast.error(error.value);
    } finally {
      loading.value = false;
    }
  }

  async function deleteAnnotation(id: string) {
    if (loading.value) return;
    loading.value = true;
    error.value = null;

    try {
      await annotationRepo.delete(id);
      annotations.value = annotations.value.filter((ann) => ann.id !== id);
      toast.success('Anotasyon silindi.');
    } catch (err: any) {
      console.error('Delete Annotation Error:', err);
      error.value = err.response?.data?.message || 'Anotasyon silinemedi.';
      toast.error(error.value);
    } finally {
      loading.value = false;
    }
  }

  function clearAnnotationData() {
    annotationTypes.value = [];
    annotations.value = [];
    currentImageId.value = null;
    loading.value = false;
    error.value = null;
  }

  return {
    // State
    loading,
    error,
    annotationTypes,
    annotations,
    currentImageId,
    // Getters
    isLoading,
    // Actions
    loadDataForImage,
    createAnnotation,
    deleteAnnotation,
    clearAnnotationData,
  };
});
