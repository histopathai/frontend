import { ref, computed } from 'vue';
import { useWorkspaceStore } from '@/stores/workspace';
import type { CreateNewWorkspaceRequest } from '@/core/repositories/IWorkspaceRepository';

export function useWorkspaceForm(emit: (event: 'close') => void) {
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

  const isPublicDataset = computed(() => {
    return license.value === 'CC-BY' || license.value === 'CC-BY-NC';
  });

  async function saveWorkspace() {
    const payload: CreateNewWorkspaceRequest = {
      name: name.value,
      organType: organType.value,
      organization: organization.value,
      description: description.value,
      license: license.value,
      resourceURL: isPublicDataset.value ? resourceURL.value : undefined,
      releaseYear: releaseYear.value || undefined,
    };

    const newWorkspace = await store.createWorkspace(payload);

    if (newWorkspace) {
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
    // Actions
    saveWorkspace,
  };
}
