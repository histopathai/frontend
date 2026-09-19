<template>
  <div ref="rootRef" class="relative w-full h-full bg-gray-800 overflow-hidden">
    <div :id="viewerId" class="absolute inset-0"></div>
    <canvas ref="canvasRef" class="absolute inset-0 w-full h-full pointer-events-none"></canvas>

    <!-- Hover details: what this patch would be, without clicking -->
    <div
      v-if="hover && grid.cells.value"
      class="absolute z-10 pointer-events-none rounded-lg bg-gray-900/90 px-2.5 py-2 text-[11px] leading-snug text-white shadow-lg"
      :style="tooltipStyle"
    >
      <PatchFacts :cells="grid.cells.value" :index="hover.index" :label-colors="labelColors" dark />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue';
import OpenSeadragon from 'openseadragon';
import type { Image } from '@/core/entities/Image';
import type { Region } from '@/core/patches';
import type { PatchGrid } from '@/presentation/composables/patches/usePatchGrid';
import PatchFacts from './PatchFacts.vue';
import { RAMP, rampBin } from './colors';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const props = defineProps<{
  grid: PatchGrid;
  image: Image | null;
  labelColors: string[];
  showPatches: boolean;
  showTissue: boolean;
  showAnnotations: boolean;
  fillOpacity: number;
  selectedIndex: number | null;
}>();

const emit = defineEmits<{ select: [index: number | null] }>();

const viewerId = `osd-patch-viewer-${Math.random().toString(36).slice(2, 8)}`;
const rootRef = ref<HTMLElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const viewer = shallowRef<OpenSeadragon.Viewer | null>(null);
const hover = shallowRef<{ index: number; x: number; y: number } | null>(null);

// ── what to draw ─────────────────────────────────────────────────────────────

function regionPath(region: Region): Path2D {
  const path = new Path2D();
  for (const poly of region) {
    for (const ring of poly) {
      ring.forEach(([x, y], i) => (i ? path.lineTo(x, y) : path.moveTo(x, y)));
      path.closePath();
    }
  }
  return path;
}

const tissuePath = computed(() => {
  const mask = props.grid.mask.value;
  if (!mask) return null;
  const path = new Path2D();
  for (const polygon of mask.polygons) {
    for (const ring of [polygon.exterior, ...polygon.holes]) {
      ring.forEach((p, i) => (i ? path.lineTo(p.x, p.y) : path.moveTo(p.x, p.y)));
      path.closePath();
    }
  }
  return path;
});

/** Outlines of the chosen label set, one path per label so that each takes one stroke. */
const annotationPaths = computed(() => {
  const set = props.grid.labelSet.value;
  const cells = props.grid.cells.value;
  if (!set) return [];
  const labels =
    cells?.source === 'annotation' ? cells.labels : set.labelCounts.map((l) => l.label);
  return labels.map((label, l) => {
    const path = new Path2D();
    for (const polygon of set.polygons) {
      if (polygon.label === label) path.addPath(regionPath(polygon.region));
    }
    return { path, color: props.labelColors[l] ?? '#f59e0b' };
  });
});

/** Per kept patch, the index of its colour in `palette`. */
const paint = computed(() => {
  const cells = props.grid.cells.value;
  const kept = props.grid.kept.value;
  const by = props.grid.settings.colorBy;
  if (!cells) return { bins: new Uint8Array(0), palette: [] as string[] };

  const bins = new Uint8Array(kept.length);
  if (by === 'label' && cells.source === 'annotation') {
    kept.forEach((i, k) => (bins[k] = cells.label[i]!));
    return { bins, palette: cells.labels.map((_, l) => props.labelColors[l] ?? '#f59e0b') };
  }
  const values = cells[by === 'label' ? 'coverage' : by];
  kept.forEach((i, k) => (bins[k] = rampBin(values[i]!)));
  return { bins, palette: RAMP };
});

/** Buckets of kept patches by position, to find the patch under the pointer. */
const lookup = computed(() => {
  const cells = props.grid.cells.value;
  const buckets = new Map<number, number[]>();
  if (!cells) return buckets;
  const side = cells.size0;
  for (const i of props.grid.kept.value) {
    const key = Math.floor(cells.x0[i]! / side) * 1_000_003 + Math.floor(cells.y0[i]! / side);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(i);
  }
  return buckets;
});

function patchAt(x: number, y: number): number | null {
  const cells = props.grid.cells.value;
  if (!cells || !props.showPatches) return null;
  const side = cells.size0;
  const bx = Math.floor(x / side);
  const by = Math.floor(y / side);
  let found: number | null = null;
  // A patch that contains the point starts in this bucket or the one before it.
  for (let dx = -1; dx <= 0; dx++) {
    for (let dy = -1; dy <= 0; dy++) {
      for (const i of lookup.value.get((bx + dx) * 1_000_003 + (by + dy)) ?? []) {
        const px = cells.x0[i]!;
        const py = cells.y0[i]!;
        // Overlapping patches: the one drawn last is the one on top.
        if (x >= px && x < px + side && y >= py && y < py + side && (found === null || i > found))
          found = i;
      }
    }
  }
  return found;
}

// ── drawing ──────────────────────────────────────────────────────────────────

let frame = 0;
function requestDraw() {
  if (!frame) frame = requestAnimationFrame(draw);
}

function draw() {
  frame = 0;
  const canvas = canvasRef.value;
  const v = viewer.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d')!;
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!v || !v.world.getItemAt(0)) return;

  // Level-0 pixels → screen: everything below is drawn in image coordinates.
  const origin = v.viewport.imageToViewerElementCoordinates(new OpenSeadragon.Point(0, 0));
  const unit = v.viewport.imageToViewerElementCoordinates(new OpenSeadragon.Point(1000, 0));
  const scale = (unit.x - origin.x) / 1000;
  if (!(scale > 0)) return;
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * origin.x, dpr * origin.y);
  const px = 1 / scale; // one screen pixel, in image units

  if (props.showTissue && tissuePath.value) {
    const usable = props.grid.tissueUsable.value;
    ctx.lineWidth = 1.5 * px;
    ctx.setLineDash(usable ? [] : [6 * px, 4 * px]);
    ctx.strokeStyle = usable ? '#22d3ee' : '#fb7185';
    ctx.stroke(tissuePath.value);
    ctx.setLineDash([]);
  }

  if (props.showAnnotations) {
    ctx.lineWidth = 1.5 * px;
    for (const { path, color } of annotationPaths.value) {
      ctx.strokeStyle = color;
      ctx.stroke(path);
    }
  }

  const cells = props.grid.cells.value;
  if (cells && props.showPatches) {
    const side = cells.size0;
    const kept = props.grid.kept.value;
    const { bins, palette } = paint.value;
    const left = -origin.x * px - side;
    const top = -origin.y * px - side;
    const right = (width - origin.x) * px;
    const bottom = (height - origin.y) * px;

    // One path per colour: a few fills per frame however many patches are in view.
    const paths = palette.map(() => new Path2D());
    const outline = new Path2D();
    const outlined = side * scale >= 5; // smaller than that, borders only smear the picture
    const inset = outlined ? 0.5 * px : 0;
    for (let k = 0; k < kept.length; k++) {
      const i = kept[k]!;
      const x = cells.x0[i]!;
      const y = cells.y0[i]!;
      if (x < left || x > right || y < top || y > bottom) continue;
      paths[bins[k]!]?.rect(x + inset, y + inset, side - 2 * inset, side - 2 * inset);
      if (outlined) outline.rect(x + inset, y + inset, side - 2 * inset, side - 2 * inset);
    }
    ctx.globalAlpha = props.fillOpacity;
    paths.forEach((path, b) => {
      ctx.fillStyle = palette[b]!;
      ctx.fill(path);
    });
    ctx.globalAlpha = 1;
    if (outlined) {
      ctx.lineWidth = px;
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
      ctx.stroke(outline);
    }

    const ring = (i: number, color: string, widthPx: number) => {
      ctx.lineWidth = widthPx * px;
      ctx.strokeStyle = color;
      ctx.strokeRect(cells.x0[i]!, cells.y0[i]!, side, side);
    };
    if (hover.value && hover.value.index !== props.selectedIndex)
      ring(hover.value.index, '#ffffff', 2);
    if (props.selectedIndex !== null && props.selectedIndex < cells.count) {
      ring(props.selectedIndex, '#ffffff', 4);
      ring(props.selectedIndex, '#4f46e5', 2);
    }
  }
}

// ── viewer ───────────────────────────────────────────────────────────────────

function imagePoint(clientX: number, clientY: number) {
  const v = viewer.value;
  if (!v || !v.world.getItemAt(0)) return null;
  const rect = (v.element as HTMLElement).getBoundingClientRect();
  return v.viewport.viewerElementToImageCoordinates(
    new OpenSeadragon.Point(clientX - rect.left, clientY - rect.top)
  );
}

function onPointerMove(event: PointerEvent) {
  const point = imagePoint(event.clientX, event.clientY);
  const index = point ? patchAt(point.x, point.y) : null;
  const rect = rootRef.value!.getBoundingClientRect();
  const next =
    index === null ? null : { index, x: event.clientX - rect.left, y: event.clientY - rect.top };
  if (next?.index !== hover.value?.index) requestDraw();
  hover.value = next;
}

function onPointerLeave() {
  if (hover.value) requestDraw();
  hover.value = null;
}

const tooltipStyle = computed(() => {
  const h = hover.value;
  const root = rootRef.value;
  if (!h || !root) return {};
  // Flip to the other side of the pointer near the right and bottom edges.
  const flipX = h.x > root.clientWidth - 240;
  const flipY = h.y > root.clientHeight - 170;
  return {
    left: flipX ? undefined : `${h.x + 14}px`,
    right: flipX ? `${root.clientWidth - h.x + 14}px` : undefined,
    top: flipY ? undefined : `${h.y + 14}px`,
    bottom: flipY ? `${root.clientHeight - h.y + 14}px` : undefined,
  };
});

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
    // Full-page mode moves the viewer out of the page, leaving the overlay and the panel behind.
    showFullPageControl: false,
    showNavigator: true,
    navigatorPosition: 'BOTTOM_LEFT',
    navigatorSizeRatio: 0.14,
    loadTilesWithAjax: true,
    ajaxWithCredentials: true,
    gestureSettingsMouse: { clickToZoom: false, dblClickToZoom: false },
  });
  const v = viewer.value;

  v.addHandler('open', () => {
    const size = v.world.getItemAt(0)?.getContentSize();
    if (size) props.grid.setSlideSize(size.x, size.y);
    nextTick(requestDraw);
  });
  v.addHandler('update-viewport', requestDraw);
  v.addHandler('resize', requestDraw);
  v.addHandler('canvas-click', (event: any) => {
    if (!event.quick) return;
    const p = v.viewport.viewerElementToImageCoordinates(event.position);
    emit('select', patchAt(p.x, p.y));
  });
  // OpenSeadragon's keyboard navigation flips ("f") and rotates ("r") the image,
  // which the overlay does not follow, and clashes with the tab's shortcuts.
  v.addHandler('canvas-key', (event: any) => {
    event.preventDefaultAction = true;
  });

  openImage(props.image);
}

function openImage(image: Image | null) {
  const v = viewer.value;
  if (!v) return;
  v.close();
  hover.value = null;
  requestDraw();
  if (!image || !image.status.isProcessed()) return;
  v.open(`${API_BASE_URL}/api/v1/proxy/${image.processedpath}/image.dzi`);
}

watch(
  () => props.image?.id,
  () => openImage(props.image)
);
watch(
  [
    () => props.grid.cells.value,
    () => props.grid.kept.value,
    paint,
    tissuePath,
    annotationPaths,
    () => props.showPatches,
    () => props.showTissue,
    () => props.showAnnotations,
    () => props.fillOpacity,
    () => props.selectedIndex,
  ],
  requestDraw
);

onMounted(() => {
  nextTick(initViewer);
  rootRef.value?.addEventListener('pointermove', onPointerMove);
  rootRef.value?.addEventListener('pointerleave', onPointerLeave);
});
onUnmounted(() => {
  if (frame) cancelAnimationFrame(frame);
  rootRef.value?.removeEventListener('pointermove', onPointerMove);
  rootRef.value?.removeEventListener('pointerleave', onPointerLeave);
  viewer.value?.destroy();
  viewer.value = null;
});

function fitBox(x: number, y: number, w: number, h: number, pad = 0.08) {
  const v = viewer.value;
  if (!v || !v.world.getItemAt(0)) return;
  const margin = Math.max(w, h) * pad;
  v.viewport.fitBounds(
    v.viewport.imageToViewportRectangle(x - margin, y - margin, w + 2 * margin, h + 2 * margin)
  );
}

defineExpose({
  /** Frames the patches on screen; the whole slide when there are none. */
  fitPatches() {
    const cells = props.grid.cells.value;
    const kept = props.grid.kept.value;
    if (!cells || !kept.length) return viewer.value?.viewport.goHome();
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const i of kept) {
      minX = Math.min(minX, cells.x0[i]!);
      minY = Math.min(minY, cells.y0[i]!);
      maxX = Math.max(maxX, cells.x0[i]! + cells.size0);
      maxY = Math.max(maxY, cells.y0[i]! + cells.size0);
    }
    fitBox(minX, minY, maxX - minX, maxY - minY);
  },
  /** Brings a patch into view with some of its surroundings. */
  showPatch(index: number) {
    const cells = props.grid.cells.value;
    if (cells && index < cells.count)
      fitBox(cells.x0[index]!, cells.y0[index]!, cells.size0, cells.size0, 1.5);
  },
});
</script>
