<template>
  <div class="relative w-full h-full bg-slate-900 overflow-hidden">
    <div :id="viewerId" class="w-full h-full"></div>

    <div
      v-if="loading"
      class="absolute inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm z-10"
    >
      <div class="flex flex-col items-center gap-3">
        <i class="fas fa-circle-notch fa-spin text-blue-500 text-3xl"></i>
        <span class="text-white text-sm font-medium">Görüntü Yükleniyor...</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { type PropType, watch } from 'vue';
import type { Image } from '@/core/entities/Image';
import { useOpenSeadragon } from '@/presentation/composables/annotator/useOpenSeadragon';

// Events: Poligon tamamlandığında koordinatları üst bileşene (AnnotatorView) fırlatır
const emit = defineEmits<{
  (e: 'polygon-complete', payload: { annotation: any; points: any[] }): void;
}>();

const props = defineProps({
  selectedImage: {
    type: Object as PropType<Image | null>,
    default: null,
  },
});

const viewerId = 'osd-viewer-main';

/**
 * useOpenSeadragon composable'ına emit fonksiyonunu paslıyoruz.
 * Böylece Annotorious içindeki 'createAnnotation' olayı doğrudan bu bileşeni tetikleyebilecek.
 */
const { loadImage, startDrawing, stopDrawing, removeAnnotation, loading } = useOpenSeadragon(
  viewerId,
  emit
);

// Dışarıya açılan metodlar: Üst bileşendeki (AnnotatorView) butonlar buraları tetikler
defineExpose({
  startDrawing,
  stopDrawing,
  removeAnnotation,
});

// Resim değişimini izle ve OSD'yi güncelle
watch(
  () => props.selectedImage,
  (newImg) => {
    if (newImg) {
      loadImage(newImg);
    }
  },
  { immediate: true }
);
</script>

<style scoped>
/* Annotorious poligonlarının seçilmesi ve çizilmesi sırasındaki stil düzenlemeleri */
:deep(.a9s-selection),
:deep(.a9s-annotation) {
  cursor: crosshair;
}

/* OSD Navigasyon kontrollerinin konumu */
:deep(.openseadragon-container) {
  background-color: transparent !important;
}
</style>
