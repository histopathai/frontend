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

  const selectedWorkspace = computed((): Workspace | null => {
    if (!selectedWorkspaceId.value) return null;
    return workspaces.value.find((w) => w.id === selectedWorkspaceId.value) || null;
  });

  /**
   * 🔥 GÜNCELLENDİ: Workspace'e ait annotation tipleri
   * Store zaten 'fetchAnnotationTypes' metodunda 'parentId' ile çağrıldığı için
   * dönen liste sadece bu workspace'e aittir. Ekstra ID kontrolü (t.workspaceId === id)
   * API yanıtında parent objesi eksikse hataya yol açabilir, bu yüzden kaldırıldı veya esnetildi.
   */
  const workspaceAnnotationTypes = computed(() => {
    if (!selectedWorkspaceId.value) return [];

    // 🔥 DÜZELTME: ID kontrolünü kaldırıyoruz.
    // Store zaten sadece bu workspace'in verilerini içeriyor.
    // Backend'den 'parent' objesi dönmese bile verileri göstermeliyiz.
    return annotationTypes.value;
  });

  /**
   * 🔥 Global annotation types
   * Global flag kontrolü (string/boolean/number uyumluluğu ile)
   */
  const globalAnnotationTypes = computed(() => {
    if (!workspaceAnnotationTypes.value) return [];

    return workspaceAnnotationTypes.value.filter((type: AnnotationType) => {
      const g = type.global;
      // API'den string "true", "1" veya number 1 gelebilir, hepsi kapsanmalı
      const gString = String(g).toLowerCase();
      return g === true || gString === 'true' || gString === '1';
    });
  });

  /**
   * 🔥 Lokal annotation types
   */
  const localAnnotationTypes = computed(() => {
    return workspaceAnnotationTypes.value.filter((type: AnnotationType) => {
      return String(type.global) !== 'true' && type.global !== true;
    });
  });

  function selectWorkspace(workspace: Workspace) {
    if (selectedWorkspaceId.value === workspace.id) return;

    console.log('🔄 [useAnnotatorNavigation] Workspace seçildi:', workspace.id);

    selectedWorkspaceId.value = workspace.id;
    selectedPatientId.value = undefined;
    selectedImageId.value = undefined;

    workspaceStore.setCurrentWorkspace(workspace);

    // Hastaları yükle
    patientStore.fetchPatientsByWorkspace(workspace.id);

    // Annotation tiplerini bu workspace için yükle
    // parentId parametresi sayesinde store sadece bu workspace'e ait tiplerle dolacak
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

  // Debug log
  watch(
    annotationTypes,
    (newTypes) => {
      console.log('👀 [useAnnotatorNavigation] Annotation types güncellendi:', {
        count: newTypes.length,
        workspaceId: selectedWorkspaceId.value,
      });
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
