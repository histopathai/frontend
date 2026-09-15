<template>
  <div class="relative w-full h-full bg-gray-800 overflow-hidden" :class="cursorClass">
    <div :id="viewerId" class="absolute inset-0"></div>

    <svg
      v-if="editor.image.value"
      class="absolute inset-0 w-full h-full tissue-overlay"
      :style="{ opacity: overlayVisible ? 1 : 0 }"
    >
      <g :transform="transform">
        <path
          v-for="(polygon, i) in editor.polygons.value"
          :key="i"
          :d="pathFor(polygon)"
          fill-rule="evenodd"
          vector-effect="non-scaling-stroke"
          :class="i === editor.selectedIndex.value ? 'tissue-selected' : 'tissue-polygon'"
          :style="{
            fillOpacity: i === editor.selectedIndex.value ? fillOpacity * 1.4 : fillOpacity,
          }"
        />

        <template v-if="editor.draft.value.length">
          <polyline
            :points="draftPoints"
            vector-effect="non-scaling-stroke"
            :class="
              editor.tool.value === 'hole' ? 'tissue-draft tissue-draft-hole' : 'tissue-draft'
            "
          />
          <circle
            v-for="(p, i) in editor.draft.value"
            :key="`draft-${i}`"
            :cx="p.x"
            :cy="p.y"
            :r="handleRadius"
            class="tissue-draft-point"
          />
        </template>

        <template v-if="showHandles">
          <circle
            v-for="h in midpointHandles"
            :key="`m-${h.ring}-${h.index}`"
            :cx="h.x"
            :cy="h.y"
            :r="handleRadius * 0.7"
            class="tissue-midpoint"
            @pointerdown="startDrag($event, h.ring, h.index, true)"
          />
          <circle
            v-for="h in vertexHandles"
            :key="`v-${h.ring}-${h.index}`"
            :cx="h.x"
            :cy="h.y"
            :r="handleRadius"
            class="tissue-vertex"
            @pointerdown="startDrag($event, h.ring, h.index, false)"
          />
        </template>
      </g>
    </svg>

    <div
      v-if="tooManyHandles"
      class="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-black/70 text-white text-[11px] font-semibold pointer-events-none"
    >
      Noktaları düzenlemek için yakınlaştırın
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef, watch, nextTick } from 'vue';
import OpenSeadragon from 'openseadragon';
import type { Image } from '@/core/entities/Image';
import { getRing, type RingIndex, type TissuePoint, type TissuePolygon } from '@/core/tissue';
import type { TissueMaskEditor } from '@/presentation/composables/tissue/useTissueMaskEditor';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const MAX_HANDLES = 1500;
const HANDLE_RADIUS_PX = 5;
const MIN_MIDPOINT_EDGE_PX = 28;

const props = defineProps<{
  editor: TissueMaskEditor;
  image: Image | null;
  overlayVisible: boolean;
  fillOpacity: number;
}>();

const viewerId = `osd-tissue-viewer-${Math.random().toString(36).slice(2, 8)}`;
const viewer = shallowRef<OpenSeadragon.Viewer | null>(null);

// Image (level-0) to viewer-element transform, updated on every viewport change.
const transform = ref('');
// Pixels per image unit; refreshed when an animation settles so handles keep a
// constant on-screen size without re-rendering them every frame.
const scale = ref(1);
const visibleBounds = shallowRef<{ x0: number; y0: number; x1: number; y1: number } | null>(null);

const pathCache = new WeakMap<TissuePolygon, string>();
function pathFor(polygon: TissuePolygon): string {
  let d = pathCache.get(polygon);
  if (d === undefined) {
    const ring = (pts: TissuePoint[]) =>
      pts.length ? `M${pts.map((p) => `${p.x} ${p.y}`).join('L')}Z` : '';
    d = ring(polygon.exterior) + polygon.holes.map(ring).join('');
    pathCache.set(polygon, d);
  }
  return d;
}

const draftPoints = computed(() => props.editor.draft.value.map((p) => `${p.x},${p.y}`).join(' '));
const handleRadius = computed(() => HANDLE_RADIUS_PX / scale.value);

const cursorClass = computed(() => {
  if (props.editor.busy.value) return 'cursor-wait';
  switch (props.editor.tool.value) {
    case 'draw':
    case 'hole':
      return 'cursor-crosshair';
    case 'delete':
      return 'cursor-not-allowed';
    default:
      return '';
  }
});

interface Handle {
  ring: RingIndex;
  index: number;
  x: number;
  y: number;
}

const selectedPolygon = computed(() => {
  const i = props.editor.selectedIndex.value;
  return i >= 0 ? (props.editor.polygons.value[i] ?? null) : null;
});

function inView(p: TissuePoint): boolean {
  const b = visibleBounds.value;
  return !b || (p.x >= b.x0 && p.x <= b.x1 && p.y >= b.y0 && p.y <= b.y1);
}

const handles = computed(() => {
  const polygon = selectedPolygon.value;
  if (!polygon || props.editor.tool.value !== 'select') return { vertices: [], midpoints: [] };
  const vertices: Handle[] = [];
  const midpoints: Handle[] = [];
  // Midpoints only on edges long enough on screen to grab them without
  // hitting the vertex handles at both ends.
  const minEdge = MIN_MIDPOINT_EDGE_PX / scale.value;
  const rings: RingIndex[] = [-1, ...polygon.holes.map((_, i) => i)];
  for (const ring of rings) {
    const pts = getRing(polygon, ring);
    pts.forEach((p, index) => {
      const q = pts[(index + 1) % pts.length]!;
      if (inView(p)) vertices.push({ ring, index, x: p.x, y: p.y });
      const m = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
      if (inView(m) && Math.hypot(q.x - p.x, q.y - p.y) >= minEdge) {
        midpoints.push({ ring, index, ...m });
      }
    });
  }
  return { vertices, midpoints };
});

const tooManyHandles = computed(() => handles.value.vertices.length > MAX_HANDLES);
const showHandles = computed(() => !tooManyHandles.value && handles.value.vertices.length > 0);
const vertexHandles = computed(() => (showHandles.value ? handles.value.vertices : []));
const midpointHandles = computed(() => (showHandles.value ? handles.value.midpoints : []));

function updateTransform() {
  const v = viewer.value;
  if (!v || !v.world.getItemAt(0)) return;
  const origin = v.viewport.imageToViewerElementCoordinates(new OpenSeadragon.Point(0, 0));
  const unit = v.viewport.imageToViewerElementCoordinates(new OpenSeadragon.Point(1000, 0));
  const s = (unit.x - origin.x) / 1000;
  transform.value = `translate(${origin.x} ${origin.y}) scale(${s})`;
}

function settleViewport() {
  const v = viewer.value;
  if (!v || !v.world.getItemAt(0)) return;
  updateTransform();
  const origin = v.viewport.imageToViewerElementCoordinates(new OpenSeadragon.Point(0, 0));
  const unit = v.viewport.imageToViewerElementCoordinates(new OpenSeadragon.Point(1000, 0));
  scale.value = (unit.x - origin.x) / 1000 || 1;
  const rect = v.viewport.viewportToImageRectangle(v.viewport.getBounds(true));
  const margin = Math.max(rect.width, rect.height) * 0.1;
  visibleBounds.value = {
    x0: rect.x - margin,
    y0: rect.y - margin,
    x1: rect.x + rect.width + margin,
    y1: rect.y + rect.height + margin,
  };
}

function toImagePoint(clientX: number, clientY: number): TissuePoint {
  const v = viewer.value!;
  const rect = (v.element as HTMLElement).getBoundingClientRect();
  const p = v.viewport.viewerElementToImageCoordinates(
    new OpenSeadragon.Point(clientX - rect.left, clientY - rect.top)
  );
  return { x: p.x, y: p.y };
}

// --- Vertex dragging ---------------------------------------------------------

let drag: { ring: RingIndex; index: number } | null = null;

function startDrag(event: PointerEvent, ring: RingIndex, index: number, isMidpoint: boolean) {
  if (event.button !== 0 || !viewer.value) return;
  event.preventDefault();
  event.stopPropagation();

  if (!isMidpoint && (event.altKey || event.shiftKey)) {
    props.editor.deleteVertex(ring, index);
    return;
  }

  if (!props.editor.beginVertexDrag()) return;
  if (isMidpoint) {
    props.editor.insertVertexForDrag(ring, index, toImagePoint(event.clientX, event.clientY));
    index += 1;
  }
  drag = { ring, index };
  viewer.value.setMouseNavEnabled(false);
  window.addEventListener('pointermove', onDragMove);
  window.addEventListener('pointerup', endDrag);
}

function onDragMove(event: PointerEvent) {
  if (!drag) return;
  props.editor.dragVertex(drag.ring, drag.index, toImagePoint(event.clientX, event.clientY));
}

function endDrag() {
  drag = null;
  viewer.value?.setMouseNavEnabled(true);
  window.removeEventListener('pointermove', onDragMove);
  window.removeEventListener('pointerup', endDrag);
}

// --- Viewer ------------------------------------------------------------------

function initViewer() {
  viewer.value = OpenSeadragon({
    id: viewerId,
    prefixUrl: 'https://cdn.jsdelivr.net/npm/openseadragon@4.1/build/openseadragon/images/',
    tileSources: [],
    animationTime: 0.3,
    blendTime: 0.1,
    constrainDuringPan: true,
    maxZoomPixelRatio: 2,
    visibilityRatio: 1,
    zoomPerScroll: 1.2,
    showNavigationControl: true,
    // Full-page mode moves the viewer out of the page, leaving the overlay and
    // the panel behind.
    showFullPageControl: false,
    loadTilesWithAjax: true,
    ajaxWithCredentials: true,
    gestureSettingsMouse: { clickToZoom: false, dblClickToZoom: false },
  });
  const v = viewer.value;

  v.addHandler('open', () => {
    const size = v.world.getItemAt(0)?.getContentSize();
    if (size && props.image) props.editor.setLevel0Size(size.x, size.y);
    nextTick(settleViewport);
  });
  v.addHandler('animation', updateTransform);
  v.addHandler('animation-finish', settleViewport);
  v.addHandler('resize', settleViewport);
  v.addHandler('update-viewport', updateTransform);

  v.addHandler('canvas-click', (event: any) => {
    if (!event.quick) return;
    const pos = v.viewport.viewerElementToImageCoordinates(event.position);
    const point = { x: pos.x, y: pos.y };
    switch (props.editor.tool.value) {
      case 'select':
        props.editor.selectAt(point);
        break;
      case 'delete':
        props.editor.deleteAt(point);
        break;
      case 'draw':
      case 'hole':
        props.editor.addDraftPoint(point);
        break;
    }
  });
  // OpenSeadragon's keyboard navigation flips ("f") and rotates ("r") the image,
  // which the overlay does not follow, and clashes with the tab's shortcuts.
  v.addHandler('canvas-key', (event: any) => {
    event.preventDefaultAction = true;
  });
  v.addHandler('canvas-double-click', () => {
    if (props.editor.tool.value === 'draw' || props.editor.tool.value === 'hole') {
      props.editor.finishDraft();
    }
  });

  openImage(props.image);
}

function openImage(image: Image | null) {
  const v = viewer.value;
  if (!v) return;
  v.close();
  transform.value = '';
  if (!image || !image.status.isProcessed()) return;
  v.open(`${API_BASE_URL}/api/v1/proxy/${image.processedpath}/image.dzi`);
}

watch(
  () => props.image?.id,
  () => openImage(props.image)
);

// Handles for a new selection must use the current viewport.
watch(() => props.editor.selectedIndex.value, settleViewport);

onMounted(() => nextTick(initViewer));
onUnmounted(() => {
  endDrag();
  viewer.value?.destroy();
  viewer.value = null;
});

defineExpose({
  fitToSelection() {
    const v = viewer.value;
    const polygon = selectedPolygon.value;
    if (!v || !polygon) return;
    const xs = polygon.exterior.map((p) => p.x);
    const ys = polygon.exterior.map((p) => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const w = Math.max(...xs) - minX;
    const h = Math.max(...ys) - minY;
    const pad = Math.max(w, h) * 0.15;
    v.viewport.fitBounds(
      v.viewport.imageToViewportRectangle(minX - pad, minY - pad, w + 2 * pad, h + 2 * pad)
    );
  },
});
</script>

<style scoped>
.tissue-overlay {
  pointer-events: none;
  transition: opacity 0.15s ease;
}
.tissue-polygon {
  fill: #22d3ee;
  stroke: #0891b2;
  stroke-width: 1.5px;
}
.tissue-selected {
  fill: #818cf8;
  stroke: #4f46e5;
  stroke-width: 2.5px;
}
.tissue-draft {
  fill: none;
  stroke: #f59e0b;
  stroke-width: 2px;
  stroke-dasharray: 6 4;
}
.tissue-draft-hole {
  stroke: #e11d48;
}
.tissue-draft-point {
  fill: #f59e0b;
}
.tissue-vertex {
  fill: white;
  stroke: #4f46e5;
  stroke-width: 1.5px;
  vector-effect: non-scaling-stroke;
  pointer-events: all;
  cursor: move;
}
.tissue-midpoint {
  fill: #4f46e5;
  fill-opacity: 0.45;
  pointer-events: all;
  cursor: copy;
}
</style>
