<template>
  <div class="relative w-full h-full bg-gray-800">
    <div :id="viewerId" class="w-full h-full"></div>

    <div class="absolute top-4 right-4 z-20 flex flex-col gap-3 w-64">
      <div
        class="bg-white/90 backdrop-blur rounded-lg shadow-lg overflow-hidden border border-white/20"
      >
        <div
          class="bg-gray-50 px-3 py-2 border-b border-gray-100 flex justify-between items-center"
        >
          <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest"
            >Anotasyon Bilgisi</span
          >
          <div
            v-if="selectedAnnotationData"
            class="w-2 h-2 rounded-full"
            :style="{ backgroundColor: selectedAnnotationData.tag?.color || '#ccc' }"
          ></div>
        </div>

        <div class="p-4">
          <div v-if="selectedAnnotationData" class="animate-fade-in space-y-4">
            <div v-if="selectedAnnotationData.data && selectedAnnotationData.data.length > 0">
              <div
                v-for="(item, index) in selectedAnnotationData.data"
                :key="index"
                class="mb-4 last:mb-0"
              >
                <div class="flex items-start gap-3">
                  <div class="w-1 h-6 rounded-full shrink-0 bg-indigo-500"></div>
                  <div class="flex flex-col min-w-0">
                    <span
                      class="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1"
                    >
                      {{ item.tagName }}
                    </span>
                    <div
                      class="text-xs font-bold text-gray-800 break-words bg-gray-50 p-2 rounded-lg border border-gray-100"
                    >
                      {{ item.value }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="flex items-start gap-3">
              <div
                class="w-1.5 h-8 rounded-full shrink-0"
                :style="{ backgroundColor: selectedAnnotationData.tag?.color || '#4F46E5' }"
              ></div>
              <div class="flex flex-col min-w-0">
                <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  {{ selectedAnnotationData.tag?.tag_name }}
                </span>
                <div class="text-xs font-bold text-indigo-900 bg-indigo-50 p-2 rounded-lg">
                  {{ selectedAnnotationData.tag?.value }}
                </div>
              </div>
            </div>

            <div class="flex items-center justify-end pt-2 border-t border-gray-100">
              <button
                @click="deleteSelected"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold text-rose-500 hover:bg-rose-50 transition-all"
              >
                SİL
              </button>
            </div>
          </div>
          <div v-else class="text-center py-10 px-4">
            <p class="text-[11px] text-gray-400 font-medium italic">
              Detaylar için bir poligon seçin.
            </p>
          </div>
        </div>
      </div>
    </div>

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
import type { Annotation } from '@/core/entities/Annotation';
import { Point } from '@/core/value-objects/Point';
import { useOpenSeadragon } from '@/presentation/composables/annotator/useOpenSeadragon';
import { useAnnotationTypeStore } from '@/stores/annotation_type';
import { useAnnotationStore } from '@/stores/annotation';
import LocalAnnotationModal from './LocalAnnotationModal.vue';

const props = defineProps({
  selectedImage: { type: Object as PropType<Image | null>, default: null },
});

const annotationTypeStore = useAnnotationTypeStore();
const annotationStore = useAnnotationStore();
const viewerId = 'osd-viewer-main';
const { loading, loadAnnotations, loadImage, startDrawing, stopDrawing, anno } =
  useOpenSeadragon(viewerId);

const isModalOpen = ref(false);
const currentDrawingData = ref<any>(null);
const selectedAnnotationData = ref<Annotation | null>(null);

const activeAnnotationTypes = computed(() =>
  annotationTypeStore.annotationTypes.filter((t) => !t.global)
);

defineExpose({ startDrawing, stopDrawing });

watch(
  () => props.selectedImage,
  (newImg) => {
    if (newImg) loadImage(newImg);
  }
);

onMounted(() => {
  watch(
    () => anno.value,
    (newAnno) => {
      if (!newAnno) return;
      newAnno.on('createSelection', (selection: any) => {
        currentDrawingData.value = selection;
        isModalOpen.value = true;
      });

      newAnno.on('selectAnnotation', (annotation: any) => {
        const targetId = String(annotation.id).replace('#', '');
        const found = annotationStore.annotations.find((a) => String(a.id) === targetId);
        selectedAnnotationData.value = found || null;
      });

      newAnno.on('deselectAnnotation', () => {
        selectedAnnotationData.value = null;
      });
    },
    { immediate: true }
  );
});

async function handleModalSave(results: Array<{ type: any; value: any }>) {
  if (!currentDrawingData.value || !props.selectedImage || results.length === 0) return;

  try {
    const rawPoints = convertAnnotoriousToPoints(currentDrawingData.value);

    // İstediğiniz değişiklik burada: Her bir değerin tagName'i anotasyon tipi ile aynı olacak şekilde 'data' dizisi oluşturuluyor
    const dataArray = results.map((r) => ({
      tagName: r.type.name, // Anotasyon tipinin adı
      value: r.value,
      type: r.type.type,
    }));

    const payload = {
      polygon: rawPoints.map((p) => Point.from(p)),
      tag: {
        tag_type: results[0].type.type,
        tag_name: results[0].type.name, // İlk seçilenin adını ana isim yapıyoruz
        value: results[0].value,
        color: results[0].type.color || '#4f46e5',
        global: false,
      },
      data: dataArray, // DB'de isimlendirilmiş tüm değerleri içeren liste
    };

    await annotationStore.createAnnotation(props.selectedImage.id, payload);

    if (anno.value) anno.value.cancelSelected();
    await loadAnnotations(props.selectedImage.id);
    isModalOpen.value = false;
    currentDrawingData.value = null;
  } catch (error) {
    console.error('Kaydetme hatası:', error);
  }
}

function handleModalCancel() {
  if (anno.value) anno.value.cancelSelected();
  isModalOpen.value = false;
  currentDrawingData.value = null;
}

async function deleteSelected() {
  if (!selectedAnnotationData.value || !props.selectedImage) return;
  await annotationStore.deleteAnnotation(selectedAnnotationData.value.id, props.selectedImage.id);
  if (anno.value) anno.value.removeAnnotation(selectedAnnotationData.value.id);
  selectedAnnotationData.value = null;
}

function convertAnnotoriousToPoints(selection: any) {
  const selector = selection.target?.selector || selection.selector;
  const pointsStr = selector.value.match(/points="([^"]+)"/)?.[1] || '';
  return pointsStr.split(/[\s,]+/).reduce((acc: any[], val, i, arr) => {
    if (i % 2 === 0 && val) acc.push({ x: parseFloat(val), y: parseFloat(arr[i + 1]) });
    return acc;
  }, []);
}
</script>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
