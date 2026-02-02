import { ref, computed, onMounted } from 'vue';
import { usePatientStore } from '@/stores/patient';
import { useToast } from 'vue-toastification';
import { useI18n } from 'vue-i18n';

export function usePatientList(workspaceId: string) {
  const store = usePatientStore();
  const toast = useToast();
  const { t } = useI18n();

  const limit = 20;
  const offset = ref(0);
  const selectedIds = ref<string[]>([]);
  const idsToDelete = ref<string[]>([]);

  const isCreateModalOpen = ref(false);
  const isEditModalOpen = ref(false);
  const isTransferModalOpen = ref(false);
  const isDeleteModalOpen = ref(false);
  const isImageUploadModalOpen = ref(false);

  const selectedPatient = ref<any>(null);
  const isSingleDelete = ref(true);
  const deleteWarningText = ref('');

  const patients = computed(() => store.patients);
  const loading = computed(() => store.loading);
  const actionLoading = computed(() => store.actionLoading);
  const currentPage = computed(() => Math.floor(offset.value / limit) + 1);
  const hasMore = computed(() => store.pagination.hasMore ?? false);

  const isAllSelected = computed(() => {
    return patients.value.length > 0 && selectedIds.value.length === patients.value.length;
  });

  const isIndeterminate = computed(() => {
    return selectedIds.value.length > 0 && selectedIds.value.length < patients.value.length;
  });

  async function loadPatients() {
    await store.fetchPatientsByWorkspace(workspaceId, {
      limit,
      offset: offset.value,
    });
  }

  function changePage(newPage: number) {
    if (newPage < 1) return;
    offset.value = (newPage - 1) * limit;
    loadPatients();
  }

  function toggleSelectAll() {
    if (isAllSelected.value) {
      selectedIds.value = [];
    } else {
      selectedIds.value = patients.value.map((p) => p.id);
    }
  }

  function openCreateModal() {
    isCreateModalOpen.value = true;
  }

  function openEditModal(patient: any) {
    selectedPatient.value = patient;
    isEditModalOpen.value = true;
  }

  function openTransferModal(patient: any) {
    selectedPatient.value = patient;
    isTransferModalOpen.value = true;
  }

  function openBatchTransferModal() {
    if (selectedIds.value.length === 0) return;
    selectedPatient.value = null;
    isTransferModalOpen.value = true;
  }

  function openImageUploadModal(patient: any) {
    selectedPatient.value = patient;
    isImageUploadModalOpen.value = true;
  }

  function openDeleteModal(patient: any) {
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

  async function handleDeleteConfirm() {
    let success = false;
    if (isSingleDelete.value && selectedPatient.value) {
      success = await store.cascadeDeletePatient(selectedPatient.value.id, workspaceId);
    } else if (!isSingleDelete.value && idsToDelete.value.length > 0) {
      success = await store.batchDeletePatients(idsToDelete.value, workspaceId);
    }

    if (success) {
      isDeleteModalOpen.value = false;
      selectedPatient.value = null;
      idsToDelete.value = [];
      selectedIds.value = [];
      loadPatients();
    }
  }

  onMounted(() => {
    loadPatients();
  });

  return {
    patients,
    loading,
    actionLoading,
    currentPage,
    hasMore,
    selectedIds,
    selectedPatient,

    isCreateModalOpen,
    isEditModalOpen,
    isTransferModalOpen,
    isDeleteModalOpen,
    isImageUploadModalOpen,
    isSingleDelete,
    deleteWarningText,
    idsToDelete,

    isAllSelected,
    isIndeterminate,

    loadPatients,
    changePage,
    toggleSelectAll,
    openCreateModal,
    openEditModal,
    openTransferModal,
    openBatchTransferModal,
    openDeleteModal,
    openBatchDeleteModal,
    openImageUploadModal,
    handleDeleteConfirm,
    t,
  };
}
