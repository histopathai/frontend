import { defineStore } from 'pinia';
import { ref, computed, shallowRef } from 'vue';
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
  const workspaces = shallowRef<Workspace[]>([]);
  const patientsByWorkspace = shallowRef<Map<string, Patient[]>>(new Map());
  const imagesByPatient = shallowRef<Map<string, Image[]>>(new Map());
  const loading = ref(false);
  const toast = useToast();

  // --- GETTERS ---
  const getPatientsForWorkspace = (workspaceId: string) => {
    return computed(() => patientsByWorkspace.value.get(workspaceId) || []);
  };
  const getImagesForPatient = (patientId: string) => {
    return computed(() => imagesByPatient.value.get(patientId) || []);
  };

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
      const newMap = new Map(patientsByWorkspace.value);
      newMap.set(workspaceId, result.data);
      patientsByWorkspace.value = newMap;
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
      const newMap = new Map(imagesByPatient.value);
      newMap.set(patientId, result.data);
      imagesByPatient.value = newMap;
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
        const newMap = new Map(patientsByWorkspace.value);
        const patients = newMap.get(updatedPatient.workspaceId);
        if (patients) {
          const index = patients.findIndex((p) => p.id === id);
          if (index !== -1) {
            const newPatients = [...patients];
            newPatients[index] = updatedPatient;
            newMap.set(updatedPatient.workspaceId, newPatients);
            patientsByWorkspace.value = newMap;
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
    // Getters
    getPatientsForWorkspace,
    getImagesForPatient,
    // Actions
    fetchWorkspaces,
    fetchPatients,
    fetchImages,
    updatePatient,
  };
});
