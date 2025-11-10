// src/presentation/views/workspace/WorkspaceView.vue
<template>
  <div class="p-4 sm:p-8">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
      <div class="flex items-center gap-4">
        <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">Çalışma Alanlarım</h1>
        <button @click="isFilterAreaVisible = !isFilterAreaVisible" class="btn btn-ghost btn-sm">
          <span class="hidden sm:inline ml-1">Filtrele</span>
        </button>
      </div>
      <button @click="promptCreateWorkspace" class="btn btn-primary btn-sm w-full sm:w-auto">
        <span class="ml-1">Yeni Çalışma Alanı Oluştur</span>
      </button>
    </div>

    <div v-if="isFilterAreaVisible" class="mb-6 p-4 bg-gray-50 rounded-lg shadow-sm">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label for="filterName" class="form-label text-sm">Ada Göre Ara</label
          ><input
            type="text"
            id="filterName"
            v-model="filters.name"
            class="form-input form-input-sm"
            placeholder="İsim içerir..."
          />
        </div>
        <div>
          <label for="filterOrgan" class="form-label text-sm">Organ Tipi</label
          ><select id="filterOrgan" v-model="filters.organType" class="form-input form-input-sm">
            <option value="">Tüm Organlar</option>
            <option v-for="organ in uniqueOrganTypes" :key="organ" :value="organ">
              {{ organ }}
            </option>
          </select>
        </div>
        <div>
          <label for="filterOrg" class="form-label text-sm">Kurum</label
          ><select id="filterOrg" v-model="filters.organization" class="form-input form-input-sm">
            <option value="">Tüm Kurumlar</option>
            <option v-for="org in uniqueOrganizations" :key="org" :value="org">{{ org }}</option>
          </select>
        </div>
        <div>
          <label for="filterYear" class="form-label text-sm">Yıl</label
          ><input
            type="text"
            id="filterYear"
            v-model="filters.releaseYear"
            class="form-input form-input-sm"
            placeholder="Örn: 2025"
          />
        </div>
      </div>
      <div class="mt-4 flex justify-end">
        <button @click="resetFilters" class="btn btn-outline btn-sm">Filtreleri Temizle</button>
      </div>
    </div>

    <CreateWorkspaceModal
      :is-open="isCreateModalOpen"
      @close="isCreateModalOpen = false"
      @created="handleWorkspaceCreated"
    />
    <DeleteWorkspaceModal
      :is-open="isDeleteModalOpen"
      :workspace-name="workspaceToDelete?.name || ''"
      @close="isDeleteModalOpen = false"
      @confirm="executeDeleteWorkspace"
    />
    <EditWorkspaceModal
      :is-open="isEditModalOpen"
      :initial-data="workspaceToEdit?.toUpdateJSON()"
      @close="isEditModalOpen = false"
      @updated="handleWorkspaceUpdated"
    />
    <WSIViewerModal
      :is-open="isViewerModalOpen"
      :image="imageToView"
      @close="isViewerModalOpen = false"
    />
    <DeleteImageModal
      :is-open="isDeleteImageModalOpen"
      :image-name="imageToDelete?.fileName || ''"
      :workspace-name="workspaceIdOfImageToDelete"
      @close="isDeleteImageModalOpen = false"
      @confirm="executeDeleteImage"
    />
    <CreatePatientModal
      :is-open="isCreatePatientModalOpen"
      :workspace-name="workspaceForNewPatient?.name || ''"
      @close="isCreatePatientModalOpen = false"
      @patientCreated="handlePatientCreated"
    />
    <ImageUploadModal
      :is-open="isUploadModalOpen"
      :workspace-id="selectedWorkspaceId"
      :patient-id="selectedPatientId"
      @close="isUploadModalOpen = false"
      @uploaded="handleImageUploaded"
    />
    <EditPatientModal
      :is-open="isEditPatientModalOpen"
      :initial-data="patientToEdit?.toUpdateJSON()"
      :workspace-name="workspaceIdForPatientEdit"
      @close="isEditPatientModalOpen = false"
      @patientUpdated="handlePatientUpdated"
    />
    <DeletePatientModal
      :is-open="isDeletePatientModalOpen"
      :patient-id="patientToDelete?.id || ''"
      :workspace-name="workspaceIdOfPatientToDelete"
      @close="isDeletePatientModalOpen = false"
      @confirm="executeDeletePatient"
    />
    <MoveImageModal
      :is-open="isMoveImageModalOpen"
      :image-to-move="imageToMove"
      :current-workspace-id="sourceWorkspaceIdForMove"
      :current-patient-id="sourcePatientIdForMove"
      :all-workspaces="allWorkspaces"
      @close="isMoveImageModalOpen = false"
      @confirmMove="executeMoveImage"
    />
    <MovePatientModal
      :is-open="isMovePatientModalOpen"
      :patient-to-move="patientToMove"
      :current-workspace-id="sourceWorkspaceIdForMove"
      :all-workspace-names="allWorkspaceNames"
      @close="isMovePatientModalOpen = false"
      @confirmMove="executeMovePatient"
    />

    <div v-if="loading && allWorkspaces.length === 0" class="text-center py-10">
      <p>Çalışma alanları yükleniyor...</p>
    </div>
    <div v-else-if="error" class="text-red-500 text-center py-10">
      <p>{{ error }}</p>
    </div>
    <div v-else-if="allWorkspaces.length === 0" class="text-center py-10 text-gray-500">
      <p>Henüz bir çalışma alanı oluşturmadınız.</p>
    </div>
    <div v-else-if="filteredWorkspaces.length === 0" class="text-center py-10 text-gray-500">
      <p>Filtre kriterlerinize uygun bir çalışma alanı bulunamadı.</p>
    </div>

    <div v-else class="space-y-6">
      <div v-for="workspace in filteredWorkspaces" :key="workspace.id" class="card">
        <div
          class="card-header flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2"
        >
          <div>
            <h2 class="text-lg sm:text-xl font-semibold">{{ workspace.name }}</h2>
            <div class="flex items-center gap-3 text-xs sm:text-sm text-gray-600 mt-1">
              <span><strong>Organ:</strong> {{ workspace.organType || 'Bilinmiyor' }}</span>
              <span class="text-gray-300">|</span>
              <span><strong>Kurum:</strong> {{ workspace.organization || 'Bilinmiyor' }}</span>
            </div>
          </div>
          <div class="flex gap-1 w-full sm:w-auto justify-end">
            <button
              @click="promptEditWorkspace(workspace)"
              class="btn btn-ghost btn-sm btn-icon-only sm:btn-icon-text"
              title="Düzenle"
            >
              <span class="hidden sm:inline ml-1">Düzenle</span>
            </button>
            <button
              @click="promptCreatePatient(workspace.id, workspace.name)"
              class="btn btn-primary btn-sm btn-icon-only sm:btn-icon-text"
              title="Yeni Hasta Ekle"
            >
              <span class="hidden sm:inline ml-1">Yeni Hasta Ekle</span>
            </button>
            <button
              @click="promptDeleteWorkspace(workspace)"
              class="btn btn-ghost-danger btn-sm btn-icon-only sm:btn-icon-text"
              title="Sil"
            >
              <span class="hidden sm:inline ml-1">Sil</span>
            </button>
          </div>
        </div>
        <div class="card-body">
          <div v-if="workspace.patients.length === 0" class="text-gray-500 text-sm italic">
            Bu çalışma alanında henüz hasta yok.
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="patient in workspace.patients"
              :key="patient.id"
              class="p-2 sm:p-3 border rounded-md bg-gray-50 hover:bg-gray-100 transition duration-150"
            >
              <div
                class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2"
              >
                <div>
                  <h4 class="font-semibold text-gray-800 text-sm sm:text-base">
                    Hasta Kodu: {{ patient.patientId }}
                  </h4>
                  <p class="text-xs sm:text-sm text-gray-600">
                    {{ patient.age ? `${patient.age} Yaş` : '' }}
                    {{ patient.gender ? ` | ${patient.gender}` : '' }}
                    {{ patient.diseaseType ? ` | ${patient.diseaseType}` : '' }}
                  </p>
                </div>
                <div class="flex gap-1 sm:gap-1.5 flex-shrink-0">
                  <button
                    @click="promptEditPatient(patient, workspace.id)"
                    class="btn btn-ghost btn-xs btn-icon-only sm:btn-icon-text"
                    title="Hasta Düzenle"
                  >
                    <span class="hidden sm:inline ml-1">Düzenle</span>
                  </button>
                  <button
                    @click="promptMovePatient(patient, workspace.id)"
                    class="btn btn-ghost btn-xs btn-icon-only sm:btn-icon-text"
                    title="Hasta Taşı"
                  >
                    <span class="hidden sm:inline ml-1">Taşı</span>
                  </button>
                  <button
                    @click="openUploadModal(workspace.id, patient.id)"
                    class="btn btn-outline btn-xs btn-icon-only sm:btn-icon-text"
                    title="Görüntü Yükle"
                  >
                    <span class="hidden sm:inline ml-1">Görüntü Yükle</span>
                  </button>
                  <button
                    @click="promptDeletePatient(patient, workspace.id)"
                    class="btn btn-ghost-danger btn-xs btn-icon-only sm:btn-icon-text"
                    title="Hasta Sil"
                  >
                    <span class="hidden sm:inline ml-1">Sil</span>
                  </button>
                </div>
              </div>
              <div v-if="patient.images.length === 0" class="text-gray-500 text-xs italic ml-1">
                Bu hastaya ait görüntü yok.
              </div>
              <div
                v-else
                class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2"
              >
                <div
                  v-for="image in patient.images"
                  :key="image.id"
                  class="border rounded shadow-sm bg-white overflow-hidden flex flex-col"
                >
                  <div
                    class="aspect-w-1 aspect-h-1 flex items-center justify-center bg-gray-200 overflow-hidden"
                  >
                    <img
                      :src="getThumbnailUrl(image.id)"
                      :alt="image.fileName"
                      class="max-w-full max-h-full object-contain"
                      @error="handleImageError"
                    />
                  </div>
                  <div class="p-2 border-t border-gray-100">
                    <p class="text-xs font-semibold truncate mb-1.5">{{ image.fileName }}</p>
                    <div class="flex justify-end gap-2 text-xs">
                      <button
                        @click="viewImage(image)"
                        class="btn-image-action text-blue-600 hover:text-blue-800"
                      >
                        Görüntüle
                      </button>
                      <button
                        @click="promptMoveImage(image, workspace.id, patient.id)"
                        class="btn-image-action text-purple-600 hover:text-purple-800"
                      >
                        Taşı
                      </button>
                      <button
                        @click="promptDeleteImage(image, workspace.id, patient.id)"
                        class="btn-image-action text-red-600 hover:text-red-800"
                      >
                        Sil
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useWorkspaceStore } from '@/stores/workspace';
import { useWorkspaceModals } from '@/presentation/composables/workspace/useWorkspaceModals';
import { storeToRefs } from 'pinia';
import { useToast } from 'vue-toastification';

// --- 1. MODAL BİLEŞENLERİNİ İMPORT ET ---
import CreateWorkspaceModal from '@/presentation/components/workspace/CreateWorkspaceModal.vue';
import EditWorkspaceModal from '@/presentation/components/workspace/EditWorkspaceModal.vue';
import DeleteWorkspaceModal from '@/presentation/components/workspace/DeleteWorkspaceModal.vue';
import WSIViewerModal from '@/presentation/components/workspace/ViewerModal.vue';
import DeleteImageModal from '@/presentation/components/workspace/DeleteImageModal.vue';
import CreatePatientModal from '@/presentation/components/workspace/CreatePatientModal.vue';
import ImageUploadModal from '@/presentation/components/workspace/ImageUploadModal.vue';
import EditPatientModal from '@/presentation/components/workspace/EditPatientModal.vue';
import DeletePatientModal from '@/presentation/components/workspace/DeletePatientModal.vue';
import MoveImageModal from '@/presentation/components/workspace/MoveImageModal.vue';
import MovePatientModal from '@/presentation/components/workspace/MovePatientModal.vue';

// --- 2. STORE VE COMPOSABLE'LARI ÇAĞIR ---
const store = useWorkspaceStore();
const toast = useToast();

const { loading, error, allWorkspaces, uniqueOrganTypes, uniqueOrganizations, allWorkspaceNames } =
  storeToRefs(store);

const {
  isCreateModalOpen,
  isEditModalOpen,
  isDeleteModalOpen,
  isCreatePatientModalOpen,
  isEditPatientModalOpen,
  isDeletePatientModalOpen,
  isUploadModalOpen,
  isDeleteImageModalOpen,
  isViewerModalOpen,
  isMoveImageModalOpen,
  isMovePatientModalOpen,
  workspaceToEdit,
  workspaceToDelete,
  workspaceForNewPatient,
  patientToEdit,
  workspaceIdForPatientEdit,
  patientToDelete,
  workspaceIdOfPatientToDelete,
  selectedWorkspaceId,
  selectedPatientId,
  imageToDelete,
  workspaceIdOfImageToDelete,
  patientIdOfImageToDelete,
  imageToView,
  imageToMove,
  sourceWorkspaceIdForMove,
  sourcePatientIdForMove,
  patientToMove,
  promptCreateWorkspace,
  promptEditWorkspace,
  promptDeleteWorkspace,
  promptCreatePatient,
  promptEditPatient,
  promptDeletePatient,
  openUploadModal,
  promptDeleteImage,
  viewImage,
  promptMoveImage,
  promptMovePatient,
  handleWorkspaceCreated,
  handleWorkspaceUpdated,
  executeDeleteWorkspace,
  handlePatientCreated,
  handlePatientUpdated,
  executeDeletePatient,
  handleImageUploaded,
  executeDeleteImage,
  executeMoveImage,
  executeMovePatient,
} = useWorkspaceModals();

// --- 3. FİLTRELEME MANTIĞI ---
const isFilterAreaVisible = ref(false);
const filters = reactive({ name: '', organType: '', organization: '', releaseYear: '' });

const filteredWorkspaces = computed(() => {
  const nameQuery = filters.name.toLowerCase().trim();
  const organQuery = filters.organType.toLowerCase();
  const orgQuery = filters.organization.toLowerCase();
  const yearQuery = String(filters.releaseYear).trim();

  if (!nameQuery && !organQuery && !orgQuery && !yearQuery) {
    return allWorkspaces.value;
  }

  return allWorkspaces.value.filter((ws) => {
    const nameMatch = nameQuery ? ws.name.toLowerCase().includes(nameQuery) : true;
    const organMatch = organQuery ? (ws.organType || '').toLowerCase() === organQuery : true;
    const orgMatch = orgQuery ? (ws.organization || '').toLowerCase() === orgQuery : true;
    const yearMatch = yearQuery ? String(ws.releaseYear || '').includes(yearQuery) : true;
    return nameMatch && organMatch && orgMatch && yearMatch;
  });
});

const resetFilters = () => {
  filters.name = '';
  filters.organType = '';
  filters.organization = '';
  filters.releaseYear = '';
};

// --- 4. YARDIMCI FONKSİYONLAR (GÖRÜNTÜLEME) ---
const getThumbnailUrl = (imageId: string) => {
  return store.getThumbnailUrl(imageId);
};

const handleImageError = (event: Event) => {
  const target = event.target as HTMLImageElement;
  target.src =
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yNCAzMkMzMC42Mjc0IDMyIDM2IDE5LjI1NDggMzYgM0MzNiAxMy4yNTQ4IDMwLjYyNzQgMjIgMjQgMjJDMTcuMzcyNiAyMiAxMiAxMy4yNTQ4IDEyIDNDMTIgMTkuMjU0OCAxNy4zNzI2IDMyIDI0IDMyWiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K';
};

// --- 5. YAŞAM DÖNGÜSÜ (LIFECYCLE) ---
onMounted(async () => {
  try {
    await store.fetchAllWorkspaces();
  } catch {
    if (error.value) toast.error(error.value);
  }
});
</script>

<style scoped>
/* Base Button */
.btn {
  @apply inline-flex items-center justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium shadow-sm transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed;
}
/* Sizes */
.btn-sm {
  @apply px-3 py-1.5 text-xs;
}
.btn-xs {
  @apply px-2 py-1 text-xs;
}
/* Variants */
.btn-primary {
  @apply bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500;
}
.btn-danger {
  @apply bg-red-600 text-white hover:bg-red-700 focus:ring-red-500;
}
.btn-outline {
  @apply border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-indigo-500;
}
.btn-ghost {
  @apply border-transparent bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:ring-indigo-500;
}
.btn-ghost-danger {
  @apply border-transparent bg-transparent text-red-600 hover:bg-red-100 hover:text-red-800 focus:ring-red-500;
}
/* Icon Button Adjustments */
.btn-icon-only {
  @apply p-1.5;
}
.sm\:btn-icon-text {
  @apply sm:px-2.5 sm:py-1;
}
.btn-image-action {
  @apply font-medium hover:underline;
}
.form-label {
  @apply block text-sm font-medium text-gray-700;
}
.form-input {
  @apply mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm;
}
.form-input-sm {
  @apply py-1.5 px-2.5 text-xs;
}
.card {
  @apply bg-white rounded-lg border border-gray-200 overflow-hidden;
}
.card-header {
  @apply bg-gray-50 px-4 py-3 border-b border-gray-200;
}
.card-body {
  @apply p-4;
}
</style>
