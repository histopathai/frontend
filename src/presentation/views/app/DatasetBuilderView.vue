<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Veri Seti Oluşturucu</h1>
        <p class="mt-1 text-gray-600">
          Mevcut veri setlerini yönetin, düzenleyin veya yeni kayıt ekleyin.
        </p>
      </div>
      <button @click="openCreateModal" class="btn btn-primary">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="w-5 h-5 mr-2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Yeni Veri Seti
      </button>
    </div>

    <div v-if="store.loading && store.workspaces.length === 0" class="text-center py-10">
      <div
        class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"
      ></div>
      <p class="mt-2 text-gray-500">Veri setleri yükleniyor...</p>
    </div>

    <WorkspaceList
      v-else
      :workspaces="store.workspaces"
      :current-page="currentPage"
      :has-more="store.paginationMeta.hasMore"
      @page-change="handlePageChange"
      @edit="openEditModal"
    />
    <CreateWorkspaceModal
      v-if="isModalOpen"
      :workspace-to-edit="selectedWorkspace"
      @close="handleModalClose"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, shallowRef } from 'vue';
import { useWorkspaceStore } from '@/stores/workspace';
import type { Workspace } from '@/core/entities/Workspace';
import WorkspaceList from '@/presentation/components/app/DatasetList.vue';
import CreateWorkspaceModal from '@/presentation/components/app/CreateDatasetModal.vue';

const store = useWorkspaceStore();
const isModalOpen = ref(false);
const selectedWorkspace = shallowRef<Workspace | null>(null);

// Pagination State
const limit = 10;
const currentPage = computed(() => {
  return Math.floor(store.paginationMeta.offset / limit) + 1;
});

onMounted(() => {
  loadData(1);
});

async function loadData(page: number) {
  const offset = (page - 1) * limit;
  await store.fetchWorkspaces({
    limit: limit,
    offset: offset,
    sortBy: 'created_at',
    sortOrder: 'desc',
  });
}
function handleModalClose() {
  isModalOpen.value = false;
  selectedWorkspace.value = null;
  loadData(currentPage.value);
}

function handlePageChange(newPage: number) {
  if (newPage < 1) return;
  loadData(newPage);
}

function openEditModal(workspace: Workspace) {
  selectedWorkspace.value = workspace;
  isModalOpen.value = true;
}

function openCreateModal() {
  selectedWorkspace.value = null;
  isModalOpen.value = true;
}
</script>
