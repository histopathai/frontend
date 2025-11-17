import { ref, computed, watch } from 'vue';
import { useWorkspaceStore } from '@/stores/workspace';
import { storeToRefs } from 'pinia';
import type { Patient } from '@/core/entities/Patient';
import type { Image } from '@/core/entities/Image';
import type { Workspace } from '@/core/entities/Workspace';

export function useAnnotatorNavigation() {
  const workspaceStore = useWorkspaceStore();
  const { workspaces, patientsByWorkspace, imagesByPatient } = storeToRefs(workspaceStore);

  const loading = computed(() => workspaceStore.loading);
  const selectedWorkspaceId = ref<string | undefined>(undefined);
  const selectedPatientId = ref<string | undefined>(undefined);
  const selectedImageId = ref<string | undefined>(undefined);

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

  function selectWorkspace(workspace: Workspace) {
    if (selectedWorkspaceId.value === workspace.id) return;

    selectedWorkspaceId.value = workspace.id;
    selectedPatientId.value = undefined;
    selectedImageId.value = undefined;
    workspaceStore.fetchPatients(workspace.id);
  }

  function selectPatient(patient: Patient) {
    if (selectedPatientId.value === patient.id) return;

    selectedPatientId.value = patient.id;
    selectedImageId.value = undefined;
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

  watch(currentImages, (newImages) => {
    const firstImage = newImages[0];
    if (firstImage && !selectedImageId.value) {
      selectImage(firstImage);
    }
  });

  workspaceStore.fetchWorkspaces();

  return {
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
  };
}
