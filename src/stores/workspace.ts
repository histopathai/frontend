import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { repositories } from '@/services';
import type { Workspace } from '@/core/entities/Workspace';
import { Patient } from '@/core/entities/Patient';
import type { Image } from '@/core/entities/Image';
import type {
  CreateNewWorkspaceRequest,
  UpdateWorkspaceRequest,
} from '@/core/repositories/IWorkspaceRepository';
import type {
  CreateNewPatientRequest,
  IPatientRepository,
} from '@/core/repositories/IPatientRepository';
import type {
  CreateNewImageRequest,
  ImageUploadPayload,
  UploadImageParams,
} from '@/core/repositories/IImageRepository';
import type { Pagination } from '@/core/types/common';

const workspaceRepo = repositories.workspace;
const patientRepo = repositories.patient;
const imageRepo = repositories.image;

// Workspace verisini, iç içe geçmiş hasta ve görüntüleriyle birlikte tutmak için bir arayüz
export interface WorkspaceStateEntry {
  details: Workspace;
  patients: PatientStateEntry[];
}

export interface PatientStateEntry {
  details: Patient;
  images: Image[];
}

// Store'un state'ini, workspace ID'sine göre map'lenmiş bir yapıda tutmak daha performanslı olabilir.
// Ancak eski yapınıza benzer şekilde bir dizi olarak da tutabiliriz.
// Şimdilik entity'leri ayrı listelerde tutalım.
export const useWorkspaceStore = defineStore('workspace', () => {
  // === STATE ===
  const workspaces = ref<Workspace[]>([]);

  // Hangi workspace'in hastalarının yüklendiğini takip etmek için bir map
  // Key: workspaceId, Value: Patient[]
  const patientsByWorkspace = ref<Map<string, Patient[]>>(new Map());

  // Hangi hastanın görüntülerinin yüklendiğini takip etmek için bir map
  // Key: patientId, Value: Image[]
  const imagesByPatient = ref<Map<string, Image[]>>(new Map());

  const loading = ref(false);
  const error = ref<string | null>(null);

  // === GETTERS ===
  const allWorkspaces = computed(() => workspaces.value);
  const isLoading = computed(() => loading.value);
  const getPatientsForWorkspace = (workspaceId: string) => {
    return computed(() => patientsByWorkspace.value.get(workspaceId) || []);
  };
  const getImagesForPatient = (patientId: string) => {
    return computed(() => imagesByPatient.value.get(patientId) || []);
  };

  // === ACTIONS ===

  // --- Workspace Actions ---
  async function fetchWorkspaces(pagination: Pagination = { limit: 100, offset: 0 }) {
    loading.value = true;
    error.value = null;
    try {
      const result = await workspaceRepo.list(pagination);
      workspaces.value = result.data;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Çalışma alanları alınamadı.';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function createWorkspace(data: CreateNewWorkspaceRequest): Promise<Workspace> {
    loading.value = true;
    error.value = null;
    try {
      const newWorkspace = await workspaceRepo.create(data);
      workspaces.value.push(newWorkspace);
      return newWorkspace;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Çalışma alanı oluşturulamadı.';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateWorkspace(id: string, data: UpdateWorkspaceRequest): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await workspaceRepo.update(id, data);
      // State'i güncelle
      const index = workspaces.value.findIndex((ws) => ws.id === id);
      if (index !== -1) {
        // Yeniden fetch etmek daha kolay olabilir veya objeyi güncelleyebiliriz
        const updatedWs = await workspaceRepo.getById(id);
        if (updatedWs) workspaces.value[index] = updatedWs;
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Çalışma alanı güncellenemedi.';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteWorkspace(id: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await workspaceRepo.delete(id);
      workspaces.value = workspaces.value.filter((ws) => ws.id !== id);
      // İlgili hastaları da temizle
      patientsByWorkspace.value.delete(id);
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Çalışma alanı silinemedi.';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // --- Patient Actions ---
  async function fetchPatients(
    workspaceId: string,
    pagination: Pagination = { limit: 100, offset: 0 }
  ) {
    loading.value = true;
    error.value = null;
    try {
      const result = await patientRepo.getByWorkspaceId(workspaceId, pagination);
      patientsByWorkspace.value.set(workspaceId, result.data);
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Hastalar alınamadı.';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function createPatient(data: CreateNewPatientRequest): Promise<Patient> {
    loading.value = true;
    error.value = null;
    try {
      const newPatient = await patientRepo.create(data);
      // İlgili workspace'in hasta listesini güncelle
      const currentPatients = patientsByWorkspace.value.get(data.workspaceId) || [];
      patientsByWorkspace.value.set(data.workspaceId, [...currentPatients, newPatient]);
      return newPatient;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Hasta oluşturulamadı.';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deletePatient(patient: Patient): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await patientRepo.delete(patient.id);
      // State'den sil
      const currentPatients = patientsByWorkspace.value.get(patient.workspaceId) || [];
      patientsByWorkspace.value.set(
        patient.workspaceId,
        currentPatients.filter((p) => p.id !== patient.id)
      );
      // İlgili görüntüleri de temizle
      imagesByPatient.value.delete(patient.id);
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Hasta silinemedi.';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function transferPatient(
    patientId: string,
    oldWorkspaceId: string,
    newWorkspaceId: string
  ) {
    loading.value = true;
    error.value = null;
    try {
      await patientRepo.transfer(patientId, newWorkspaceId);
      const oldPatients = patientsByWorkspace.value.get(oldWorkspaceId) || [];
      const patientToMove = oldPatients.find((p) => p.id === patientId);
      patientsByWorkspace.value.set(
        oldWorkspaceId,
        oldPatients.filter((p) => p.id !== patientId)
      );
      if (patientToMove && patientsByWorkspace.value.has(newWorkspaceId)) {
        const newPatients = patientsByWorkspace.value.get(newWorkspaceId) || [];
        const patientData = patientToMove.toJSON();

        const patientApiData = {
          id: patientData.id,
          creator_id: patientData.creatorId,
          workspace_id: newWorkspaceId,
          name: patientData.name,
          age: patientData.age,
          gender: patientData.gender,
          race: patientData.race,
          disease: patientData.disease,
          subtype: patientData.subtype,
          grade: patientData.grade,
          history: patientData.history,
          created_at: patientData.createdAt,
          updated_at: patientData.updatedAt,
        };

        const newPatientInstance = Patient.create(patientApiData);
        patientsByWorkspace.value.set(newWorkspaceId, [...newPatients, newPatientInstance]);
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Hasta taşınamadı.';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // --- Image Actions ---

  async function fetchImages(
    patientId: string,
    pagination: Pagination = { limit: 100, offset: 0 }
  ) {
    loading.value = true;
    error.value = null;
    try {
      const result = await imageRepo.getByPatientId(patientId, pagination);
      imagesByPatient.value.set(patientId, result.data);
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Görüntüler alınamadı.';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function refreshPatientImages(
    patientId: string,
    pagination: Pagination = { limit: 100, offset: 0 }
  ): Promise<Image[]> {
    try {
      const result = await imageRepo.getByPatientId(patientId, pagination);
      imagesByPatient.value.set(patientId, result.data);
      return result.data; // Polling mantığının durumu kontrol etmesi için
    } catch (err: any) {
      console.error(`Failed to refresh images for patient ${patientId}:`, err);
      throw err;
    }
  }

  async function getUploadPayload(data: CreateNewImageRequest): Promise<ImageUploadPayload> {
    return await imageRepo.create(data);
  }

  async function uploadImage(params: UploadImageParams): Promise<void> {
    // Bu eylem state'i değiştirmez, sadece yükler.
    await imageRepo.upload(params);
    // Yükleme başarılı olduktan sonra, 'confirm' backend'de tetiklenir
    // ve (idealde) bir websocket veya polling ile state güncellenir.
    // Şimdilik, yükleme sonrası listeyi manuel yeniliyoruz.
  }

  async function deleteImage(image: Image): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await imageRepo.delete(image.id);
      // State'den sil
      const currentImages = imagesByPatient.value.get(image.patientId) || [];
      imagesByPatient.value.set(
        image.patientId,
        currentImages.filter((i) => i.id !== image.id)
      );
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Görüntü silinemedi.';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // onUploaded (upload bittiğinde çağrılır)
  function markImageAsUploaded(patientId: string, image: Image) {
    const currentImages = imagesByPatient.value.get(patientId) || [];
    const existingIndex = currentImages.findIndex((i) => i.id === image.id);
    if (existingIndex > -1) {
      currentImages[existingIndex] = image;
      imagesByPatient.value.set(patientId, [...currentImages]);
    } else {
      imagesByPatient.value.set(patientId, [...currentImages, image]);
    }
  }

  return {
    workspaces,
    patientsByWorkspace,
    imagesByPatient,
    loading,
    error,
    allWorkspaces,
    isLoading,
    getPatientsForWorkspace,
    getImagesForPatient,
    fetchWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    fetchPatients,
    createPatient,
    deletePatient,
    transferPatient,
    fetchImages,
    refreshPatientImages,
    getUploadPayload,
    uploadImage,
    deleteImage,
    markImageAsUploaded,
  };
});
