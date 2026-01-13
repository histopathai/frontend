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
      class="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur text-white transition-all z-10"
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
      class="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur text-white transition-all z-10"
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

    <LocalAnnotationModal
      :is-open="isModalOpen"
      :annotation-types="activeAnnotationTypes"
      @save="handleModalSave"
      @cancel="handleModalCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, type PropType, watch, computed, onMounted } from 'vue';
import type { Image } from '@/core/entities/Image';
import { useOpenSeadragon } from '@/presentation/composables/annotator/useOpenSeadragon';
import { useAnnotationTypeStore } from '@/stores/annotation_type';
import { useAnnotationStore } from '@/stores/annotation';
import LocalAnnotationModal from './LocalAnnotationModal.vue';
import { Point } from '@/core/value-objects/Point';

const props = defineProps({
  selectedImage: {
    type: Object as PropType<Image | null>,
    default: null,
  },
});

const emit = defineEmits(['prev-image', 'next-image']);
const annotationTypeStore = useAnnotationTypeStore();
const annotationStore = useAnnotationStore();

const viewerId = 'osd-viewer-main';
const { loading, loadImage, startDrawing, stopDrawing, anno } = useOpenSeadragon(viewerId);

const isModalOpen = ref(false);
const currentDrawingData = ref<any>(null);

const activeAnnotationTypes = computed(() => annotationTypeStore.annotationTypes);

watch(
  () => props.selectedImage,
  (newImg) => {
    if (newImg) loadImage(newImg);
  }
);

// --- Anotasyon Olay Yönetimi ---
onMounted(() => {
  watch(
    () => anno.value,
    (newAnno) => {
      if (newAnno) {
        newAnno.on('createSelection', (selection: any) => {
          currentDrawingData.value = selection;
          isModalOpen.value = true;
        });
      }
    },
    { immediate: true }
  );
});

/**
 * Modaldan gelen verilerle kaydetme işlemi
 */
async function handleModalSave(data: { typeId: string; type: any; value: any }) {
  if (!currentDrawingData.value || !props.selectedImage) return;

  try {
    const rawPoints = convertAnnotoriousToPoints(currentDrawingData.value);
    const points = rawPoints.map((p) => Point.from(p));

    const payload = {
      polygon: points,
      tag: {
        tag_type: data.type.type,
        tag_name: data.type.name,
        value: data.value,
        color: data.type.color || '#4F46E5',
        global: false,
      },
    };

    await annotationStore.createAnnotation(props.selectedImage.id, payload);

    if (anno.value) anno.value.cancelSelected();
    isModalOpen.value = false;
    currentDrawingData.value = null;
    stopDrawing();
  } catch (error) {
    console.error('Kaydetme hatası:', error);
  }
}

/**
 * İptal durumunda seçimi temizle
 */
function handleModalCancel() {
  if (anno.value) anno.value.cancelSelected();
  isModalOpen.value = false;
  currentDrawingData.value = null;
}

function convertAnnotoriousToPoints(selection: any) {
  const selector = selection.target?.selector || selection.selector;
  if (!selector || !selector.value) return [];

  let pointsStr = '';
  if (selector.value.includes('points="')) {
    const match = selector.value.match(/points="([^"]+)"/);
    pointsStr = match ? match[1] : '';
  } else if (selector.value.includes('polygon:')) {
    pointsStr = selector.value.split('polygon:')[1].trim();
  }

  if (!pointsStr) return [];

  const pointsArr = pointsStr.split(/[\s,]+/);
  const result: { x: number; y: number }[] = [];

  for (let i = 0; i < pointsArr.length; i += 2) {
    const xStr = pointsArr[i];
    const yStr = pointsArr[i + 1];

    if (xStr !== undefined && yStr !== undefined) {
      const x = parseFloat(xStr);
      const y = parseFloat(yStr);

      if (!isNaN(x) && !isNaN(y)) {
        result.push({ x, y });
      }
    }
  }

  return result;
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 0px;
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fade-in {
  animation: fadeIn 0.15s ease-out forwards;
}
</style>
