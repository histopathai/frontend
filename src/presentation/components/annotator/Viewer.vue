<template>
  <div class="relative w-full h-full bg-gray-800">
    <div :id="viewerId" class="w-full h-full"></div>

    <div
      class="absolute top-4 right-4 z-20 bg-white/90 backdrop-blur rounded-lg shadow-lg p-1.5 flex flex-col gap-2"
    >
      <button
        @click="startDrawing"
        class="p-2 rounded hover:bg-indigo-50 text-gray-700 hover:text-indigo-600 transition-colors group relative"
        title="Çizim Yap (Poligon)"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="size-6"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42"
          />
        </svg>

        <span
          class="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity"
        >
          Çizim Modu
        </span>
      </button>

      <button
        @click="stopDrawing"
        class="p-2 rounded hover:bg-indigo-50 text-gray-700 hover:text-indigo-600 transition-colors group relative"
        title="Seç / Düzenle"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="w-6 h-6"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672ZM12 2.25V4.5m5.834.166-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243-1.59-1.59"
          />
        </svg>
        <span
          class="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity"
        >
          Seçim Modu
        </span>
      </button>
    </div>

    <div
      v-if="loading"
      class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30"
    >
      <div class="text-center">
        <div
          class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-white border-t-transparent mb-2"
        ></div>
        <p class="text-white text-lg font-medium">Görüntü Yükleniyor...</p>
      </div>
    </div>

    <button
      @click="$emit('prev-image')"
      class="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur text-white transition-all hover:scale-110 focus:outline-none z-10"
      title="Önceki Görüntü"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="2"
        stroke="currentColor"
        class="w-6 h-6"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
      </svg>
    </button>
    <button
      @click="$emit('next-image')"
      class="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur text-white transition-all hover:scale-110 focus:outline-none z-10"
      title="Sonraki Görüntü"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="2"
        stroke="currentColor"
        class="w-6 h-6"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { type PropType, watch } from 'vue';
import type { Image } from '@/core/entities/Image';
import { useOpenSeadragon } from '@/presentation/composables/annotator/useOpenSeadragon';

const props = defineProps({
  selectedImage: {
    type: Object as PropType<Image | null>,
    default: null,
  },
});

defineEmits(['prev-image', 'next-image']);

const viewerId = 'osd-viewer-main';
const { loading, loadImage, startDrawing, stopDrawing } = useOpenSeadragon(viewerId);

watch(
  () => props.selectedImage,
  (newImage) => {
    if (newImage) {
      loadImage(newImage);
    }
  }
);
</script>
