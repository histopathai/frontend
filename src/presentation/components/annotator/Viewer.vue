<template>
  <div class="relative w-full h-full bg-gray-800">
    <div :id="viewerId" class="w-full h-full"></div>
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

// src/presentation/components/annotator/Viewer.vue

// src/presentation/components/annotator/Viewer.vue

async function handleModalSave(results: Array<{ type: any; value: any }>) {
  // 1. Guard clause: Dizinin boş olmadığını ve resmin seçili olduğunu kesinleştirin
  if (!results || results.length === 0 || !props.selectedImage || !currentDrawingData.value) {
    return;
  }

  try {
    const rawPoints = convertAnnotoriousToPoints(currentDrawingData.value);
    const points = rawPoints.map((p) => Point.from(p));

    // 2. ÇÖZÜM: İlk elemanı dizi parçalama ile alın.
    // TypeScript yukarıdaki length kontrolü sayesinde bunun undefined olmayacağını anlar.
    const [primaryResult] = results;

    // 3. Payload hazırlama
    const payload = {
      polygon: points,
      // Ana etiket (Görselleştirme için kullanılır)
      tag: {
        tag_type: primaryResult.type.type,
        tag_name: primaryResult.type.name,
        value: primaryResult.value,
        color: primaryResult.type.color || '#4F46E5',
        global: false,
      },
      // Tüm etiketleri 'data' dizisinde topluyoruz (DB'ye toplu kayıt için)
      data: results.map((r) => ({
        tagName: r.type.name,
        value: r.value,
        type: r.type.type,
      })),
      description: results.map((r) => `${r.type.name}: ${r.value}`).join(', '),
    };

    const saved = await annotationStore.createAnnotation(props.selectedImage.id, payload);

    if (saved) {
      if (anno.value) {
        anno.value.cancelSelected();
      }
      // UI ve Annotorious'u güncel verilerle yenile
      await loadAnnotations(props.selectedImage.id);

      isModalOpen.value = false;
      currentDrawingData.value = null;
    }
  } catch (error) {
    console.error('Çoklu etiket kaydı sırasında hata:', error);
  }
}

function handleModalCancel() {
  if (anno.value) anno.value.cancelSelected();
  isModalOpen.value = false;
  currentDrawingData.value = null;
}

async function deleteSelected() {
  if (!selectedAnnotationData.value || !props.selectedImage) return;

  try {
    const success = await annotationStore.deleteAnnotation(
      selectedAnnotationData.value.id,
      props.selectedImage.id
    );

    if (success) {
      if (anno.value) {
        // Annotorious'tan ID ile kaldır
        anno.value.removeAnnotation(selectedAnnotationData.value.id);
      }
      selectedAnnotationData.value = null;
      // UI'ı senkronize et
      await loadAnnotations(props.selectedImage.id);
    }
  } catch (error) {
    console.error('Silme hatası:', error);
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
