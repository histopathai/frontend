// src/stores/annotation.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { repositories } from '@/services';
import { Annotation } from '@/core/entities/Annotation';
import { useToast } from 'vue-toastification';

export const useAnnotationStore = defineStore('annotation', () => {
  const toast = useToast();
  const annotationRepo = repositories.annotation;

  // STATE
  const dbAnnotations = ref<Annotation[]>([]); // Veritabanından gelenler
  const draftAnnotations = ref<any[]>([]); // Henüz kaydedilmemiş taslaklar
  const actionLoading = ref(false);

  // GETTERS
  const hasUnsavedChanges = computed(() => draftAnnotations.value.length > 0);
  const unsavedCount = computed(() => draftAnnotations.value.length);

  // Tüm etiketlerin birleşik listesi (Viewer'da göstermek için)
  const allAnnotations = computed(() => [...dbAnnotations.value, ...draftAnnotations.value]);

  // ACTIONS

  // Yeni bir taslak ekle (Lokal veya Global fark etmez)
  function addDraft(tag: any, imageId: string, polygon: any = null) {
    const newDraft = {
      id: `temp-${Date.now()}-${Math.random()}`,
      image_id: imageId,
      polygon: polygon, // null ise globaldir
      tag: {
        tag_type: tag.tag_type,
        tag_name: tag.tag_name,
        value: tag.value,
        color: tag.color || '#4f46e5',
        global: !polygon, // Poligon yoksa globaldir
      },
    };
    draftAnnotations.value.push(newDraft);
  }

  // Atomik Kaydetme (Toplu Kayıt)
  async function saveAllChanges() {
    if (draftAnnotations.value.length === 0) return;
    actionLoading.value = true;

    try {
      // Backend'e sırayla veya (varsa) batch endpoint'ine gönder
      for (const draft of draftAnnotations.value) {
        const { image_id, ...payload } = draft;
        await annotationRepo.create({
          ...payload,
          parent: { id: image_id, type: 'image' },
        });
      }

      // Başarılı ise temizle ve DB'yi yenile
      const lastImageId = draftAnnotations.value[0].image_id;
      draftAnnotations.value = [];
      await fetchAnnotations(lastImageId);

      toast.success('Tüm değişiklikler başarıyla kaydedildi.');
    } catch (error) {
      toast.error('Kaydetme sırasında bir hata oluştu.');
    } finally {
      actionLoading.value = false;
    }
  }

  async function fetchAnnotations(imageId: string) {
    const result = await annotationRepo.getByImageId(imageId, { limit: 100, offset: 0 });
    dbAnnotations.value = result.data.map((item: any) => Annotation.create(item));
  }

  // src/stores/annotation.ts içine eklenecek aksiyonlar:

  // 1. Veritabanındaki (kalıcı) bir anotasyonu siler
  async function deleteRealAnnotation(annotationId: string, imageId: string) {
    actionLoading.value = true;
    try {
      await annotationRepo.delete(annotationId);
      // State'i güncelle: db listesinden çıkar
      dbAnnotations.value = dbAnnotations.value.filter((a) => a.id !== annotationId);
      toast.success('Etiket başarıyla silindi.');
      return true;
    } catch (error) {
      toast.error('Etiket silinirken bir hata oluştu.');
      return false;
    } finally {
      actionLoading.value = false;
    }
  }

  // 2. Taslak (henüz kaydedilmemiş) bir anotasyonu listeden çıkarır
  function removeDraft(tempId: string) {
    draftAnnotations.value = draftAnnotations.value.filter((a) => a.id !== tempId);
  }

  function clearStore() {
    dbAnnotations.value = [];
    draftAnnotations.value = [];
  }

  return {
    dbAnnotations,
    draftAnnotations,
    allAnnotations,
    hasUnsavedChanges,
    unsavedCount,
    actionLoading,
    addDraft,
    removeDraft,
    saveAllChanges,
    fetchAnnotations,
    deleteRealAnnotation,
    clearStore,
  };
});
