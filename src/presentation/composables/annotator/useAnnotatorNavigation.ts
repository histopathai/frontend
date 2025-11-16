import { ref, computed, watch } from 'vue';
import { useWorkspaceStore } from '@/stores/workspace';
import { storeToRefs } from 'pinia';
import type { Patient } from '@/core/entities/Patient';
import type { Image } from '@/core/entities/Image';
import type { Workspace } from '@/core/entities/Workspace';

export function useAnnotatorNavigation() {
  const workspaceStore = useWorkspaceStore();
  const { workspaces, patientsByWorkspace, imagesByPatient } = storeToRefs(workspaceStore);

  // --- State ---
  const loading = computed(() => workspaceStore.loading);
  const selectedWorkspaceId = ref<string | null>(null);
  const selectedPatientId = ref<string | null>(null);
  const selectedImageId = ref<string | null>(null);

  // --- Computed Properties ---
  const currentPatients = computed((): Patient[] => {
    return selectedWorkspaceId.value
      ? patientsByWorkspace.value.get(selectedWorkspaceId.value) || []
      : [];
  });

  const currentImages = computed((): Image[] => {
    return selectedPatientId.value ? imagesByPatient.value.get(selectedPatientId.value) || [] : [];
  });

  const selectedPatient = computed((): Patient | null => {
    return currentPatients.value.find((p) => p.id === selectedPatientId.value) || null;
  });

  const selectedImage = computed((): Image | null => {
    return currentImages.value.find((img) => img.id === selectedImageId.value) || null;
  });

  const selectedImageIndex = computed((): number => {
    return currentImages.value.findIndex((img) => img.id === selectedImageId.value);
  });

  // --- Methods ---
  function selectWorkspace(workspace: Workspace) {
    if (selectedWorkspaceId.value === workspace.id) return;

    selectedWorkspaceId.value = workspace.id;
    selectedPatientId.value = null;
    selectedImageId.value = null;
    workspaceStore.fetchPatients(workspace.id);
  }

  function selectPatient(patient: Patient) {
    if (selectedPatientId.value === patient.id) return;

    selectedPatientId.value = patient.id;
    selectedImageId.value = null;
    workspaceStore.fetchImages(patient.id);
  }

  function selectImage(image: Image) {
    selectedImageId.value = image.id;
  }

  function nextImage() {
    if (selectedImageIndex.value < currentImages.value.length - 1) {
      const nextImage = currentImages.value[selectedImageIndex.value + 1];
      selectImage(nextImage);
    }
  }

  function prevImage() {
    if (selectedImageIndex.value > 0) {
      const prevImage = currentImages.value[selectedImageIndex.value - 1];
      selectImage(prevImage);
    }
  }

  // --- Watchers ---
  watch(currentImages, (newImages) => {
    if (newImages.length > 0 && !selectedImageId.value) {
      selectImage(newImages[0]);
    }
  });

  workspaceStore.fetchWorkspaces();

  return {
    loading,
    // Veri
    workspaces,
    currentPatients,
    currentImages,
    // Seçili Durum
    selectedWorkspaceId,
    selectedPatientId,
    selectedImageId,
    selectedPatient,
    selectedImage,
    // Eylemler
    selectWorkspace,
    selectPatient,
    selectImage,
    nextImage,
    prevImage,
  };
}
