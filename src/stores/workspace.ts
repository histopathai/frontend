import { defineStore } from 'pinia';
import { ref, shallowRef } from 'vue';
import { repositories } from '@/services';
import type { Workspace } from '@/core/entities/Workspace';
import type { CreateNewWorkspaceRequest } from '@/core/repositories/IWorkspaceRepository';
import type { Pagination } from '@/core/types/common';
import { useToast } from 'vue-toastification';

export const useWorkspaceStore = defineStore('workspace', () => {
  // --- STATE ---
  const workspaces = shallowRef<Workspace[]>([]);
  const loading = ref(false);
  const toast = useToast();

  // --- ACTIONS ---

  /**
   * Tüm workspace'leri (datasetleri) çeker.
   */
  async function fetchWorkspaces(pagination: Pagination = { limit: 100, offset: 0 }) {
    loading.value = true;
    try {
      const result = await repositories.workspace.list(pagination);
      workspaces.value = result.data;
    } catch (err: any) {
      toast.error(err.message || 'Çalışma alanları alınamadı.');
    } finally {
      loading.value = false;
    }
  }

  /**
   * Yeni bir workspace (dataset) oluşturur.
   */
  async function createWorkspace(data: CreateNewWorkspaceRequest): Promise<Workspace | null> {
    loading.value = true;
    try {
      const newWorkspace = await repositories.workspace.create(data);
      workspaces.value = [...workspaces.value, newWorkspace];

      toast.success('Veri seti başarıyla oluşturuldu.');
      return newWorkspace;
    } catch (err: any) {
      toast.error(err.message || 'Veri seti oluşturulamadı.');
      return null;
    } finally {
      loading.value = false;
    }
  }

  return {
    // State
    workspaces,
    loading,
    // Actions
    fetchWorkspaces,
    createWorkspace,
  };
});
