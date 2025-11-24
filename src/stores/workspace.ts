import { defineStore } from 'pinia';
import { ref, shallowRef } from 'vue';
import { repositories } from '@/services';
import type { Workspace } from '@/core/entities/Workspace';
import type { Patient } from '@/core/entities/Patient';
import type { Image } from '@/core/entities/Image';
import type {
  CreateNewWorkspaceRequest,
  UpdateWorkspaceRequest,
} from '@/core/repositories/IWorkspaceRepository';
import type { CreateNewPatientRequest } from '@/core/repositories/IPatientRepository';
import type { CreateNewImageRequest } from '@/core/repositories/IImageRepository';
import type { Pagination } from '@/core/types/common';
import { useToast } from 'vue-toastification';

export const useWorkspaceStore = defineStore('workspace', () => {
  const workspaces = shallowRef<Workspace[]>([]);
  const patientsByWorkspace = ref<Map<string, Patient[]>>(new Map());
  const imagesByPatient = ref<Map<string, Image[]>>(new Map());
  const loading = ref(false);
  const patientsLoading = ref(false);
  const imagesLoading = ref(false);
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

  async function fetchImagesForPatient(patientId: string) {
    imagesLoading.value = true;
    try {
      const result = await repositories.image.getByPatientId(patientId, {
        limit: 100, // Şimdilik yüksek limit, gerekirse pagination eklenir
        offset: 0,
        sortBy: 'created_at',
        sortOrder: 'desc',
      });
      imagesByPatient.value.set(patientId, result.data);
    } catch (err: any) {
      console.error(err);
      toast.error('Görüntüler alınamadı.');
    } finally {
      imagesLoading.value = false;
    }
  }

  async function uploadImage(
    file: File,
    patientId: string,
    onProgress?: (percent: number) => void
  ): Promise<boolean> {
    try {
      const format = file.type.split('/')[1]?.toUpperCase() || 'UNKNOWN';

      const createPayload: CreateNewImageRequest = {
        patient_id: patientId,
        content_type: file.type,
        name: file.name,
        format: format,
        size: file.size,
      };

      const uploadConfig = await repositories.image.create(createPayload);
      await repositories.image.upload({
        payload: uploadConfig,
        file: file,
        onUploadProgress: onProgress,
      });

      toast.success('Görüntü yüklendi. İşleniyor...');

      setTimeout(() => {
        fetchImagesForPatient(patientId);
      }, 2000);

      return true;
    } catch (err: any) {
      console.error(err);
      toast.error('Görüntü yüklenirken hata oluştu.');
      return false;
    }
  }

  async function deleteImage(imageId: string, patientId: string) {
    try {
      await repositories.image.delete(imageId);
      toast.success('Görüntü silindi.');
      await fetchImagesForPatient(patientId);
    } catch (err: any) {
      toast.error('Silme işlemi başarısız.');
    }
  }

  return {
    // State
    workspaces,
    patientsByWorkspace,
    imagesByPatient,
    loading,
    patientsLoading,
    imagesLoading,
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
    fetchImagesForPatient,
    uploadImage,
    deleteImage,
  };
});
