<template>
  <div class="flex-1 bg-black relative flex flex-row">
    <ImageCatalogSidebar
      :workspaces="filteredWorkspaces"
      :patients-by-workspace="patientsByWorkspace"
      :images-by-patient="imagesByPatient"
      :selected-image="imageToView"
      :selected-patient="patientToEdit"
      :loading="loading"
      :error="error"
      v-model:searchQuery="filters.name"
      @reload-workspaces="reloadAllWorkspaces"
      @load-patients="loadPatientsFor($event)"
      @load-images="loadImagesFor($event)"
      @select-image="handleImageSelected"
      @update-patient="onPatientUpdate"
    />

    <div class="flex-1 bg-gray-800 relative">
      <WSIViewer v-if="imageToView" :key="(imageToView as any).id" :image="imageToView as any" />

      <div v-else class="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div class="text-center p-8 bg-gray-900 bg-opacity-50 rounded-lg">
          <svg
            class="h-12 w-12 text-gray-500 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            ></path>
          </svg>
          <p class="text-gray-400 text-lg mt-4">
            Görüntülemek için soldaki katalogdan bir resim seçin.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useWorkspaces } from '@/presentation/composables/workspace/useWorkspaceManager';
import ImageCatalogSidebar from '@/presentation/components/viewer/ImageCatalog.vue';
import WSIViewer from '@/presentation/components/viewer/ImageViewerModal.vue';
import type { ImageProps } from '@/core/entities/Image';
import type { PatientProps } from '@/core/entities/Patient';
import type { CreateNewPatientRequest } from '@/core/repositories/IPatientRepository';
import { useToast } from 'vue-toastification';

const toast = useToast();

// 1. Workspace (Katalog) Veri Yönetimi
// useWorkspaces, tüm veri ve eylem fonksiyonlarını sağlar
const {
  loading,
  error,
  filteredWorkspaces,
  filters,
  patientsByWorkspace,
  imagesByPatient,
  loadPatientsFor,
  loadImagesFor,
  fetchWorkspaces,
  patientToEdit,
  handlePatientUpdated,
} = useWorkspaces();

// 2. Görüntüleyici State'i
const imageToView = ref<ImageProps | null>(null);

// Sayfa yüklendiğinde katalog verisinin kökünü (workspaces) çek
onMounted(() => {
  reloadAllWorkspaces();
});

const reloadAllWorkspaces = () => {
  fetchWorkspaces().catch((err) => toast.error(error.value || 'Katalog yüklenemedi.'));
};

// 3. Olay Yöneticileri (Event Handlers)

// Katalogdan bir görüntü seçildiğinde
const handleImageSelected = (image: ImageProps, patient: PatientProps) => {
  imageToView.value = image;
  patientToEdit.value = patient; // useWorkspaces'tan gelen ref'i ayarla
};

// Katalogdaki metadata formu 'Kaydet'e bastığında
const onPatientUpdate = (payload: Partial<CreateNewPatientRequest>) => {
  // Bu fonksiyon useWorkspaces içinde tanımlıdır ve toast mesajlarını da içerir
  handlePatientUpdated(payload);
};
</script>
