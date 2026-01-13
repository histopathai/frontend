import { ref, computed, watch } from 'vue';
import { useWorkspaceStore } from '@/stores/workspace';
import { usePatientStore } from '@/stores/patient';
import { useImageStore } from '@/stores/image';
import { useAnnotationTypeStore } from '@/stores/annotation_type';
import { storeToRefs } from 'pinia';
import type { Patient } from '@/core/entities/Patient';
import type { Image } from '@/core/entities/Image';
import type { Workspace } from '@/core/entities/Workspace';
import type { AnnotationType } from '@/core/entities/AnnotationType';

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
    return currentImages.value.findIndex((img) => img.id === selectedImageId.value);
  });

  const selectedPatientIndex = computed((): number => {
    return currentPatients.value.findIndex((p) => p.id === selectedPatientId.value);
  });

  // 🔥 Seçili workspace objesi
  const selectedWorkspace = computed((): Workspace | null => {
    if (!selectedWorkspaceId.value) return null;
    return workspaces.value.find((w) => w.id === selectedWorkspaceId.value) || null;
  });

  /**
   * 🔥 REVERSE FILTER: Workspace'teki annotation_types array'ine göre filtrele
   */
  const workspaceAnnotationTypes = computed(() => {
    if (!selectedWorkspace.value) {
      console.log('⚠️ [useAnnotatorNavigation] Workspace seçilmemiş');
      return [];
    }

    // Workspace objesinden annotation_types array'ini al
    const workspaceTypeIds =
      (selectedWorkspace.value as any).annotation_types ||
      (selectedWorkspace.value as any).annotationTypes ||
      [];

    console.log('🔍 [useAnnotatorNavigation] Workspace annotation type IDs:', {
      workspaceId: selectedWorkspaceId.value,
      typeIds: workspaceTypeIds,
      totalAvailableTypes: annotationTypes.value.length,
    });

    if (!Array.isArray(workspaceTypeIds) || workspaceTypeIds.length === 0) {
      console.warn(
        "⚠️ [useAnnotatorNavigation] Workspace'te annotation_types array'i yok veya boş!"
      );
      return [];
    }

    // Annotation type'ları ID'lere göre filtrele
    const filtered = annotationTypes.value.filter((type: AnnotationType) => {
      const matches = workspaceTypeIds.includes(type.id);
      if (matches) {
        console.log('  ✅ Eşleşti:', type.name, '→', type.id);
      }
      return matches;
    });

    console.log('📊 [useAnnotatorNavigation] Filtreleme sonucu:', {
      filtered: filtered.length,
      types: filtered.map((t) => ({ name: t.name, global: t.global })),
    });

    return filtered;
  });

  /**
   * 🔥 Global annotation types
   */
  const globalAnnotationTypes = computed(() => {
    const globals = workspaceAnnotationTypes.value.filter((type: AnnotationType) => {
      return type.global === true;
    });

    console.log('🌍 [useAnnotatorNavigation] Global types:', {
      count: globals.length,
      types: globals.map((t) => t.name),
    });

    return globals;
  });

  /**
   * 🔥 Lokal annotation types
   */
  const localAnnotationTypes = computed(() => {
    const locals = workspaceAnnotationTypes.value.filter((type: AnnotationType) => {
      return type.global !== true;
    });

    console.log('📍 [useAnnotatorNavigation] Local types:', {
      count: locals.length,
      types: locals.map((t) => t.name),
    });

    return locals;
  });

  function selectWorkspace(workspace: Workspace) {
    if (selectedWorkspaceId.value === workspace.id) return;

    console.log('🔄 [useAnnotatorNavigation] Workspace seçildi:', workspace.id);
    console.log('📋 Workspace annotation_types:', (workspace as any).annotation_types);

    selectedWorkspaceId.value = workspace.id;
    selectedPatientId.value = undefined;
    selectedImageId.value = undefined;

    workspaceStore.setCurrentWorkspace(workspace);
    patientStore.fetchPatientsByWorkspace(workspace.id);

    console.log('📥 [useAnnotatorNavigation] Annotation types yükleniyor...');
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

  watch(
    annotationTypes,
    (newTypes) => {
      console.log('👀 [useAnnotatorNavigation] Annotation types güncellendi:', {
        count: newTypes.length,
        types: newTypes.map((t) => ({
          id: t.id,
          name: t.name,
          global: t.global,
        })),
      });
    },
    { deep: true }
  );

  // 🔥 YENİ: Workspace değişimini izle
  watch(
    selectedWorkspace,
    (newWorkspace) => {
      if (newWorkspace) {
        console.log('👀 [useAnnotatorNavigation] Seçili workspace değişti:', {
          id: newWorkspace.id,
          name: (newWorkspace as any).name,
          annotation_types: (newWorkspace as any).annotation_types,
        });
      }
    },
    { deep: true }
  );

  workspaceStore.fetchWorkspaces();

  return {
    loading,

    workspaces,
    currentPatients,
    currentImages,
    annotationTypes,

    // Workspace array'ine göre filtrelenmiş
    workspaceAnnotationTypes,
    globalAnnotationTypes,
    localAnnotationTypes,

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
