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
  { immediate: true }
);

watch(
  () => annotationStore.pendingCount,
  async (newCount, oldCount) => {
    if (oldCount > 0 && newCount === 0 && props.selectedImage) {
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
        selectedAnnotationData.value = null; 
        editInitialValues.value = {};
        isModalOpen.value = true;
      });

      newAnno.on('selectAnnotation', (annotation: any) => {
        const rawId = String(annotation.id);
        const targetId = rawId.startsWith('#') ? rawId.slice(1) : rawId;

        const realAnnotation = annotationStore.annotations.find((a) => String(a.id) === targetId);
        let foundData = realAnnotation;
      
        if (!foundData) {
          const pending = annotationStore.pendingAnnotations.find(
            (p) => String(p.tempId) === targetId
          );
          if (pending) {

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
          currentDrawingData.value = null;

          const initialValues: Record<string, any> = {};
          const isSamePolygon = (poly1: any[], poly2: any[]) => {
            if (!poly1 || !poly2 || poly1.length !== poly2.length) return false;
            const tolerance = 0.01;
            return poly1.every((p1, i) => {
              const p2 = poly2[i];
              return p2 && Math.abs(p1.x - p2.x) < tolerance && Math.abs(p1.y - p2.y) < tolerance;
            });
          };

          const selectedPolygon = (foundData as any).polygon;
          if (selectedPolygon && props.selectedImage) {
            annotationStore.annotations
              .filter((ann) => isSamePolygon(ann.polygon, selectedPolygon))
              .forEach((ann) => {
                const type = activeAnnotationTypes.value.find((t) => t.id === ann.annotationTypeId);
                if (type) initialValues[type.id] = ann.value;
              });

            annotationStore.pendingAnnotations
              .filter((p) => p.imageId === props.selectedImage!.id && isSamePolygon(p.polygon || [], selectedPolygon))
              .forEach((pending) => {
                const type = activeAnnotationTypes.value.find((t) => t.name === pending.name);
                if (type && !initialValues[type.id]) initialValues[type.id] = pending.value;
              });
          }

          editInitialValues.value = initialValues;
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
  if (!anno.value) return;
  const selected = anno.value.getSelected();

  if (selected && selectedAnnotationData.value) {
    const annData = selectedAnnotationData.value;
    if ((annData as Annotation).annotationTypeId) {
      const type = activeAnnotationTypes.value.find((t) => t.id === (annData as Annotation).annotationTypeId);
      if (type) editInitialValues.value = { [type.id]: (annData as Annotation).value };
    }
    currentDrawingData.value = null;
    isModalOpen.value = true;
  }
}

async function handleModalSave(results: Array<{ type: any; value: any }>) {
  if (results.length === 0) return;

  if (selectedAnnotationData.value && !currentDrawingData.value) {
    const selectedPolygon = (selectedAnnotationData.value as any).polygon;
    if (!selectedPolygon || !props.selectedImage) return;

    const isSamePolygon = (poly1: any[], poly2: any[]) => {
      if (!poly1 || !poly2 || poly1.length !== poly2.length) return false;
      const tolerance = 0.01;
      return poly1.every((p1, i) => {
        const p2 = poly2[i];
        return p2 && Math.abs(p1.x - p2.x) < tolerance && Math.abs(p1.y - p2.y) < tolerance;
      });
    };

    const annotationsOnSamePolygon = annotationStore.annotations.filter((ann) =>
      isSamePolygon(ann.polygon, selectedPolygon)
    );

    let updateCount = 0;
    let createCount = 0;

    for (const res of results) {
      const typeId = res.type.id;
      const existingAnn = annotationsOnSamePolygon.find((ann) => ann.annotationTypeId === typeId);

      if (existingAnn) {
        await annotationStore.updateAnnotation(existingAnn.id, {
          tag_type: res.type.type,
          name: res.type.name,
          value: res.value,
          color: res.type.color || '#ec4899',
          is_global: false,
        });
        updateCount++;
        
        if (anno.value) {
          const w3cAnnotation = anno.value.getAnnotation(existingAnn.id);
          if (w3cAnnotation) {
            w3cAnnotation.body = [{ type: 'TextualBody', value: `${res.type.name}: ${res.value}`, purpose: 'tagging' }];
            anno.value.updateAnnotation(w3cAnnotation);
          }
        }
      } else {
        const safeWsId = (props.selectedImage as any).wsId || props.selectedImage!.parent?.id;
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
          polygon: selectedPolygon.map((p: any) => ({ x: p.x, y: p.y })),
        } as any);
        createCount++;
        
        if (anno.value) {
           const polygonStr = selectedPolygon.map((p: any) => `${p.x},${p.y}`).join(' ');
           anno.value.addAnnotation({
            id: tempId,
            type: 'Annotation',
            body: [{ type: 'TextualBody', value: `${res.type.name}: ${res.value}`, purpose: 'tagging' }],
            target: { selector: { type: 'SvgSelector', value: `<svg><polygon points="${polygonStr}"></polygon></svg>` } },
          });
        }
      }
    }
    
    if (anno.value) anno.value.cancelSelected();
    isModalOpen.value = false;
    editInitialValues.value = {};
    if (updateCount > 0 || createCount > 0) toast.success('Kaydedildi.');
    return;
  }

  if (!currentDrawingData.value || !props.selectedImage) return;

  const rawPoints = convertAnnotoriousToPoints(currentDrawingData.value);
  const points = rawPoints.map((p) => Point.from(p));

  results.forEach((res) => {
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const safeWsId = (props.selectedImage as any).wsId || props.selectedImage!.parent?.id;

    annotationStore.addPendingAnnotation({
      tempId,
      imageId: props.selectedImage!.id,
      ws_id: safeWsId,
      name: res.type.name,
      tag_type: res.type.type,
      value: res.value,
      color: res.type.color || '#ec4899',
      is_global: false,
      polygon: points.map((p) => ({ x: p.x, y: p.y })),
    } as any);

    if (anno.value) {
      anno.value.addAnnotation({
        id: tempId,
        type: 'Annotation',
        body: [{ type: 'TextualBody', value: `${res.type.name}: ${res.value}`, purpose: 'tagging' }],
        target: {
          selector: {
            type: 'SvgSelector',
            value: `<svg><polygon points="${rawPoints.map((p) => `${p.x},${p.y}`).join(' ')}"></polygon></svg>`,
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
  currentDrawingData.value = null;
  editInitialValues.value = {};
}

function handleModalDelete() {
  deleteSelected();
  isModalOpen.value = false;
  editInitialValues.value = {};
}

async function deleteSelected() {
  if (!selectedAnnotationData.value && !currentDrawingData.value) {
     return;
  }

  if (currentDrawingData.value && !selectedAnnotationData.value) {
    if (anno.value) {
       anno.value.cancelSelected();
    }
    currentDrawingData.value = null;
    return;
  }

  if (selectedAnnotationData.value && props.selectedImage) {
    const targetPolygon = (selectedAnnotationData.value as any).polygon;
    
    if (!targetPolygon) {
      console.warn('Silinecek poligon verisi bulunamadı.');
      return;
    }
    const isSamePolygon = (poly1: any[], poly2: any[]) => {
      if (!poly1 || !poly2 || poly1.length !== poly2.length) return false;
      const tolerance = 0.01;
      return poly1.every((p1, i) => {
        const p2 = poly2[i];
        return p2 && Math.abs(p1.x - p2.x) < tolerance && Math.abs(p1.y - p2.y) < tolerance;
      });
    };

    const annotationsToDelete = annotationStore.annotations.filter((ann) => 
      isSamePolygon(ann.polygon, targetPolygon)
    );

    const pendingToDelete = annotationStore.pendingAnnotations.filter((p) => 
      p.imageId === props.selectedImage!.id && isSamePolygon(p.polygon || [], targetPolygon)
    );

    if (annotationsToDelete.length === 0 && pendingToDelete.length === 0) {
      console.warn('Silinecek ilişkili kayıt bulunamadı.');
      return;
    }

    try {
      for (const pending of pendingToDelete) {
        annotationStore.removePendingAnnotation(pending.tempId);
        if (anno.value) anno.value.removeAnnotation(pending.tempId);
      }

      const deletePromises = annotationsToDelete.map(async (ann) => {
     
        await annotationStore.deleteAnnotation(String(ann.id), props.selectedImage!.id);
        if (anno.value) anno.value.removeAnnotation(ann.id);
      });

      await Promise.all(deletePromises);
      
      toast.success('Çizim ve tüm etiketleri başarıyla silindi.');

    } catch (e) {
      console.error('Toplu silme hatası:', e);
      toast.error('Silme işlemi sırasında hata oluştu.');
    } finally {
      console.groupEnd();
      selectedAnnotationData.value = null;
      if (anno.value) anno.value.cancelSelected(); 
    }
  }
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