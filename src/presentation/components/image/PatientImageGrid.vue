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
            @click="handleBatchDelete"
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

    <div v-else class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      <div
        v-for="img in images"
        :key="img.id"
        class="group relative bg-white p-2 rounded-lg border transition-all hover:shadow-md"
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

        <span
          class="absolute bottom-2 right-2 z-10 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium opacity-90 shadow-sm"
          :class="{
            'bg-yellow-100 text-yellow-800': img.status.toString() === 'PROCESSING',
            'bg-green-100 text-green-800': img.status.toString() === 'PROCESSED',
            'bg-red-100 text-red-800': img.status.toString() === 'FAILED',
          }"
        >
          {{ img.status.isProcessed() ? 'Hazır' : img.status.isFailed() ? 'Hata' : 'İşleniyor' }}
        </span>

        <div
          class="aspect-square bg-gray-100 rounded-md overflow-hidden mb-2 flex items-center justify-center cursor-pointer"
        >
          <img
            v-if="img.isProcessed()"
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
  </div>
</template>

<script setup lang="ts">
import { useImageList } from '@/presentation/composables/image/useImageList';

const props = defineProps({
  patientId: { type: String, required: true },
});

const emit = defineEmits(['transfer', 'batch-transfer']);

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
  handleBatchDelete,
  transferSelected,
} = useImageList(props.patientId, emit);
</script>
