import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { repositories } from '@/services';
import { Annotation } from '@/core/entities/Annotation';
import { useToast } from 'vue-toastification';
import type { Point } from '@/core/value-objects/Point';

/**
 * 🔥 GELİŞTİRİLMİŞ ANNOTATION STORE
 *
 * Yeni Özellikler:
 * - Otomatik değer doldurma (loadExistingGlobalValues)
 * - Daha iyi draft yönetimi (çakışma kontrolü)
 * - Global annotation'ların güncelleme desteği
 * - Detaylı logging
 */

interface DraftAnnotation {
  id: string; // draft-{timestamp}
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

  const allAnnotations = computed(() => {
    // DB annotation'lar + Draft'lar (görsel olarak birleştirilmiş)
    return [...dbAnnotations.value];
  });

  const globalAnnotations = computed(() => {
    return dbAnnotations.value.filter((a) => a.tag?.global === true);
  });

  const localAnnotations = computed(() => {
    return dbAnnotations.value.filter((a) => a.tag?.global === false);
  });

  // ===========================
  // Actions - Fetch
  // ===========================

  /**
   * 🔄 Belirli bir görüntünün kayıtlı annotation'larını çeker
   */
  async function fetchAnnotations(imageId: string) {
    try {
      console.log('🔄 [AnnotationStore] Annotations yükleniyor:', imageId);

      const result = await annotationRepo.getByImageId(imageId, { limit: 100, offset: 0 });
      dbAnnotations.value = result.data.map((item: any) => Annotation.create(item));

      console.log('✅ [AnnotationStore] Annotations yüklendi:', {
        total: dbAnnotations.value.length,
        global: globalAnnotations.value.length,
        local: localAnnotations.value.length,
      });
    } catch (error) {
      console.error('❌ [AnnotationStore] Yükleme hatası:', error);
      dbAnnotations.value = [];
    }
  }

  /**
   * 🔄 Mevcut global annotation'ların değerlerini döndürür
   * Bu fonksiyon PatientInfoBar'dan çağrılarak form alanlarını doldurur
   */
  function loadExistingGlobalValues(): Record<string, any> {
    const existingValues: Record<string, any> = {};

    console.log('🔍 [AnnotationStore] Global değerler yükleniyor...');

    globalAnnotations.value.forEach((ann) => {
      if (ann.tag) {
        existingValues[ann.tag.tag_name] = ann.tag.value;
        console.log(`  ✅ ${ann.tag.tag_name} = ${ann.tag.value}`);
      }
    });

    console.log(
      '📊 [AnnotationStore] Toplam yüklenen global değer:',
      Object.keys(existingValues).length
    );

    return existingValues;
  }

  // ===========================
  // Actions - Draft Management
  // ===========================

  /**
   * 📝 Yeni draft annotation ekle veya mevcut olanı güncelle
   */
  function addDraft(tag: any, imageId: string, polygon: any = null) {
    console.group(`📝 [addDraft] ${tag.tag_name}`);

    // 1. VALIDASYON: Value kontrolü
    if (tag.value === undefined || tag.value === null || tag.value === '') {
      console.error('❌ İPTAL: value alanı eksik!', tag);
      console.groupEnd();
      return;
    }

    // 2. GLOBAL ANNOTATION GÜNCELLEME KONTROLÜ
    if (tag.global && !polygon) {
      const existingIndex = draftAnnotations.value.findIndex(
        (ann) => ann.tag?.global && ann.tag?.tag_name === tag.tag_name
      );

      if (existingIndex !== -1) {
        const existingDraft = draftAnnotations.value[existingIndex];

        // Type guard: tag'in var olduğundan emin ol
        if (!existingDraft || !existingDraft.tag) {
          console.error('❌ Beklenmeyen durum: Draft tag bulunamadı');
          console.groupEnd();
          return;
        }

        // Aynı değer mi kontrol et
        if (existingDraft.tag.value === tag.value) {
          console.log('✅ Değer aynı, değişiklik yok.');
          console.groupEnd();
          return;
        }

        // Değer farklı, güncelle
        console.log('🔄 Taslak güncellendi:', {
          old: existingDraft.tag.value,
          new: tag.value,
        });
        existingDraft.tag.value = tag.value;
        isDirty.value = true;
        console.groupEnd();
        return;
      }
    }

    // 3. YENİ TASLAK EKLEME
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

    console.log('✅ Yeni taslak başarıyla eklendi:', {
      id: newAnnotation.id,
      global: newAnnotation.tag.global,
      hasPolygon: !!polygon,
    });
    console.groupEnd();
  }

  /**
   * 🗑️ Kaydedilmemiş bir taslağı listeden çıkarır
   */
  function removeDraft(tempId: string) {
    console.log('🗑️ [removeDraft] Draft siliniyor:', tempId);

    draftAnnotations.value = draftAnnotations.value.filter((a) => a.id !== tempId);

    if (draftAnnotations.value.length === 0) {
      isDirty.value = false;
    }

    console.log('✅ [removeDraft] Draft silindi. Kalan:', draftAnnotations.value.length);
  }

  // ===========================
  // Actions - Save
  // ===========================

  /**
   * 💾 Tüm draft'ları DB'ye kaydet
   */
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
      const savedAnnotations: Annotation[] = [];

      // Her draft'ı sırayla kaydet
      for (const draft of draftAnnotations.value) {
        console.log('📤 Gönderilen Taslak:', {
          tag_name: draft.tag.tag_name,
          tag_type: draft.tag.tag_type,
          value: draft.tag.value,
          global: draft.tag.global,
          hasPolygon: !!draft.polygon,
        });

        // Backend'in beklediği formatı oluştur
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
        console.log('📥 Sunucu Yanıtı:', result);

        savedAnnotations.push(result);
      }

      // Başarılı kayıtları DB annotation'lara ekle
      dbAnnotations.value.push(...savedAnnotations);

      // Draft'ları temizle
      draftAnnotations.value = [];
      isDirty.value = false;

      toast.success(`${savedAnnotations.length} annotation başarıyla kaydedildi.`);
      console.log('✅ [saveAllChanges] Tüm değişiklikler kaydedildi!');
    } catch (error: any) {
      console.error('🔥 KAYIT HATASI DETAYI:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });

      toast.error('Hata: ' + (error.response?.data?.message || 'Kaydedilemedi'));
      throw error;
    } finally {
      actionLoading.value = false;
      console.groupEnd();
    }
  }

  // ===========================
  // Actions - Delete
  // ===========================

  /**
   * 🗑️ Veritabanındaki kalıcı bir annotation'ı siler
   */
  async function deleteRealAnnotation(annotationId: string) {
    actionLoading.value = true;

    try {
      console.log('🗑️ [deleteRealAnnotation] Siliniyor:', annotationId);

      await annotationRepo.delete(annotationId);
      dbAnnotations.value = dbAnnotations.value.filter((a) => a.id !== annotationId);

      toast.success('Annotation silindi.');
      console.log('✅ [deleteRealAnnotation] Başarıyla silindi');

      return true;
    } catch (error) {
      console.error('❌ [deleteRealAnnotation] Silme hatası:', error);
      toast.error('Silme işlemi başarısız.');
      return false;
    } finally {
      actionLoading.value = false;
    }
  }

  // ===========================
  // Actions - Utility
  // ===========================

  /**
   * 🧹 DB annotation'ları temizle (görüntü değişiminde)
   */
  function clearDbAnnotations() {
    console.log('🧹 [clearDbAnnotations] DB annotations temizleniyor');
    dbAnnotations.value = [];
  }

  /**
   * 🧹 Store içeriğini tamamen sıfırlar
   */
  function clearStore() {
    console.log('🧹 [clearStore] Store tamamen temizleniyor');
    dbAnnotations.value = [];
    draftAnnotations.value = [];
    isDirty.value = false;
  }

  // ===========================
  // Return
  // ===========================

  return {
    // State
    dbAnnotations,
    draftAnnotations,
    actionLoading,
    isDirty,

    // Computed
    allAnnotations,
    globalAnnotations,
    localAnnotations,
    hasUnsavedChanges,
    unsavedCount,

    // Actions - Fetch
    fetchAnnotations,
    loadExistingGlobalValues,

    // Actions - Draft
    addDraft,
    removeDraft,

    // Actions - Save
    saveAllChanges,

    // Actions - Delete
    deleteRealAnnotation,

    // Actions - Utility
    clearDbAnnotations,
    clearStore,
  };
});
