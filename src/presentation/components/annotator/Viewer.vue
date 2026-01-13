<template>
  <div class="relative w-full h-full bg-gray-800">
    <div :id="viewerId" class="w-full h-full"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, type PropType, watch, computed, onMounted } from 'vue';
import type { Image } from '@/core/entities/Image';
import { useOpenSeadragon } from '@/presentation/composables/annotator/useOpenSeadragon';
import { useToast } from 'vue-toastification';

const toast = useToast();

const props = defineProps({
  selectedImage: { type: Object as PropType<Image | null>, default: null },
});

const viewerId = 'osd-viewer-main';
const { loadImage, startDrawing, stopDrawing, anno } = useOpenSeadragon(viewerId);

defineExpose({ startDrawing, stopDrawing });

watch(
  () => props.selectedImage,
  (newImg) => {
    if (newImg) loadImage(newImg);
  }
);
</script>
