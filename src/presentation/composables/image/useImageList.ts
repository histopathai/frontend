import { ref, computed, onMounted } from 'vue';
import { useImageStore } from '@/stores/image';
import type { Image } from '@/core/entities/Image';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export function useImageList(patientId: string, emit: any) {
  const imageStore = useImageStore();

  const selectedIds = ref<string[]>([]);
  const limit = 12;
  const offset = ref(0);
  const loading = ref(false);

  const images = computed(() => imageStore.getImagesByPatientId(patientId));
  const totalImages = computed(() => images.value.length);

  const hasMore = computed(() => imageStore.hasMore);
  const isAllSelected = computed(() => {
    return images.value.length > 0 && selectedIds.value.length === images.value.length;
  });

  function getThumbnailUrl(image: any): string {
    if (!image || !image.processedpath) return '';
    const basePath = image.processedpath.substring(0, image.processedpath.lastIndexOf('/'));
    return `${API_BASE_URL}/api/v1/proxy/${basePath}/thumbnail.jpeg`;
  }

  function toggleSelection(id: string) {
    if (selectedIds.value.includes(id)) {
      selectedIds.value = selectedIds.value.filter((i) => i !== id);
    } else {
      selectedIds.value.push(id);
    }
  }

  function toggleSelectAll() {
    if (isAllSelected.value) {
      selectedIds.value = [];
    } else {
      selectedIds.value = images.value.map((img) => img.id);
    }
  }

  async function loadImages(reset = false) {
    if (reset) {
      offset.value = 0;
      selectedIds.value = [];
    }

    loading.value = true;
    try {
      await imageStore.fetchImagesByPatient(
        patientId,
        {
          limit: limit,
          offset: offset.value,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        },
        { append: !reset, showToast: false }
      );

      offset.value += limit;
    } catch (e) {
      console.error(e);
    } finally {
      loading.value = false;
    }
  }

  async function handleDelete(image: any) {
    if (!confirm(`${image.name} adlı görüntüyü silmek istediğinize emin misiniz?`)) return;

    const success = await imageStore.deleteImage(image.id, patientId);

    if (success) {
      if (selectedIds.value.includes(image.id)) {
        selectedIds.value = selectedIds.value.filter((id) => id !== image.id);
      }
      offset.value = Math.max(0, offset.value - 1);
      await loadImages(false);
    }
  }

  async function handleBatchDelete() {
    if (selectedIds.value.length === 0) return;
    if (!confirm(`${selectedIds.value.length} adet görüntüyü silmek istediğinize emin misiniz?`))
      return;

    const countToDelete = selectedIds.value.length;
    const success = await imageStore.batchDeleteImages(selectedIds.value, patientId);

    if (success) {
      selectedIds.value = [];
      offset.value = Math.max(0, offset.value - countToDelete);
      await loadImages(false);
    }
  }

  function transferSelected() {
    emit('batch-transfer', selectedIds.value);
  }

  function transferSingle(image: any) {
    emit('transfer', image);
  }

  onMounted(() => {
    if (images.value.length === 0) {
      loadImages(true);
    } else {
      offset.value = images.value.length;
    }
  });

  return {
    images,
    totalImages,
    loading,
    hasMore,
    selectedIds,
    isAllSelected,
    getThumbnailUrl,
    toggleSelection,
    toggleSelectAll,
    loadImages,
    handleBatchDelete,
    transferSelected,
    handleDelete,
    transferSingle,
  };
}
