<template>
  <div class="flex w-full overflow-hidden" style="height: calc(100vh - 65px)">
    <!-- SOL SIDEBAR -->
    <aside class="w-85 h-full flex-shrink-0 border-r border-gray-200">
      <AnnotatorSidebar
        :workspaces="workspaces"
        :patients="currentPatients"
        :images="currentImages"
        :selected-workspace-id="selectedWorkspaceId"
        :selected-patient-id="selectedPatientId"
        :selected-image-id="selectedImageId"
        :loading="loading"
        @workspace-selected="selectWorkspace"
        @patient-selected="selectPatient"
        @image-selected="selectImage"
        @load-more="loadMorePatients"
      />
    </aside>

    <!-- ANA İÇERİK -->
    <main class="flex-1 h-full flex flex-col bg-white min-w-0 overflow-hidden">
      <!-- ÜST BAR (GLOBAL ETİKETLER + HASTA BİLGİSİ + ÇİZİM MODU + KAYDET) -->
      <PatientInfoBar
        :patient="selectedPatient"
        :annotation-types="workspaceAnnotationTypes"
        :global-annotation-types="globalAnnotationTypes"
        :is-drawing-mode="isDrawingMode"
        :has-changes="annotationStore.hasUnsavedChanges"
        :unsaved-count="annotationStore.unsavedCount"
        :loading="annotationStore.actionLoading || patientStore.isActionLoading"
        @toggle-draw="toggleDrawing"
        @add-global="handleGlobalAnnotation"
        @update-patient="handlePatientUpdate"
        @save="saveAll"
      />

      <!-- GÖRÜNTÜ VİEWER -->
      <div class="flex-1 w-full overflow-hidden relative">
        <Viewer
          ref="viewerRef"
          :selected-image="selectedImage"
          @polygon-complete="handlePolygonComplete"
        />

        <!-- GÖRÜNTÜ NAVİGASYON BUTONLARI -->
        <div
          class="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2 z-50 pointer-events-none"
        >
          <button
            @click="navigateImage('prev')"
            :disabled="!canNavigatePrev"
            class="pointer-events-auto flex items-center gap-2 bg-gray-900/90 hover:bg-gray-900 disabled:bg-gray-500/50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg shadow-2xl transition-all text-sm font-bold backdrop-blur-sm"
          >
            <i class="fas fa-chevron-left"></i>
            <span>ÖNCEKİ</span>
          </button>

          <div
            class="pointer-events-auto flex items-center bg-gray-900/90 backdrop-blur-sm px-5 py-2.5 rounded-lg shadow-2xl text-sm font-bold text-white"
          >
            <i class="fas fa-image mr-2"></i>
            <span>{{ currentImageIndex + 1 }} / {{ totalImages }}</span>
          </div>

          <button
            @click="navigateImage('next')"
            :disabled="!canNavigateNext"
            class="pointer-events-auto flex items-center gap-2 bg-gray-900/90 hover:bg-gray-900 disabled:bg-gray-500/50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg shadow-2xl transition-all text-sm font-bold backdrop-blur-sm"
          >
            <span>SONRAKİ</span>
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>
      </div>

      <!-- LOKAL ANNOTATION MODALI -->
      <LocalAnnotationModal
        :is-open="isModalOpen"
        :local-annotation-types="localAnnotationTypes"
        @confirm="confirmLocalAnnotation"
        @cancel="cancelLocalAnnotation"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useAnnotatorNavigation } from '@/presentation/composables/annotator/useAnnotatorNavigation';
import { useAnnotationStore } from '@/stores/annotation';
import { useAnnotationTypeStore } from '@/stores/annotation_type';
import { usePatientStore } from '@/stores/patient';

// Bileşenler
import AnnotatorSidebar from '@/presentation/components/annotator/AnnotatorSidebar.vue';
import Viewer from '@/presentation/components/annotator/Viewer.vue';
import PatientInfoBar from '@/presentation/components/annotator/PatientInfoBar.vue';
import LocalAnnotationModal from '@/presentation/components/annotator/LocalAnnotationModal.vue';

// ===========================
// Stores ve Navigasyon
// ===========================

const {
  loading,
  workspaces,
  currentPatients,
  currentImages,
  workspaceAnnotationTypes,
  globalAnnotationTypes,
  localAnnotationTypes,
  selectedWorkspaceId,
  selectedPatientId,
  selectedImageId,
  selectedPatient,
  selectedImage,
  selectWorkspace,
  selectPatient,
  selectImage: selectImageFromNav,
  loadMorePatients,
} = useAnnotatorNavigation();

const annotationStore = useAnnotationStore();
const annotationTypeStore = useAnnotationTypeStore();
const patientStore = usePatientStore();

// ===========================
// UI State
// ===========================

const viewerRef = ref<InstanceType<typeof Viewer> | null>(null);
const isDrawingMode = ref(false);
const isModalOpen = ref(false);
const pendingPolygon = ref<{ annotation: any; points: any[] } | null>(null);
const pendingPatientUpdates = ref<Record<string, any>>({});

// ===========================
// Lifecycle
// ===========================

onMounted(() => {
  console.log('🎯 [AnnotatorView] Component mounted', {
    workspaceId: selectedWorkspaceId.value,
    globalTypes: globalAnnotationTypes.value.length,
    localTypes: localAnnotationTypes.value.length,
  });
});

// ===========================
// Watchers
// ===========================

/**
 * 🔄 Annotation Types değişimlerini izle
 */
watch(
  [workspaceAnnotationTypes, globalAnnotationTypes, localAnnotationTypes],
  ([workspace, global, local]) => {
    console.log('👀 [AnnotatorView] Annotation types güncellendi:', {
      workspace: workspace.length,
      global: global.length,
      local: local.length,
    });
  },
  { immediate: true, deep: true }
);

/**
 * 🔄 Görüntü değişimini izle ve annotation'ları yükle
 */
watch(
  () => selectedImageId.value,
  async (newImageId, oldImageId) => {
    if (newImageId && newImageId !== oldImageId) {
      console.log('🔄 [AnnotatorView] Görüntü değişti:', newImageId);

      // Çizim modunu kapat
      if (isDrawingMode.value) {
        isDrawingMode.value = false;
        viewerRef.value?.stopDrawing();
      }

      // Modalı kapat
      if (isModalOpen.value) {
        isModalOpen.value = false;
        pendingPolygon.value = null;
      }

      // Pending değişiklikleri temizle (yeni görüntüye geçerken)
      pendingPatientUpdates.value = {};

      // 🔥 ÖNEMLİ: Annotation'ları yükle
      await annotationStore.fetchAnnotations(newImageId);

      console.log('✅ [AnnotatorView] Annotations yüklendi:', {
        db: annotationStore.dbAnnotations.length,
        draft: annotationStore.draftAnnotations.length,
        total: annotationStore.allAnnotations.length,
      });
    }
  },
  { immediate: true }
);

// ===========================
// Navigation Functions
// ===========================

async function selectImage(imageOrId: string | any) {
  const imageId = typeof imageOrId === 'string' ? imageOrId : imageOrId.id;
  console.log('📸 [AnnotatorView] selectImage çağrıldı:', imageId);

  const imageObj = currentImages.value.find((img) => img.id === imageId);
  if (!imageObj) {
    console.error('❌ [AnnotatorView] Görüntü bulunamadı:', imageId);
    return;
  }

  selectImageFromNav(imageObj);
}

function navigateImage(direction: 'prev' | 'next') {
  const currentIndex = currentImageIndex.value;
  if (currentIndex === -1) return;

  let newIndex: number;
  if (direction === 'prev' && canNavigatePrev.value) {
    newIndex = currentIndex - 1;
  } else if (direction === 'next' && canNavigateNext.value) {
    newIndex = currentIndex + 1;
  } else {
    return;
  }

  const newImage = currentImages.value[newIndex];
  if (newImage) {
    console.log(`🔄 [Navigate] ${direction === 'prev' ? 'Önceki' : 'Sonraki'}:`, newImage.id);
    selectImage(newImage.id);
  }
}

const currentImageIndex = computed(() => {
  if (!selectedImageId.value) return -1;
  return currentImages.value.findIndex((img) => img.id === selectedImageId.value);
});

const totalImages = computed(() => currentImages.value.length);

const canNavigatePrev = computed(() => {
  return currentImageIndex.value > 0;
});

const canNavigateNext = computed(() => {
  return currentImageIndex.value < totalImages.value - 1 && currentImageIndex.value !== -1;
});

// ===========================
// Drawing Mode Functions
// ===========================

function toggleDrawing() {
  isDrawingMode.value = !isDrawingMode.value;

  if (isDrawingMode.value) {
    console.log('✏️ [Drawing] Çizim modu açıldı');
    viewerRef.value?.startDrawing();
  } else {
    console.log('🛑 [Drawing] Çizim modu kapatıldı');
    viewerRef.value?.stopDrawing();
  }
}

function handlePolygonComplete(payload: { annotation: any; points: any[] }) {
  console.log('🎯 [Polygon] Poligon tamamlandı, modal açılıyor');

  pendingPolygon.value = payload;
  isModalOpen.value = true;

  // Çizim modunu kapat
  isDrawingMode.value = false;
  viewerRef.value?.stopDrawing();
}

// ===========================
// Annotation Functions
// ===========================

/**
 * 📝 Lokal annotation onaylandığında
 */
function confirmLocalAnnotation({ type, description }: { type: any; description: string }) {
  if (!selectedImageId.value || !pendingPolygon.value) {
    console.error('❌ [LocalAnnotation] Eksik veri!');
    return;
  }

  console.log('✅ [LocalAnnotation] Onaylandı:', {
    type: type.name,
    description,
    points: pendingPolygon.value.points.length,
  });

  // Store'a draft ekle
  annotationStore.addDraft(
    {
      tag_type: type.type || 'REGION',
      tag_name: type.name,
      value: type.name, // Lokal annotation'larda value genelde name ile aynı
      color: type.color || '#6366f1',
      global: false,
      description: description || undefined,
    },
    selectedImageId.value,
    pendingPolygon.value.points
  );

  closeModal();
}

/**
 * ❌ Lokal annotation iptal edildiğinde
 */
function cancelLocalAnnotation() {
  console.log('❌ [LocalAnnotation] İptal edildi');

  // Çizilmiş poligonu kaldır
  if (pendingPolygon.value?.annotation) {
    viewerRef.value?.removeAnnotation(pendingPolygon.value.annotation);
  }

  closeModal();
}

/**
 * 🌍 Global annotation eklendiğinde
 */
function handleGlobalAnnotation(payload: {
  tag_type: string;
  tag_name: string;
  tag_value: string;
  color: string;
  global: boolean;
}) {
  if (!selectedImageId.value) {
    console.error('❌ [GlobalAnnotation] Seçili görüntü yok!');
    return;
  }

  console.log('📥 [GlobalAnnotation] Gelen payload:', payload);

  // Store'a draft ekle
  annotationStore.addDraft(
    {
      tag_type: payload.tag_type,
      tag_name: payload.tag_name,
      value: payload.tag_value,
      color: payload.color,
      global: true,
    },
    selectedImageId.value,
    null // Global annotation'larda polygon yok
  );

  console.log('✅ [GlobalAnnotation] Draft eklendi');
}

/**
 * 👤 Hasta bilgisi güncellendiğinde
 */
function handlePatientUpdate({ field, value }: { field: string; value: any }) {
  console.log('📝 [PatientUpdate] Geçici güncelleme:', { field, value });
  pendingPatientUpdates.value[field] = value;
}

// ===========================
// Save Function
// ===========================

/**
 * 💾 Tüm değişiklikleri kaydet
 */
async function saveAll() {
  if (!selectedImageId.value || !selectedPatient.value) {
    console.error('❌ [SaveAll] Eksik veri!');
    return;
  }

  console.log('💾 [SaveAll] Kaydetme başlıyor...');

  try {
    // 1️⃣ VALIDASYON: Global NUMBER alanlarını kontrol et
    const invalidFields: string[] = [];

    annotationStore.draftAnnotations.forEach((draft) => {
      if (draft.tag?.global && draft.tag?.tag_type === 'NUMBER') {
        const tagName = draft.tag.tag_name;
        const value = parseFloat(draft.tag.value);

        const annotationType = globalAnnotationTypes.value.find((t) => {
          const typeName = t.name || (t as any).tag_name;
          return typeName === tagName;
        });

        if (annotationType) {
          const min = (annotationType as any).min;
          const max = (annotationType as any).max;

          if (isNaN(value)) {
            invalidFields.push(`❌ "${tagName}": Geçersiz sayı değeri`);
          } else if (min !== undefined && value < min) {
            invalidFields.push(`❌ "${tagName}": Minimum ${min} olmalı (Girilen: ${value})`);
          } else if (max !== undefined && value > max) {
            invalidFields.push(`❌ "${tagName}": Maksimum ${max} olmalı (Girilen: ${value})`);
          }
        }
      }
    });

    if (invalidFields.length > 0) {
      const errorMessage =
        '⚠️ Aşağıdaki alanlarda geçersiz değerler var:\n\n' +
        invalidFields.join('\n') +
        '\n\n✏️ Lütfen değerleri düzeltin ve tekrar deneyin.';

      alert(errorMessage);
      console.error('❌ [SaveAll] Geçersiz alanlar:', invalidFields);
      return;
    }

    // 2️⃣ HASTA BİLGİSİ GÜNCELLEME
    if (Object.keys(pendingPatientUpdates.value).length > 0) {
      console.log('👤 [SaveAll] Hasta bilgisi güncelleniyor:', pendingPatientUpdates.value);

      await patientStore.updatePatient(selectedPatient.value.id, pendingPatientUpdates.value);

      pendingPatientUpdates.value = {};
      console.log('✅ [SaveAll] Hasta bilgisi kaydedildi');
    }

    // 3️⃣ ANNOTATION'LARI KAYDET
    if (annotationStore.draftAnnotations.length > 0) {
      console.log('📝 [SaveAll] Annotations kaydediliyor:', {
        count: annotationStore.draftAnnotations.length,
      });

      await annotationStore.saveAllChanges();
      console.log('✅ [SaveAll] Annotations kaydedildi');
    }

    console.log('✅✅✅ [SaveAll] TÜM DEĞİŞİKLİKLER KAYDEDİLDİ!');
  } catch (error) {
    console.error('❌ [SaveAll] Hata:', error);
    alert('Kaydetme sırasında bir hata oluştu. Lütfen tekrar deneyin.');
  }
}

// ===========================
// Helper Functions
// ===========================

function closeModal() {
  isModalOpen.value = false;
  pendingPolygon.value = null;
}
</script>

<style scoped>
.w-85 {
  width: 340px;
}
</style>
