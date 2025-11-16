import { defineStore } from 'pinia';
import { ref } from 'vue';
import { repositories } from '@/services';
import type { Workspace } from '@/core/entities/Workspace';
import type { Patient } from '@/core/entities/Patient';
import type { Image } from '@/core/entities/Image';
import type { UpdatePatientRequest } from '@/core/repositories/IPatientRepository';
import type { Pagination } from '@/core/types/common';
import { useToast } from 'vue-toastification';

const workspaceRepo = repositories.workspace;
const patientRepo = repositories.patient;
const imageRepo = repositories.image;

export const useWorkspaceStore = defineStore('workspace', () => {
  // --- STATE ---
  const workspaces = ref<Workspace[]>([]);
  const patientsByWorkspace = ref<Map<string, Patient[]>>(new Map());
  const imagesByPatient = ref<Map<string, Image[]>>(new Map());
  const loading = ref(false);
  const toast = useToast();

  // --- ACTIONS ---

  async function fetchWorkspaces(pagination: Pagination = { limit: 100, offset: 0 }) {
    loading.value = true;
    try {
      const result = await workspaceRepo.list(pagination);
      workspaces.value = result.data;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Çalışma alanları alınamadı.');
    } finally {
      loading.value = false;
    }
  }

  async function fetchPatients(
    workspaceId: string,
    pagination: Pagination = { limit: 100, offset: 0 }
  ) {
    loading.value = true;
    try {
      const result = await patientRepo.getByWorkspaceId(workspaceId, pagination);
      patientsByWorkspace.value.set(workspaceId, result.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Hastalar alınamadı.');
    } finally {
      loading.value = false;
    }
  }

  async function fetchImages(
    patientId: string,
    pagination: Pagination = { limit: 100, offset: 0 }
  ) {
    loading.value = true;
    try {
      const result = await imageRepo.getByPatientId(patientId, pagination);
      imagesByPatient.value.set(patientId, result.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Görüntüler alınamadı.');
    } finally {
      loading.value = false;
    }
  }

  async function updatePatient(id: string, data: UpdatePatientRequest): Promise<Patient | null> {
    loading.value = true;
    try {
      await patientRepo.update(id, data);
      const updatedPatient = await patientRepo.getById(id);

      if (updatedPatient) {
        const patients = patientsByWorkspace.value.get(updatedPatient.workspaceId);
        if (patients) {
          const index = patients.findIndex((p) => p.id === id);
          if (index !== -1) {
            patients[index] = updatedPatient;
            patientsByWorkspace.value.set(updatedPatient.workspaceId, [...patients]);
          }
        }
      }
      toast.success('Hasta bilgileri güncellendi.');
      return updatedPatient;
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Hasta güncellenemedi.');
      return null;
    } finally {
      loading.value = false;
    }
  }

  return {
    // State
    workspaces,
    patientsByWorkspace,
    imagesByPatient,
    loading,
    // Actions
    fetchWorkspaces,
    fetchPatients,
    fetchImages,
    updatePatient,
  };
});
