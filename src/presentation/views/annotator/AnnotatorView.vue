<template>
  <div class="flex w-full overflow-hidden" style="height: calc(100vh - 65px)">
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

    <main class="flex-1 h-full flex flex-col bg-white min-w-0 overflow-hidden">
      <PatientInfoBar
        :patient="selectedPatient"
        :annotation-types="annotationTypeStore.annotationTypes"
        :is-drawing-mode="isDrawingMode"
        :has-changes="annotationStore.hasUnsavedChanges"
        :unsaved-count="annotationStore.unsavedCount"
        :loading="annotationStore.actionLoading"
        @toggle-draw="toggleDrawing"
        @add-global="handleGlobalAnnotation"
        @save="saveAll"
      />

      <div class="flex-1 w-full overflow-hidden relative">
        <Viewer
          ref="viewerRef"
          :selected-image="selectedImage"
          @polygon-complete="handlePolygonComplete"
        />

        <!-- Navigasyon Butonları -->
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

      <LocalAnnotationModal
        :is-open="isModalOpen"
        :annotation-types="annotationTypeStore.annotationTypes"
        @confirm="confirmLocalAnnotation"
        @cancel="cancelLocalAnnotation"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useAnnotatorNavigation } from '@/presentation/composables/annotator/useAnnotatorNavigation';
import { useAnnotationStore } from '@/stores/annotation';
import { useAnnotationTypeStore } from '@/stores/annotation_type';

// Yeni Bileşenler
import AnnotatorSidebar from '@/presentation/components/annotator/AnnotatorSidebar.vue';
import Viewer from '@/presentation/components/annotator/Viewer.vue';
import PatientInfoBar from '@/presentation/components/annotator/PatientInfoBar.vue';
import LocalAnnotationModal from '@/presentation/components/annotator/LocalAnnotationModal.vue';
import type { AnnotationType } from '@/core/entities/AnnotationType';

// Store ve Navigasyon logic
const {
  loading,
  workspaces,
  currentPatients,
  currentImages,
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

// UI State
const viewerRef = ref<InstanceType<typeof Viewer> | null>(null);
const isDrawingMode = ref(false);
const isModalOpen = ref(false);
const pendingPolygon = ref<{ annotation: any; points: any[] } | null>(null);

// Başlangıçta etiket tiplerini yükle
onMounted(async () => {
  await annotationTypeStore.fetchAnnotationTypes();
});

// selectedImageId değiştiğinde anotasyonları yükle
watch(
  () => selectedImageId.value,
  async (newImageId, oldImageId) => {
    if (newImageId && newImageId !== oldImageId) {
      console.log('🔄 [Watch] Görüntü değişti, anotasyonlar yükleniyor:', newImageId);

      // Yeni anotasyonları yükle (fetchAnnotations içinde zaten dbAnnotations temizleniyor)
      await annotationStore.fetchAnnotations(newImageId);
      console.log('✅ [Watch] DB Anotasyonları:', annotationStore.dbAnnotations.length);
      console.log('✅ [Watch] Draft Anotasyonları:', annotationStore.draftAnnotations.length);
      console.log('✅ [Watch] Toplam:', annotationStore.allAnnotations.length);
    }
  },
  { immediate: true } // ✅ İlk yüklenmede de çalışsın
);

/**
 * Görüntü seçimi - Anotasyonları otomatik yükle
 * NOT: Anotasyon yükleme işi artık watch() tarafından yapılıyor
 */
async function selectImage(imageOrId: string | any) {
  // Image objesi mi yoksa ID mi geldi kontrol et
  const imageId = typeof imageOrId === 'string' ? imageOrId : imageOrId.id;

  console.log('📸 [AnnotatorView] selectImage çağrıldı:', imageId);

  // Image objesini bul
  const imageObj = currentImages.value.find((img) => img.id === imageId);

  if (!imageObj) {
    console.error('❌ [AnnotatorView] Görüntü bulunamadı:', imageId);
    return;
  }

  // Yeni görüntüyü seç (composable Image objesi bekliyor)
  // Bu selectedImageId'yi değiştirecek ve watch tetiklenecek
  selectImageFromNav(imageObj);
}

/**
 * Önceki/Sonraki görüntüye geç
 */
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
    console.log(
      `🔄 [Navigate] ${direction === 'prev' ? 'Önceki' : 'Sonraki'} görüntüye geçiliyor:`,
      newImage.id
    );
    selectImage(newImage.id);
  }
}

const filteredAnnotationTypes = computed(() => {
  return annotationTypeStore.annotationTypes.filter(
    (type) => type.workspaceId === selectedWorkspaceId.value
  );
});

// Navigasyon için computed değerler
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

/**
 * Çizim modunu aç/kapat
 */
function toggleDrawing() {
  isDrawingMode.value = !isDrawingMode.value;
  if (isDrawingMode.value) {
    viewerRef.value?.startDrawing();
  } else {
    viewerRef.value?.stopDrawing();
  }
}

/**
 * Viewer'dan gelen poligon tamamlama olayı
 */
function handlePolygonComplete(payload: { annotation: any; points: any[] }) {
  pendingPolygon.value = payload;
  isModalOpen.value = true;
  // Çizim modunu otomatik kapat (isteğe bağlı)
  isDrawingMode.value = false;
  viewerRef.value?.stopDrawing();
}

/**
 * Lokal Etiketleme Onayı
 */
function confirmLocalAnnotation({ type, description }: { type: any; description: string }) {
  if (selectedImageId.value && pendingPolygon.value) {
    annotationStore.addDraft(
      {
        tag_type: type.tag_type,
        tag_name: type.name,
        value: type.name, // Veya özel bir değer
        color: type.color,
      },
      selectedImageId.value,
      pendingPolygon.value.points
    );
  }
  closeModal();
}

/**
 * Lokal Etiketleme İptal (Çizilen poligonu viewer'dan kaldırır)
 */
function cancelLocalAnnotation() {
  if (pendingPolygon.value?.annotation) {
    viewerRef.value?.removeAnnotation(pendingPolygon.value.annotation);
  }
  closeModal();
}

/**
 * Global Etiket Ekleme - TEK PARAMETRE ALIYOR!
 * @param payload { tag_type, tag_name, tag_value, color, global }
 */
function handleGlobalAnnotation(payload: {
  tag_type: string;
  tag_name: string;
  tag_value: string;
  color: string;
  global: boolean;
}) {
  if (!selectedImageId.value) {
    console.error('❌ [Global] Seçili image yok!');
    return;
  }

  console.log('📥 [AnnotatorView] Gelen payload:', payload);

  annotationStore.addDraft(
    {
      tag_type: payload.tag_type, // "SELECT"
      tag_name: payload.tag_name, // "Histolojik Alt Tip"
      value: payload.tag_value, // ✅ "Ductal" (kullanıcının seçtiği değer!)
      color: payload.color,
      global: true,
    },
    selectedImageId.value,
    null // Global olduğu için poligon yok
  );

  console.log('✅ [AnnotatorView] Draft eklendi:', {
    tag_name: payload.tag_name,
    value: payload.tag_value,
  });
}

/**
 * Tüm taslakları DB'ye kaydet
 */
async function saveAll() {
  if (!selectedImageId.value) return;

  // ✅ Kaydetmeden önce global number alanlarını valide et
  const invalidFields: string[] = [];

  annotationStore.draftAnnotations.forEach((draft) => {
    if (draft.tag?.global && draft.tag?.tag_type === 'NUMBER') {
      const tagName = draft.tag.tag_name;
      const value = parseFloat(draft.tag.value);

      // Annotation type'ı store'dan bul
      const annotationType = annotationTypeStore.annotationTypes.find((t) => {
        const typeName = t.name || (t as any).tag_name;
        const isGlobal = t.global === true || (t as any).isGlobal === true;
        return typeName === tagName && isGlobal;
      });

      if (annotationType) {
        // AnnotationType'dan min/max al
        const min = (annotationType as any).min;
        const max = (annotationType as any).max;

        // Validasyon kontrolleri
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

  // ❌ Geçersiz alanlar varsa kaydetme
  if (invalidFields.length > 0) {
    const errorMessage =
      '⚠️ Aşağıdaki alanlarda geçersiz değerler var:\n\n' +
      invalidFields.join('\n') +
      '\n\n✏️ Lütfen değerleri düzeltin ve tekrar deneyin.';

    alert(errorMessage);
    console.error('❌ [SaveAll] Geçersiz alanlar:', invalidFields);
    return;
  }

  // ✅ Tüm alanlar geçerli, kaydet
  console.log('✅ [SaveAll] Tüm validasyonlar başarılı, kaydediliyor...');
  await annotationStore.saveAllChanges();
}

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
