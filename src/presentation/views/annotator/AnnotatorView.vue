<template>
  <div class="flex w-full" style="height: calc(100vh - 65px)">
    <aside class="w-96 h-full flex-shrink-0">
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
      />
    </aside>

    <main class="flex-1 h-full flex flex-col bg-white">
      <PatientMetadataBar :patient="selectedPatient" :image="selectedImage" />

      <div class="flex-1 h-full w-full overflow-hidden">
        <Viewer :selected-image="selectedImage" @prev-image="prevImage" @next-image="nextImage" />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
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
  selectWorkspace,
  selectPatient,
  selectImage,
  nextImage,
  prevImage,
} = useAnnotatorNavigation();
</script>

<style>
.openseadragon-container {
  background-color: #2d2d2d;
}
</style>
