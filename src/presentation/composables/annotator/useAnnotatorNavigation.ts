import { ref, computed, watch } from 'vue';
import { useWorkspaceStore } from '@/stores/workspace';
import { usePatientStore } from '@/stores/patient';
import { useImageStore } from '@/stores/image';
import { useAnnotationTypeStore } from '@/stores/annotation_type'; // 1. Store importu
import { storeToRefs } from 'pinia';
import type { Patient } from '@/core/entities/Patient';
import type { Image } from '@/core/entities/Image';
import type { Workspace } from '@/core/entities/Workspace';

export function useAnnotatorNavigation() {
  const workspaceStore = useWorkspaceStore();
  const patientStore = usePatientStore();
  const imageStore = useImageStore();
  const annotationTypeStore = useAnnotationTypeStore(); // 2. Store kullanımı

  const { workspaces } = storeToRefs(workspaceStore);
  const { patientsByWorkspace } = storeToRefs(patientStore);
  const { imagesByPatient } = storeToRefs(imageStore);
  const { annotationTypes } = storeToRefs(annotationTypeStore); // 3. State'i al

  const loading = computed(
    () =>
      workspaceStore.loading ||
      patientStore.loading ||
      imageStore.loading ||
      annotationTypeStore.loading
  );

  const selectedWorkspaceId = ref<string | undefined>(undefined);
  const selectedPatientId = ref<string | undefined>(undefined);
  const selectedImageId = ref<string | undefined>(undefined);
  const selectedAnnotationTypeId = ref<string | undefined>(undefined); // 4. Seçili tip state'i

  const currentPatients = computed((): Patient[] => {
    const list = selectedWorkspaceId.value
      ? patientsByWorkspace.value.get(selectedWorkspaceId.value)
      : [];
    return (list || []) as Patient[];
  });

  const currentImages = computed((): Image[] => {
    const list = selectedPatientId.value ? imagesByPatient.value.get(selectedPatientId.value) : [];
    return (list || []) as Image[];
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

  const selectedPatientIndex = computed((): number => {
    return currentPatients.value.findIndex((p) => p.id === selectedPatientId.value);
  });

  function selectWorkspace(workspace: Workspace) {
    if (selectedWorkspaceId.value === workspace.id) return;

    selectedWorkspaceId.value = workspace.id;
    selectedPatientId.value = undefined;
    selectedImageId.value = undefined;

    patientStore.fetchPatientsByWorkspace(workspace.id);
    annotationTypeStore.fetchAnnotationTypes(
      { limit: 100 },
      { refresh: true, parentId: workspace.id }
    );
  }

  function selectAnnotationType(typeId: string) {
    selectedAnnotationTypeId.value = typeId;
  }

  function selectPatient(patient: Patient | null) {
    if (!patient) {
      selectedPatientId.value = undefined;
      selectedImageId.value = undefined;
      return;
    }

    if (selectedPatientId.value === patient.id) {
      return;
    }

    selectedPatientId.value = patient.id;
    selectedImageId.value = undefined;
    imageStore.fetchImagesByPatient(patient.id);
  }

  function selectImage(image: Image) {
    selectedImageId.value = image.id;
  }

  function nextImage() {
    if (selectedImageIndex.value < currentImages.value.length - 1) {
      const nextImg = currentImages.value[selectedImageIndex.value + 1];
      if (nextImg) {
        selectImage(nextImg);
      }
    } else if (selectedPatientIndex.value < currentPatients.value.length - 1) {
      const nextPatient = currentPatients.value[selectedPatientIndex.value + 1];
      if (nextPatient) {
        selectPatient(nextPatient);
      }
    }
  }

  function prevImage() {
    if (selectedImageIndex.value > 0) {
      const prevImg = currentImages.value[selectedImageIndex.value - 1];
      if (prevImg) {
        selectImage(prevImg);
      }
    } else if (selectedPatientIndex.value > 0) {
      const prevPatient = currentPatients.value[selectedPatientIndex.value - 1];
      if (prevPatient) {
        selectPatient(prevPatient);
      }
    }
  }

  function loadMorePatients() {
    if (selectedWorkspaceId.value) {
      patientStore.loadMorePatients(selectedWorkspaceId.value);
    }
  }

  watch(currentImages, (newImages) => {
    const firstImage = newImages[0];
    if (firstImage && !selectedImageId.value) {
      selectImage(firstImage);
    }
  });

  watch(
    currentPatients,
    (newPatients) => {
      if (newPatients && newPatients.length > 0 && !selectedPatientId.value) {
        const firstPatient = newPatients[0];
        if (firstPatient) selectPatient(firstPatient);
      }
    },
    { immediate: true }
  );

  watch(
    workspaces,
    (newWorkspaces) => {
      if (newWorkspaces && newWorkspaces.length > 0 && !selectedWorkspaceId.value) {
        const firstWorkspace = newWorkspaces[0];
        if (firstWorkspace) {
          selectWorkspace(firstWorkspace);
        }
      }
    },
    { immediate: true }
  );

  workspaceStore.fetchWorkspaces();

  return {
    loading,

    workspaces,
    currentPatients,
    currentImages,
    annotationTypes,

    selectedWorkspaceId,
    selectedPatientId,
    selectedImageId,
    selectedPatient,
    selectedImage,
    selectedAnnotationTypeId,

    selectWorkspace,
    selectPatient,
    selectImage,
    selectAnnotationType,
    nextImage,
    prevImage,

    loadMorePatients,
  };
}
