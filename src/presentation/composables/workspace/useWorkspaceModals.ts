// src/presentation/composables/workspace/useWorkspaceModals.ts
import { ref } from 'vue';
import { useWorkspaceStore } from '@/stores/workspace';
import { useToast } from 'vue-toastification';
import type { Workspace } from '@/core/entities/Workspace';
import type { Patient } from '@/core/entities/Patient';
import type { Image } from '@/core/entities/Image';
import type {
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
} from '@/core/repositories/IWorkspaceRepository';
import type {
  CreatePatientRequest,
  UpdatePatientRequest,
  MovePatientRequest,
} from '@/core/repositories/IPatientRepository';
import type { CreateImageRequest, MoveImageRequest } from '@/core/repositories/IImageRepository';

export function useWorkspaceModals() {
  const store = useWorkspaceStore();
  const toast = useToast();

  // === 1. MODAL DURUMLARI (STATE) ===
  const isCreateModalOpen = ref(false);
  const isEditModalOpen = ref(false);
  const isDeleteModalOpen = ref(false);
  const isCreatePatientModalOpen = ref(false);
  const isEditPatientModalOpen = ref(false);
  const isDeletePatientModalOpen = ref(false);
  const isUploadModalOpen = ref(false);
  const isDeleteImageModalOpen = ref(false);
  const isViewerModalOpen = ref(false);
  const isMoveImageModalOpen = ref(false);
  const isMovePatientModalOpen = ref(false);

  // === 2. MODAL VERİLERİ (DATA) ===
  const workspaceToEdit = ref<Workspace | null>(null);
  const workspaceToDelete = ref<Workspace | null>(null);
  const workspaceForNewPatient = ref<{ id: string; name: string } | null>(null);
  const patientToEdit = ref<Patient | null>(null);
  const workspaceIdForPatientEdit = ref<string>('');
  const patientToDelete = ref<Patient | null>(null);
  const workspaceIdOfPatientToDelete = ref<string>('');
  const selectedWorkspaceId = ref<string>('');
  const selectedPatientId = ref<string>('');
  const imageToDelete = ref<Image | null>(null);
  const workspaceIdOfImageToDelete = ref<string>('');
  const patientIdOfImageToDelete = ref<string>('');
  const imageToView = ref<Image | null>(null);
  const imageToMove = ref<Image | null>(null);
  const sourceWorkspaceIdForMove = ref<string>('');
  const sourcePatientIdForMove = ref<string>('');
  const patientToMove = ref<Patient | null>(null);

  // === 3. MODAL AÇMA FONKSİYONLARI (PROMPTS) - (ID BAZLI DÜZELTİLDİ) ===

  const promptCreateWorkspace = () => {
    isCreateModalOpen.value = true;
  };

  const promptEditWorkspace = (workspace: Workspace) => {
    workspaceToEdit.value = workspace;
    isEditModalOpen.value = true;
  };

  const promptDeleteWorkspace = (workspace: Workspace) => {
    workspaceToDelete.value = workspace;
    isDeleteModalOpen.value = true;
  };

  const promptCreatePatient = (workspaceId: string, workspaceName: string) => {
    workspaceForNewPatient.value = { id: workspaceId, name: workspaceName };
    isCreatePatientModalOpen.value = true;
  };

  const promptEditPatient = (patient: Patient, workspaceId: string) => {
    patientToEdit.value = patient;
    workspaceIdForPatientEdit.value = workspaceId;
    isEditPatientModalOpen.value = true;
  };

  const promptDeletePatient = (patient: Patient, workspaceId: string) => {
    patientToDelete.value = patient;
    workspaceIdOfPatientToDelete.value = workspaceId;
    isDeletePatientModalOpen.value = true;
  };

  const openUploadModal = (workspaceId: string, patientId: string) => {
    selectedWorkspaceId.value = workspaceId;
    selectedPatientId.value = patientId;
    isUploadModalOpen.value = true;
  };

  const promptDeleteImage = (image: Image, workspaceId: string, patientId: string) => {
    imageToDelete.value = image;
    workspaceIdOfImageToDelete.value = workspaceId;
    patientIdOfImageToDelete.value = patientId;
    isDeleteImageModalOpen.value = true;
  };

  const viewImage = (image: Image) => {
    imageToView.value = image;
    isViewerModalOpen.value = true;
  };

  const promptMoveImage = (image: Image, workspaceId: string, patientId: string) => {
    imageToMove.value = image;
    sourceWorkspaceIdForMove.value = workspaceId;
    sourcePatientIdForMove.value = patientId;
    isMoveImageModalOpen.value = true;
  };

  const promptMovePatient = (patient: Patient, workspaceId: string) => {
    patientToMove.value = patient;
    sourceWorkspaceIdForMove.value = workspaceId;
    isMovePatientModalOpen.value = true;
  };

  // === 4. MODAL EYLEM İŞLEYİCİLERİ (HANDLERS) - (ID BAZLI DÜZELTİLDİ) ===

  const handleWorkspaceCreated = async (data: CreateWorkspaceRequest) => {
    try {
      await store.createWorkspace(data);
      toast.success(`'${data.name}' çalışma alanı oluşturuldu.`);
      isCreateModalOpen.value = false;
    } catch {
      toast.error(store.error);
    }
  };

  const handleWorkspaceUpdated = async (data: UpdateWorkspaceRequest) => {
    if (!workspaceToEdit.value) return;
    try {
      await store.updateWorkspace(workspaceToEdit.value.id, data);
      toast.success(`'${data.name}' güncellendi.`);
      isEditModalOpen.value = false;
      workspaceToEdit.value = null;
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

  const handlePatientCreated = async (data: CreatePatientRequest) => {
    if (!workspaceForNewPatient.value) return;
    try {
      await store.createPatient(workspaceForNewPatient.value.id, data);
      toast.success(`'${data.patientId}' kodlu hasta eklendi.`);
      isCreatePatientModalOpen.value = false;
      workspaceForNewPatient.value = null;
    } catch {
      toast.error(store.error);
    }
  };

  const handlePatientUpdated = async (data: UpdatePatientRequest) => {
    if (!workspaceIdForPatientEdit.value || !patientToEdit.value) {
      toast.error('Gerekli bilgiler bulunamadı.');
      return;
    }
    try {
      await store.updatePatient(workspaceIdForPatientEdit.value, patientToEdit.value.id, data);
      toast.success(`Hasta '${data.patientId}' güncellendi.`);
      isEditPatientModalOpen.value = false;
      patientToEdit.value = null;
    } catch {
      toast.error(store.error);
    }
  };

  const executeDeletePatient = async () => {
    if (!workspaceIdOfPatientToDelete.value || !patientToDelete.value) return;
    try {
      await store.deletePatient(workspaceIdOfPatientToDelete.value, patientToDelete.value.id);
      toast.success(`Hasta '${patientToDelete.value.id}' silindi.`);
      isDeletePatientModalOpen.value = false;
      patientToDelete.value = null;
    } catch {
      toast.error(store.error);
    }
  };

  const handleImageUploaded = async (data: CreateImageRequest) => {
    if (!selectedWorkspaceId.value || !selectedPatientId.value) return;
    try {
      await store.createImage(selectedWorkspaceId.value, selectedPatientId.value, data);
      toast.success(`'${data.fileName}' görüntüsü eklendi!`);
      isUploadModalOpen.value = false;
    } catch (err) {
      toast.error(store.error);
      console.error(err);
    }
  };

  const executeDeleteImage = async () => {
    if (!imageToDelete.value) return;
    try {
      await store.deleteImage(
        workspaceIdOfImageToDelete.value,
        patientIdOfImageToDelete.value,
        imageToDelete.value.id
      );
      toast.success(`Görüntü silindi.`);
      isDeleteImageModalOpen.value = false;
      imageToDelete.value = null;
    } catch {
      toast.error(store.error);
    }
  };

  const executeMoveImage = async (data: {
    targetWorkspaceName: string;
    targetPatientId: string;
  }) => {
    const targetWS = store.allWorkspaces.find((ws) => ws.name === data.targetWorkspaceName);
    const targetPatient = targetWS?.patients.find((p) => p.id === data.targetPatientId);

    if (!imageToMove.value || !targetWS || !targetPatient) {
      toast.error('Taşıma hedefi bulunamadı.');
      return;
    }

    const payload: MoveImageRequest = {
      targetWorkspaceID: targetWS.id,
      targetPatientID: targetPatient.id,
    };

    try {
      await store.moveImage(
        sourceWorkspaceIdForMove.value,
        sourcePatientIdForMove.value,
        imageToMove.value.id,
        payload
      );
      toast.success(`Görüntü '${targetWS.name}/${targetPatient.id}' hedefine taşındı.`);
      isMoveImageModalOpen.value = false;
    } catch {
      toast.error(store.error);
    }
  };

  const executeMovePatient = async (targetWorkspaceName: string) => {
    const targetWS = store.allWorkspaces.find((ws) => ws.name === targetWorkspaceName);

    if (!patientToMove.value || !targetWS) {
      toast.error('Taşıma hedefi bulunamadı.');
      return;
    }

    const payload: MovePatientRequest = {
      targetWorkspaceID: targetWS.id,
    };

    try {
      await store.movePatient(sourceWorkspaceIdForMove.value, patientToMove.value.id, payload);
      toast.success(`Hasta '${patientToMove.value.id}', '${targetWS.name}' hedefine taşındı.`);
      isMovePatientModalOpen.value = false;
    } catch {
      toast.error(store.error);
    }
  };

  return {
    isCreateModalOpen,
    isEditModalOpen,
    isDeleteModalOpen,
    isCreatePatientModalOpen,
    isEditPatientModalOpen,
    isDeletePatientModalOpen,
    isUploadModalOpen,
    isDeleteImageModalOpen,
    isViewerModalOpen,
    isMoveImageModalOpen,
    isMovePatientModalOpen,

    workspaceToEdit,
    workspaceToDelete,
    workspaceForNewPatient,
    patientToEdit,
    workspaceIdForPatientEdit,
    patientToDelete,
    workspaceIdOfPatientToDelete,
    selectedWorkspaceId,
    selectedPatientId,
    imageToDelete,
    workspaceIdOfImageToDelete,
    patientIdOfImageToDelete,
    imageToView,
    imageToMove,
    sourceWorkspaceIdForMove,
    sourcePatientIdForMove,
    patientToMove,

    promptCreateWorkspace,
    promptEditWorkspace,
    promptDeleteWorkspace,
    promptCreatePatient,
    promptEditPatient,
    promptDeletePatient,
    openUploadModal,
    promptDeleteImage,
    viewImage,
    promptMoveImage,
    promptMovePatient,

    handleWorkspaceCreated,
    handleWorkspaceUpdated,
    executeDeleteWorkspace,
    handlePatientCreated,
    handlePatientUpdated,
    executeDeletePatient,
    handleImageUploaded,
    executeDeleteImage,
    executeMoveImage,
    executeMovePatient,
  };
}
