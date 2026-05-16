<template>
  <div class="flex w-full overflow-hidden" style="height: calc(100vh - 41px)">
    <aside class="w-85 h-full flex-shrink-0 border-r border-gray-200">
      <AnnotatorSidebar
        :workspaces="workspaces"
        :patients="currentPatients"
        :images="currentImages"
        :selected-workspace-id="selectedWorkspaceId"
        :selected-patient-id="selectedPatientId"
        :selected-image-id="selectedImageId"
        :loading="loading"
        :current-page="currentPage"
        :total-pages="totalPages"
        :has-more="hasMore"
        @workspace-selected="selectWorkspace"
        @patient-selected="selectPatient"
        @image-selected="selectImage"
        @clear-selection="clearImageSelection"
        @page-change="setPage"
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
        @refresh-viewer="handleRefreshViewer"
      />

      <div class="flex-1 w-full overflow-hidden relative group flex">
        <div class="flex-1 relative">
          <Viewer
            ref="viewerRef"
            :selected-image="selectedImage"
            :is-drawing-mode="isDrawingMode"
            @prev-image="prevImage"
            @next-image="nextImage"
          />
        </div>

        <!-- Activity Panel Toggle Button -->
        <button
          v-if="selectedImageId && !isActivityPanelOpen"
          @click="isActivityPanelOpen = true"
          class="absolute right-3 top-3 z-20 flex items-center gap-1.5 px-2.5 py-1.5 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg shadow-md hover:shadow-lg hover:bg-white transition-all duration-200 group/btn"
          title="Etkinlikleri Göster"
        >
          <svg class="w-3.5 h-3.5 text-gray-500 group-hover/btn:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-[10px] font-bold text-gray-500 group-hover/btn:text-indigo-600 transition-colors">Etkinlikler</span>
        </button>

        <!-- Activity Panel -->
        <ActivityPanel
          :is-open="isActivityPanelOpen"
          :selected-image-id="selectedImageId"
          @close="isActivityPanelOpen = false"
          @focus-annotation="handleFocusAnnotation"
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
import ActivityPanel from '@/presentation/components/annotator/ActivityPanel.vue';

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
  clearImageSelection,
  nextImage,
  prevImage,
  currentPage,
  totalPages,
  hasMore,
  setPage,
  loadMorePatients,
} = useAnnotatorNavigation();

const totalImagesCount = computed(() => currentImages.value.length);

const isDrawingMode = ref(false);
const isActivityPanelOpen = ref(false);
const viewerRef = ref<InstanceType<typeof Viewer> | null>(null);

function handleStartDrawing() {
  isDrawingMode.value = true;
}

function handleStopDrawing() {
  isDrawingMode.value = false;
}

function handleRefreshViewer() {
  if (selectedImageId.value) {
    viewerRef.value?.loadAnnotations(selectedImageId.value);
  }
}

function handleFocusAnnotation(annotationId: string) {
  viewerRef.value?.highlightAnnotation(annotationId);
}
</script>

<style scoped>
.w-85 {
  width: clamp(240px, 18vw, 320px);
}
</style>
