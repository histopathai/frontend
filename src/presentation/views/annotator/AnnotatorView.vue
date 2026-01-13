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

      <div class="flex-1 w-full overflow-hidden relative group">
        <Viewer
          ref="viewerRef"
          :selected-image="selectedImage"
          @polygon-complete="handlePolygonComplete"
        />
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
import { ref, onMounted } from 'vue';
import { useAnnotatorNavigation } from '@/presentation/composables/annotator/useAnnotatorNavigation';
import { useAnnotationStore } from '@/stores/annotation';
import { useAnnotationTypeStore } from '@/stores/annotation_type';
import { computed } from 'vue';

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
  selectImage,
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

const filteredAnnotationTypes = computed(() => {
  return annotationTypeStore.annotationTypes.filter(
    (type) => type.workspaceId === selectedWorkspaceId.value
  );
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
 * Global Etiket Ekleme
 */
/**
 * Global Etiket Ekleme
 * @param type Etiket şablonu (AnnotationType)
 * @param payloadValue Kullanıcının girdiği asıl veri (örn: "Adenokarsinom")
 */
function handleGlobalAnnotation(type: AnnotationType, payloadValue?: any) {
  if (selectedImageId.value) {
    // Eğer kullanıcı bir değer girmemişse (boş bırakmışsa) varsayılan olarak isim kaydedilir
    const finalValue = payloadValue !== undefined ? payloadValue : type.name;

    annotationStore.addDraft(
      {
        tag_type: type.type, // SELECT, NUMBER, TEXT vb.
        tag_name: type.name, // "Histolojik Alt Tip"
        value: finalValue, // Kullanıcının seçtiği/yazdığı asıl değer
        color: type.color || '#4f46e5',
        global: true,
      },
      selectedImageId.value,
      null // Global olduğu için poligon yok
    );
  }
}

/**
 * Tüm taslakları DB'ye kaydet
 */
async function saveAll() {
  if (selectedImageId.value) {
    await annotationStore.saveAllChanges();
  }
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
