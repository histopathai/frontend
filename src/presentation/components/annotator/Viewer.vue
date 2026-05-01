<template>
  <div class="relative w-full h-full bg-gray-800">

    <div :id="viewerId" class="w-full h-full"></div>

    <LocalAnnotationModal
      :is-open="isModalOpen"
      :annotation-types="activeAnnotationTypes"
      :initial-values="editInitialValues"
      :is-review-mode="isReviewMode"
      @save="handleModalSave"
      @cancel="handleModalCancel"
      @approve="handleApprove"
      @reject="handleReject"
      @edit-and-approve="handleEditAndApprove"
    />

    <ConfirmModal
      :is-open="isConfirmModalOpen"
      title="Poligonu Sil"
      message="Bu poligonu kalıcı olarak silmek istediğinize emin misiniz?"
      @confirm="executeDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, type PropType, watch, computed, onMounted, onUnmounted, nextTick } from 'vue';
import type { Image } from '@/core/entities/Image';
import type { Annotation } from '@/core/entities/Annotation';
import { useOpenSeadragon } from '@/presentation/composables/annotator/useOpenSeadragon';
import { useAnnotationTypeStore } from '@/stores/annotation_type';
import { useAnnotationStore } from '@/stores/annotation';
import LocalAnnotationModal from './LocalAnnotationModal.vue';
import ConfirmModal from '../common/ConfirmModal.vue';
import { useToast } from 'vue-toastification';
import { useWorkspaceStore } from '@/stores/workspace';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const workspaceStore = useWorkspaceStore();
const annotationTypeStore = useAnnotationTypeStore();
const annotationStore = useAnnotationStore();
const toast = useToast();

const isReviewModeActive = computed(() => {
  const currentUserId = String(authStore.user?.userId || '');
  
  // 1. Eğer bir poligon seçiliyse ve bizim değilse
  const selected = annotationStore.currentAnnotation;
  if (selected && String(selected.creatorId || '') !== currentUserId) {
    return true;
  }
  
  // 2. Eğer görüntüdeki HERHANGİ BİR anotasyon (global veya poligon) başkasına aitse
  const list = (annotationStore.annotations as any[]) || [];
  return list.some((a: any) => String(a.creatorId || '') !== currentUserId);
});

const props = defineProps({
  selectedImage: { type: Object as PropType<Image | null>, default: null },
  isDrawingMode: { type: Boolean, default: false },
});

const viewerId = 'osd-viewer-main';

const {
  loadAnnotations,
  loadImage,
  startDrawing,
  stopDrawing,
  updateLabelOverlays,
  anno,
  viewer,
  onSelectionCreated,
  onAnnotationSelected,
  onAnnotationCreated,
  onAnnotationDeselected,
  onDeleteAnnotationRequest,
} = useOpenSeadragon(viewerId);

const isModalOpen = ref(false);
const isConfirmModalOpen = ref(false);
const itemToDelete = ref<string | null>(null);
const isProcessingModal = ref(false);
const currentDrawingData = ref<any>(null);
const selectedAnnotationData = ref<any>(null);
const editInitialValues = ref<Record<string, any>>({});

const isReviewMode = computed(() => {
  if (!selectedAnnotationData.value) return false;
  const currentUserId = authStore.user?.userId;
  const creatorId = selectedAnnotationData.value.creatorId;
  // If no creatorId found, assume it is ours (pending)
  if (!creatorId) return false;
  return String(creatorId) !== String(currentUserId);
});

// --- UTILS ---

function isSamePolygon(poly1: any[], poly2: any[]) {
  if (!poly1 || !poly2 || poly1.length !== poly2.length) return false;
  
  // Robust order-independent matching: sort points by X then Y
  const sortPoints = (pts: any[]) => [...pts].sort((a, b) => (a.x - b.x) || (a.y - b.y));
  const sorted1 = sortPoints(poly1);
  const sorted2 = sortPoints(poly2);

  const tolerance = 2.0;
  return sorted1.every((p1, i) => {
    const p2 = sorted2[i];
    return p2 && Math.abs(p1.x - p2.x) < tolerance && Math.abs(p1.y - p2.y) < tolerance;
  });
}

function convertAnnotoriousToPoints(selection: any): Array<{ x: number; y: number }> {
  const selector = selection.target?.selector || selection.selector;
  if (!selector || !selector.value) return [];
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

defineExpose({ startDrawing, stopDrawing, loadAnnotations });

// --- WATCHERS ---

watch(
  [() => props.selectedImage, viewer],
  async ([newImg, newViewer]) => {
    if (newImg && newViewer) {
      await loadImage(newImg);
    }
  },
  { immediate: true }
);

watch(
  () => props.isDrawingMode,
  (val) => {
    if (!viewer.value || !anno.value) return;
    if (val) startDrawing();
    else stopDrawing();
  },
  { immediate: true }
);

watch(
  () => annotationStore.pendingCount,
  async (newCount, oldCount) => {
    if (oldCount > 0 && newCount === 0 && props.selectedImage) {
      selectedAnnotationData.value = null;
      updateLabelOverlays();
    }
  }
);

watch(
  () => annotationStore.dirtyCount,
  async (newCount, oldCount) => {
    if (oldCount > 0 && newCount === 0 && props.selectedImage) {
      selectedAnnotationData.value = null;
      updateLabelOverlays();
    }
  }
);

const activeAnnotationTypes = computed(() => {
  const workspaceStore = useWorkspaceStore();
  const currentWs = workspaceStore.currentWorkspace;
  if (!currentWs || !currentWs.annotationTypeIds) return [];
  return annotationTypeStore.annotationTypes.filter(
    (t) => !t.global && currentWs.annotationTypeIds.includes(t.id)
  );
});

// --- EVENTS ---

onMounted(() => {
  onSelectionCreated.value = (selection: any) => {
    currentDrawingData.value = selection;
    selectedAnnotationData.value = null;
    editInitialValues.value = {};
    isModalOpen.value = true;
  };

  onAnnotationCreated.value = (annotation: any) => {
    if (!isModalOpen.value) {
      currentDrawingData.value = annotation;
      isModalOpen.value = true;
    }
  };

  onAnnotationSelected.value = (annotation: any) => {
    // If we just clicked 'Edit Points', skip opening the modal once
    if ((window as any)._skipAnnotationModal) {
      (window as any)._skipAnnotationModal = false;
      return;
    }

    const rawId = String(annotation.id);
    const targetId = rawId.startsWith('#') ? rawId.slice(1) : rawId;

    // 1. Try to find in persisted annotations
    let found = annotationStore.annotations.find((a: any) => String(a.id) === targetId);
    
    // 2. Try to find in pending annotations
    if (!found) {
      found = annotationStore.pendingAnnotations.find(p => String(p.tempId) === targetId) as any;
    }

    // 3. Fallback: match by polygon geometry
    if (!found) {
      const pts = convertAnnotoriousToPoints(annotation);
      found = annotationStore.annotations.find(a => isSamePolygon(a.polygon, pts));
      if (found) {
      } else {
        found = annotationStore.pendingAnnotations.find(p => isSamePolygon(p.polygon || [], pts)) as any;
      }
    }

    if (found) {
      selectedAnnotationData.value = found;
      currentDrawingData.value = null;
      
      const initial: Record<string, any> = {};
      const polyToMatch = (found as any).polygon;
      
      // Batch initial values for all tags on this polygon from both persisted and pending stores
      // Persisted
      annotationStore.annotations
        .filter(a => isSamePolygon(a.polygon, polyToMatch))
        .forEach(a => {
          const type = activeAnnotationTypes.value.find(t => t.id === a.annotationTypeId);
          if (type) {
            const dirty = annotationStore.dirtyAnnotations.get(String(a.id));
            initial[type.id] = dirty ? dirty.value : a.value;
          }
        });

      // Pending
      annotationStore.pendingAnnotations
        .filter(p => isSamePolygon(p.polygon || [], polyToMatch))
        .forEach(p => {
          const type = activeAnnotationTypes.value.find(t => t.name === p.name);
          if (type) {
            initial[type.id] = p.value;
          }
        });
      
      editInitialValues.value = initial;
      nextTick(() => { isModalOpen.value = true; });
    } else {
      // 4. Case: Poligon is on the viewer but not in any store (e.g. modal was cancelled previously)
      currentDrawingData.value = annotation;
      selectedAnnotationData.value = null;
      editInitialValues.value = {};
      nextTick(() => { isModalOpen.value = true; });
    }
  };

  onAnnotationDeselected.value = () => {
    // Re-enable navigation if it was disabled for point editing
    if (viewer.value) {
      (viewer.value as any).setMouseNavEnabled(true);
      (viewer.value as any).panHorizontal = true;
      (viewer.value as any).panVertical = true;
      (viewer.value as any).gestureSettingsMouse.clickToZoom = true;
      (viewer.value as any).gestureSettingsMouse.dblClickToZoom = true;
    }
    if (!isModalOpen.value) selectedAnnotationData.value = null;
  };

  onDeleteAnnotationRequest.value = async (id: string) => {
    // Sadece modalı aç ve silinecek ID'yi kaydet
    itemToDelete.value = id;
    isConfirmModalOpen.value = true;
  };
});

// --- CONFIRM MODAL ACTIONS ---
async function executeDelete() {
  if (!itemToDelete.value) return;
  const id = itemToDelete.value;
  isConfirmModalOpen.value = false;
  itemToDelete.value = null;

  const rawId = String(id);
  const targetId = rawId.startsWith('#') ? rawId.slice(1) : rawId;
  let target = annotationStore.annotations.find((a) => String(a.id) === targetId);
  if (!target) {
    const pending = annotationStore.pendingAnnotations.find((p) => String(p.tempId) === targetId);
    if (pending)
      target = { polygon: pending.polygon, isPending: true, id: pending.tempId } as any;
  }

  if (target && target.polygon) {
    const poly = target.polygon;
    const toDelete = annotationStore.annotations.filter((a) => isSamePolygon(a.polygon, poly));
    const pendingToDelete = annotationStore.pendingAnnotations.filter(
      (p) => p.imageId === props.selectedImage?.id && isSamePolygon(p.polygon || [], poly)
    );

    for (const p of pendingToDelete) {
      annotationStore.removePendingAnnotation(p.tempId);
      if (anno.value) anno.value.removeAnnotation(p.tempId);
    }
    for (const a of toDelete) {
      try {
        if (props.selectedImage?.id) {
          await annotationStore.deleteAnnotation(String(a.id), props.selectedImage.id);
        }
        if (anno.value) anno.value.removeAnnotation(String(a.id));
      } catch (e) {
      }
    }
    updateLabelOverlays();
    toast.success('Silindi.');
  }
}

function cancelDelete() {
  isConfirmModalOpen.value = false;
  itemToDelete.value = null;
  if (anno.value) anno.value.cancelSelected();
}

// --- SAVE / CANCEL ---

async function handleModalSave(results: Array<{ type: any; value: any }>) {
  if (isProcessingModal.value) return;
  isProcessingModal.value = true;
  isModalOpen.value = false;

  try {
    const safeWsId = (props.selectedImage as any).wsId || props.selectedImage!.parent?.id;

    if (selectedAnnotationData.value) {
      const poly = (selectedAnnotationData.value as any).polygon;
      for (const res of results) {
        const existing = annotationStore.annotations.find(
          (a) => a.annotationTypeId === res.type.id && isSamePolygon(a.polygon, poly)
        );
        if (existing) {
          annotationStore.addDirtyAnnotation(existing.id, {
            value: res.value,
            name: res.type.name,
            tag_type: res.type.type,
            color: res.type.color,
          });
        } else {
          const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          annotationStore.addPendingAnnotation({
            tempId,
            imageId: props.selectedImage!.id,
            ws_id: safeWsId,
            name: res.type.name,
            tag_type: res.type.type,
            value: res.value,
            color: res.type.color || '#ec4899',
            is_global: false,
            polygon: poly,
          } as any);
        }
      }
    } else if (currentDrawingData.value) {
      const pts = convertAnnotoriousToPoints(currentDrawingData.value);
      
      // If this was a 'stray' annotation already in Annotorious (not just a selection),
      // remove it before adding the formal pending version(s).
      if (anno.value && currentDrawingData.value.id) {
        try { anno.value.removeAnnotation(currentDrawingData.value.id); } catch(e) {}
      }

      // 1. Add all results to the store (as separate pending annotations)
      const firstTempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      results.forEach((res, idx) => {
        // We only use the firstTempId for the first result; subsequent results get their own tempId
        // but since they share geometry, clicking the first one will still pull all of them.
        const tempId = idx === 0 ? firstTempId : `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        annotationStore.addPendingAnnotation({
          tempId, imageId: props.selectedImage!.id, ws_id: safeWsId, name: res.type.name, tag_type: res.type.type, value: res.value, color: res.type.color || '#ec4899', is_global: false, polygon: pts,
        } as any);
      });
      
      // 2. Add ONLY ONE polygon to Annotorious for visualization/selection
      // This prevents multiple overlapping polygons for the same area.
      if (anno.value && results.length > 0) {
        const ptsStr = pts.map(p => `${p.x},${p.y}`).join(' ');
        const mainRes = results[0];
        if (mainRes) {
          anno.value.addAnnotation({
            id: firstTempId, type: 'Annotation',
            body: [
              { type: 'TextualBody', value: `${mainRes.type.name}: ${mainRes.value}`, purpose: 'tagging' }, 
              { type: 'TextualBody', value: mainRes.type.color || '#ec4899', purpose: 'highlighting' }
            ],
            target: { selector: { type: 'SvgSelector', value: `<svg><polygon points="${ptsStr}"></polygon></svg>` } },
          });
        }
      }
    }

    if (anno.value) anno.value.cancelSelected();
    updateLabelOverlays();
    toast.info('Kaydedilmeyi bekliyor.');

    // Re-activate drawing mode if we are still in drawing state
    if (props.isDrawingMode) {
      setTimeout(() => startDrawing(), 100);
    }
  } finally {
    isProcessingModal.value = false;
    currentDrawingData.value = null;
    selectedAnnotationData.value = null;
  }
}

async function handleApprove() {
  if (!selectedAnnotationData.value) return;
  const id = String(selectedAnnotationData.value.id);
  const success = await annotationStore.approveAnnotation(id);
  if (success) {
    toast.success('Onaylandı.');
    isModalOpen.value = false;
    if (anno.value) {
      anno.value.cancelSelected();
    }
    updateLabelOverlays();
  }
}

async function handleReject() {
  if (!selectedAnnotationData.value || !props.selectedImage) return;
  if (confirm('Bu poligonu silmek ve reddetmek istediğinize emin misiniz?')) {
    const id = String(selectedAnnotationData.value.id);
    const success = await annotationStore.rejectAnnotation(
      id,
      props.selectedImage.id
    );
    if (success) {
      if (anno.value) {
        anno.value.removeAnnotation(id);
        anno.value.cancelSelected();
      }
      updateLabelOverlays();
      toast.error('Reddedildi ve silindi.');
      isModalOpen.value = false;
    }
  }
}

async function handleEditAndApprove(results: any[]) {
  if (!selectedAnnotationData.value) return;

  // First update values in store (mark as dirty)
  const poly = (selectedAnnotationData.value as any).polygon;
  for (const res of results) {
    const existing = annotationStore.annotations.find(
      (a) => a.annotationTypeId === res.type.id && isSamePolygon(a.polygon, poly)
    );
    if (existing) {
      annotationStore.addDirtyAnnotation(existing.id, {
        value: res.value,
        name: res.type.name,
        tag_type: res.type.type,
        color: res.type.color,
      });
    }
  }

  // Then run the special edit & approve logic
  const success = await annotationStore.editAndApproveAnnotation(
    String(selectedAnnotationData.value.id),
    poly
  );

  if (success) {
    toast.success('Düzenlendi ve Onaylandı.');
    isModalOpen.value = false;
  }
}

function handleModalCancel() {
  if (anno.value) anno.value.cancelSelected();
  isModalOpen.value = false;
  currentDrawingData.value = null;
  selectedAnnotationData.value = null;

  // Re-activate drawing mode if we are still in drawing state
  if (props.isDrawingMode) {
    setTimeout(() => startDrawing(), 100);
  }
}
</script>
