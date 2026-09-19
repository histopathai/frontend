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
        @load-more="loadMorePatients"
      />
    </aside>

    <PatchGridWorkspace
      :image="shownImage"
      :can-go-prev="selectedImageIndex > 0 || !!selectedPatient"
      :position="currentImages.length ? `${selectedImageIndex + 1} / ${currentImages.length}` : ''"
      @prev="prevImage"
      @next="nextImage"
      @open-image="openImage"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue';
import { useToast } from 'vue-toastification';
import type { Image } from '@/core/entities/Image';
import { repositories } from '@/services';
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
  loadMorePatients,
} = useAnnotatorNavigation();

// An image opened by id — one the chosen annotator labelled, which may belong to
// a patient that is not on the sidebar's page. It is shown until the user picks
// something in the sidebar again.
const toast = useToast();
const opened = shallowRef<Image | null>(null);
const shownImage = computed(() => opened.value ?? selectedImage.value);

async function openImage(imageId: string) {
  const inSidebar = currentImages.value.find((img) => img.id === imageId);
  if (inSidebar) {
    opened.value = null;
    return selectImage(inSidebar);
  }
  try {
    opened.value = await repositories.image.getById(imageId);
  } catch {
    toast.error('Görüntü açılamadı.');
  }
}

watch([selectedImageId, selectedPatientId, selectedWorkspaceId], () => (opened.value = null));
</script>

<style scoped>
.patch-sidebar {
  width: clamp(240px, 18vw, 320px);
}
</style>
