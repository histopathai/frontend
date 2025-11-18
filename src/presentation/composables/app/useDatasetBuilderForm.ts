import { ref, computed, watch, type Ref } from 'vue';
import { useWorkspaceStore } from '@/stores/workspace';
import type {
  CreateNewWorkspaceRequest,
  UpdateWorkspaceRequest,
} from '@/core/repositories/IWorkspaceRepository';
import type { Workspace } from '@/core/entities/Workspace';

export function useWorkspaceForm(
  emit: (event: 'close') => void,
  workspaceToEdit: Ref<Workspace | null>
) {
  const store = useWorkspaceStore();
  const loading = computed(() => store.loading);

  // Form State
  const name = ref('');
  const organType = ref('');
  const organization = ref('');
  const description = ref('');
  const license = ref('Özel');
  const resourceURL = ref('');
  const releaseYear = ref<number | null>(null);
  const isEditMode = computed(() => !!workspaceToEdit.value);
  watch(
    workspaceToEdit,
    (newVal) => {
      if (newVal) {
        name.value = newVal.name;
        organType.value = newVal.organType;
        organization.value = newVal.organization;
        description.value = newVal.description;
        license.value = newVal.license;
        resourceURL.value = newVal.resourceURL || '';
        releaseYear.value = newVal.releaseYear || null;
      } else {
        resetForm();
      }
    },
    { immediate: true }
  );

  function resetForm() {
    name.value = '';
    organType.value = '';
    organization.value = '';
    description.value = '';
    license.value = 'Özel';
    resourceURL.value = '';
    releaseYear.value = null;
  }

  const isPublicDataset = computed(() => {
    return license.value === 'CC-BY' || license.value === 'CC-BY-NC';
  });

  async function saveWorkspace() {
    const commonData = {
      name: name.value,
      organ_type: organType.value,
      organization: organization.value,
      description: description.value,
      license: license.value,
      resource_url: isPublicDataset.value ? resourceURL.value : undefined,
      release_year: releaseYear.value || undefined,
    };

    let success = false;

    if (isEditMode.value && workspaceToEdit.value) {
      const updatePayload: UpdateWorkspaceRequest = { ...commonData };
      success = await store.updateWorkspace(workspaceToEdit.value.id, updatePayload);
    } else {
      const createPayload: CreateNewWorkspaceRequest = { ...commonData };
      const result = await store.createWorkspace(createPayload);
      success = !!result;
    }

    if (success) {
      emit('close');
    }
  }

  return {
    // State
    name,
    organType,
    organization,
    description,
    license,
    resourceURL,
    releaseYear,
    // Computed
    loading,
    isPublicDataset,
    isEditMode,
    // Actions
    saveWorkspace,
  };
}
