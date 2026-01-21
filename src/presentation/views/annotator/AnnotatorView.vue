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
      <PatientMetadataBar
        :patient="selectedPatient"
        :image="selectedImage"
        :is-drawing-mode="isDrawingMode"
        :current-index="selectedImageIndex"
        :total-count="totalImagesCount"
        @start-drawing="handleStartDrawing"
        @stop-drawing="handleStopDrawing"
        @prev="prevImage"
        @next="nextImage"
      />

      <div class="flex-1 w-full overflow-hidden relative group">
        <Viewer
          ref="viewerRef"
          :selected-image="selectedImage"
          @prev-image="prevImage"
          @next-image="nextImage"
        />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAnnotatorNavigation } from '@/presentation/composables/annotator/useAnnotatorNavigation';
import AnnotatorSidebar from '@/presentation/components/annotator/AnnotatorSidebar.vue';
import PatientMetadataBar from '@/presentation/components/annotator/PatientMetadataBar.vue';
import Viewer from '@/presentation/components/annotator/Viewer.vue';

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
  selectedImageIndex,
  selectWorkspace,
  selectPatient,
  selectImage,
  nextImage,
  prevImage,
  loadMorePatients,
} = useAnnotatorNavigation();

const totalImagesCount = computed(() => currentImages.value.length);

const isDrawingMode = ref(false);
const viewerRef = ref<InstanceType<typeof Viewer> | null>(null);

function handleStartDrawing() {
  isDrawingMode.value = true;
  viewerRef.value?.startDrawing();
}

function handleStopDrawing() {
  isDrawingMode.value = false;
  viewerRef.value?.stopDrawing();
}
</script>

<style scoped>
.w-85 {
  width: 340px;
}
</style>
