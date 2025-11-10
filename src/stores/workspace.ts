import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { repositories } from '@/services';
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
} from '@/core/repositories/IPatientRepository';
import type { CreateImageRequest, MoveImageRequest } from '@/core/repositories/IImageRepository';
import type { MovePatientRequest } from '@/core/repositories/IPatientRepository';

// Depoları (Repositories) al
const workspaceRepo = repositories.workspace;
const patientRepo = repositories.patient;
const imageRepo = repositories.image;

export const useWorkspaceStore = defineStore('workspace', () => {
  // === STATE ===
  const workspaces = ref<Workspace[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // === GETTERS ===
  const allWorkspaces = computed(() => workspaces.value);

  const uniqueOrganTypes = computed(() => {
    const allTypes = workspaces.value.map((ws) => ws.organType).filter(Boolean);
    return [...new Set(allTypes)].sort();
  });

  const uniqueOrganizations = computed(() => {
    const allOrgs = workspaces.value.map((ws) => ws.organization).filter(Boolean);
    return [...new Set(allOrgs)].sort();
  });

  const allWorkspaceNames = computed(() => workspaces.value.map((ws) => ws.name).sort());

  // === ACTIONS ===

  // --- Workspace CRUD ---
  async function fetchAllWorkspaces() {
    if (workspaces.value.length > 0) {
      // Basit cache
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      workspaces.value = await workspaceRepo.getAll();
    } catch (err: any) {
      error.value = 'Çalışma alanları yüklenemedi.';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function createWorkspace(data: CreateWorkspaceRequest): Promise<Workspace> {
    loading.value = true;
    error.value = null;
    try {
      const newWorkspace = await workspaceRepo.create(data);
      workspaces.value.push(newWorkspace);
      return newWorkspace;
    } catch (err: any) {
      error.value = `Çalışma alanı '${data.name}' oluşturulamadı: ${err.response?.data?.message || err.message}`;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateWorkspace(id: string, data: UpdateWorkspaceRequest): Promise<Workspace> {
    loading.value = true;
    error.value = null;
    try {
      const updatedWorkspace = await workspaceRepo.update(id, data);
      const index = workspaces.value.findIndex((ws) => ws.id === id);
      if (index !== -1) {
        workspaces.value[index] = updatedWorkspace;
      }
      return updatedWorkspace;
    } catch (err: any) {
      error.value = 'Çalışma alanı güncellenemedi.';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteWorkspace(id: string) {
    loading.value = true;
    error.value = null;
    try {
      await workspaceRepo.delete(id);
      workspaces.value = workspaces.value.filter((ws) => ws.id !== id);
    } catch (err: any) {
      error.value = 'Çalışma alanı silinemedi.';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // --- Patient CRUD ---
  async function createPatient(workspaceId: string, data: CreatePatientRequest): Promise<Patient> {
    loading.value = true;
    error.value = null;
    try {
      const newPatient = await patientRepo.create(workspaceId, data);
      const ws = workspaces.value.find((w) => w.id === workspaceId);
      if (ws) {
        ws.patients.push(newPatient);
      }
      return newPatient;
    } catch (err: any) {
      error.value = 'Hasta oluşturulamadı.';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updatePatient(
    workspaceId: string,
    patientId: string,
    data: UpdatePatientRequest
  ): Promise<Patient> {
    loading.value = true;
    error.value = null;
    try {
      const updatedPatient = await patientRepo.update(workspaceId, patientId, data);
      const ws = workspaces.value.find((w) => w.id === workspaceId);
      if (ws) {
        const pIndex = ws.patients.findIndex((p) => p.id === patientId);
        if (pIndex !== -1) ws.patients[pIndex] = updatedPatient;
      }
      return updatedPatient;
    } catch (err: any) {
      error.value = 'Hasta güncellenemedi.';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deletePatient(workspaceId: string, patientId: string) {
    loading.value = true;
    error.value = null;
    try {
      await patientRepo.delete(workspaceId, patientId);
      const ws = workspaces.value.find((w) => w.id === workspaceId);
      if (ws) {
        ws.patients = ws.patients.filter((p) => p.id !== patientId);
      }
    } catch (err: any) {
      error.value = 'Hasta silinemedi.';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function movePatient(workspaceId: string, patientId: string, data: MovePatientRequest) {
    loading.value = true;
    error.value = null;
    try {
      await patientRepo.move(workspaceId, patientId, data);

      const sourceWS = workspaces.value.find((w) => w.id === workspaceId);
      const targetWS = workspaces.value.find((w) => w.id === data.targetWorkspaceID);
      const pIndex = sourceWS?.patients.findIndex((p) => p.id === patientId);

      if (sourceWS && targetWS && pIndex !== -1) {
        const [movedPatient] = sourceWS.patients.splice(pIndex, 1);
        targetWS.patients.push(movedPatient);
      }
    } catch (err: any) {
      error.value = 'Hasta taşınamadı.';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // --- Image CRUD ---
  async function createImage(
    workspaceId: string,
    patientId: string,
    data: CreateImageRequest
  ): Promise<Image> {
    loading.value = true;
    error.value = null;
    try {
      const newImage = await imageRepo.create(workspaceId, patientId, data);
      const ws = workspaces.value.find((w) => w.id === workspaceId);
      const p = ws?.patients.find((p) => p.id === patientId);
      if (p) {
        p.images.push(newImage);
      }
      return newImage;
    } catch (err: any) {
      error.value = 'Görüntü yüklenemedi.';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteImage(workspaceId: string, patientId: string, imageId: string) {
    loading.value = true;
    error.value = null;
    try {
      await imageRepo.delete(workspaceId, patientId, imageId);
      const ws = workspaces.value.find((w) => w.id === workspaceId);
      const p = ws?.patients.find((p) => p.id === patientId);
      if (p) {
        p.images = p.images.filter((img) => img.id !== imageId);
      }
    } catch (err: any) {
      error.value = 'Görüntü silinemedi.';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function moveImage(
    workspaceId: string,
    patientId: string,
    imageId: string,
    data: MoveImageRequest
  ) {
    loading.value = true;
    error.value = null;
    try {
      await imageRepo.move(workspaceId, patientId, imageId, data);

      // State'i manuel güncelle
      const sourceWS = workspaces.value.find((w) => w.id === workspaceId);
      const sourcePatient = sourceWS?.patients.find((p) => p.id === patientId);
      const targetWS = workspaces.value.find((w) => w.id === data.targetWorkspaceID);
      const targetPatient = targetWS?.patients.find((p) => p.id === data.targetPatientID);
      const imgIndex = sourcePatient?.images.findIndex((img) => img.id === imageId);

      if (sourcePatient && targetPatient && imgIndex !== -1) {
        const [movedImage] = sourcePatient.images.splice(imgIndex, 1);
        targetPatient.images.push(movedImage);
      }
    } catch (err: any) {
      error.value = 'Görüntü taşınamadı.';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function getThumbnailUrl(imageId: string): string {
    // Bu, imageRepo.getThumbnailUrl(imageId) çağrısından gelmeli,
    // ancak şimdilik URL'yi manuel oluşturuyoruz (ApiClient baseURL'ine göre).
    // NOT: `ApiClient`'inizde `getBaseURL()` metodu yoksa,
    // bunu `repositories.image.getThumbnailUrl(imageId)` olarak implemente edin.
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    return `${baseUrl}/api/v1/images/${imageId}/thumbnail`;
  }

  return {
    workspaces,
    loading,
    error,
    allWorkspaces,
    uniqueOrganTypes,
    uniqueOrganizations,
    allWorkspaceNames,
    fetchAllWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    createPatient,
    updatePatient,
    deletePatient,
    movePatient,
    createImage,
    deleteImage,
    moveImage,
    getThumbnailUrl,
  };
});
