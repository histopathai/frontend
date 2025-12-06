<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">{{ t('workspace.list.title') }}</h1>
        <p class="mt-1 text-gray-600">
          {{ t('workspace.list.search_placeholder') }}
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
        {{ t('workspace.actions.create') }}
      </button>
    </div>

    <div v-if="store.isLoading && !store.hasWorkspaces" class="text-center py-10">
      <div
        class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"
      ></div>
      <p class="mt-2 text-gray-500">{{ t('workspace.list.loading') }}</p>
    </div>

    <WorkspaceList
      v-else
      :workspaces="store.workspaces"
      :current-page="currentPage"
      :has-more="store.hasMore"
      @page-change="handlePageChange"
      @edit="openEditModal"
      @delete="openDeleteModal"
      @delete-selected="openBatchDeleteModal"
    />

    <WorkspaceFormModal
      v-if="isModalOpen"
      :workspace-to-edit="selectedWorkspace as any"
      @close="handleModalClose"
    />

    <DeleteConfirmationModal
      v-if="isDeleteModalOpen"
      :title="deleteModalTitle"
      :item-name="deleteItemName"
      :message="deleteModalMessage"
      :warning-text="deleteWarningText"
      :loading="store.isActionLoading"
      :require-confirmation="isSingleDelete"
      @close="closeDeleteModal"
      @confirm="handleDeleteConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, shallowRef } from 'vue';
import { useWorkspaceStore } from '@/stores/workspace';
import { repositories } from '@/services';
import type { Workspace } from '@/core/entities/Workspace';
import { useI18n } from 'vue-i18n';

// Components
import WorkspaceList from '@/presentation/components/workspace/WorkspaceList.vue';
import WorkspaceFormModal from '@/presentation/components/workspace/WorkspaceFormModal.vue';
import DeleteConfirmationModal from '@/presentation/components/common/DeleteConfirmationModal.vue';

const store = useWorkspaceStore();
const { t } = useI18n();

// --- State ---
const isModalOpen = ref(false);
const selectedWorkspace = shallowRef<Workspace | null>(null);

// Delete State
const isDeleteModalOpen = ref(false);
const workspaceToDelete = shallowRef<Workspace | null>(null);
const idsToDelete = ref<string[]>([]);
const isSingleDelete = ref(true);
const deleteWarningText = ref('');

// Pagination State
const limit = 10;
const currentPage = computed(() => {
  return Math.floor(store.pagination.offset / limit) + 1;
});

const deleteModalTitle = computed(
  () => (isSingleDelete.value ? t('workspace.actions.delete') : 'Toplu Silme İşlemi') // i18n anahtarı eklenebilir
);

const deleteItemName = computed(() =>
  workspaceToDelete.value ? workspaceToDelete.value.name : ''
);

const deleteModalMessage = computed(() => {
  if (isSingleDelete.value) {
    return t('workspace.messages.delete_confirm');
  }
  return `${idsToDelete.value.length} adet veri seti silinecek.`;
});

// --- Lifecycle ---
onMounted(() => {
  loadData(1);
});

// --- Methods ---

async function loadData(page: number) {
  const offset = (page - 1) * limit;
  await store.fetchWorkspaces({
    limit: limit,
    offset: offset,
    sortBy: 'created_at',
    sortDir: 'desc',
  });
}

function handlePageChange(newPage: number) {
  if (newPage < 1) return;
  loadData(newPage);
}

// --- Create / Edit ---

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
}

// --- Delete Operations ---

async function openDeleteModal(workspace: Workspace) {
  workspaceToDelete.value = workspace;
  idsToDelete.value = [];
  isSingleDelete.value = true;
  deleteWarningText.value = t('workspace.messages.cascade_delete_warning');

  try {
    const result = await repositories.patient.getByWorkspaceId(workspace.id, {
      limit: 1,
      offset: 0,
    });
    if (result.data.length > 0) {
    }
  } catch (error) {
    console.error('Patient check failed', error);
  }

  isDeleteModalOpen.value = true;
}

function openBatchDeleteModal(ids: string[]) {
  if (ids.length === 0) return;
  workspaceToDelete.value = null;
  idsToDelete.value = ids;
  isSingleDelete.value = false;
  deleteWarningText.value = t('workspace.messages.cascade_delete_warning');
  isDeleteModalOpen.value = true;
}

function closeDeleteModal() {
  isDeleteModalOpen.value = false;
  workspaceToDelete.value = null;
  idsToDelete.value = [];
  deleteWarningText.value = '';
}

async function handleDeleteConfirm() {
  let success = false;

  if (isSingleDelete.value && workspaceToDelete.value) {
    success = await store.cascadeDeleteWorkspace(workspaceToDelete.value.id);
  } else if (!isSingleDelete.value && idsToDelete.value.length > 0) {
    success = await store.batchDeleteWorkspaces(idsToDelete.value);
  }

  if (success) {
    closeDeleteModal();
    if (store.workspaces.length === 0 && currentPage.value > 1) {
      loadData(currentPage.value - 1);
    } else {
    }
  }
}
</script>
