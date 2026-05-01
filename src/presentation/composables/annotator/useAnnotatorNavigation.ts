import { ref, computed, watch } from 'vue';
import { useWorkspaceStore } from '@/stores/workspace';
import { usePatientStore } from '@/stores/patient';
import { useImageStore } from '@/stores/image';
import { useAnnotationStore } from '@/stores/annotation';
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
  const annotationStore = useAnnotationStore();

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

  const STORAGE_KEY_WS = 'annotator_selected_workspace_id';
  const STORAGE_KEY_PT = 'annotator_selected_patient_id';
  const STORAGE_KEY_IMG = 'annotator_selected_image_id';
  const STORAGE_KEY_PAGE = 'annotator_patients_page';

  const selectedWorkspaceId = ref<string | undefined>(localStorage.getItem(STORAGE_KEY_WS) || undefined);
  const selectedPatientId = ref<string | undefined>(localStorage.getItem(STORAGE_KEY_PT) || undefined);
  const selectedImageId = ref<string | undefined>(localStorage.getItem(STORAGE_KEY_IMG) || undefined);
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

  function clearAllStates() {
    annotationStore.clearAnnotations();
    patientStore.clearPatients();
    imageStore.clearImages();
    selectedPatientId.value = undefined;
    selectedImageId.value = undefined;
    localStorage.removeItem(STORAGE_KEY_PT);
    localStorage.removeItem(STORAGE_KEY_IMG);
  }

  function selectWorkspace(workspace: Workspace) {
    if (selectedWorkspaceId.value === workspace.id) return;

    clearAllStates();
    selectedWorkspaceId.value = workspace.id;
    localStorage.setItem(STORAGE_KEY_WS, workspace.id);
    
    workspaceStore.setCurrentWorkspace(workspace);
    workspaceStore.fetchWorkspaceById(workspace.id, { showToast: false });

    annotationTypeStore.fetchAnnotationTypes(
      { limit: 100 },
      { refresh: true, parentId: workspace.id }
    );

    currentPage.value = 1;
    localStorage.setItem(STORAGE_KEY_PAGE, '1');
    loadPatientsPage();
  }

  // --- Pagination Logic ---
  const currentPage = ref(Number(localStorage.getItem(STORAGE_KEY_PAGE)) || 1);
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
      localStorage.removeItem(STORAGE_KEY_PT);
      localStorage.removeItem(STORAGE_KEY_IMG);
      imageStore.clearImages();
      annotationStore.clearAnnotations();
      return;
    }

    if (selectedPatientId.value === patient.id) return;

    // Clear previous patient's state
    imageStore.clearImages();
    annotationStore.clearAnnotations();
    selectedImageId.value = undefined;
    localStorage.removeItem(STORAGE_KEY_IMG);

    selectedPatientId.value = patient.id;
    localStorage.setItem(STORAGE_KEY_PT, patient.id);
    patientStore.setCurrentPatient(patient);

    // Load images for the new patient
    imageStore.fetchImagesByPatient(patient.id, { limit: 100 }, { refresh: true }).then(() => {
      // Auto-select first image if none selected
      const images = imageStore.getImagesByPatientId(patient.id);
      const firstImage = images[0];
      if (firstImage && !selectedImageId.value) {
        selectImage(firstImage as any);
      }
    });
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

  // --- Persistence Watchers ---
  watch(selectedWorkspaceId, (val) => {
    if (val) localStorage.setItem(STORAGE_KEY_WS, val);
    else localStorage.removeItem(STORAGE_KEY_WS);
  });
  watch(selectedPatientId, (val) => {
    if (val) localStorage.setItem(STORAGE_KEY_PT, val);
    else localStorage.removeItem(STORAGE_KEY_PT);
  });
  watch(selectedImageId, (val) => {
    if (val) localStorage.setItem(STORAGE_KEY_IMG, val);
    else localStorage.removeItem(STORAGE_KEY_IMG);
  });
  watch(currentPage, (val) => {
    localStorage.setItem(STORAGE_KEY_PAGE, val.toString());
  });

  watch(currentImages, (newImages) => {
    if (newImages.length === 0) return;
    if (!selectedImageId.value) {
      const firstImage = newImages[0];
      if (firstImage) selectImage(firstImage);
    }
  });

  watch(
    currentPatients,
    (newPatients) => {
      if (newPatients && newPatients.length > 0) {
        if (!selectedPatientId.value) {
          const firstPatient = newPatients[0];
          if (firstPatient) selectPatient(firstPatient);
        } else {
          // Check if stored patient exists in the current list
          const exists = newPatients.some((p) => p.id === selectedPatientId.value);
          if (exists) {
            // Restore side effect: fetch images for this patient (only if not already loaded)
            const patientId = selectedPatientId.value as string;
            const alreadyLoaded = imageStore.getImagesByPatientId(patientId).length > 0;
            if (!alreadyLoaded) {
              imageStore.fetchImagesByPatient(patientId);
            }
          } else {
            // Fallback to first patient if stored ID is invalid for this workspace
            const firstPatient = newPatients[0];
            if (firstPatient) selectPatient(firstPatient);
          }
        }
      }
    },
    { immediate: true }
  );

  let isWorkspacesInitialized = false;
  watch(
    workspaces,
    (newWorkspaces) => {
      if (isWorkspacesInitialized) return;
      if (newWorkspaces && newWorkspaces.length > 0) {
        isWorkspacesInitialized = true;
        if (!selectedWorkspaceId.value) {
          const firstWorkspace = newWorkspaces[0];
          if (firstWorkspace) {
            selectWorkspace(firstWorkspace);
          }
        } else {
          // Check if stored workspace exists
          const workspace = newWorkspaces.find((w) => w.id === selectedWorkspaceId.value);
          if (workspace) {
            // Restore side effects
            workspaceStore.setCurrentWorkspace(workspace);
            workspaceStore.fetchWorkspaceById(workspace.id, { showToast: false });
            
            // Check if patients for this workspace are already loaded
            const patientsLoaded = patientStore.patientsByWorkspace.has(workspace.id);
            if (!patientsLoaded) {
              loadPatientsPage();
            }
            
            annotationTypeStore.fetchAnnotationTypes(
              { limit: 100 },
              { refresh: false, parentId: workspace.id }
            );
          } else {
            // Fallback to first workspace
            const firstWorkspace = newWorkspaces[0];
            if (firstWorkspace) selectWorkspace(firstWorkspace);
          }
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
