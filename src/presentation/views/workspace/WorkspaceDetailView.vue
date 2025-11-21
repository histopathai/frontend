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
            Veri Setleri
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
          <span class="text-gray-400" v-else>Yükleniyor...</span>
        </li>
      </ol>
    </nav>

    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Hasta Listesi</h1>
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
          Anotasyon Ayarları
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
          Yeni Hasta Ekle
        </button>
      </div>
    </div>

    <div class="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
      <div v-if="loading" class="p-10 text-center">
        <div
          class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"
        ></div>
        <p class="mt-2 text-gray-500">Veriler yükleniyor...</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th
                scope="col"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Hasta ID / Adı
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Yaş / Cinsiyet
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Teşhis
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
              <td colspan="5" class="px-6 py-12 text-center">
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
                <p class="text-gray-500 font-medium">
                  Bu veri setinde henüz kayıtlı hasta bulunmamaktadır.
                </p>
                <p class="text-gray-400 text-sm mt-1">Yeni bir hasta ekleyerek başlayın.</p>
              </td>
            </tr>

            <tr
              v-for="patient in patients"
              :key="patient.id"
              class="hover:bg-indigo-50 cursor-pointer transition-colors group"
              @click="goToPatientDetail(patient.id)"
            >
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
                    @click="openTransferModal(patient)"
                    class="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                    title="Başka veri setine taşı"
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
                    Taşı
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
                    Düzenle
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
                    Sil
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
              Sayfa <span class="font-medium">{{ currentPage }}</span>
            </p>
          </div>
          <div>
            <nav
              class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
              aria-label="Pagination"
            >
              <button
                @click="changePage(currentPage - 1)"
                :disabled="currentPage === 1"
                class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span class="sr-only">Önceki</span>
                <svg
                  class="h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fill-rule="evenodd"
                    d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>

              <span
                class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
              >
                {{ currentPage }}
              </span>

              <button
                @click="changePage(currentPage + 1)"
                :disabled="!hasMore"
                class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span class="sr-only">Sonraki</span>
                <svg
                  class="h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fill-rule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clip-rule="evenodd"
                  />
                </svg>
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
      v-if="isTransferModalOpen && selectedPatient"
      :patient-id="selectedPatient.id"
      :patient-name="selectedPatient.name"
      :current-workspace-id="workspaceId"
      @close="closeTransferModal"
      @transferred="loadPatients"
    />

    <DeleteConfirmationModal
      v-if="isDeleteModalOpen && selectedPatient"
      title="Hastayı Sil"
      :item-name="selectedPatient.name"
      warning-text="Bu hastaya ait tüm görüntüler ve etiketlemeler kalıcı olarak silinecektir."
      :loading="loadingAction"
      @close="closeDeleteModal"
      @confirm="handleDeleteConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed, shallowRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useWorkspaceStore } from '@/stores/workspace';
import { repositories } from '@/services';
import { useToast } from 'vue-toastification';
import type { Workspace } from '@/core/entities/Workspace';
import type { Patient } from '@/core/entities/Patient';

import CreatePatientModal from '@/presentation/components/workspace/CreatePatientModal.vue';
import EditPatientModal from '@/presentation/components/workspace/EditPatientModal.vue';
import TransferPatientModal from '@/presentation/components/workspace/TransferPatientModal.vue';
import DeleteConfirmationModal from '@/presentation/components/workspace/DeleteConfirmationModal.vue';
import AnnotationSettingsModal from '@/presentation/components/workspace/AnnotationSettingsModal.vue';

const route = useRoute();
const router = useRouter();
const workspaceStore = useWorkspaceStore();
const toast = useToast();

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
const selectedPatient = shallowRef<Patient | null>(null);
const isAnnotationSettingsModalOpen = ref(false);

onMounted(async () => {
  await loadData();
});

function openAnnotationSettings() {
  isAnnotationSettingsModalOpen.value = true;
}

async function handleCreatePatientClick() {
  if (!workspace.value) return;

  if (!workspace.value.annotationTypeId) {
    toast.warning('Hasta eklemeden önce anotasyon (etiketleme) ayarlarını yapmalısınız.');
    isAnnotationSettingsModalOpen.value = true;
  } else {
    isCreatePatientModalOpen.value = true;
  }
}

async function onAnnotationSettingsSaved() {
  isAnnotationSettingsModalOpen.value = false;
  workspace.value = await repositories.workspace.getById(workspaceId);
  isCreatePatientModalOpen.value = true;
}

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

function goToPatientDetail(patientId: string) {
  alert(`Hasta detayına (${patientId}) gidilecek (Görüntüler burada listelenecek).`);
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
  isTransferModalOpen.value = true;
}
function closeTransferModal() {
  isTransferModalOpen.value = false;
  selectedPatient.value = null;
}

function openDeleteModal(patient: Patient) {
  selectedPatient.value = patient;
  isDeleteModalOpen.value = true;
}
function closeDeleteModal() {
  isDeleteModalOpen.value = false;
  selectedPatient.value = null;
}

async function handleDeleteConfirm() {
  if (!selectedPatient.value) return;

  loadingAction.value = true;
  const success = await workspaceStore.deletePatient(selectedPatient.value.id, workspaceId);
  loadingAction.value = false;

  if (success) {
    closeDeleteModal();
    loadPatients();
  }
}
</script>
