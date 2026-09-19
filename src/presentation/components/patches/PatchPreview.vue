<template>
  <div class="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-800">
    <div :id="viewerId" class="absolute inset-0"></div>
  </div>
</template>

<script setup lang="ts">
// What a patch actually contains: a second viewer locked onto its square. It
// reads the same tiles as the main viewer, so it costs no backend work.
import { nextTick, onMounted, onUnmounted, shallowRef, watch } from 'vue';
import OpenSeadragon from 'openseadragon';
import type { Image } from '@/core/entities/Image';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const props = defineProps<{ image: Image; x0: number; y0: number; size0: number }>();

const viewerId = `osd-patch-preview-${Math.random().toString(36).slice(2, 8)}`;
const viewer = shallowRef<OpenSeadragon.Viewer | null>(null);

function frame() {
  const v = viewer.value;
  if (!v || !v.world.getItemAt(0)) return;
  v.viewport.fitBounds(
    v.viewport.imageToViewportRectangle(props.x0, props.y0, props.size0, props.size0),
    true
  );
}

onMounted(() =>
  nextTick(() => {
    viewer.value = OpenSeadragon({
      id: viewerId,
      tileSources: `${API_BASE_URL}/api/v1/proxy/${props.image.processedpath}/image.dzi`,
      showNavigationControl: false,
      mouseNavEnabled: false,
      // The square is the patch: no margin, no clamping to the slide's aspect.
      visibilityRatio: 0,
      minZoomImageRatio: 0,
      maxZoomPixelRatio: Infinity,
      immediateRender: true,
      loadTilesWithAjax: true,
      ajaxWithCredentials: true,
    });
    viewer.value.addHandler('open', frame);
    viewer.value.addHandler('resize', frame);
  })
);

watch(() => [props.x0, props.y0, props.size0], frame);

onUnmounted(() => {
  viewer.value?.destroy();
  viewer.value = null;
});
</script>
