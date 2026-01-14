<template>
  <div class="space-y-4">
    <div
      class="flex flex-wrap items-center justify-between gap-4 bg-white p-3 rounded-lg border border-gray-200"
    >
      <div class="flex items-center text-sm text-gray-600">
        <div class="flex items-center mr-4 pr-4 border-r border-gray-200">
          <input
            type="checkbox"
            id="select-all-images"
            class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 mr-2 cursor-pointer disabled:opacity-50"
            :checked="isAllSelected"
            @change="toggleSelectAll"
            :disabled="images.length === 0"
          />
          <label
            for="select-all-images"
            class="cursor-pointer select-none font-medium text-gray-700"
          >
            Tümünü Seç
          </label>
        </div>

        <span class="font-medium text-gray-900 mr-1">{{ totalImages }}</span> görüntü listeleniyor
        <span
          v-if="selectedIds.length > 0"
          class="ml-4 font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md"
        >
          {{ selectedIds.length }} seçildi
        </span>
      </div>

      <div class="flex items-center gap-2">
        <template v-if="selectedIds.length > 0">
          <button
            @click="transferSelected"
            class="btn btn-sm btn-outline text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            Seçilenleri Taşı
          </button>
          <button
            @click="openBatchDeleteModal"
            class="btn btn-sm btn-danger bg-white border border-red-200 text-red-600 hover:bg-red-50"
          >
            Seçilenleri Sil
          </button>
          <div class="h-4 w-px bg-gray-300 mx-2"></div>
        </template>

        <button
          @click="loadImages(true)"
          class="text-gray-400 hover:text-gray-600 p-1"
          title="Yenile"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="w-5 h-5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
        </button>
      </div>
    </div>

    <div v-if="loading && images.length === 0" class="py-8 text-center text-gray-500">
      Görüntüler yükleniyor...
    </div>
    <div
      v-else-if="images.length === 0"
      class="py-8 text-center border-2 border-dashed border-gray-300 rounded-lg text-gray-500 italic"
    >
      Henüz görüntü yüklenmemiş.
    </div>

    <div v-else class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
      <div
        v-for="img in images"
        :key="img.id"
        class="group relative bg-white p-1.5 rounded-lg border transition-all hover:shadow-md"
        :class="
          selectedIds.includes(img.id)
            ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50'
            : 'border-gray-200'
        "
        @click="toggleSelection(img.id)"
      >
        <div class="absolute top-2 left-2 z-10">
          <input
            type="checkbox"
            :value="img.id"
            v-model="selectedIds"
            class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer shadow-sm"
            @click.stop
          />
        </div>

        <div
          class="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1"
        >
          <button
            @click.stop="openSingleDeleteModal(img)"
            class="bg-white text-red-600 p-1.5 rounded-md shadow-sm border border-gray-200 hover:bg-red-50 hover:border-red-200 transition-colors"
            title="Sil"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              class="w-3.5 h-3.5"
            >
              <path
                fill-rule="evenodd"
                d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
          <button
            @click.stop="transferSingle(img)"
            class="bg-white text-blue-600 p-1.5 rounded-md shadow-sm border border-gray-200 hover:bg-blue-50 hover:border-blue-200 transition-colors"
            title="Transfer Et"
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
        </div>

        <div
          class="aspect-square bg-gray-100 rounded-md overflow-hidden mb-2 flex items-center justify-center cursor-pointer relative"
        >
          <span
            class="absolute bottom-1 right-1 z-10 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium opacity-90 shadow-sm"
            :class="{
              'bg-yellow-100 text-yellow-800':
                !img.processedpath && img.status.toString() === 'PROCESSING',
              'bg-green-100 text-green-800':
                img.processedpath || img.status.toString() === 'PROCESSED',
              'bg-red-100 text-red-800': !img.processedpath && img.status.toString() === 'FAILED',
            }"
          >
            {{
              img.processedpath || img.status.isProcessed()
                ? 'Hazır'
                : img.status.isFailed()
                  ? 'Hata'
                  : 'İşleniyor'
            }}
          </span>

          <img
            v-if="img.processedpath"
            :src="getThumbnailUrl(img)"
            class="w-full h-full object-cover"
            alt="Thumbnail"
            loading="lazy"
          />
          <div v-else class="flex flex-col items-center justify-center p-2 text-center">
            <svg
              class="w-8 h-8 text-gray-400 animate-pulse mb-1"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span class="text-[10px] text-gray-400">İşleniyor</span>
          </div>
        </div>

        <div class="px-1">
          <div class="text-xs text-gray-700 truncate font-medium" :title="img.name">
            {{ img.name }}
          </div>
          <div class="text-[10px] text-gray-400 flex justify-between">
            <span v-if="img.width">{{ img.width }}x{{ img.height }}</span>
            <span v-else>-</span>
            <span>{{ new Date(img.createdAt).toLocaleDateString('tr-TR') }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="hasMore" class="flex justify-center pt-4">
      <button
        @click="loadImages(false)"
        :disabled="loading"
        class="btn btn-sm btn-outline text-gray-600"
      >
        <span v-if="loading" class="mr-2 animate-spin">⚪</span>
        Daha Fazla Göster
      </button>
    </div>

    <DeleteConfirmationModal
      v-if="isDeleteModalOpen"
      :title="deleteModalTitle"
      :item-name="itemNameToDelete"
      :message="deleteModalMessage"
      :warning-text="isBatchDelete ? 'Bu işlem geri alınamaz!' : ''"
      :loading="isDeleting"
      :require-confirmation="false"
      @close="closeDeleteModal"
      @confirm="confirmDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useImageList } from '@/presentation/composables/image/useImageList';
import { useImageStore } from '@/stores/image';
import DeleteConfirmationModal from '@/presentation/components/common/DeleteConfirmationModal.vue';

const props = defineProps({
  patientId: { type: String, required: true },
});

const emit = defineEmits(['transfer', 'batch-transfer']);
const imageStore = useImageStore();

const {
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
  transferSelected,
  transferSingle,
} = useImageList(props.patientId, emit);

let pollInterval: ReturnType<typeof setInterval> | null = null;

const hasProcessingImages = computed(() => {
  return images.value.some(
    (img) =>
      img.status.toString() === 'PROCESSING' ||
      (!img.processedpath && !img.status.toString().includes('FAILED'))
  );
});

watch(
  hasProcessingImages,
  (isProcessing) => {
    if (isProcessing) {
      if (!pollInterval) {
        pollInterval = setInterval(() => {
          loadImages(true);
        }, 2000);
      }
    } else {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
});

const isDeleteModalOpen = ref(false);
const isDeleting = ref(false);
const imageToDelete = ref<any>(null);
const isBatchDelete = ref(false);

const deleteModalTitle = computed(() =>
  isBatchDelete.value ? 'Seçili Görüntüleri Sil' : 'Görüntüyü Sil'
);

const deleteModalMessage = computed(() =>
  isBatchDelete.value
    ? `Seçili <strong>${selectedIds.value.length}</strong> adet görüntüyü silmek istediğinize emin misiniz?`
    : `Bu görüntüyü silmek istediğinize emin misiniz?`
);

const itemNameToDelete = computed(() =>
  isBatchDelete.value ? '' : imageToDelete.value?.name || ''
);

function openSingleDeleteModal(img: any) {
  isBatchDelete.value = false;
  imageToDelete.value = img;
  isDeleteModalOpen.value = true;
}

function openBatchDeleteModal() {
  isBatchDelete.value = true;
  imageToDelete.value = null;
  isDeleteModalOpen.value = true;
}

function closeDeleteModal() {
  isDeleteModalOpen.value = false;
  imageToDelete.value = null;
}

async function confirmDelete() {
  isDeleting.value = true;
  let success = false;

  try {
    if (isBatchDelete.value) {
      success = await imageStore.batchDeleteImages(selectedIds.value, props.patientId);
      if (success) {
        selectedIds.value = [];
        await loadImages(true);
      }
    } else {
      if (imageToDelete.value) {
        success = await imageStore.deleteImage(imageToDelete.value.id, props.patientId);
        if (success) {
          selectedIds.value = selectedIds.value.filter((id) => id !== imageToDelete.value.id);
          await loadImages(true);
        }
      }
    }
  } catch (error) {
    console.error('Silme hatası:', error);
  } finally {
    isDeleting.value = false;
    if (success) {
      closeDeleteModal();
    }
  }
}

defineExpose({
  loadImages,
});
</script>
