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
        Yeni Veri Seti Oluştur
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
      @delete="openDeleteModal"
    />

    <CreateWorkspaceModal
      v-if="isModalOpen"
      :workspace-to-edit="selectedWorkspace as any"
      @close="handleModalClose"
    />

    <DeleteConfirmationModal
      v-if="isDeleteModalOpen"
      :workspace-name="workspaceToDelete?.name || ''"
      :loading="store.loading"
      @close="closeDeleteModal"
      @confirm="handleDeleteConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, shallowRef } from 'vue';
import { useWorkspaceStore } from '@/stores/workspace';
import type { Workspace } from '@/core/entities/Workspace';

// Bileşen Importları
import WorkspaceList from '@/presentation/components/workspace/WorkspaceList.vue';
import CreateWorkspaceModal from '@/presentation/components/workspace/WorkspaceFormModal.vue';
import DeleteConfirmationModal from '@/presentation/components/workspace/DeleteConfirmationModal.vue';

const store = useWorkspaceStore();

// --- State Tanımları ---
const isModalOpen = ref(false);
const selectedWorkspace = shallowRef<Workspace | null>(null);

// Silme işlemi için State
const isDeleteModalOpen = ref(false);
const workspaceToDelete = shallowRef<Workspace | null>(null);

// Pagination State
const limit = 10;
const currentPage = computed(() => {
  return Math.floor(store.paginationMeta.offset / limit) + 1;
});

// Sayfa Yüklendiğinde
onMounted(() => {
  loadData(1);
});

// Veri Çekme Fonksiyonu
async function loadData(page: number) {
  const offset = (page - 1) * limit;
  await store.fetchWorkspaces({
    limit: limit,
    offset: offset,
    sortBy: 'created_at',
    sortOrder: 'desc',
  });
}

// Sayfa Değişimi
function handlePageChange(newPage: number) {
  if (newPage < 1) return;
  loadData(newPage);
}

// --- Modal İşlemleri (Ekle/Düzenle) ---

function openCreateModal() {
  selectedWorkspace.value = null;
  isModalOpen.value = true;
}

function openEditModal(workspace: Workspace) {
  selectedWorkspace.value = workspace;
  isModalOpen.value = true;
}

function handleModalClose() {
  isModalOpen.value = false;
  selectedWorkspace.value = null;
  // Listeyi tazeleyelim
  loadData(currentPage.value);
}

// --- Silme İşlemleri ---

function openDeleteModal(workspace: Workspace) {
  workspaceToDelete.value = workspace;
  isDeleteModalOpen.value = true;
}

function closeDeleteModal() {
  isDeleteModalOpen.value = false;
  workspaceToDelete.value = null;
}

async function handleDeleteConfirm() {
  if (!workspaceToDelete.value) return;

  // Store üzerinden silme işlemini tetikle
  const success = await store.deleteWorkspace(workspaceToDelete.value.id);

  if (success) {
    closeDeleteModal();
    // Eğer sayfadaki son kaydı sildiysek ve 1. sayfada değilsek bir geri git
    if (store.workspaces.length === 0 && currentPage.value > 1) {
      loadData(currentPage.value - 1);
    } else {
      // Değilse mevcut sayfayı yenile (deleteWorkspace içinde zaten yapılıyor ama garanti olsun)
      loadData(currentPage.value);
    }
  }
}
</script>
