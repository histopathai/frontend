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
import { useWorkspaceStore } from '@/stores/workspace';

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

const activeAnnotationTypes = computed(() => {
  const workspaceStore = useWorkspaceStore();
  const currentWs = workspaceStore.currentWorkspace;
  const allTypes = annotationTypeStore.annotationTypes;

  if (!currentWs || !currentWs.annotationTypeIds) {
    return [];
  }

  return allTypes.filter((t) => {
    const isGlobal = t.global ?? (t as any).is_global ?? false;

    if (isGlobal) return false;
    const belongsToWorkspace = currentWs.annotationTypeIds.includes(t.id);

    return belongsToWorkspace;
  });
});

defineExpose({ startDrawing, stopDrawing });

watch(
  () => props.selectedImage,
  async (newImg, oldImg) => {
    if (!newImg || (oldImg && newImg.id === oldImg.id)) {
      return;
    }
    await loadImage(newImg);
    if (newImg) {
      let targetWorkspaceId = (newImg as any).wsId;
      if (!targetWorkspaceId && newImg.parent && newImg.parent.type === 'workspace') {
        targetWorkspaceId = newImg.parent.id;
      }

      if (targetWorkspaceId) {
        const workspaceStore = useWorkspaceStore();
        if (workspaceStore.currentWorkspace?.id !== targetWorkspaceId) {
          try {
            await workspaceStore.fetchWorkspaceById(targetWorkspaceId);
          } catch (e) {
            console.error('Failed to fetch workspace in Viewer:', targetWorkspaceId, e);
          }
        }
      }
    }
  },
  { immediate: true } // Sayfa ilk açıldığında da çalışması için
);

// Watch for pending annotations being cleared (after save)
// When pending count goes to 0, it means annotations were just saved
// We need to refresh the viewer to show the real annotation IDs
let previousPendingCount = annotationStore.pendingCount;
watch(
  () => annotationStore.pendingCount,
  async (newCount, oldCount) => {
    // If pending count went from >0 to 0, annotations were just saved
    if (oldCount > 0 && newCount === 0 && props.selectedImage) {
      console.log('🔄 Pending annotations cleared, refreshing viewer...');
      // Small delay to ensure backend has processed everything
      await new Promise((resolve) => setTimeout(resolve, 300));
      await loadAnnotations(props.selectedImage.id);
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

          console.group("🔍 Aynı Polygon'daki Tüm Annotation'ları Bulma");
          const initialValues: Record<string, any> = {};

          // Helper: Compare polygon coordinates (with tolerance for floating point)
          const isSamePolygon = (poly1: any[], poly2: any[]) => {
            if (!poly1 || !poly2 || poly1.length !== poly2.length) return false;
            const tolerance = 0.01;
            return poly1.every((p1, i) => {
              const p2 = poly2[i];
              return p2 && Math.abs(p1.x - p2.x) < tolerance && Math.abs(p1.y - p2.y) < tolerance;
            });
          };

          // Find all annotations with the same polygon coordinates
          const selectedPolygon = (foundData as any).polygon;
          if (selectedPolygon && props.selectedImage) {
            const annotationsOnSamePolygon = annotationStore.annotations.filter((ann) =>
              isSamePolygon(ann.polygon, selectedPolygon)
            );

            console.log(
              `📍 Aynı polygon üzerinde ${annotationsOnSamePolygon.length} annotation bulundu`
            );

            // Populate initialValues with ALL annotations on this polygon
            annotationsOnSamePolygon.forEach((ann) => {
              const typeId = ann.annotationTypeId;
              const type = activeAnnotationTypes.value.find((t) => t.id === typeId);
              if (type) {
                initialValues[type.id] = ann.value;
                console.log(`✅ [${type.name}] -> ${ann.value}`);
              }
            });

            // Also check pending annotations on the same polygon
            const pendingOnSamePolygon = annotationStore.pendingAnnotations.filter(
              (p) =>
                p.imageId === props.selectedImage!.id &&
                isSamePolygon(p.polygon || [], selectedPolygon)
            );

            pendingOnSamePolygon.forEach((pending) => {
              const type = activeAnnotationTypes.value.find((t) => t.name === pending.name);
              if (type && !initialValues[type.id]) {
                initialValues[type.id] = pending.value;
                console.log(`✅ [${type.name}] -> ${pending.value} (pending)`);
              }
            });
          }

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

    if ((annData as Annotation).annotationTypeId) {
      const typeId = (annData as Annotation).annotationTypeId;
      const type = activeAnnotationTypes.value.find((t) => t.id === typeId);

      if (type) {
        editInitialValues.value = { [type.id]: (annData as Annotation).value };
      }
    } else if ((annData as any).tag_type) {
    } else if ((annData as any).tag) {
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

  // Case 1: Editing existing polygon (not drawing new)
  if (selectedAnnotationData.value && !currentDrawingData.value) {
    // Get the selected polygon coordinates
    const selectedPolygon = (selectedAnnotationData.value as any).polygon;

    if (!selectedPolygon || !props.selectedImage) {
      console.error('Cannot process: missing polygon data');
      return;
    }

    // Helper to compare polygons
    const isSamePolygon = (poly1: any[], poly2: any[]) => {
      if (!poly1 || !poly2 || poly1.length !== poly2.length) return false;
      const tolerance = 0.01;
      return poly1.every((p1, i) => {
        const p2 = poly2[i];
        return p2 && Math.abs(p1.x - p2.x) < tolerance && Math.abs(p1.y - p2.y) < tolerance;
      });
    };

    // Get all annotations on this polygon
    const annotationsOnSamePolygon = annotationStore.annotations.filter((ann) =>
      isSamePolygon(ann.polygon, selectedPolygon)
    );

    console.group('💾 Saving/Updating Annotations on Polygon');
    let updateCount = 0;
    let createCount = 0;

    // Process each annotation type in results
    for (const res of results) {
      const typeId = res.type.id;

      // Check if annotation already exists for this type on this polygon
      const existingAnn = annotationsOnSamePolygon.find((ann) => ann.annotationTypeId === typeId);

      if (existingAnn) {
        // UPDATE existing annotation
        console.log(`🔄 Updating existing: ${res.type.name} = ${res.value}`);

        const updateData = {
          tag_type: res.type.type,
          name: res.type.name,
          value: res.value,
          color: res.type.color || '#ec4899',
          is_global: false,
        };

        await annotationStore.updateAnnotation(existingAnn.id, updateData);
        updateCount++;

        // Update the visual annotation in OpenSeadragon
        if (anno.value && typeof anno.value.getAnnotation === 'function') {
          const w3cAnnotation = anno.value.getAnnotation(existingAnn.id);
          if (w3cAnnotation) {
            w3cAnnotation.body = [
              {
                type: 'TextualBody',
                value: `${res.type.name}: ${res.value}`,
                purpose: 'tagging',
              },
            ];
            if (typeof anno.value.updateAnnotation === 'function') {
              anno.value.updateAnnotation(w3cAnnotation);
            }
          }
        }
      } else {
        // CREATE new annotation on same polygon
        console.log(`➕ Creating new: ${res.type.name} = ${res.value}`);

        const safeWsId =
          (props.selectedImage as any).wsId ||
          (props.selectedImage!.parent?.type === 'workspace'
            ? props.selectedImage!.parent.id
            : undefined);

        if (!safeWsId) {
          console.error('Cannot create annotation: Missing Workspace ID');
          continue;
        }

        const tempId = `temp-${Date.now()}-${Math.random()}`;

        annotationStore.addPendingAnnotation({
          tempId,
          imageId: props.selectedImage!.id,
          ws_id: safeWsId,
          name: res.type.name,
          tag_type: res.type.type,
          value: res.value,
          color: res.type.color || '#ec4899',
          is_global: false,
          polygon: selectedPolygon.map((p: { x: number; y: number }) => ({ x: p.x, y: p.y })),
        } as any);

        createCount++;

        // Add visual annotation to OpenSeadragon
        if (anno.value) {
          const polygonStr = selectedPolygon
            .map((p: { x: number; y: number }) => `${p.x},${p.y}`)
            .join(' ');
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
                value: `<svg><polygon points="${polygonStr}"></polygon></svg>`,
              },
            },
          });
        }
      }
    }

    console.log(`✅ ${updateCount} updated, ${createCount} created`);
    console.groupEnd();

    if (anno.value && typeof anno.value.cancelSelected === 'function') {
      anno.value.cancelSelected();
    }

    isModalOpen.value = false;
    editInitialValues.value = {};

    if (updateCount > 0 && createCount > 0) {
      toast.success(`${updateCount} güncellendi, ${createCount} eklendi`);
    } else if (updateCount > 0) {
      toast.success(`${updateCount} etiket güncellendi`);
    } else if (createCount > 0) {
      toast.info(`${createCount} etiket eklendi`);
    }

    return;
  }

  // Case 2: Drawing new polygon
  if (!currentDrawingData.value || !props.selectedImage) return;

  const rawPoints = convertAnnotoriousToPoints(currentDrawingData.value);
  const points = rawPoints.map((p: { x: number; y: number }) => Point.from(p));

  results.forEach((res) => {
    const tempId = `temp-${Date.now()}-${Math.random()}`;

    const typeId = res.type.id || '';

    // Safe workspace ID resolution
    const safeWsId =
      (props.selectedImage as any).wsId ||
      (props.selectedImage!.parent?.type === 'workspace'
        ? props.selectedImage!.parent.id
        : undefined);

    if (!safeWsId) {
      console.error('Cannot create pending annotation: Missing Workspace ID');
      return;
    }

    annotationStore.addPendingAnnotation({
      tempId,
      imageId: props.selectedImage!.id,
      ws_id: safeWsId,
      name: res.type.name,
      tag_type: res.type.type,
      value: res.value,
      color: res.type.color || '#ec4899',
      is_global: false,
      polygon: points.map((p: { x: number; y: number }) => ({ x: p.x, y: p.y })),
    } as any);

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
