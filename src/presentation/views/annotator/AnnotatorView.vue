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
        @load-more="loadMorePatients"
      />
    </aside>

    <main class="flex-1 h-full flex flex-col bg-white min-w-0">
      <PatientMetadataBar :patient="selectedPatient" :image="selectedImage" />

      <div class="flex-1 h-full w-full overflow-hidden relative group">
        <Viewer :selected-image="selectedImage" @prev-image="prevImage" @next-image="nextImage" />

        <transition name="slide-fade">
          <div
            v-if="selectedWorkspaceId && annotationTypes.length > 0"
            class="absolute top-36 right-4 z-40 flex flex-col gap-2"
          >
            <div
              class="bg-white/90 backdrop-blur-md border border-gray-200 shadow-[0_8px_30px_rgba(0,0,0,0.12)] rounded-xl p-2 flex flex-col gap-2 max-h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar"
            >
              <div
                class="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center py-1 mb-1 border-b border-gray-100 select-none cursor-default"
              >
                Etiketler
              </div>

              <button
                v-for="type in annotationTypes"
                :key="type.id"
                @click="selectAnnotationType(type.id)"
                :title="type.name"
                class="w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 relative shrink-0"
                :class="[
                  selectedAnnotationTypeId === type.id
                    ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-200 ring-offset-1 scale-105'
                    : 'bg-gray-50 text-gray-500 hover:bg-white hover:text-indigo-600 hover:shadow-sm border border-transparent hover:border-gray-200',
                ]"
              >
                <span
                  v-if="selectedAnnotationTypeId !== type.id"
                  class="absolute top-1 right-1 w-2 h-2 rounded-full"
                  :style="{ backgroundColor: type.color || '#ccc' }"
                ></span>

                <span class="font-bold text-xs">{{ type.name.substring(0, 2).toUpperCase() }}</span>
              </button>
            </div>
          </div>
        </transition>
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
  annotationTypes,
  selectedWorkspaceId,
  selectedPatientId,
  selectedImageId,
  selectedAnnotationTypeId,
  selectedPatient,
  selectedImage,
  selectWorkspace,
  selectPatient,
  selectImage,
  selectAnnotationType,
  nextImage,
  prevImage,
  loadMorePatients,
} = useAnnotatorNavigation();
</script>

<style scoped>
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(20px);
  opacity: 0;
}
.custom-scrollbar::-webkit-scrollbar {
  width: 0px;
}
</style>
