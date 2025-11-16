<template>
  <div class="relative w-full h-full bg-gray-800">
    <div :id="viewerId" class="w-full h-full"></div>

    <div
      v-if="loading"
      class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center"
    >
      <span class="text-white text-xl">Görüntü yükleniyor...</span>
    </div>

    <button
      @click="$emit('prev-image')"
      class="absolute left-4 top-1/2 -translate-y-1/2 btn btn-primary opacity-50 hover:opacity-100"
    >
      Önceki
    </button>
    <button
      @click="$emit('next-image')"
      class="absolute right-4 top-1/2 -translate-y-1/2 btn btn-primary opacity-50 hover:opacity-100"
    >
      Sonraki
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
const { loading, loadImage } = useOpenSeadragon(viewerId);

watch(
  () => props.selectedImage,
  (newImage) => {
    if (newImage) {
      loadImage(newImage);
    }
  }
);
</script>
