import { ref, computed, watch } from 'vue';
import { useWorkspaceStore } from '@/stores/workspace';
import { usePatientStore } from '@/stores/patient';
import { useImageStore } from '@/stores/image';
import { useAnnotationTypeStore } from '@/stores/annotation_type';
import { storeToRefs } from 'pinia';
import type { Patient } from '@/core/entities/Patient';
import type { Image } from '@/core/entities/Image';
import type { Workspace } from '@/core/entities/Workspace';

export function useAnnotatorNavigation() {
  const workspaceStore = useWorkspaceStore();
  const patientStore = usePatientStore();
  const imageStore = useImageStore();
  const annotationTypeStore = useAnnotationTypeStore();

  const { workspaces } = storeToRefs(workspaceStore);
  const { patientsByWorkspace } = storeToRefs(patientStore);
  const { imagesByPatient } = storeToRefs(imageStore);
  const { annotationTypes } = storeToRefs(annotationTypeStore);

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
  const selectedAnnotationTypeId = ref<string | undefined>(undefined);

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
    if (!selectedImageId.value || currentImages.value.length === 0) return -1;
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

    workspaceStore.setCurrentWorkspace(workspace);

    patientStore.fetchPatientsByWorkspace(workspace.id);
    annotationTypeStore.fetchAnnotationTypes(
      { limit: 100 },
      { refresh: true, parentId: workspace.id }
    );

    // Reset pagination on workspace change
    currentPage.value = 1;
    limit.value = 20; // Default limit
    loadPatientsPage();
  }

  // --- Pagination Logic ---
  const currentPage = ref(1);
  const limit = ref(20);

  const totalPages = computed(() => {
    if (!selectedWorkspaceId.value) return 0;
    const pag = patientStore.getPaginationByWorkspaceId(selectedWorkspaceId.value);
    if (!pag) return 0;
    const total = pag.total ?? 0;
    return Math.ceil(total / limit.value);
  });

  const hasMore = computed(() => {
    if (!selectedWorkspaceId.value) return false;
    const pag = patientStore.getPaginationByWorkspaceId(selectedWorkspaceId.value);
    return pag?.hasMore ?? false;
  });

  const totalPatientsCount = computed(() => {
    if (!selectedWorkspaceId.value) return 0;
    const pag = patientStore.getPaginationByWorkspaceId(selectedWorkspaceId.value);
    return pag?.total ?? 0;
  });

  function setPage(page: number) {
    if (page < 1) return;
    if (totalPages.value > 0 && page > totalPages.value) return;

    // If we don't know total pages but hasMore is true, allow next page
    if (totalPages.value === 0 && page > currentPage.value && !hasMore.value) return;

    currentPage.value = page;
    loadPatientsPage();
  }

  function loadPatientsPage() {
    if (!selectedWorkspaceId.value) return;

    const offset = (currentPage.value - 1) * limit.value;

    // We utilize fetchPatientsByWorkspace with explicit offset and limit
    // Note: We are replacing the list, not appending (append: false is default)
    patientStore.fetchPatientsByWorkspace(
      selectedWorkspaceId.value,
      { limit: limit.value, offset: offset },
      undefined,
      { refresh: true } // Force refresh to replace current list
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
    if (
      selectedImageIndex.value !== -1 &&
      selectedImageIndex.value < currentImages.value.length - 1
    ) {
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

  function searchPatients(query: string) {
    if (!selectedWorkspaceId.value) return;

    patientStore.fetchPatientsByWorkspace(selectedWorkspaceId.value, { offset: 0 }, query, {
      refresh: true,
      append: false,
    });
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
    selectedImageIndex,
    selectedAnnotationTypeId,

    selectWorkspace,
    selectPatient,
    selectImage,
    selectAnnotationType,
    nextImage,
    prevImage,
    searchPatients,
    loadMorePatients,

    // Pagination exports
    currentPage,
    totalPages,
    hasMore,
    limit,
    totalPatientsCount,
    setPage,
  };
}
