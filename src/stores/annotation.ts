import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { repositories } from '@/services';
import { Annotation } from '@/core/entities/Annotation';
import { useToast } from 'vue-toastification';

export const useAnnotationStore = defineStore('annotation', () => {
  const toast = useToast();
  const annotationRepo = repositories.annotation;

  const dbAnnotations = ref<Annotation[]>([]);
  const draftAnnotations = ref<any[]>([]);
  const actionLoading = ref(false);
  const isDirty = ref(false);

  const hasUnsavedChanges = computed(() => draftAnnotations.value.length > 0 || isDirty.value);
  const unsavedCount = computed(() => draftAnnotations.value.length);
  const allAnnotations = computed(() => [...dbAnnotations.value, ...draftAnnotations.value]);

  // --- ACTIONS ---

  function addDraft(tag: any, imageId: string, polygon: any = null) {
    console.group(`📝 [addDraft Debug] ${tag.tag_name}`);

    if (tag.value === undefined || tag.value === null || tag.value === '') {
      console.error("❌ İPTAL: 'value' alanı eksik olduğu için taslak eklenmedi!", tag);
      console.groupEnd();
      return; // Fonksiyondan çık
    }

    if (!polygon) {
      // 2. MÜKERRER KONTROLÜ (Sayaç artışını önler)
      const existingIndex = draftAnnotations.value.findIndex(
        (ann) => ann.tag?.global && ann.tag?.tag_name === tag.tag_name
      );

      if (existingIndex !== -1) {
        if (draftAnnotations.value[existingIndex].tag.value === tag.value) {
          console.log('✅ Değer aynı, değişiklik yok.');
          console.groupEnd();
          return;
        }

        console.log('🔄 Taslak güncellendi:', tag.value);
        draftAnnotations.value[existingIndex].tag.value = tag.value;
        isDirty.value = true;
        console.groupEnd();
        return;
      }
    }

    // 3. YENİ TASLAK EKLEME
    const newAnnotation = {
      id: `draft-${Date.now()}`,
      image_id: imageId,
      tag: { ...tag }, // Artık value alanının burada olduğundan eminiz
      polygon: polygon,
    };

    draftAnnotations.value.push(newAnnotation);
    isDirty.value = true;
    console.log('✅ Yeni taslak başarıyla eklendi.');
    console.groupEnd();
  }

  async function saveAllChanges() {
    console.group('🚀 [STORE -> saveAllChanges]');
    console.log('Kaydedilecek Toplam Taslak:', draftAnnotations.value.length);

    if (draftAnnotations.value.length === 0) {
      console.warn('⚠️ Kaydedilecek taslak yok.');
      console.groupEnd();
      return;
    }

    actionLoading.value = true;
    try {
      for (const draft of draftAnnotations.value) {
        console.log('📤 Gönderilen Tekil Taslak (Payload):', draft);

        // Backend'in beklediği formatı doğrula
        const result = await annotationRepo.create({
          tag: draft.tag,
          polygon: draft.polygon,
          parent: { id: draft.image_id, type: 'image' },
        });
        console.log('📥 Sunucu Yanıtı (Success):', result);
      }

      draftAnnotations.value = [];
      isDirty.value = false;
      toast.success('Kaydedildi.');
    } catch (error: any) {
      console.error('🔥 KAYIT HATASI DETAYI:', {
        status: error.response?.status,
        data: error.response?.data, // Backend'in 'neden' reddettiği burada yazar
        message: error.message,
      });
      toast.error('Hata: ' + (error.response?.data?.message || 'Kaydedilemedi'));
    } finally {
      actionLoading.value = false;
      console.groupEnd();
    }
  }

  /**
   * Belirli bir görüntünün kayıtlı anotasyonlarını çeker.
   */
  async function fetchAnnotations(imageId: string) {
    try {
      const result = await annotationRepo.getByImageId(imageId, { limit: 100, offset: 0 });
      dbAnnotations.value = result.data.map((item: any) => Annotation.create(item));
    } catch (error) {
      console.warn('Anotasyonlar yüklenemedi:', error);
    }
  }

  /**
   * Veritabanındaki kalıcı bir anotasyonu siler.
   */
  async function deleteRealAnnotation(annotationId: string) {
    actionLoading.value = true;
    try {
      await annotationRepo.delete(annotationId);
      dbAnnotations.value = dbAnnotations.value.filter((a) => a.id !== annotationId);
      toast.success('Etiket silindi.');
      return true;
    } catch (error) {
      toast.error('Silme işlemi başarısız.');
      return false;
    } finally {
      actionLoading.value = false;
    }
  }

  /**
   * Kaydedilmemiş bir taslağı listeden çıkarır.
   */
  function removeDraft(tempId: string) {
    draftAnnotations.value = draftAnnotations.value.filter((a) => a.id !== tempId);
    if (draftAnnotations.value.length === 0) isDirty.value = false;
  }

  /**
   * Store içeriğini sıfırlar (Görüntü değişiminde çağrılır).
   */
  function clearStore() {
    dbAnnotations.value = [];
    draftAnnotations.value = [];
    isDirty.value = false;
  }

  return {
    // State
    dbAnnotations,
    draftAnnotations,
    actionLoading,
    isDirty,
    // Getters
    allAnnotations,
    hasUnsavedChanges,
    unsavedCount,
    // Actions
    addDraft,
    removeDraft,
    saveAllChanges,
    fetchAnnotations,
    deleteRealAnnotation,
    clearStore,
  };
});
