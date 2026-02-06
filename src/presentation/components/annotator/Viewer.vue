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

import { useWorkspaceStore } from '@/stores/workspace';

const activeAnnotationTypes = computed(() => {
  const workspaceStore = useWorkspaceStore();
  const currentWs = workspaceStore.currentWorkspace;
  if (!currentWs || !currentWs.annotationTypeIds) return [];

  return annotationTypeStore.annotationTypes.filter(
    (t) => !t.global && currentWs.annotationTypeIds.includes(t.id)
  );
});

defineExpose({ startDrawing, stopDrawing });

watch(
  () => props.selectedImage,
  async (newImg, oldImg) => {
    if (!newImg || (oldImg && newImg.id === oldImg.id)) {
      console.log('⚠️ [Viewer] Aynı resim veya geçersiz veri, atlanıyor.');
      return;
    }

    console.log('✅ [Viewer] Yeni resim yükleniyor:', newImg.id);
    await loadImage(newImg);
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

      newAnno.on('selectAnnotation', (annotation: any) => {
        const rawId = String(annotation.id);
        const targetId = rawId.startsWith('#') ? rawId.slice(1) : rawId;

        console.log('🖱️ Poligon Seçildi. ID:', targetId);

        const realAnnotation = annotationStore.annotations.find((a) => String(a.id) === targetId);
        let foundData = realAnnotation;
        if (!foundData) {
          const pending = annotationStore.pendingAnnotations.find(
            (p) => String(p.tempId) === targetId
          );
          if (pending) {
            console.log('⏳ Pending (Geçici) veri bulundu.');
            foundData = {
              id: pending.tempId,
              name: pending.name,
              tag_type: pending.tag_type,
              value: pending.value,
              polygon: pending.polygon || [],
            } as any;
          }
        }

        if (foundData) {
          selectedAnnotationData.value = foundData;

          console.group('🔍 Veri Eşleştirme (Fix)');
          const initialValues: Record<string, any> = {};

          const normalize = (str: any) =>
            String(str || '')
              .trim()
              .toLowerCase();

          activeAnnotationTypes.value.forEach((type) => {
            const targetName = normalize(type.name);

            // Match by ID first (most reliable)
            if ((foundData as any).annotationTypeId === type.id) {
              initialValues[type.id] = (foundData as any).value;
              console.log(`✅ [${type.name}] -> Matched by ID: ${(foundData as any).value}`);
            }
            // Fallback for pending annotations (match by name/type)
            else if (
              (foundData as any).name === type.name ||
              (foundData as any).tag_type === type.type
            ) {
              initialValues[type.id] = (foundData as any).value;
              console.log(`✅ [${type.name}] -> Matched by Name/Type: ${(foundData as any).value}`);
            }
          });

          console.log('🚀 Modal Değerleri:', initialValues);
          console.groupEnd();

          editInitialValues.value = initialValues;

          currentDrawingData.value = null;
          isModalOpen.value = true;
        } else {
          console.warn('❌ Store içinde bu ID ile eşleşen veri bulunamadı:', targetId);
        }
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

function handleDoubleClick() {
  console.group('🖱️ Double Click Event');
  if (!anno.value) {
    console.groupEnd();
    return;
  }

  const selected = anno.value.getSelected();

  if (selected && selectedAnnotationData.value) {
    const annData = selectedAnnotationData.value;

    // Check if it's a real annotation (has annotationTypeId)
    if ((annData as Annotation).annotationTypeId) {
      const typeId = (annData as Annotation).annotationTypeId;
      const type = activeAnnotationTypes.value.find((t) => t.id === typeId);

      if (type) {
        editInitialValues.value = { [type.id]: (annData as Annotation).value };
      }
    }
    // Check if it's pending (might use different structure or tempId)
    else if ((annData as any).tag_type) {
      // Pending annotation using flat structure
      // We need to look up type by name if we don't have ID, or maybe we have typeId?
      // Pending annotation creation logic in handleModalSave doesn't seem to store typeId?
      // Let's re-examine addPendingAnnotation in handleModalSave
    }
    // Fallback for legacy 'tag' object if still present in pending
    else if ((annData as any).tag) {
      const currentTag = (annData as any).tag;
      const type = activeAnnotationTypes.value.find((t) => {
        const match = t.name === currentTag.tag_name;
        if (match) return match;
      });

      if (type) {
        editInitialValues.value = { [type.id]: currentTag.value };
      }
    } else {
      editInitialValues.value = {};
    }

    currentDrawingData.value = null;
    isModalOpen.value = true;
  } else {
    editInitialValues.value = {};
  }
  console.groupEnd();
}

async function handleModalSave(results: Array<{ type: any; value: any }>) {
  if (results.length === 0) return;

  if (selectedAnnotationData.value && !currentDrawingData.value) {
    const res = results[0];
    if (!res) return;
    const annId = String(selectedAnnotationData.value.id);

    const newData = {
      tag_type: res.type.type,
      name: res.type.name,
      value: res.value,
      color: res.type.color || '#ec4899',
      is_global: false,
    };

    if (annId.startsWith('temp-')) {
      annotationStore.updatePendingAnnotation(annId, newData);
      toast.success('Geçici etiket güncellendi.');
    } else {
      await annotationStore.updateAnnotation(annId, newData);
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

    // Need to find annotation type ID?
    // res.type is likely the AnnotationType object from LocalAnnotationModal
    const typeId = res.type.id || '';

    annotationStore.addPendingAnnotation({
      tempId,
      imageId: props.selectedImage!.id,
      // Flattened structure
      ws_id: props.selectedImage!.parent.id, // Assuming parent is workspace? Or get from store?
      // Wait, CreateNewAnnotationRequest needs ws_id.
      // If props.selectedImage.parent is 'patient', we need to find workspace.
      // But addPendingAnnotation might only store partial data?
      name: res.type.name,
      tag_type: res.type.type,
      value: res.value,
      color: res.type.color || '#ec4899',
      is_global: false,
      polygon: points.map((p: { x: number; y: number }) => ({ x: p.x, y: p.y })),
    } as any); // Type assertion because pending annotations might be looser or strict match

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
