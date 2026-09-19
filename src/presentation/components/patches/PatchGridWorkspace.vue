<template>
  <main class="flex-1 h-full flex flex-col bg-white min-w-0 overflow-hidden">
    <header class="h-10 flex items-center justify-between gap-3 px-4 border-b border-gray-200">
      <div class="min-w-0 flex items-center gap-2">
        <h2 class="truncate text-xs font-black text-gray-700">
          {{ image?.name || 'Görüntü seçin' }}
        </h2>
        <span v-if="image?.mpp" class="flex-shrink-0 text-[10px] text-gray-400">
          mpp {{ image.mpp.toFixed(4) }}
          <template v-if="image.magnificationLabel"> · {{ image.magnificationLabel }}</template>
        </span>
      </div>
      <div class="flex items-center gap-1">
        <button class="nav-button" title="Patch'lere sığdır (F)" @click="viewerRef?.fitPatches()">
          Sığdır
        </button>
        <span class="mx-1 h-4 w-px bg-gray-200"></span>
        <!-- The parameters stay put while the images change: that is how a setting is judged on a dataset -->
        <button
          class="nav-button disabled:opacity-40"
          :disabled="!canGoPrev"
          title="Önceki görüntü ([)"
          @click="$emit('prev')"
        >
          ‹ Önceki
        </button>
        <span v-if="position" class="text-[10px] text-gray-400">{{ position }}</span>
        <button class="nav-button" title="Sonraki görüntü (])" @click="$emit('next')">
          Sonraki ›
        </button>
      </div>
    </header>

    <div class="flex-1 relative min-h-0">
      <PatchGridViewer
        v-if="image"
        ref="viewerRef"
        :grid="grid"
        :image="image"
        :label-colors="labelColors"
        :show-patches="showPatches"
        :show-tissue="showTissue"
        :show-annotations="showAnnotations"
        :fill-opacity="fillOpacity"
        :selected-index="selectedIndex"
        @select="selectedIndex = $event"
      />
      <div v-else class="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
        Soldan bir görüntü seçin
      </div>
    </div>
  </main>

  <PatchGridPanel
    v-model:show-patches="showPatches"
    v-model:show-tissue="showTissue"
    v-model:show-annotations="showAnnotations"
    v-model:fill-opacity="fillOpacity"
    :grid="grid"
    :label-colors="labelColors"
    :selected-index="selectedIndex"
    @locate="selectedIndex !== null && viewerRef?.showPatch(selectedIndex)"
    @deselect="selectedIndex = null"
  />
</template>

<script setup lang="ts">
// The patch grid for one image: viewer, panel and shortcuts. Which image is
// shown is decided outside — by the navigation sidebar in the app.
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import type { Image } from '@/core/entities/Image';
import { usePatchGrid } from '@/presentation/composables/patches/usePatchGrid';
import PatchGridPanel from './PatchGridPanel.vue';
import PatchGridViewer from './PatchGridViewer.vue';
import { labelColor } from './colors';

const props = defineProps<{
  image: Image | null;
  canGoPrev?: boolean;
  /** "3 / 12" */
  position?: string;
}>();
const emit = defineEmits<{ prev: []; next: [] }>();

const grid = usePatchGrid();
const viewerRef = ref<InstanceType<typeof PatchGridViewer> | null>(null);
const selectedIndex = ref<number | null>(null);
const showPatches = ref(true);
const showTissue = ref(true);
const showAnnotations = ref(true);
const fillOpacity = ref(0.35);

// Labels take their colours in sorted order, so a label keeps its colour across images.
const labelColors = computed(() => {
  const labels = grid.cells.value?.labels.length
    ? grid.cells.value.labels
    : (grid.labelSet.value?.labelCounts.map((l) => l.label) ?? []);
  return labels.map((_, i) => labelColor(i));
});

watch(
  () => props.image?.id,
  () => grid.load(props.image),
  { immediate: true }
);

// A patch index means nothing once the candidates change.
watch(
  () => grid.cells.value,
  () => (selectedIndex.value = null)
);
// A threshold may drop the selected patch.
watch(
  () => grid.kept.value,
  (kept) => {
    if (selectedIndex.value !== null && !kept.includes(selectedIndex.value)) {
      selectedIndex.value = null;
    }
  }
);

/** The kept patch nearest to the selected one in the direction of an arrow key. */
function step(dx: number, dy: number) {
  const cells = grid.cells.value;
  const from = selectedIndex.value;
  if (!cells || from === null) return;
  let best: number | null = null;
  let bestScore = Infinity;
  for (const i of grid.kept.value) {
    if (i === from) continue;
    const along = (cells.x0[i]! - cells.x0[from]!) * dx + (cells.y0[i]! - cells.y0[from]!) * dy;
    const across =
      Math.abs((cells.x0[i]! - cells.x0[from]!) * dy) +
      Math.abs((cells.y0[i]! - cells.y0[from]!) * dx);
    if (along <= 0 || across > along) continue; // only what lies ahead, within 45° of the arrow
    const score = along + 2 * across;
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  }
  if (best !== null) selectedIndex.value = best;
}

function onKeyDown(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null;
  if (target?.closest('input, select, textarea, [contenteditable]')) return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  switch (event.key) {
    case 'g':
    case 'G':
      showPatches.value = !showPatches.value;
      break;
    case 'm':
    case 'M':
      showTissue.value = !showTissue.value;
      break;
    case 'a':
    case 'A':
      showAnnotations.value = !showAnnotations.value;
      break;
    case 'f':
    case 'F':
      viewerRef.value?.fitPatches();
      break;
    case '[':
      emit('prev');
      break;
    case ']':
      emit('next');
      break;
    case 'Escape':
      selectedIndex.value = null;
      break;
    case 'ArrowLeft':
      step(-1, 0);
      break;
    case 'ArrowRight':
      step(1, 0);
      break;
    case 'ArrowUp':
      step(0, -1);
      break;
    case 'ArrowDown':
      step(0, 1);
      break;
    default:
      return;
  }
  event.preventDefault();
}

onMounted(() => window.addEventListener('keydown', onKeyDown));
onUnmounted(() => window.removeEventListener('keydown', onKeyDown));
</script>

<style scoped>
.nav-button {
  @apply rounded px-2 py-1 text-[11px] font-bold text-gray-500 hover:bg-gray-100;
}
</style>
