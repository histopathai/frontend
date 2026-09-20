<template>
  <div class="flex w-full overflow-hidden" style="height: calc(100vh - 41px)">
    <aside class="patch-sidebar h-full flex-shrink-0 border-r border-gray-200">
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
      />
    </aside>

    <PatchGridWorkspace
      :image="selectedImage"
      :can-go-prev="selectedImageIndex > 0 || !!selectedPatient"
      :position="currentImages.length ? `${selectedImageIndex + 1} / ${currentImages.length}` : ''"
      @prev="prevImage"
      @next="nextImage"
    />
  </div>
</template>

<script setup lang="ts">
import AnnotatorSidebar from '@/presentation/components/annotator/AnnotatorSidebar.vue';
import PatchGridWorkspace from '@/presentation/components/patches/PatchGridWorkspace.vue';
import { useAnnotatorNavigation } from '@/presentation/composables/annotator/useAnnotatorNavigation';

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
} = useAnnotatorNavigation();
</script>

<style scoped>
.patch-sidebar {
  width: clamp(240px, 18vw, 320px);
}
</style>
