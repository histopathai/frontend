<template>
  <div class="space-y-6">
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
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {{ t('patient.form.name') }}
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {{ t('patient.form.age') }} / {{ t('patient.form.gender') }}
              </th>
              <th
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Kayıt Tarihi
              </th>
              <th class="relative px-6 py-3"><span class="sr-only">İşlemler</span></th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="patients.length === 0">
              <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                {{ t('patient.list.empty') }}
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
                <div class="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5 text-indigo-400 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                    />
                  </svg>
                  <div class="font-medium text-gray-900">{{ patient.name }}</div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ patient.age || '-' }}
                <span v-if="patient.age" class="text-gray-400 mx-1">/</span>
                {{ patient.gender || '-' }}
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
                    :title="t('patient.actions.transfer')"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
                      />
                    </svg>
                  </button>
                  <button
                    @click="openEditModal(patient)"
                    class="text-indigo-600 hover:text-indigo-900 flex items-center gap-1"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                      />
                    </svg>
                  </button>
                  <button
                    @click="openDeleteModal(patient)"
                    class="text-red-600 hover:text-red-900 flex items-center gap-1"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                      />
                    </svg>
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
              <div class="relative inline-flex items-center border-y border-gray-300 bg-white">
                <input
                  type="number"
                  :value="currentPage"
                  min="1"
                  :max="totalPages > 0 ? totalPages : undefined"
                  class="w-16 border-0 p-0 text-center text-sm font-medium text-gray-700 focus:ring-0"
                  @change="handlePageInput"
                />
                <span v-if="totalPages > 0" class="border-l border-gray-300 px-2 text-gray-500">
                  / {{ totalPages }}
                </span>
              </div>
              <button
                @click="changePage(currentPage + 1)"
                :disabled="!hasMore && (totalPages === 0 || currentPage >= totalPages)"
                class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                &gt;
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>

    <EditPatientModal
      v-if="isEditModalOpen && selectedPatient"
      :patient="selectedPatient"
      :workspace-id="workspaceId"
      @close="isEditModalOpen = false"
      @updated="loadPatients"
    />
    <TransferPatientModal
      v-if="isTransferModalOpen"
      :patient-id="selectedPatient?.id"
      :patient-name="selectedPatient?.name"
      :patient-ids="selectedIds"
      :current-workspace-id="workspaceId"
      @close="isTransferModalOpen = false"
      @transferred="loadPatients"
    />
    <DeleteConfirmationModal
      v-if="isDeleteModalOpen"
      :title="isSingleDelete ? t('patient.actions.delete') : t('patient.actions.delete_selected')"
      :item-name="selectedPatient?.name || ''"
      :message="
        isSingleDelete
          ? t('patient.messages.delete_confirm')
          : t('patient.messages.batch_delete_confirm', { count: idsToDelete.length })
      "
      :warning-text="deleteWarningText"
      :loading="actionLoading"
      :require-confirmation="isSingleDelete"
      @close="isDeleteModalOpen = false"
      @confirm="handleDeleteConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { usePatientList } from '@/presentation/composables/patient/usePatientList';

import EditPatientModal from '@/presentation/components/patient/EditPatientModal.vue';
import TransferPatientModal from '@/presentation/components/patient/TransferPatientModal.vue';
import DeleteConfirmationModal from '@/presentation/components/common/DeleteConfirmationModal.vue';

const props = defineProps({
  workspaceId: { type: String, required: true },
});

const router = useRouter();
const {
  patients,
  loading,
  actionLoading,
  currentPage,
  totalPages,
  hasMore,
  selectedIds,
  selectedPatient,
  isEditModalOpen,
  isTransferModalOpen,
  isDeleteModalOpen,
  isSingleDelete,
  deleteWarningText,
  idsToDelete,
  isAllSelected,
  isIndeterminate,
  loadPatients,
  changePage,
  toggleSelectAll,
  openEditModal,
  openTransferModal,
  openBatchTransferModal,
  openDeleteModal,
  openBatchDeleteModal,
  handleDeleteConfirm,
  t,
} = usePatientList(props.workspaceId);

defineExpose({
  loadPatients,
});

function goToPatientDetail(patientId: string) {
  router.push({ name: 'PatientDetail', params: { workspaceId: props.workspaceId, patientId } });
}

function handlePageInput(event: Event) {
  const target = event.target as HTMLInputElement;
  let page = parseInt(target.value);

  if (isNaN(page) || page < 1) {
    page = 1;
  }

  if (totalPages.value > 0 && page > totalPages.value) {
    page = totalPages.value;
  }

  // Update input value to properly formatted/clamped number if needed
  if (target.value !== page.toString()) {
    target.value = page.toString();
  }

  if (page !== currentPage.value) {
    changePage(page);
  }
}
</script>
