<template>
  <div class="relative w-full h-full bg-gray-800">
    <div :id="viewerId" class="w-full h-full"></div>

    <LocalAnnotationModal
      :is-open="isModalOpen"
      :annotation-types="activeAnnotationTypes"
      :initial-values="editInitialValues"
      @save="handleModalSave"
      @cancel="handleModalCancel"
      @delete="handleModalDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, type PropType, watch, computed, onMounted, onUnmounted } from 'vue';
import type { Image } from '@/core/entities/Image';
import type { Annotation } from '@/core/entities/Annotation';
import { Point } from '@/core/value-objects/Point';
import { useOpenSeadragon } from '@/presentation/composables/annotator/useOpenSeadragon';
import { useAnnotationTypeStore } from '@/stores/annotation_type';
import { useAnnotationStore } from '@/stores/annotation';
import LocalAnnotationModal from './LocalAnnotationModal.vue';
import { useToast } from 'vue-toastification';

const toast = useToast();

const props = defineProps({
  selectedImage: { type: Object as PropType<Image | null>, default: null },
});

const annotationTypeStore = useAnnotationTypeStore();
const annotationStore = useAnnotationStore();
const viewerId = 'osd-viewer-main';
const { loadAnnotations, loadImage, startDrawing, stopDrawing, anno } = useOpenSeadragon(viewerId);

const isModalOpen = ref(false);
const currentDrawingData = ref<any>(null);
const selectedAnnotationData = ref<Annotation | null>(null);
const editInitialValues = ref<Record<string, any>>({});

const activeAnnotationTypes = computed(() =>
  annotationTypeStore.annotationTypes.filter((t) => !t.global)
);

defineExpose({ startDrawing, stopDrawing });

watch(
  () => props.selectedImage,
  async (newImg) => {
    if (newImg) {
      await loadImage(newImg);
    }
  }
);

onMounted(() => {
  const viewerEl = document.getElementById(viewerId);
  if (viewerEl) {
    viewerEl.addEventListener('dblclick', handleDoubleClick);
  }

  watch(
    () => anno.value,
    (newAnno) => {
      if (!newAnno) return;

      newAnno.on('createSelection', (selection: any) => {
        currentDrawingData.value = selection;
        editInitialValues.value = {};
        isModalOpen.value = true;
      });

      // --- LOG EKLENDİ ---
      newAnno.on('selectAnnotation', (annotation: any) => {
        const targetId = String(annotation.id).replace('#', '');
        console.group('🎯 Annotation Selected (Click)');
        console.log('Target ID:', targetId);

        const realAnnotation = annotationStore.annotations.find((a) => String(a.id) === targetId);
        if (realAnnotation) {
          console.log('✅ Found in Store:', realAnnotation);
          console.log('🏷️ Tag Data:', realAnnotation.tag);
          selectedAnnotationData.value = realAnnotation;
        } else {
          const pendingAnnotation = annotationStore.pendingAnnotations.find(
            (p) => p.tempId === targetId
          );
          if (pendingAnnotation) {
            console.log('⏳ Found in Pending:', pendingAnnotation);
            selectedAnnotationData.value = {
              id: pendingAnnotation.tempId,
              tag: pendingAnnotation.tag,
              polygon: pendingAnnotation.polygon || [],
            } as any;
          } else {
            console.warn('❌ Annotation NOT FOUND in Store!');
          }
        }
        console.groupEnd();
      });

      newAnno.on('deselectAnnotation', () => {
        if (!isModalOpen.value) {
          selectedAnnotationData.value = null;
        }
      });
    },
    { immediate: true }
  );
});

onUnmounted(() => {
  const viewerEl = document.getElementById(viewerId);
  if (viewerEl) {
    viewerEl.removeEventListener('dblclick', handleDoubleClick);
  }
});

// --- LOG EKLENDİ ---
function handleDoubleClick() {
  console.group('🖱️ Double Click Event');
  if (!anno.value) {
    console.log('❌ Annotorious instance not found');
    console.groupEnd();
    return;
  }

  const selected = anno.value.getSelected();
  console.log('Selected Object (Annotorious):', selected);
  console.log('Current Store Data:', selectedAnnotationData.value);

  if (selected && selectedAnnotationData.value) {
    const currentTag = selectedAnnotationData.value.tag;

    if (currentTag) {
      console.log('🏷️ Processing Tag:', currentTag);
      console.log(
        '📋 Available Types:',
        activeAnnotationTypes.value.map((t) => ({ id: t.id, name: t.name }))
      );

      // Eşleşme kontrolü logu
      const type = activeAnnotationTypes.value.find((t) => {
        const match = t.name === currentTag.tag_name;
        if (match)
          console.log(`✅ MATCH FOUND: Type "${t.name}" matches Tag "${currentTag.tag_name}"`);
        return match;
      });

      if (type) {
        editInitialValues.value = { [type.id]: currentTag.value };
        console.log('🚀 Setting Initial Values:', editInitialValues.value);
      } else {
        console.warn(`⚠️ NO MATCHING TYPE FOUND for tag name: "${currentTag.tag_name}"`);
      }
    } else {
      console.warn('⚠️ Selected annotation has NO TAG data');
      editInitialValues.value = {};
    }

    currentDrawingData.value = null;
    isModalOpen.value = true;
  } else {
    console.log('❌ No selection or data missing');
  }
  console.groupEnd();
}

async function handleModalSave(results: Array<{ type: any; value: any }>) {
  if (results.length === 0) return;

  if (selectedAnnotationData.value && !currentDrawingData.value) {
    const res = results[0];
    if (!res) return;
    const annId = String(selectedAnnotationData.value.id);

    const newTagData = {
      tag_type: res.type.type,
      tag_name: res.type.name,
      value: res.value,
      color: res.type.color || '#ec4899',
      global: false,
    };

    if (annId.startsWith('temp-')) {
      annotationStore.updatePendingAnnotation(annId, { tag: newTagData });
      toast.success('Geçici etiket güncellendi.');
    } else {
      await annotationStore.updateAnnotation(annId, { tag: newTagData });
    }

    if (anno.value) {
      const w3cAnnotation = anno.value.getAnnotation(annId);
      if (w3cAnnotation) {
        w3cAnnotation.body = [
          {
            type: 'TextualBody',
            value: `${res.type.name}: ${res.value}`,
            purpose: 'tagging',
          },
        ];
        anno.value.updateAnnotation(w3cAnnotation);
      }
      anno.value.cancelSelected();
    }

    isModalOpen.value = false;
    editInitialValues.value = {};
    return;
  }

  if (!currentDrawingData.value || !props.selectedImage) return;

  const rawPoints = convertAnnotoriousToPoints(currentDrawingData.value);
  const points = rawPoints.map((p: { x: number; y: number }) => Point.from(p));

  results.forEach((res) => {
    const tempId = `temp-${Date.now()}-${Math.random()}`;

    annotationStore.addPendingAnnotation({
      tempId,
      imageId: props.selectedImage!.id,
      tag: {
        tag_type: res.type.type,
        tag_name: res.type.name,
        value: res.value,
        color: res.type.color || '#ec4899',
        global: false,
      },
      polygon: points.map((p: { x: number; y: number }) => ({ x: p.x, y: p.y })),
    });

    if (anno.value) {
      anno.value.addAnnotation({
        id: tempId,
        type: 'Annotation',
        body: [
          {
            type: 'TextualBody',
            value: `${res.type.name}: ${res.value}`,
            purpose: 'tagging',
          },
        ],
        target: {
          selector: {
            type: 'SvgSelector',
            value: `<svg><polygon points="${rawPoints.map((p: { x: number; y: number }) => `${p.x},${p.y}`).join(' ')}"></polygon></svg>`,
          },
        },
      });
    }
  });

  if (anno.value) anno.value.cancelSelected();

  isModalOpen.value = false;
  currentDrawingData.value = null;
  editInitialValues.value = {};

  toast.info(`${results.length} etiket eklendi.`);
}

function handleModalCancel() {
  if (anno.value) anno.value.cancelSelected();
  isModalOpen.value = false;
  editInitialValues.value = {};
}

function handleModalDelete() {
  deleteSelected();
  isModalOpen.value = false;
  editInitialValues.value = {};
}

async function deleteSelected() {
  if (!selectedAnnotationData.value || !props.selectedImage) return;

  const annotationId = selectedAnnotationData.value.id;
  if (!annotationId) return;

  if (String(annotationId).startsWith('temp-')) {
    annotationStore.removePendingAnnotation(String(annotationId));
    if (anno.value) anno.value.removeAnnotation(annotationId);
    toast.info('Geçici etiket silindi');
  } else {
    await annotationStore.deleteAnnotation(String(annotationId), props.selectedImage.id);
    if (anno.value) anno.value.removeAnnotation(annotationId);
  }

  selectedAnnotationData.value = null;
}

function convertAnnotoriousToPoints(selection: any): Array<{ x: number; y: number }> {
  const selector = selection.target?.selector || selection.selector;
  const pointsStr = selector.value.match(/points="([^"]+)"/)?.[1] || '';
  return pointsStr
    .split(/[\s,]+/)
    .reduce((acc: Array<{ x: number; y: number }>, val: string, i: number, arr: string[]) => {
      if (i % 2 === 0 && val && arr[i + 1]) {
        acc.push({ x: parseFloat(val), y: parseFloat(arr[i + 1]!) });
      }
      return acc;
    }, []);
}
</script>
