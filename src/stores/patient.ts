import { defineStore } from 'pinia';
import { ref, computed, shallowRef } from 'vue';
import { repositories } from '@/services';
import { useToast } from 'vue-toastification';
import { useI18n } from 'vue-i18n';
import { Patient } from '@/core/entities/Patient';
import type { CreateNewPatientRequest } from '@/core/repositories/IPatientRepository';
import type { Pagination, PaginatedResult } from '@/core/types/common';
import type { BatchTransfer } from '@/core/repositories/common';

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
  append?: boolean;
}

export const usePatientStore = defineStore('patient', () => {
  const { t } = useI18n();
  const toast = useToast();
  const patientRepo = repositories.patient;

  const patients = shallowRef<Patient[]>([]);
  const patientsByWorkspace = ref<Map<string, Patient[]>>(new Map());
  const currentPatient = ref<Patient | null>(null);
  const loading = ref(false);
  const actionLoading = ref(false);
  const error = ref<string | null>(null);

  const pagination = ref<Pagination>({
    limit: 20,
    offset: 0,
    hasMore: false,
  });

  const sort = ref({
    by: 'created_at',
    dir: 'asc' as 'asc' | 'desc',
  });

  const isLoading = computed(() => loading.value);
  const isActionLoading = computed(() => actionLoading.value);
  const hasError = computed(() => !!error.value);
  const hasPatients = computed(() => patients.value.length > 0);
  const totalPatients = computed(() => patients.value.length);
  const hasMore = computed(() => pagination.value.hasMore ?? false);
  const totalPages = computed(() => {
    const total = pagination.value.total ?? 0;
    const limit = pagination.value.limit;
    return total > 0 ? Math.ceil(total / limit) : 0;
  });

  const paginationByWorkspace = ref<Map<string, Pagination>>(new Map());

  const getPatientById = computed(() => {
    return (id: string) => patients.value.find((p) => p.id === id);
  });

  const getPatientsByWorkspaceId = computed(() => {
    return (workspaceId: string) => patientsByWorkspace.value.get(workspaceId) || [];
  });

  const getPaginationByWorkspaceId = computed(() => {
    return (workspaceId: string) => paginationByWorkspace.value.get(workspaceId);
  });

  const handleError = (err: any, defaultMessage: string, showToast = true): void => {
    const errorMessage = err.response?.data?.message || err.message || defaultMessage;
    error.value = errorMessage;
    console.error(defaultMessage, err);
    if (showToast) toast.error(errorMessage);
  };

  const resetError = (): void => {
    error.value = null;
  };

  const updatePatientInState = (updatedPatient: Patient): void => {
    const index = patients.value.findIndex((p) => p.id === updatedPatient.id);
    if (index !== -1) {
      patients.value = [
        ...patients.value.slice(0, index),
        updatedPatient,
        ...patients.value.slice(index + 1),
      ];
    }
    const workspacePatients = patientsByWorkspace.value.get(updatedPatient.workspaceId);
    if (workspacePatients) {
      const wsIndex = workspacePatients.findIndex((p) => p.id === updatedPatient.id);
      if (wsIndex !== -1) {
        const newWorkspacePatients = [...workspacePatients];
        newWorkspacePatients[wsIndex] = updatedPatient;
        patientsByWorkspace.value.set(updatedPatient.workspaceId, newWorkspacePatients);
      }
    }
    if (currentPatient.value?.id === updatedPatient.id) {
      currentPatient.value = updatedPatient;
    }
  };

  const removePatientFromState = (patientId: string, workspaceId?: string): void => {
    patients.value = patients.value.filter((p) => p.id !== patientId);
    if (workspaceId) {
      const workspacePatients = patientsByWorkspace.value.get(workspaceId);
      if (workspacePatients) {
        patientsByWorkspace.value.set(
          workspaceId,
          workspacePatients.filter((p) => p.id !== patientId)
        );
      }
    } else {
      patientsByWorkspace.value.forEach((patients, wsId) => {
        patientsByWorkspace.value.set(
          wsId,
          patients.filter((p) => p.id !== patientId)
        );
      });
    }
    if (currentPatient.value?.id === patientId) currentPatient.value = null;
  };

  // --- ACTIONS ---

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
    searchQuery?: string,
    options: FetchOptions = {}
  ): Promise<void> => {
    const { refresh = false, showToast: showErrorToast = true, append = false } = options;

    if (loading.value && !refresh && !append) return;

    loading.value = true;
    resetError();

    try {
      const extraParams: any = {};
      if (searchQuery && searchQuery.length > 0) {
        extraParams.name = searchQuery;
      }
      const paginationParams: Pagination = {
        limit: 20,
        offset: 0,
        sortBy: 'created_at',
        sortDir: 'asc',
        ...paginationOptions,
        ...extraParams,
      };
      const result: PaginatedResult<Patient> = await patientRepo.listByWorkspace(workspaceId, {
        pagination: paginationParams,
        sort: [{ field: sort.value.by, direction: sort.value.dir }],
        search: extraParams.name,
      });
      const mappedPatients = result.data;

      const currentList = append ? patientsByWorkspace.value.get(workspaceId) || [] : [];
      const newList = [...currentList, ...mappedPatients] as Patient[];

      patientsByWorkspace.value.set(workspaceId, newList);
      patients.value = newList;

      pagination.value = {
        ...paginationParams,
        ...result.pagination,
        hasMore: result.pagination?.hasMore ?? result.data.length === paginationParams.limit,
      };

      paginationByWorkspace.value.set(workspaceId, pagination.value);
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

    await fetchPatientsByWorkspace(workspaceId, { offset: currentPatients.length }, undefined, {
      append: true,
    });
  };

  const createPatient = async (data: CreateNewPatientRequest): Promise<Patient | null> => {
    actionLoading.value = true;
    resetError();
    try {
      const newPatient = await patientRepo.create(data);
      patients.value = [newPatient, ...patients.value];
      const workspaceId = data.parent.id;

      const workspacePatients = patientsByWorkspace.value.get(workspaceId) || [];
      patientsByWorkspace.value.set(workspaceId, [newPatient, ...workspacePatients]);

      toast.success(t('patient.messages.create_success'));
      return newPatient;
    } catch (err: any) {
      handleError(err, t('patient.messages.create_error'));
      throw err;
    } finally {
      actionLoading.value = false;
    }
  };

  const updatePatient = async (
    patientId: string,
    data: Partial<CreateNewPatientRequest>
  ): Promise<boolean> => {
    actionLoading.value = true;
    resetError();
    try {
      await patientRepo.update(patientId, data);
      const updatedPatient = await patientRepo.getById(patientId);
      if (updatedPatient) updatePatientInState(updatedPatient);
      toast.success(t('patient.messages.update_success'));
      return true;
    } catch (err: any) {
      handleError(err, t('patient.messages.update_error'));
      return false;
    } finally {
      actionLoading.value = false;
    }
  };

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

  const softDeleteManyPatients = async (
    patientIds: string[],
    workspaceId: string
  ): Promise<boolean> => {
    actionLoading.value = true;
    resetError();
    try {
      await patientRepo.softDeleteMany(patientIds);
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

  const transferPatient = async (
    patientId: string,
    currentWorkspaceId: string,
    targetWorkspaceId: string
  ): Promise<boolean> => {
    actionLoading.value = true;
    resetError();
    try {
      await patientRepo.transfer(patientId, targetWorkspaceId);
      removePatientFromState(patientId, currentWorkspaceId);
      toast.success(t('patient.messages.transfer_success'));
      return true;
    } catch (err: any) {
      handleError(err, t('patient.messages.transfer_error'));
      return false;
    } finally {
      actionLoading.value = false;
    }
  };

  const transferManyPatients = async (data: BatchTransfer): Promise<boolean> => {
    actionLoading.value = true;
    resetError();
    try {
      await patientRepo.transferMany(data);
      toast.success(t('patient.messages.batch_transfer_success'));
      return true;
    } catch (err: any) {
      handleError(err, t('patient.messages.batch_transfer_error'));
      return false;
    } finally {
      actionLoading.value = false;
    }
  };

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

  // --- Stats Persistence ---
  const patientAnnotationStats = ref<Map<string, { total: number; annotated: number }>>(new Map());

  const updatePatientStats = (patientId: string, total: number, annotated: number) => {
    patientAnnotationStats.value.set(patientId, { total, annotated });

    // Update current patient in state if it exists
    const patient = patients.value.find((p) => p.id === patientId);
    if (patient) {
      patient.updateAnnotationStats(total, annotated);
    }
  };

  const getPatientStats = (patientId: string) => {
    return patientAnnotationStats.value.get(patientId);
  };

  return {
    patients,
    patientsByWorkspace,
    currentPatient,
    loading,
    actionLoading,
    error,
    pagination,
    isLoading,
    isActionLoading,
    hasError,
    hasPatients,
    totalPatients,
    totalPages,
    hasMore,
    getPatientById,
    getPatientsByWorkspaceId,
    getPaginationByWorkspaceId,
    fetchPatientById,
    fetchPatientsByWorkspace,
    loadMorePatients,
    createPatient,
    updatePatient,
    deletePatient,
    softDeleteManyPatients,
    transferPatient,
    transferManyPatients,
    setCurrentPatient,
    clearCurrentPatient,
    clearPatients,
    clearWorkspacePatients,
    refreshPatient,
    getPatientCount,
    resetError,

    // Stats Persistence
    patientAnnotationStats,
    updatePatientStats,
    getPatientStats,
  };
});
