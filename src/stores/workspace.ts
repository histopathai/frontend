import { defineStore } from 'pinia';
import { ref, shallowRef } from 'vue';
import { repositories } from '@/services';
import type { Workspace } from '@/core/entities/Workspace';
import type { Patient } from '@/core/entities/Patient';
import type {
  CreateNewWorkspaceRequest,
  UpdateWorkspaceRequest,
} from '@/core/repositories/IWorkspaceRepository';
import type { CreateNewPatientRequest } from '@/core/repositories/IPatientRepository';
import type { Pagination } from '@/core/types/common';
import { useToast } from 'vue-toastification';

export const useWorkspaceStore = defineStore('workspace', () => {
  // --- STATE ---
  const workspaces = shallowRef<Workspace[]>([]);
  const patientsByWorkspace = ref<Map<string, Patient[]>>(new Map());
  const loading = ref(false);
  const patientsLoading = ref(false);
  const paginationMeta = ref<Pagination>({ limit: 10, offset: 0, hasMore: false });
  const toast = useToast();

  // --- ACTIONS ---
  async function fetchWorkspaces(pagination: Pagination = { limit: 10, offset: 0 }) {
    loading.value = true;
    try {
      const result = await repositories.workspace.list(pagination);
      workspaces.value = result.data;
      const serverHasMore = result.pagination?.hasMore;
      const calculatedHasMore = result.data.length === pagination.limit;

      paginationMeta.value = {
        ...pagination,
        ...result.pagination,
        hasMore: serverHasMore !== undefined ? serverHasMore : calculatedHasMore,
      };
    } catch (err: any) {
      toast.error(err.message || 'Çalışma alanları alınamadı.');
    } finally {
      loading.value = false;
    }
  }
  async function fetchPatientsForWorkspace(workspaceId: string) {
    patientsLoading.value = true;
    try {
      const result = await repositories.patient.getByWorkspaceId(workspaceId, {
        limit: 10,
        offset: 0,
        sortBy: 'created_at',
        sortOrder: 'desc',
      });

      patientsByWorkspace.value.set(workspaceId, result.data);
    } catch (err: any) {
      console.error(err);
      toast.error('Hasta listesi alınamadı.');
    } finally {
      patientsLoading.value = false;
    }
  }

  async function createWorkspace(data: CreateNewWorkspaceRequest): Promise<Workspace | null> {
    loading.value = true;
    try {
      const newWorkspace = await repositories.workspace.create(data);
      workspaces.value = [newWorkspace, ...workspaces.value];

      toast.success('Veri seti başarıyla oluşturuldu.');
      return newWorkspace;
    } catch (err: any) {
      toast.error(err.message || 'Veri seti oluşturulamadı.');
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function updateWorkspace(id: string, data: UpdateWorkspaceRequest): Promise<boolean> {
    loading.value = true;
    try {
      await repositories.workspace.update(id, data);
      await fetchWorkspaces({
        limit: paginationMeta.value.limit,
        offset: paginationMeta.value.offset,
        sortBy: paginationMeta.value.sortBy,
        sortOrder: paginationMeta.value.sortOrder,
      });

      toast.success('Veri seti başarıyla güncellendi.');
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Veri seti güncellenemedi.');
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function deleteWorkspace(id: string): Promise<boolean> {
    loading.value = true;
    try {
      await repositories.workspace.delete(id);

      toast.success('Veri seti silindi.');
      await fetchWorkspaces({
        limit: paginationMeta.value.limit,
        offset: paginationMeta.value.offset,
        sortBy: paginationMeta.value.sortBy,
        sortOrder: paginationMeta.value.sortOrder,
      });

      return true;
    } catch (err: any) {
      toast.error(err.message || 'Silme işlemi başarısız.');
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function createPatient(data: CreateNewPatientRequest): Promise<boolean> {
    loading.value = true;
    try {
      await repositories.patient.create(data);
      toast.success('Hasta başarıyla oluşturuldu.');

      if (patientsByWorkspace.value.has(data.workspace_id)) {
        await fetchPatientsForWorkspace(data.workspace_id);
      }

      return true;
    } catch (err: any) {
      toast.error(err.message || 'Hasta oluşturulamadı.');
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function updatePatient(
    id: string,
    data: Partial<CreateNewPatientRequest>
  ): Promise<boolean> {
    loading.value = true;
    try {
      await repositories.patient.update(id, data);
      toast.success('Hasta bilgileri güncellendi.');
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Güncelleme başarısız.');
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function deletePatient(id: string, workspaceId: string): Promise<boolean> {
    loading.value = true;
    try {
      await repositories.patient.delete(id);
      toast.success('Hasta silindi.');
      await fetchPatientsForWorkspace(workspaceId);
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Silme işlemi başarısız.');
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function transferPatient(
    id: string,
    currentWorkspaceId: string,
    targetWorkspaceId: string
  ): Promise<boolean> {
    loading.value = true;
    try {
      await repositories.patient.transfer(id, targetWorkspaceId);
      toast.success('Hasta başarıyla transfer edildi.');
      await fetchPatientsForWorkspace(currentWorkspaceId);
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Transfer işlemi başarısız.');
      return false;
    } finally {
      loading.value = false;
    }
  }

  return {
    // State
    workspaces,
    patientsByWorkspace,
    loading,
    patientsLoading,
    paginationMeta,
    // Actions
    fetchWorkspaces,
    fetchPatientsForWorkspace,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    createPatient,
    updatePatient,
    deletePatient,
    transferPatient,
  };
});
