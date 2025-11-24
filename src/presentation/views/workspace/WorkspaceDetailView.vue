<template>
  <div class="space-y-6">
    <nav class="flex" aria-label="Breadcrumb">
      <ol class="flex items-center space-x-4">
        <li>
          <RouterLink
            :to="{ name: 'WorkspaceList' }"
            class="text-gray-500 hover:text-gray-700 flex items-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              class="w-5 h-5 mr-1"
            >
              <path
                fill-rule="evenodd"
                d="M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7Z"
                clip-rule="evenodd"
              />
            </svg>
            {{ t('workspace.list.title') }}
          </RouterLink>
        </li>
        <li>
          <svg class="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              clip-rule="evenodd"
            />
          </svg>
        </li>
        <li>
          <span class="text-gray-900 font-medium" v-if="workspace">{{ workspace.name }}</span>
          <span class="text-gray-400" v-else>...</span>
        </li>
      </ol>
    </nav>

    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">{{ t('patient.list.title') }}</h1>
        <p class="text-sm text-gray-500 mt-1" v-if="workspace">
          {{ workspace.organization }} <span class="mx-2">•</span>
          <span
            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
          >
            {{ workspace.organType }}
          </span>
        </p>
      </div>
      <div class="flex gap-3">
        <button
          class="btn btn-outline bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50"
          @click="openAnnotationSettings"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="w-5 h-5 mr-2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281Z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
            />
          </svg>
          Etiketleme Ayarları
        </button>

        <button class="btn btn-primary" @click="handleCreatePatientClick">
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
          {{ t('patient.actions.create') }}
        </button>
      </div>
    </div>

    <div class="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
      <div
        v-if="selectedIds.length > 0"
        class="bg-indigo-50 px-6 py-3 flex items-center justify-between border-b border-indigo-100 transition-all"
      >
        <div class="text-sm font-medium text-indigo-700">
          {{ t('patient.list.selected_count', { count: selectedIds.length }) }}
        </div>
        <div class="flex space-x-2">
          <button
            @click="openBatchTransferModal"
            class="btn btn-sm btn-outline bg-white text-indigo-600 hover:bg-indigo-50 border-indigo-200"
          >
            {{ t('patient.actions.transfer_selected') }}
          </button>
          <button
            @click="openBatchDeleteModal"
            class="btn btn-sm btn-danger bg-white border border-red-200 text-red-600 hover:bg-red-50"
          >
            {{ t('patient.actions.delete_selected') }}
          </button>
        </div>
      </div>

      <div v-if="loading" class="p-10 text-center">
        <div
          class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"
        ></div>
        <p class="mt-2 text-gray-500">{{ t('patient.list.loading') }}</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-6 py-3 w-10">
                <input
                  v-if="patients.length > 0"
                  type="checkbox"
                  class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  :checked="isAllSelected"
                  :indeterminate="isIndeterminate"
                  @change="toggleSelectAll"
                />
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {{ t('patient.form.name') }}
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {{ t('patient.form.age') }} / {{ t('patient.form.gender') }}
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {{ t('patient.form.disease') }}
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Kayıt Tarihi
              </th>
              <th scope="col" class="relative px-6 py-3"><span class="sr-only">İşlemler</span></th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="patients.length === 0">
              <td colspan="6" class="px-6 py-12 text-center">
                <div class="text-gray-400 mb-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    class="w-12 h-12 mx-auto"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                    />
                  </svg>
                </div>
                <p class="text-gray-500 font-medium">{{ t('patient.list.empty') }}</p>
              </td>
            </tr>

            <tr
              v-for="patient in patients"
              :key="patient.id"
              class="hover:bg-indigo-50 cursor-pointer transition-colors group"
              :class="{ 'bg-indigo-50/50': selectedIds.includes(patient.id) }"
              @click="goToPatientDetail(patient.id)"
            >
              <td class="px-6 py-4 whitespace-nowrap" @click.stop>
                <input
                  type="checkbox"
                  class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  :value="patient.id"
                  v-model="selectedIds"
                />
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="font-medium text-gray-900">{{ patient.name }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ patient.age || '-' }}
                <span v-if="patient.age" class="text-gray-400 mx-1">/</span>
                {{ patient.gender || '-' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ patient.disease || '-' }}
                <span
                  v-if="patient.subtype"
                  class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 ml-2"
                >
                  {{ patient.subtype }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ new Date(patient.createdAt).toLocaleDateString('tr-TR') }}
              </td>

              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" @click.stop>
                <div
                  class="flex justify-end items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <button
                    @click="openImageUploadModal(patient)"
                    class="text-green-600 hover:text-green-900 flex items-center gap-1"
                    :title="t('patient.actions.upload_image')"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="currentColor"
                      class="w-4 h-4"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
                      />
                    </svg>
                    {{ t('patient.actions.upload_image') }}
                  </button>
                  <button
                    @click="openTransferModal(patient)"
                    class="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                    :title="t('patient.actions.transfer')"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="currentColor"
                      class="w-4 h-4"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
                      />
                    </svg>
                    {{ t('patient.actions.transfer') }}
                  </button>
                  <button
                    @click="openEditModal(patient)"
                    class="text-indigo-600 hover:text-indigo-900 flex items-center gap-1"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="currentColor"
                      class="w-4 h-4"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                      />
                    </svg>
                    {{ t('patient.actions.edit') }}
                  </button>
                  <button
                    @click="openDeleteModal(patient)"
                    class="text-red-600 hover:text-red-900 flex items-center gap-1"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="currentColor"
                      class="w-4 h-4"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                      />
                    </svg>
                    {{ t('patient.actions.delete') }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6"
        v-if="patients.length > 0 || currentPage > 1"
      >
        <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p class="text-sm text-gray-700">
              {{ t('common.page') }} <span class="font-medium">{{ currentPage }}</span>
            </p>
          </div>
          <div>
            <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                @click="changePage(currentPage - 1)"
                :disabled="currentPage === 1"
                class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                &lt;
              </button>
              <span
                class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
              >
                {{ currentPage }}
              </span>
              <button
                @click="changePage(currentPage + 1)"
                :disabled="!hasMore"
                class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                &gt;
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>

    <AnnotationSettingsModal
      v-if="isAnnotationSettingsModalOpen"
      :workspace-id="workspaceId"
      :workspace-name="workspace?.name"
      :current-annotation-type-id="workspace?.annotationTypeId || undefined"
      @close="isAnnotationSettingsModalOpen = false"
      @saved="onAnnotationSettingsSaved"
    />

    <CreatePatientModal
      v-if="isCreatePatientModalOpen"
      :workspace-id="workspaceId"
      @close="closeCreatePatientModal"
    />

    <EditPatientModal
      v-if="isEditModalOpen && selectedPatient"
      :patient="selectedPatient"
      :workspace-id="workspaceId"
      @close="closeEditModal"
      @updated="loadPatients"
    />

    <TransferPatientModal
      v-if="isTransferModalOpen"
      :patient-id="selectedPatient?.id"
      :patient-name="selectedPatient?.name"
      :patient-ids="selectedIdsForTransfer"
      :current-workspace-id="workspaceId"
      @close="closeTransferModal"
      @transferred="handleTransferSuccess"
    />

    <DeleteConfirmationModal
      v-if="isDeleteModalOpen"
      :title="deleteModalTitle"
      :item-name="deleteItemName"
      :message="deleteModalMessage"
      :warning-text="deleteWarningText"
      :loading="loadingAction"
      :require-confirmation="isSingleDelete"
      @close="closeDeleteModal"
      @confirm="handleDeleteConfirm"
    />

    <ImageUploadModal
      v-if="isImageUploadModalOpen && selectedPatient"
      :patient-id="selectedPatient.id"
      @close="closeImageUploadModal"
      @uploaded="handleImageUploaded"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed, shallowRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useWorkspaceStore } from '@/stores/workspace';
import { usePatientStore } from '@/stores/patient';
import { repositories } from '@/services';
import { useToast } from 'vue-toastification';
import { useI18n } from 'vue-i18n';
import type { Workspace } from '@/core/entities/Workspace';
import type { Patient } from '@/core/entities/Patient';

import CreatePatientModal from '@/presentation/components/workspace/CreatePatientModal.vue';
import EditPatientModal from '@/presentation/components/workspace/EditPatientModal.vue';
import TransferPatientModal from '@/presentation/components/workspace/TransferPatientModal.vue';
import DeleteConfirmationModal from '@/presentation/components/workspace/DeleteConfirmationModal.vue';
import AnnotationSettingsModal from '@/presentation/components/workspace/AnnotationSettingsModal.vue';
import ImageUploadModal from '@/presentation/components/image/ImageUploadModal.vue';

const route = useRoute();
const router = useRouter();
const workspaceStore = useWorkspaceStore();
const patientStore = usePatientStore();
const toast = useToast();
const { t } = useI18n();

const workspaceId = route.params.workspaceId as string;
const workspace = ref<Workspace | null>(null);
const patients = shallowRef<Patient[]>([]);
const loading = ref(false);
const loadingAction = ref(false);

const limit = 20;
const offset = ref(0);
const hasMore = ref(false);
const currentPage = computed(() => Math.floor(offset.value / limit) + 1);

const isCreatePatientModalOpen = ref(false);
const isEditModalOpen = ref(false);
const isTransferModalOpen = ref(false);
const isDeleteModalOpen = ref(false);
const isAnnotationSettingsModalOpen = ref(false);
const isImageUploadModalOpen = ref(false);

const selectedPatient = shallowRef<Patient | null>(null);
const selectedIds = ref<string[]>([]);
const selectedIdsForTransfer = ref<string[]>([]);
const idsToDelete = ref<string[]>([]);
const isSingleDelete = ref(true);
const deleteWarningText = ref('');

const isAllSelected = computed(() => {
  return patients.value.length > 0 && selectedIds.value.length === patients.value.length;
});

const isIndeterminate = computed(() => {
  return selectedIds.value.length > 0 && selectedIds.value.length < patients.value.length;
});

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedIds.value = [];
  } else {
    selectedIds.value = patients.value.map((p) => p.id);
  }
}

const deleteModalTitle = computed(() =>
  isSingleDelete.value ? t('patient.actions.delete') : t('patient.actions.delete_selected')
);

const deleteItemName = computed(() => (selectedPatient.value ? selectedPatient.value.name : ''));

const deleteModalMessage = computed(() => {
  if (isSingleDelete.value) {
    return t('patient.messages.delete_confirm');
  }
  return t('patient.messages.batch_delete_confirm', { count: idsToDelete.value.length });
});

onMounted(async () => {
  await loadData();
});

async function loadData() {
  loading.value = true;
  try {
    if (!workspace.value) {
      workspace.value = await repositories.workspace.getById(workspaceId);
    }
    await loadPatients();
  } catch (e) {
    console.error('Veri yüklenirken hata:', e);
  } finally {
    loading.value = false;
  }
}

async function loadPatients() {
  try {
    const result = await repositories.patient.getByWorkspaceId(workspaceId, {
      limit,
      offset: offset.value,
      sortBy: 'created_at',
      sortOrder: 'desc',
    });
    patients.value = result.data;
    hasMore.value = result.pagination.hasMore ?? result.data.length === limit;
    selectedIds.value = [];
  } catch (e) {
    console.error('Hasta listesi yüklenirken hata:', e);
  }
}

function changePage(newPage: number) {
  if (newPage < 1) return;
  offset.value = (newPage - 1) * limit;
  loading.value = true;
  loadPatients().finally(() => (loading.value = false));
}

function openAnnotationSettings() {
  isAnnotationSettingsModalOpen.value = true;
}

async function onAnnotationSettingsSaved() {
  isAnnotationSettingsModalOpen.value = false;
  workspace.value = await repositories.workspace.getById(workspaceId);
  isCreatePatientModalOpen.value = true;
}

async function handleCreatePatientClick() {
  if (!workspace.value) return;
  if (!workspace.value.annotationTypeId) {
    toast.warning('Hasta eklemeden önce anotasyon ayarlarını yapmalısınız.');
    isAnnotationSettingsModalOpen.value = true;
  } else {
    isCreatePatientModalOpen.value = true;
  }
}

function closeCreatePatientModal() {
  isCreatePatientModalOpen.value = false;
  loadPatients();
}

function openEditModal(patient: Patient) {
  selectedPatient.value = patient;
  isEditModalOpen.value = true;
}
function closeEditModal() {
  isEditModalOpen.value = false;
  selectedPatient.value = null;
}

function openTransferModal(patient: Patient) {
  selectedPatient.value = patient;
  selectedIdsForTransfer.value = [];
  isTransferModalOpen.value = true;
}

function openBatchTransferModal() {
  if (selectedIds.value.length === 0) return;
  selectedPatient.value = null;
  selectedIdsForTransfer.value = selectedIds.value;
  isTransferModalOpen.value = true;
}

function closeTransferModal() {
  isTransferModalOpen.value = false;
  selectedPatient.value = null;
  selectedIdsForTransfer.value = [];
}

function handleTransferSuccess() {
  loadPatients();
  selectedIds.value = [];
}

function openDeleteModal(patient: Patient) {
  selectedPatient.value = patient;
  idsToDelete.value = [];
  isSingleDelete.value = true;
  deleteWarningText.value = t('patient.messages.cascade_delete_warning');
  isDeleteModalOpen.value = true;
}

function openBatchDeleteModal() {
  if (selectedIds.value.length === 0) return;
  selectedPatient.value = null;
  idsToDelete.value = selectedIds.value;
  isSingleDelete.value = false;
  deleteWarningText.value = t('patient.messages.cascade_delete_warning');
  isDeleteModalOpen.value = true;
}

function closeDeleteModal() {
  isDeleteModalOpen.value = false;
  selectedPatient.value = null;
  idsToDelete.value = [];
  deleteWarningText.value = '';
}

async function handleDeleteConfirm() {
  loadingAction.value = true;
  let success = false;

  if (isSingleDelete.value && selectedPatient.value) {
    success = await patientStore.cascadeDeletePatient(selectedPatient.value.id, workspaceId);
  } else if (!isSingleDelete.value && idsToDelete.value.length > 0) {
    success = await patientStore.batchDeletePatients(idsToDelete.value, workspaceId);
  }

  loadingAction.value = false;

  if (success) {
    closeDeleteModal();
    loadPatients();
  }
}

function openImageUploadModal(patient: Patient) {
  selectedPatient.value = patient;
  isImageUploadModalOpen.value = true;
}

function closeImageUploadModal() {
  isImageUploadModalOpen.value = false;
  selectedPatient.value = null;
}

function handleImageUploaded() {}

function goToPatientDetail(patientId: string) {
  console.log('Go to patient detail:', patientId);
}
</script>
