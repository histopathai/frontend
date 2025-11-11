<template>
  <div class="border rounded shadow-sm bg-white overflow-hidden flex flex-col">
    <div
      class="aspect-w-1 aspect-h-1 w-full bg-gray-200 flex items-center justify-center overflow-hidden"
    >
      <div v-if="image.status.toString() === 'PROCESSING'" class="p-2 text-center">
        <svg
          class="animate-spin h-5 w-5 text-gray-500 mx-auto"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <span class="text-xs text-gray-500 mt-1 block">İşleniyor...</span>
      </div>

      <div v-else-if="image.status.toString() === 'FAILED'" class="p-2 text-center">
        <svg
          class="h-5 w-5 text-red-500 mx-auto"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
        <span class="text-xs text-red-500 mt-1 block">Hata</span>
      </div>

      <img
        v-else-if="image.status.toString() === 'PROCESSED'"
        :src="thumbnailUrl"
        :alt="image.name"
        class="w-full h-full object-cover"
        @error="onImageError"
      />
      <div v-else class="p-2 text-center">
        <svg
          class="h-5 w-5 text-gray-400 mx-auto"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
          />
        </svg>
        <span class="text-xs text-gray-400 mt-1 block">Bekliyor</span>
      </div>
    </div>

    <div class="p-2 border-t border-gray-100">
      <p class="text-xs font-semibold truncate" :title="image.name">{{ image.name }}</p>
      <div class="flex justify-end gap-2 text-xs mt-1.5">
        <button
          v-if="image.status.toString() === 'PROCESSED'"
          @click="viewImage"
          class="btn-image-action text-blue-600"
        >
          Görüntüle
        </button>
        <button @click.stop="$emit('delete-image', image)" class="btn-image-action text-red-600">
          Sil
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, computed } from 'vue';
import type { PropType } from 'vue';
import type { Image } from '@/core/entities/Image';
import { useRouter } from 'vue-router';

const props = defineProps({
  image: { type: Object as PropType<Image>, required: true },
});

const emit = defineEmits(['delete-image', 'view-image']);
const router = useRouter();

const thumbnailUrl = computed(() => {
  const processedPath = props.image.processedpath;
  if (!processedPath) {
    return 'https://via.placeholder.com/150/FFEBEE/B71C1C?text=Path+Hatas%C4%B1';
  }
  return `/api/v1/proxy/${processedPath}/thumbnail.jpeg`;
});

const onImageError = (event: Event) => {
  (event.target as HTMLImageElement).src =
    'https://via.placeholder.com/150/FFEBEE/B71C1C?text=Hata';
};

const viewImage = () => {
  alert(`Görüntüleyici açılıyor: ${props.image.id}`);
  emit('view-image', props.image);
};
</script>

<style scoped>
.btn-image-action {
  @apply font-medium hover:underline;
}
.aspect-w-1 {
  aspect-ratio: 1 / 1;
}
</style>
