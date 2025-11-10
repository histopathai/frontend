import { onMounted, reactive, computed } from 'vue';
import { useWorkspaceStore } from '@/stores/workspace';
import { storeToRefs } from 'pinia';
import { useToast } from 'vue-toastification';

export function useWorkspaceState() {
  const store = useWorkspaceStore();
  const toast = useToast();

  const { loading, error, uniqueOrganTypes, uniqueOrganizations, allWorkspaces } =
    storeToRefs(store);

  const isFilterAreaVisible = ref(false);
  const filters = reactive({ name: '', organType: '', organization: '', releaseYear: '' });

  const filteredWorkspaces = store.getFilteredWorkspaces(filters);

  const resetFilters = () => {
    filters.name = '';
    filters.organType = '';
    filters.organization = '';
    filters.releaseYear = '';
  };

  onMounted(async () => {
    try {
      await store.fetchAllWorkspaces();
    } catch {
      toast.error(error.value);
    }
  });

  return {
    loading,
    error,
    filteredWorkspaces,
    uniqueOrganTypes,
    uniqueOrganizations,
    allWorkspaces,
    isFilterAreaVisible,
    filters,
    resetFilters,
  };
}
