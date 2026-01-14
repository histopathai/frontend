import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { repositories } from '@/services';
import { Annotation } from '@/core/entities/Annotation';
import { useToast } from 'vue-toastification';
import type { Point } from '@/core/value-objects/Point';

interface DraftAnnotation {
  id: string;
  image_id: string;
  tag: {
    tag_type: string;
    tag_name: string;
    value: any;
    color?: string;
    global: boolean;
  };
  polygon: Point[] | null;
  description?: string;
}

export const useAnnotationStore = defineStore('annotation', () => {
  const toast = useToast();
  const annotationRepo = repositories.annotation;

  // ===========================
  // State
  // ===========================

  const dbAnnotations = ref<Annotation[]>([]);
  const draftAnnotations = ref<DraftAnnotation[]>([]);
  const actionLoading = ref(false);
  const isDirty = ref(false);

  // ===========================
  // Computed
  // ===========================

  const hasUnsavedChanges = computed(() => draftAnnotations.value.length > 0 || isDirty.value);
  const unsavedCount = computed(() => draftAnnotations.value.length);
  const allAnnotations = computed(() => [...dbAnnotations.value]);

  /**
   * 🔥 GÜNCELLENDİ: Global/Local ayrımı için sağlam (robust) kontrol
   * Backend "true" string'i veya true boolean'ı gönderebilir.
   */
  const globalAnnotations = computed(() => {
    return dbAnnotations.value.filter((a) => {
      const g = a.tag?.global;
      return String(g) === 'true' || g === true;
    });
  });

  const localAnnotations = computed(() => {
    return dbAnnotations.value.filter((a) => {
      const g = a.tag?.global;
      return String(g) !== 'true' && g !== true;
    });
  });

  // ===========================
  // Actions - Fetch
  // ===========================

  async function fetchAnnotations(imageId: string) {
    try {
      console.log('🔄 [AnnotationStore] Yükleniyor:', imageId);

      // Temizle
      dbAnnotations.value = [];

      const result = await annotationRepo.getByImageId(imageId, { limit: 100, offset: 0 });
      const rawData = result.data || [];

      // 🔥 GÜVENLİ MOD: Filtreleme yapma, sadece uyar.
      // API'den gelen veriyi %100 kabul et.
      const validItems = rawData;

      // Opsiyonel: Log amaçlı kontrol
      rawData.forEach((item: any) => {
        const pId = item.parent_id || item.parent?.id || item.parentId;
        if (pId && String(pId) !== String(imageId)) {
          console.warn(
            `⚠️ [AnnotationStore] ID Uyuşmazlığı (Kabul Edildi): Beklenen ${imageId}, Gelen ${pId}`
          );
        }
      });

      dbAnnotations.value = validItems.map((item: any) => Annotation.create(item));

      console.log('✅ [AnnotationStore] Yüklendi. Adet:', dbAnnotations.value.length);
    } catch (error) {
      console.error('❌ [AnnotationStore] Hata:', error);
      dbAnnotations.value = [];
    }
  }

  /**
   * 🔄 Formu doldurmak için değerleri döndürür
   */
  function loadExistingGlobalValues(): Record<string, any> {
    const existingValues: Record<string, any> = {};

    globalAnnotations.value.forEach((ann) => {
      if (ann.tag && ann.tag.tag_name) {
        existingValues[ann.tag.tag_name] = ann.tag.value;
      }
    });

    return existingValues;
  }

  // ===========================
  // Actions - Draft Management
  // ===========================

  function addDraft(tag: any, imageId: string, polygon: any = null) {
    if (tag.value === undefined || tag.value === null || tag.value === '') return;

    // Global ise ve zaten varsa güncelle
    if (tag.global && !polygon) {
      const existingDraft = draftAnnotations.value.find(
        (ann) => ann.tag?.global && ann.tag?.tag_name === tag.tag_name
      );

      if (existingDraft) {
        if (existingDraft.tag.value !== tag.value) {
          existingDraft.tag.value = tag.value;
          isDirty.value = true;
        }
        return;
      }
    }

    const newAnnotation: DraftAnnotation = {
      id: `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      image_id: imageId,
      tag: {
        tag_type: tag.tag_type,
        tag_name: tag.tag_name,
        value: tag.value,
        color: tag.color || '#6366f1',
        global: tag.global || false,
      },
      polygon: polygon,
      description: tag.description,
    };

    draftAnnotations.value.push(newAnnotation);
    isDirty.value = true;
  }

  function removeDraft(tempId: string) {
    draftAnnotations.value = draftAnnotations.value.filter((a) => a.id !== tempId);
    if (draftAnnotations.value.length === 0) isDirty.value = false;
  }

  // ===========================
  // Actions - Save
  // ===========================

  async function saveAllChanges() {
    if (draftAnnotations.value.length === 0) return;
    actionLoading.value = true;

    try {
      const savedAnnotations: Annotation[] = [];
      for (const draft of draftAnnotations.value) {
        const payload = {
          tag: {
            tag_type: draft.tag.tag_type,
            tag_name: draft.tag.tag_name,
            value: draft.tag.value,
            color: draft.tag.color,
            global: draft.tag.global,
          },
          polygon: draft.polygon || undefined,
          parent: { id: draft.image_id, type: 'image' as const },
          description: draft.description,
        };
        const result = await annotationRepo.create(payload);
        savedAnnotations.push(result);
      }

      dbAnnotations.value.push(...savedAnnotations);
      draftAnnotations.value = [];
      isDirty.value = false;
      toast.success(`${savedAnnotations.length} kayıt başarılı.`);
    } catch (error: any) {
      console.error('🔥 Kayıt hatası:', error);
      toast.error('Hata: ' + (error.response?.data?.message || 'Kaydedilemedi'));
      throw error;
    } finally {
      actionLoading.value = false;
    }
  }

  // ===========================
  // Actions - Delete & Utility
  // ===========================

  async function deleteRealAnnotation(annotationId: string) {
    actionLoading.value = true;
    try {
      await annotationRepo.delete(annotationId);
      dbAnnotations.value = dbAnnotations.value.filter((a) => a.id !== annotationId);
      toast.success('Silindi.');
      return true;
    } catch (error) {
      toast.error('Silme başarısız.');
      return false;
    } finally {
      actionLoading.value = false;
    }
  }

  function clearDbAnnotations() {
    dbAnnotations.value = [];
  }

  function clearStore() {
    dbAnnotations.value = [];
    draftAnnotations.value = [];
    isDirty.value = false;
  }

  return {
    dbAnnotations,
    draftAnnotations,
    actionLoading,
    isDirty,
    allAnnotations,
    globalAnnotations,
    localAnnotations,
    hasUnsavedChanges,
    unsavedCount,
    fetchAnnotations,
    loadExistingGlobalValues,
    addDraft,
    removeDraft,
    saveAllChanges,
    deleteRealAnnotation,
    clearDbAnnotations,
    clearStore,
  };
});
