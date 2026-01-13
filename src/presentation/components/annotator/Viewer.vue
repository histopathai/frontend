<template>
  <div class="relative w-full h-full bg-gray-800">
    <div :id="viewerId" class="w-full h-full"></div>

    <div class="absolute top-4 right-4 z-20 flex flex-col gap-3 w-64">
      <div class="bg-white/90 backdrop-blur rounded-lg shadow-lg p-1.5 flex gap-2 justify-center">
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
        </button>

        <button
          @click="stopDrawing"
          class="p-2 rounded hover:bg-indigo-50 text-gray-700 hover:text-indigo-600 transition-colors"
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
        </button>
      </div>

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

        <div class="p-3">
          <div v-if="selectedAnnotationData" class="animate-fade-in">
            <div class="flex items-center gap-2 mb-2">
              <div
                class="w-2 h-2 rounded-full"
                :style="{ backgroundColor: selectedAnnotationData.tag?.color }"
              ></div>
              <div class="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                {{ selectedAnnotationData.tag?.tag_name }}
              </div>
            </div>

            <div class="bg-gray-50 rounded-lg p-3 border border-gray-100 shadow-inner">
              <div class="text-xs text-gray-800 font-medium break-all">
                <template v-if="selectedAnnotationData.tag?.tag_type === 'BOOLEAN'">
                  {{ selectedAnnotationData.tag?.value ? '✓ Evet' : '✕ Hayır' }}
                </template>
                <template v-else>
                  {{ selectedAnnotationData.tag?.value || 'Değer girilmemiş' }}
                </template>
              </div>
            </div>

            <div class="mt-3 flex justify-between items-center px-1">
              <span class="text-[9px] text-gray-400 italic"
                >ID: {{ selectedAnnotationData.id.substring(0, 8) }}</span
              >
              <button
                @click="deleteSelected"
                class="text-[10px] text-red-500 hover:text-red-700 font-bold transition-colors"
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="absolute inset-0 bg-black/50 flex items-center justify-center z-30">
      <div
        class="animate-spin rounded-full h-8 w-8 border-4 border-white border-t-transparent"
      ></div>
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

const emit = defineEmits(['prev-image', 'next-image']);

const annotationTypeStore = useAnnotationTypeStore();
const annotationStore = useAnnotationStore();
const viewerId = 'osd-viewer-main';
const { loading, loadAnnotations, loadImage, startDrawing, stopDrawing, anno } =
  useOpenSeadragon(viewerId);

const isModalOpen = ref(false);
const currentDrawingData = ref<any>(null);
const selectedAnnotationData = ref<Annotation | null>(null);

const activeAnnotationTypes = computed(() => annotationTypeStore.annotationTypes);

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
      if (newAnno) {
        // Çizim bitince modalı aç
        newAnno.on('createSelection', (selection: any) => {
          currentDrawingData.value = selection;
          isModalOpen.value = true;
        });

        // Poligon seçilince Info Box'ı doldur
        // src/presentation/components/annotator/Viewer.vue içindeki onMounted watch bloğu

        // src/presentation/components/annotator/Viewer.vue içindeki onMounted

        newAnno.on('selectAnnotation', (annotation: any) => {
          // Annotorious bazen ID'nin başına # koyabilir veya string/number farkı olabilir
          const cleanId = String(annotation.id).replace('#', '');

          console.log('Seçilen ID:', cleanId);

          // Eşleşmeyi '==' ile yaparak tip farklarını (string vs number) ortadan kaldırın
          const found = annotationStore.annotations.find((a) => String(a.id) == cleanId);

          if (found) {
            console.log('Bulunan Veri Tag:', found.tag);
            selectedAnnotationData.value = found;
          } else {
            // Eğer hala bulunamazsa, tüm listeyi yazdırıp ID'leri karşılaştırın (Debug için)
            console.warn(
              "Store'daki ID'ler:",
              annotationStore.annotations.map((a) => a.id)
            );
            selectedAnnotationData.value = null;
          }
        });

        // Seçim boşa çıkınca Info Box'ı temizle
        newAnno.on('deselectAnnotation', () => {
          selectedAnnotationData.value = null;
        });
      }
    },
    { immediate: true }
  );
});

async function handleModalSave(data: { typeId: string; type: any; value: any }) {
  if (!currentDrawingData.value || !props.selectedImage) return;

  try {
    const rawPoints = convertAnnotoriousToPoints(currentDrawingData.value);
    const points = rawPoints.map((p) => Point.from(p));

    const payload = {
      polygon: points,
      tag: {
        tag_type: data.type.type, // 'TEXT', 'BOOLEAN' vb.
        tag_name: data.type.name, // ÖNEMLİ: Workspace'te tanımladığınız etiket ismi (Mitoz Varlığı vb.)
        value: data.value,
        color: data.type.color || '#4F46E5',
        global: false,
      },
    };

    await annotationStore.createAnnotation(props.selectedImage.id, payload);
    if (anno.value) {
      anno.value.cancelSelected();
      await loadAnnotations(props.selectedImage.id);
    }

    isModalOpen.value = false;
    currentDrawingData.value = null;
    stopDrawing();
  } catch (error) {
    console.error('Hata:', error);
  }
}

function handleModalCancel() {
  if (anno.value) anno.value.cancelSelected();
  isModalOpen.value = false;
  currentDrawingData.value = null;
}

async function deleteSelected() {
  if (selectedAnnotationData.value && props.selectedImage) {
    const success = await annotationStore.deleteAnnotation(
      selectedAnnotationData.value.id,
      props.selectedImage.id
    );
    if (success && anno.value) {
      anno.value.removeAnnotation(selectedAnnotationData.value.id);
      selectedAnnotationData.value = null;
    }
  }
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
  const result = [];
  for (let i = 0; i < pointsArr.length; i += 2) {
    const xStr = pointsArr[i];
    const yStr = pointsArr[i + 1];
    if (xStr !== undefined && yStr !== undefined) {
      result.push({ x: parseFloat(xStr), y: parseFloat(yStr) });
    }
  }
  return result;
}
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.2s ease-out forwards;
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
