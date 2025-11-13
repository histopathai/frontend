import { ref, computed, onMounted, reactive } from 'vue';
import { useWorkspaceStore } from '@/stores/workspace';
import { useToast } from 'vue-toastification';
import type { Workspace } from '@/core/entities/Workspace';
import type { Patient } from '@/core/entities/Patient';
import type { Image } from '@/core/entities/Image';
import type {
  CreateNewWorkspaceRequest,
  UpdateWorkspaceRequest,
} from '@/core/repositories/IWorkspaceRepository';
import type { CreateNewPatientRequest } from '@/core/repositories/IPatientRepository';

export function useWorkspaces() {
  const store = useWorkspaceStore();
  const toast = useToast();

  // === Store State ===
  const workspaces = computed(() => store.allWorkspaces);
  const loading = computed(() => store.isLoading);
  const error = computed(() => store.error);

  // === Filtering State ===
  const isFilterAreaVisible = ref(false);
  const filters = reactive({ name: '', organType: '', organization: '', releaseYear: '' });

  const uniqueOrganTypes = computed(() => {
    const allTypes = workspaces.value.map((ws) => ws.organType).filter(Boolean);
    return [...new Set(allTypes)].sort();
  });
  const uniqueOrganizations = computed(() => {
    const allOrgs = workspaces.value.map((ws) => ws.organization).filter(Boolean);
    return [...new Set(allOrgs)].sort();
  });

  const filteredWorkspaces = computed(() => {
    const nameQuery = filters.name.toLowerCase().trim();
    const organQuery = filters.organType.toLowerCase();
    const orgQuery = filters.organization.toLowerCase();
    const yearQuery = String(filters.releaseYear).trim();

    if (!nameQuery && !organQuery && !orgQuery && !yearQuery) {
      return workspaces.value;
    }

    return workspaces.value.filter((ws) => {
      const details = ws;
      const nameMatch = nameQuery ? details.name.toLowerCase().includes(nameQuery) : true;
      const organMatch = organQuery ? (details.organType || '').toLowerCase() === organQuery : true;
      const orgMatch = orgQuery ? (details.organization || '').toLowerCase() === orgQuery : true;
      const yearMatch = yearQuery ? String(details.releaseYear || '').includes(yearQuery) : true;
      return nameMatch && organMatch && orgMatch && yearMatch;
    });
  });

  const resetFilters = () => {
    filters.name = '';
    filters.organType = '';
    filters.organization = '';
    filters.releaseYear = '';
  };

  // === Modal State ===
  const isCreateModalOpen = ref(false);
  const isDeleteModalOpen = ref(false);
  const workspaceToDelete = ref<Workspace | null>(null);

  const isCreatePatientModalOpen = ref(false);
  const workspaceForNewPatient = ref<Workspace | null>(null);

  const isDeletePatientModalOpen = ref(false);
  const patientToDelete = ref<Patient | null>(null);

  const isUploadModalOpen = ref(false);
  const patientForNewImage = ref<Patient | null>(null);

  const isDeleteImageModalOpen = ref(false);
  const imageToDelete = ref<Image | null>(null);

  const isMovePatientModalOpen = ref(false);
  const patientToMove = ref<Patient | null>(null);

  const isMoveImageModalOpen = ref(false);
  const imageToMove = ref<Image | null>(null);

  const isViewerModalOpen = ref(false);
  const imageToView = ref<Image | null>(null);

  // --- YENİ EKLENEN STATE'LER ---
  const isEditModalOpen = ref(false);
  const workspaceToEdit = ref<Workspace | null>(null);
  const isEditPatientModalOpen = ref(false);
  const patientToEdit = ref<Patient | null>(null);
  // --- BİTTİ ---

  // === Data Fetching ===
  onMounted(() => {
    if (workspaces.value.length === 0) {
      store.fetchWorkspaces().catch((err) => toast.error(store.error));
    }
  });

  // Dinamik olarak hasta ve görüntüleri yükle
  async function loadPatientsFor(workspaceId: string) {
    // Zaten yüklüyse tekrar çekme
    if (!store.patientsByWorkspace.has(workspaceId)) {
      await store.fetchPatients(workspaceId).catch((err) => toast.error(store.error));
    }
  }

  async function loadImagesFor(patientId: string) {
    // Zaten yüklüyse tekrar çekme
    if (!store.imagesByPatient.has(patientId)) {
      await store.fetchImages(patientId).catch((err) => toast.error(store.error));
    }
  }

  // === Modal Triggers ===
  const promptDeleteWorkspace = (workspace: Workspace) => {
    workspaceToDelete.value = workspace;
    isDeleteModalOpen.value = true;
  };

  const promptCreatePatient = (workspace: Workspace) => {
    workspaceForNewPatient.value = workspace;
    isCreatePatientModalOpen.value = true;
  };

  const promptDeletePatient = (patient: Patient) => {
    patientToDelete.value = patient;
    isDeletePatientModalOpen.value = true;
  };

  const promptUploadImage = (patient: Patient) => {
    patientForNewImage.value = patient;
    isUploadModalOpen.value = true;
  };

  const promptDeleteImage = (image: Image) => {
    imageToDelete.value = image;
    isDeleteImageModalOpen.value = true;
  };

  const promptMovePatient = (patient: Patient) => {
    patientToMove.value = patient;
    isMovePatientModalOpen.value = true;
  };

  const promptMoveImage = (image: Image) => {
    imageToMove.value = image;
    isMoveImageModalOpen.value = true;
  };

  const promptViewImage = (image: Image) => {
    imageToView.value = image;
    isViewerModalOpen.value = true;
  };

  const promptEditWorkspace = (workspace: Workspace) => {
    workspaceToEdit.value = workspace;
    isEditModalOpen.value = true;
  };

  const promptEditPatient = (patient: Patient) => {
    patientToEdit.value = patient;
    isEditPatientModalOpen.value = true;
  };
  // --- BİTTİ ---

  // === Modal Handlers (CRUD) ===
  const handleWorkspaceCreated = async (data: CreateNewWorkspaceRequest) => {
    try {
      await store.createWorkspace(data);
      toast.success(`'${data.name}' çalışma alanı oluşturuldu!`);
      isCreateModalOpen.value = false;
    } catch {
      toast.error(store.error);
    }
  };

  const executeDeleteWorkspace = async () => {
    if (!workspaceToDelete.value) return;
    try {
      await store.deleteWorkspace(workspaceToDelete.value.id);
      toast.success(`'${workspaceToDelete.value.name}' silindi.`);
      isDeleteModalOpen.value = false;
      workspaceToDelete.value = null;
    } catch {
      toast.error(store.error);
    }
  };

  const handlePatientCreated = async (data: Omit<CreateNewPatientRequest, 'workspaceId'>) => {
    if (!workspaceForNewPatient.value) return;
    try {
      const payload: CreateNewPatientRequest = {
        ...data,
        workspaceId: workspaceForNewPatient.value.id,
      };
      await store.createPatient(payload);
      toast.success(`'${data.name}' hastası oluşturuldu.`);
      isCreatePatientModalOpen.value = false;
      workspaceForNewPatient.value = null;
    } catch {
      toast.error(store.error);
    }
  };

  const executeDeletePatient = async () => {
    if (!patientToDelete.value) return;
    try {
      await store.deletePatient(patientToDelete.value as Patient);
      toast.success(`'${patientToDelete.value.name}' hastası silindi.`);
      isDeletePatientModalOpen.value = false;
      patientToDelete.value = null;
    } catch {
      toast.error(store.error);
    }
  };

  const handleImageUploaded = (patient: Patient, image: Image) => {
    // Yükleme bittiğinde, store'daki state'i güncelle
    store.markImageAsUploaded(patient.id, image);
    isUploadModalOpen.value = false;
    patientForNewImage.value = null;
  };

  const executeDeleteImage = async () => {
    if (!imageToDelete.value) return;
    try {
      await store.deleteImage(imageToDelete.value as Image);
      toast.success(`Görüntü silindi.`);
      isDeleteImageModalOpen.value = false;
      imageToDelete.value = null;
    } catch {
      toast.error(store.error);
    }
  };

  const executeMovePatient = async (newWorkspaceId: string) => {
    if (!patientToMove.value) return;
    try {
      await store.transferPatient(
        patientToMove.value.id,
        patientToMove.value.workspaceId,
        newWorkspaceId
      );
      toast.success(`'${patientToMove.value.name}' hastası taşındı.`);
      isMovePatientModalOpen.value = false;
      patientToMove.value = null;
    } catch {
      toast.error(store.error);
    }
  };

  const executeMoveImage = async (newPatientId: string) => {
    if (!imageToMove.value) return;
    try {
      await store.transferImage(imageToMove.value.id, imageToMove.value.patientId, newPatientId);
      toast.success(`'${imageToMove.value.name}' görüntüsü taşındı.`);
      isMoveImageModalOpen.value = false;
      imageToMove.value = null;
    } catch {
      toast.error(store.error);
    }
  };

  // --- YENİ EKLENEN HANDLER'LAR ---
  const handleWorkspaceUpdated = async (data: UpdateWorkspaceRequest) => {
    if (!workspaceToEdit.value) return;
    try {
      await store.updateWorkspace(workspaceToEdit.value.id, data);
      toast.success(`'${data.name}' çalışma alanı güncellendi!`);
      isEditModalOpen.value = false;
      workspaceToEdit.value = null;
    } catch {
      toast.error(store.error);
    }
  };

  const handlePatientUpdated = async (data: Partial<CreateNewPatientRequest>) => {
    if (!patientToEdit.value) return;
    try {
      await store.updatePatient(patientToEdit.value.id, patientToEdit.value.workspaceId, data);
      toast.success(`'${data.name}' hastası güncellendi.`);
      isEditPatientModalOpen.value = false;
      patientToEdit.value = null;
    } catch {
      toast.error(store.error);
    }
  };
  // --- BİTTİ ---

  return {
    // State & Getters
    loading,
    error,
    filteredWorkspaces,
    getPatientsForWorkspace: store.getPatientsForWorkspace,
    getImagesForPatient: store.getImagesForPatient,

    // Filtering
    isFilterAreaVisible,
    filters,
    uniqueOrganTypes,
    uniqueOrganizations,
    resetFilters,

    // Modals State
    isCreateModalOpen,
    isDeleteModalOpen,
    workspaceToDelete,
    isCreatePatientModalOpen,
    workspaceForNewPatient,
    isDeletePatientModalOpen,
    patientToDelete,
    isUploadModalOpen,
    patientForNewImage,
    isDeleteImageModalOpen,
    imageToDelete,
    isMovePatientModalOpen,
    patientToMove,
    isMoveImageModalOpen,
    imageToMove,
    isViewerModalOpen,
    imageToView,

    patientsByWorkspace: store.patientsByWorkspace,
    allWorkspaces: workspaces,

    isEditModalOpen,
    workspaceToEdit,
    isEditPatientModalOpen,
    patientToEdit,

    // Loaders
    loadPatientsFor,
    loadImagesFor,

    // Modal Triggers
    promptDeleteWorkspace,
    promptCreatePatient,
    promptDeletePatient,
    promptUploadImage,
    promptDeleteImage,
    promptMovePatient,
    promptMoveImage,
    promptViewImage,

    // --- YENİ ---
    promptEditWorkspace,
    promptEditPatient,
    // --- BİTTİ ---

    // Modal Handlers
    handleWorkspaceCreated,
    executeDeleteWorkspace,
    handlePatientCreated,
    executeDeletePatient,
    handleImageUploaded,
    executeDeleteImage,
    executeMovePatient,
    executeMoveImage,

    // --- YENİ ---
    handleWorkspaceUpdated,
    handlePatientUpdated,
    // --- BİTTİ ---
  };
}
