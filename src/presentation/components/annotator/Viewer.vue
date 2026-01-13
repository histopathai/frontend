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

        <div class="p-4">
          <div v-if="selectedAnnotationData" class="animate-fade-in space-y-4">
            <div class="flex items-start gap-3">
              <div
                class="w-1.5 h-8 rounded-full shrink-0"
                :style="{ backgroundColor: selectedAnnotationData.tag?.color || '#4F46E5' }"
              ></div>
              <div class="flex flex-col min-w-0">
                <span
                  class="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1"
                >
                  Lokal Etiket Türü
                </span>
                <h4 class="text-sm font-semibold text-gray-800 truncate leading-tight">
                  {{ selectedAnnotationData.tag?.tag_name || 'İsimsiz Anotasyon' }}
                </h4>
              </div>
            </div>

            <div class="bg-indigo-50/50 rounded-xl p-3 border border-indigo-100/50 shadow-sm">
              <div class="flex flex-col gap-1">
                <span class="text-[10px] font-medium text-indigo-400 uppercase tracking-tight"
                  >İşaretlenen Değer</span
                >
                <div class="text-xs font-bold text-indigo-900 break-words leading-relaxed">
                  <template v-if="selectedAnnotationData.tag?.tag_type === 'BOOLEAN'">
                    <div class="flex items-center gap-1.5">
                      <span
                        v-if="selectedAnnotationData.tag?.value"
                        class="text-emerald-600 flex items-center gap-1"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          class="w-4 h-4"
                        >
                          <path
                            fill-rule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                            clip-rule="evenodd"
                          />
                        </svg>
                        Evet
                      </span>
                      <span v-else class="text-rose-600 flex items-center gap-1">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          class="w-4 h-4"
                        >
                          <path
                            fill-rule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                            clip-rule="evenodd"
                          />
                        </svg>
                        Hayır
                      </span>
                    </div>
                  </template>

                  <template v-else>
                    {{ selectedAnnotationData.tag?.value || 'Veri girilmemiş' }}
                  </template>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-between pt-2 border-t border-gray-100">
              <div class="flex flex-col">
                <span class="text-[9px] text-gray-400 font-medium">Sistem ID</span>
                <code class="text-[9px] text-gray-500 bg-gray-100 px-1 rounded"
                  >#{{ selectedAnnotationData.id.substring(0, 8) }}</code
                >
              </div>

              <button
                @click="deleteSelected"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-all active:scale-95 border border-transparent hover:border-rose-100"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="2"
                  stroke="currentColor"
                  class="w-3.5 h-3.5"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                  />
                </svg>
                SİL
              </button>
            </div>
          </div>

          <div
            v-else
            class="flex flex-col items-center justify-center py-10 px-4 text-center space-y-3"
          >
            <div class="p-3 bg-gray-50 rounded-full">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="w-6 h-6 text-gray-300"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672ZM12 2.25V4.5m5.834.166-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243-1.59-1.59"
                />
              </svg>
            </div>
            <p class="text-[11px] text-gray-400 font-medium leading-relaxed italic">
              Anotasyon detaylarını görmek için <br />
              bir poligon seçin.
            </p>
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

// src/presentation/components/annotator/Viewer.vue

// src/presentation/components/annotator/Viewer.vue
// src/presentation/components/annotator/Viewer.vue

async function handleModalSave(data: { typeId: string; type: any; value: any }) {
  if (!currentDrawingData.value || !props.selectedImage) return;

  try {
    // 1. Ortak poligon verisini hazırla
    const rawPoints = convertAnnotoriousToPoints(currentDrawingData.value);
    const points = rawPoints.map((p) => Point.from(p));

    // 2. Payload hazırla
    // Not: Eğer modalın sadece bir tip dönüyorsa,
    // her "Kaydet" dediğinde bu fonksiyon bir kez çalışır.
    const payload = {
      polygon: points,
      tag: {
        tag_type: data.type.type,
        tag_name: data.type.name, // "Lokal skorlama" veya "Lokal değerlendirme"
        value: data.value,
        color: data.type.color || '#4F46E5',
        global: false,
      },
    };

    // 3. Backend'e gönder
    console.log('Gönderilen Payload:', payload);
    const saved = await annotationStore.createAnnotation(props.selectedImage.id, payload);

    if (saved) {
      // 4. KRİTİK: Kütüphanedeki geçici seçimi temizle
      if (anno.value) {
        anno.value.cancelSelected();
      }

      // 5. Listeyi tazele (Böylece hem önceki hem yeni kayıtlar gelir)
      await loadAnnotations(props.selectedImage.id);

      // Modal'ı kapat
      isModalOpen.value = false;
      currentDrawingData.value = null;
    }
  } catch (error) {
    console.error('Kayıt sırasında hata:', error);
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
