<template>
  <div class="p-4 sm:p-8">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
      <div class="flex items-center gap-4">
        <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">Çalışma Alanlarım</h1>
        <button @click="isFilterAreaVisible = !isFilterAreaVisible" class="btn btn-ghost btn-sm">
          <span class="ml-1">Filtrele</span>
        </button>
      </div>
      <button @click="isCreateModalOpen = true" class="btn btn-primary btn-sm w-full sm:w-auto">
        <span class="ml-1">Yeni Çalışma Alanı Oluştur</span>
      </button>
    </div>

    <div v-if="isFilterAreaVisible" class="mb-6 p-4 bg-gray-50 rounded-lg shadow-sm">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label for="filterName" class="form-label text-sm">Ada Göre Ara</label>
          <input
            type="text"
            id="filterName"
            v-model="filters.name"
            class="form-input form-input-sm"
            placeholder="İsim içerir..."
          />
        </div>
        <div>
          <label for="filterOrgan" class="form-label text-sm">Organ Tipi</label>
          <select id="filterOrgan" v-model="filters.organType" class="form-input form-input-sm">
            <option value="">Tüm Organlar</option>
            <option v-for="organ in uniqueOrganTypes" :key="organ" :value="organ">
              {{ organ }}
            </option>
          </select>
        </div>
        <div>
          <label for="filterOrg" class="form-label text-sm">Kurum</label>
          <select id="filterOrg" v-model="filters.organization" class="form-input form-input-sm">
            <option value="">Tüm Kurumlar</option>
            <option v-for="org in uniqueOrganizations" :key="org" :value="org">{{ org }}</option>
          </select>
        </div>
        <div>
          <label for="filterYear" class="form-label text-sm">Yıl</label>
          <input
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

    <div v-if="loading && filteredWorkspaces.length === 0" class="text-center py-10">
      <p>Çalışma alanları yükleniyor...</p>
    </div>
    <div v-else-if="error" class="text-red-500 text-center py-10">
      <p>{{ error }}</p>
    </div>
    <div v-else-if="filteredWorkspaces.length === 0" class="text-center py-10 text-gray-500">
      <p v-if="filters.name || filters.organType || filters.organization || filters.releaseYear">
        Filtre kriterlerinize uygun bir çalışma alanı bulunamadı.
      </p>
      <p v-else>Henüz bir çalışma alanı oluşturmadınız.</p>
    </div>

    <div v-else class="space-y-6">
      <WorkspaceCard
        v-for="workspace in filteredWorkspaces"
        :key="workspace.id"
        :workspace="workspace"
        :patients="getPatientsForWorkspace(workspace.id).value"
        :get-images-for-patient="getImagesForPatient"
        @load-patients="loadPatientsFor(workspace.id)"
        @load-images="loadImagesFor($event)"
        @create-patient="promptCreatePatient(workspace)"
        @delete-workspace="promptDeleteWorkspace(workspace)"
        @delete-patient="promptDeletePatient($event)"
        @upload-image="promptUploadImage($event)"
        @delete-image="promptDeleteImage($event)"
        @edit-workspace="promptEditWorkspace(workspace)"
        @edit-patient="promptEditPatient($event)"
      />
    </div>

    <CreateWorkspaceModal
      :is-open="isCreateModalOpen"
      @close="isCreateModalOpen = false"
      @created="handleWorkspaceCreated"
    />
    <DeleteWorkspaceModal
      :is-open="isDeleteModalOpen"
      :workspace="workspaceToDelete"
      @close="isDeleteModalOpen = false"
      @confirm="executeDeleteWorkspace"
    />
    <CreatePatientModal
      :is-open="isCreatePatientModalOpen"
      :workspace="workspaceForNewPatient"
      @close="isCreatePatientModalOpen = false"
      @created="handlePatientCreated"
    />
    <DeletePatientModal
      :is-open="isDeletePatientModalOpen"
      :patient="patientToDelete"
      @close="isDeletePatientModalOpen = false"
      @confirm="executeDeletePatient"
    />
    <MovePatientModal
      :is-open="isMovePatientModalOpen"
      :patient="patientToMove"
      :all-workspaces="allWorkspaces"
      @close="isMovePatientModalOpen = false"
      @confirm="executeMovePatient"
    />
    <ImageUploadModal
      :is-open="isUploadModalOpen"
      :patient="patientForNewImage"
      @close="isUploadModalOpen = false"
      @uploaded="handleImageUploaded"
    />
    <DeleteImageModal
      :is-open="isDeleteImageModalOpen"
      :image="imageToDelete"
      @close="isDeleteImageModalOpen = false"
      @confirm="executeDeleteImage"
    />
    <WSIViewerModal
      :is-open="isViewerModalOpen"
      :image="imageToView"
      @close="isViewerModalOpen = false"
    />
    <MoveImageModal
      :is-open="isMoveImageModalOpen"
      :image="imageToMove"
      :all-workspaces="allWorkspaces"
      :patients-by-workspace="patientsByWorkspace"
      @close="isMoveImageModalOpen = false"
      @confirm="executeMoveImage"
    />

    <EditWorkspaceModal
      :is-open="isEditModalOpen"
      :workspace="workspaceToEdit"
      @close="isEditModalOpen = false"
      @updated="handleWorkspaceUpdated"
    />
    <EditPatientModal
      :is-open="isEditPatientModalOpen"
      :patient="patientToEdit"
      @close="isEditPatientModalOpen = false"
      @updated="handlePatientUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { useWorkspaces } from '@/presentation/composables/workspace/useWorkspaceManager';
import WorkspaceCard from '@/presentation/components/workspace/WorkspaceCard.vue';
import CreateWorkspaceModal from '@/presentation/components/workspace/CreateWorkspaceModal.vue';
import DeleteWorkspaceModal from '@/presentation/components/workspace/DeleteWorkspaceModal.vue';
import CreatePatientModal from '@/presentation/components/workspace/CreatePatientModal.vue';
import DeletePatientModal from '@/presentation/components/workspace/DeletePatientModal.vue';
import ImageUploadModal from '@/presentation/components/workspace/ImageUploadModal.vue';
import DeleteImageModal from '@/presentation/components/workspace/DeleteImageModal.vue';
import MovePatientModal from '@/presentation/components/workspace/MovePatientModal.vue';
import WSIViewerModal from '@/presentation/components/viewer/ImageViewerModal.vue';
import MoveImageModal from '@/presentation/components/workspace/MoveImageModal.vue';

// --- YENİ IMPORTLAR ---
import EditWorkspaceModal from '@/presentation/components/workspace/EditWorkspaceModal.vue';
import EditPatientModal from '@/presentation/components/workspace/EditPatientModal.vue';
// --- BİTTİ ---

const {
  loading,
  error,
  filteredWorkspaces,
  isFilterAreaVisible,
  filters,
  uniqueOrganTypes,
  uniqueOrganizations,
  isCreateModalOpen,
  isDeleteModalOpen,
  workspaceToDelete,
  isCreatePatientModalOpen,
  workspaceForNewPatient,
  isDeletePatientModalOpen,
  patientToDelete,
  isUploadModalOpen,
  patientForNewImage,
  isDeleteImageModalOpen,
  imageToDelete,
  allWorkspaces,
  patientsByWorkspace,
  isMovePatientModalOpen,
  patientToMove,
  isViewerModalOpen,
  imageToView,
  isMoveImageModalOpen,
  imageToMove,
  isEditModalOpen,
  workspaceToEdit,
  isEditPatientModalOpen,
  patientToEdit,
  resetFilters,
  getPatientsForWorkspace,
  getImagesForPatient,
  loadPatientsFor,
  loadImagesFor,
  promptDeleteWorkspace,
  promptCreatePatient,
  promptDeletePatient,
  promptUploadImage,
  promptDeleteImage,
  handleWorkspaceCreated,
  executeDeleteWorkspace,
  handlePatientCreated,
  executeDeletePatient,
  handleImageUploaded,
  executeDeleteImage,
  executeMovePatient,
  executeMoveImage,
  promptEditWorkspace,
  promptEditPatient,
  handleWorkspaceUpdated,
  handlePatientUpdated,
} = useWorkspaces();
</script>
