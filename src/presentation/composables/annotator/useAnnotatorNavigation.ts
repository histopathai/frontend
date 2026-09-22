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
import { nextMatching, prevMatching, type CompletionMode } from '@/core/completion';
import { useCompletionFilter } from './useCompletionFilter';

export function useAnnotatorNavigation(options: { completion?: CompletionMode } = {}) {
  const workspaceStore = useWorkspaceStore();
  const patientStore = usePatientStore();
  const imageStore = useImageStore();
  const annotationTypeStore = useAnnotationTypeStore();
  const annotationStore = useAnnotationStore();

  const { allWorkspaces } = storeToRefs(workspaceStore);
  const { patientsByWorkspace } = storeToRefs(patientStore);
  const { imagesByPatient } = storeToRefs(imageStore);
  const { annotationTypes } = storeToRefs(annotationTypeStore);

  const loading = computed(
    () =>
      workspaceStore.allLoading ||
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

  const allPatients = computed((): Patient[] => {
    const list = selectedWorkspaceId.value
      ? patientsByWorkspace.value.get(selectedWorkspaceId.value)
      : [];
    return (list || []) as Patient[];
  });

  const allImages = computed((): Image[] => {
    const list = selectedPatientId.value ? imagesByPatient.value.get(selectedPatientId.value) : [];
    return (list || []) as Image[];
  });

  // With "Bitenleri Gizle" on, the lists everyone else sees leave the finished out.
  const completion = useCompletionFilter(options.completion ?? 'none', {
    workspaces: allWorkspaces as any,
    patients: allPatients,
    images: allImages,
    selectedWorkspaceId,
    selectedPatientId,
    selectedImageId,
  });
  const workspaces = completion.visibleWorkspaces;
  const currentPatients = completion.visiblePatients;
  const currentImages = completion.visibleImages;

  const selectedPatient = computed((): Patient | null => {
    return allPatients.value.find((p) => p.id === selectedPatientId.value) || null;
  });

  const selectedImage = computed((): Image | null => {
    return allImages.value.find((img) => img.id === selectedImageId.value) || null;
  });

  const selectedImageIndex = computed((): number => {
    if (!selectedImageId.value || currentImages.value.length === 0) return -1;
    return currentImages.value.findIndex((img) => img.id === selectedImageId.value);
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
  // While hiding, more patients are appended to the list, which only adds up
  // from the first page.
  const pageReset = completion.hideFinished.value && currentPage.value !== 1;
  if (pageReset) currentPage.value = 1;
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
    imageStore.fetchImagesByPatient(patient.id, { limit: 100 }, { refresh: true });
  }

  function clearImageSelection() {
    selectedImageId.value = undefined;
    localStorage.removeItem(STORAGE_KEY_IMG);
  }

  function selectImage(image: Image) {
    selectedImageId.value = image.id;
  }

  // Steps are taken in the full lists: the image just finished is already out
  // of the filtered one, and its place there would be lost.
  function nextImage() {
    const nextImg = nextMatching(allImages.value, selectedImageId.value, completion.isImageVisible);
    const nextPatient = nextMatching(
      allPatients.value,
      selectedPatientId.value,
      completion.isPatientVisible
    );
    if (nextImg) selectImage(nextImg);
    else if (nextPatient) selectPatient(nextPatient);
    else if (hasMore.value) loadMorePatients();
  }

  function prevImage() {
    const prevImg = prevMatching(allImages.value, selectedImageId.value, completion.isImageVisible);
    const prevPatient = prevMatching(
      allPatients.value,
      selectedPatientId.value,
      completion.isPatientVisible
    );
    if (prevImg) selectImage(prevImg);
    else if (prevPatient) selectPatient(prevPatient);
  }

  function setHideFinished(value: boolean) {
    if (completion.hideFinished.value === value) return;
    completion.hideFinished.value = value;
    if (value && currentPage.value !== 1) setPage(1);
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
    allPatients,
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

  // --- "Bitenleri Gizle" ---

  // Keeps the list filled: a page of patients may be finished from top to bottom.
  watch(
    [completion.filtering, currentPatients, hasMore, () => patientStore.loading],
    ([filtering, visible, more, busy]) => {
      if (filtering && visible.length < 10 && more && !busy) loadMorePatients();
    },
    { immediate: true }
  );

  // A finished image can only be selected from before the switch was on (or from
  // the last visit); move on to work that is left. One that turns finished while
  // open stays, see useCompletionFilter.
  watch(
    [
      completion.filtering,
      completion.ready,
      currentImages,
      currentPatients,
      selectedImageId,
      () => imageStore.loading,
    ],
    () => {
      const patientId = selectedPatientId.value;
      if (!completion.filtering.value || !completion.ready.value || !patientId) return;
      if (imageStore.loading || !imagesByPatient.value.has(patientId)) return;
      if (selectedImage.value && completion.isImageVisible(selectedImage.value)) return;

      const firstImage = currentImages.value[0];
      if (firstImage) return selectImage(firstImage);

      const withWork =
        nextMatching(allPatients.value, patientId, completion.hasWorkLeft) ??
        allPatients.value.find(completion.hasWorkLeft);
      if (withWork) return selectPatient(withWork);
      // Wait for the patients still being counted before giving up.
      if (allPatients.value.some((p) => !completion.patientProgress(p.id))) return;
      if (selectedImageId.value) clearImageSelection();
    }
  );

  let isWorkspacesInitialized = false;
  watch(
    allWorkspaces,
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
            if (!patientsLoaded || pageReset) {
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

  workspaceStore.fetchAllWorkspaces().catch(() => {});

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
    clearImageSelection,
    selectAnnotationType,
    nextImage,
    prevImage,
    searchPatients,
    loadMorePatients,

    completionMode: completion.mode,
    hideFinished: completion.hideFinished,
    setHideFinished,
    patientProgress: completion.patientProgress,
    isImageFinished: completion.isImageFinished,
    setMaskStatus: completion.setMaskStatus,

    // Pagination exports
    currentPage,
    totalPages,
    hasMore,
    limit,
    totalPatientsCount,
    setPage,
  };
}
