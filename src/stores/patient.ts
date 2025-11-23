import { defineStore } from 'pinia';
import { ref, computed, shallowRef } from 'vue';
import { repositories } from '@/services';
import { useToast } from 'vue-toastification';
import { useI18n } from 'vue-i18n';
import type { Patient } from '@/core/entities/Patient';
import type { CreateNewPatientRequest } from '@/core/repositories/IPatientRepository';
import type { Pagination, PaginatedResult } from '@/core/types/common';
import type { BatchTransfer } from '@/core/repositories/common';

// ===========================
// Types & Interfaces
// ===========================

interface PatientState {
  patients: Patient[];
  patientsByWorkspace: Map<string, Patient[]>;
  currentPatient: Patient | null;
  loading: boolean;
  actionLoading: boolean;
  error: string | null;
  pagination: Pagination;
}

interface FetchOptions {
  refresh?: boolean;
  showToast?: boolean;
}

// ===========================
// Store Definition
// ===========================

export const usePatientStore = defineStore('patient', () => {
  const { t } = useI18n();
  const toast = useToast();
  const patientRepo = repositories.patient;

  // ===========================
  // State
  // ===========================

  const patients = shallowRef<Patient[]>([]);
  const patientsByWorkspace = ref<Map<string, Patient[]>>(new Map());
  const currentPatient = ref<Patient | null>(null);
  const loading = ref(false);
  const actionLoading = ref(false);
  const error = ref<string | null>(null);
  const pagination = ref<Pagination>({
    limit: 10,
    offset: 0,
    sortBy: 'created_at',
    sortOrder: 'desc',
    hasMore: false,
  });

  // ===========================
  // Getters
  // ===========================

  const isLoading = computed(() => loading.value);
  const isActionLoading = computed(() => actionLoading.value);
  const hasError = computed(() => !!error.value);
  const hasPatients = computed(() => patients.value.length > 0);
  const totalPatients = computed(() => patients.value.length);
  const hasMore = computed(() => pagination.value.hasMore ?? false);

  // Get patient by ID
  const getPatientById = computed(() => {
    return (id: string) => patients.value.find((p) => p.id === id);
  });

  // Get patients by workspace ID
  const getPatientsByWorkspaceId = computed(() => {
    return (workspaceId: string) => patientsByWorkspace.value.get(workspaceId) || [];
  });

  // ===========================
  // Helper Functions
  // ===========================

  const handleError = (err: any, defaultMessage: string, showToast = true): void => {
    const errorMessage = err.response?.data?.message || err.message || defaultMessage;
    error.value = errorMessage;
    console.error(defaultMessage, err);

    if (showToast) {
      toast.error(errorMessage);
    }
  };

  const resetError = (): void => {
    error.value = null;
  };

  const updatePatientInState = (updatedPatient: Patient): void => {
    // Update in main patients array
    const index = patients.value.findIndex((p) => p.id === updatedPatient.id);
    if (index !== -1) {
      patients.value = [
        ...patients.value.slice(0, index),
        updatedPatient,
        ...patients.value.slice(index + 1),
      ];
    }

    // Update in workspace-specific patients
    const workspacePatients = patientsByWorkspace.value.get(updatedPatient.workspaceId);
    if (workspacePatients) {
      const wsIndex = workspacePatients.findIndex((p) => p.id === updatedPatient.id);
      if (wsIndex !== -1) {
        const newWorkspacePatients = [...workspacePatients];
        newWorkspacePatients[wsIndex] = updatedPatient;
        patientsByWorkspace.value.set(updatedPatient.workspaceId, newWorkspacePatients);
      }
    }

    // Update current patient if it matches
    if (currentPatient.value?.id === updatedPatient.id) {
      currentPatient.value = updatedPatient;
    }
  };

  const removePatientFromState = (patientId: string, workspaceId?: string): void => {
    // Remove from main patients array
    patients.value = patients.value.filter((p) => p.id !== patientId);

    // Remove from workspace-specific patients
    if (workspaceId) {
      const workspacePatients = patientsByWorkspace.value.get(workspaceId);
      if (workspacePatients) {
        patientsByWorkspace.value.set(
          workspaceId,
          workspacePatients.filter((p) => p.id !== patientId)
        );
      }
    } else {
      // Remove from all workspaces if workspaceId not provided
      patientsByWorkspace.value.forEach((patients, wsId) => {
        patientsByWorkspace.value.set(
          wsId,
          patients.filter((p) => p.id !== patientId)
        );
      });
    }

    // Clear current patient if it matches
    if (currentPatient.value?.id === patientId) {
      currentPatient.value = null;
    }
  };

  // ===========================
  // Actions - Fetch
  // ===========================

  const fetchPatientById = async (
    patientId: string,
    options: FetchOptions = {}
  ): Promise<Patient | null> => {
    const { showToast: showErrorToast = true } = options;

    loading.value = true;
    resetError();

    try {
      const patient = await patientRepo.getById(patientId);

      if (patient) {
        currentPatient.value = patient;
        updatePatientInState(patient);
      }

      return patient;
    } catch (err: any) {
      handleError(err, t('patient.messages.fetch_error'), showErrorToast);
      return null;
    } finally {
      loading.value = false;
    }
  };

  const fetchPatientsByWorkspace = async (
    workspaceId: string,
    paginationOptions?: Partial<Pagination>,
    options: FetchOptions = {}
  ): Promise<void> => {
    const { refresh = false, showToast: showErrorToast = true } = options;

    if (loading.value && !refresh) return;

    loading.value = true;
    resetError();

    try {
      const paginationParams: Pagination = {
        limit: 10,
        offset: 0,
        sortBy: 'created_at',
        sortOrder: 'desc',
        ...paginationOptions,
      };

      const result: PaginatedResult<Patient> = await patientRepo.getByWorkspaceId(
        workspaceId,
        paginationParams
      );

      // Store in workspace-specific map
      patientsByWorkspace.value.set(workspaceId, result.data);

      // Also update main patients array
      patients.value = result.data;

      // Update pagination
      pagination.value = {
        ...paginationParams,
        ...result.pagination,
        hasMore: result.pagination?.hasMore ?? result.data.length === paginationParams.limit,
      };
    } catch (err: any) {
      handleError(err, t('patient.messages.fetch_error'), showErrorToast);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const loadMorePatients = async (workspaceId: string): Promise<void> => {
    if (!hasMore.value || loading.value) return;

    const currentPatients = patientsByWorkspace.value.get(workspaceId) || [];

    await fetchPatientsByWorkspace(workspaceId, {
      offset: currentPatients.length,
    });
  };

  // ===========================
  // Actions - Create
  // ===========================

  const createPatient = async (data: CreateNewPatientRequest): Promise<Patient | null> => {
    actionLoading.value = true;
    resetError();

    try {
      const newPatient = await patientRepo.create(data);

      // Add to main patients array
      patients.value = [newPatient, ...patients.value];

      // Add to workspace-specific patients
      const workspacePatients = patientsByWorkspace.value.get(data.workspace_id) || [];
      patientsByWorkspace.value.set(data.workspace_id, [newPatient, ...workspacePatients]);

      toast.success(t('patient.messages.create_success'));
      return newPatient;
    } catch (err: any) {
      handleError(err, t('patient.messages.create_error'));
      throw err;
    } finally {
      actionLoading.value = false;
    }
  };

  // ===========================
  // Actions - Update
  // ===========================

  const updatePatient = async (
    patientId: string,
    data: Partial<CreateNewPatientRequest>
  ): Promise<boolean> => {
    actionLoading.value = true;
    resetError();

    try {
      await patientRepo.update(patientId, data);

      // Fetch updated patient
      const updatedPatient = await patientRepo.getById(patientId);

      if (updatedPatient) {
        updatePatientInState(updatedPatient);
      }

      toast.success(t('patient.messages.update_success'));
      return true;
    } catch (err: any) {
      handleError(err, t('patient.messages.update_error'));
      return false;
    } finally {
      actionLoading.value = false;
    }
  };

  // ===========================
  // Actions - Delete
  // ===========================

  const deletePatient = async (patientId: string, workspaceId: string): Promise<boolean> => {
    actionLoading.value = true;
    resetError();

    try {
      await patientRepo.delete(patientId);

      removePatientFromState(patientId, workspaceId);

      toast.success(t('patient.messages.delete_success'));
      return true;
    } catch (err: any) {
      handleError(err, t('patient.messages.delete_error'));
      return false;
    } finally {
      actionLoading.value = false;
    }
  };

  const cascadeDeletePatient = async (patientId: string, workspaceId: string): Promise<boolean> => {
    actionLoading.value = true;
    resetError();

    try {
      await patientRepo.cascadeDelete(patientId);

      removePatientFromState(patientId, workspaceId);

      toast.success(t('patient.messages.delete_success'));
      return true;
    } catch (err: any) {
      handleError(err, t('patient.messages.delete_error'));
      return false;
    } finally {
      actionLoading.value = false;
    }
  };

  const batchDeletePatients = async (
    patientIds: string[],
    workspaceId: string
  ): Promise<boolean> => {
    actionLoading.value = true;
    resetError();

    try {
      await patientRepo.batchDelete(patientIds);

      // Remove all deleted patients from state
      patientIds.forEach((id) => removePatientFromState(id, workspaceId));

      toast.success(t('patient.messages.batch_delete_success'));
      return true;
    } catch (err: any) {
      handleError(err, t('patient.messages.batch_delete_error'));
      return false;
    } finally {
      actionLoading.value = false;
    }
  };

  // ===========================
  // Actions - Transfer
  // ===========================

  const transferPatient = async (
    patientId: string,
    currentWorkspaceId: string,
    targetWorkspaceId: string
  ): Promise<boolean> => {
    actionLoading.value = true;
    resetError();

    try {
      await patientRepo.transfer(patientId, targetWorkspaceId);

      // Remove from current workspace
      removePatientFromState(patientId, currentWorkspaceId);

      // Refresh both workspaces
      await fetchPatientsByWorkspace(currentWorkspaceId, undefined, { showToast: false });
      await fetchPatientsByWorkspace(targetWorkspaceId, undefined, { showToast: false });

      toast.success(t('patient.messages.transfer_success'));
      return true;
    } catch (err: any) {
      handleError(err, t('patient.messages.transfer_error'));
      return false;
    } finally {
      actionLoading.value = false;
    }
  };

  const batchTransferPatients = async (data: BatchTransfer): Promise<boolean> => {
    actionLoading.value = true;
    resetError();

    try {
      await patientRepo.batchTransfer(data);

      toast.success(t('patient.messages.batch_transfer_success'));
      return true;
    } catch (err: any) {
      handleError(err, t('patient.messages.batch_transfer_error'));
      return false;
    } finally {
      actionLoading.value = false;
    }
  };

  // ===========================
  // Actions - Utility
  // ===========================

  const setCurrentPatient = (patient: Patient | null): void => {
    currentPatient.value = patient;
  };

  const clearCurrentPatient = (): void => {
    currentPatient.value = null;
  };

  const clearPatients = (): void => {
    patients.value = [];
    patientsByWorkspace.value.clear();
    currentPatient.value = null;
    error.value = null;
  };

  const clearWorkspacePatients = (workspaceId: string): void => {
    patientsByWorkspace.value.delete(workspaceId);
  };

  const refreshPatient = async (patientId: string): Promise<void> => {
    await fetchPatientById(patientId, { showToast: false });
  };

  const getPatientCount = async (): Promise<number> => {
    try {
      return await patientRepo.count();
    } catch (err: any) {
      handleError(err, 'Failed to get patient count', false);
      return 0;
    }
  };

  // ===========================
  // Return
  // ===========================

  return {
    // State
    patients,
    patientsByWorkspace,
    currentPatient,
    loading,
    actionLoading,
    error,
    pagination,

    // Getters
    isLoading,
    isActionLoading,
    hasError,
    hasPatients,
    totalPatients,
    hasMore,
    getPatientById,
    getPatientsByWorkspaceId,

    // Actions - Fetch
    fetchPatientById,
    fetchPatientsByWorkspace,
    loadMorePatients,

    // Actions - Create
    createPatient,

    // Actions - Update
    updatePatient,

    // Actions - Delete
    deletePatient,
    cascadeDeletePatient,
    batchDeletePatients,

    // Actions - Transfer
    transferPatient,
    batchTransferPatients,

    // Actions - Utility
    setCurrentPatient,
    clearCurrentPatient,
    clearPatients,
    clearWorkspacePatients,
    refreshPatient,
    getPatientCount,
    resetError,
  };
});
