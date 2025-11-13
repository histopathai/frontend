<template>
  <div class="flex-1 h-full bg-black relative flex">
    <div :id="viewerDivId" ref="viewerDiv" class="w-full h-full"></div>

    <ViewerToolbar :active-tool="activeTool" @tool-selected="setActiveTool($event as ToolName)" />

    <AnnotationNotification
      v-if="notification"
      :message="notification.message"
      :status="notification.status"
    />

    <AnnotationSidebar
      :annotation-types="annotationTypes"
      :annotations="annotations"
      :selected-type="selectedType"
      @type-selected="setSelectedType"
      @annotation-selected="handleAnnotationSelected($event.id)"
      @annotation-deleted="handleAnnotationDeleted"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { useAnnotationViewer } from '@/presentation/composables/viewer/useAnnotationViewer';
import ViewerToolbar from '@/presentation/components/viewer/ViewerToolbar.vue';
import AnnotationSidebar from '@/presentation/components/viewer/AnnotationSidebar.vue';
import AnnotationNotification from '@/presentation/components/viewer/AnnotationNotification.vue';
import type { ToolName } from '@/presentation/components/viewer/ViewerToolbar.vue';

// Standalone bir sayfa olduğu için 'props.image' olmayacak.
// Görüntüleyiciyi 'null' image ile başlatıyoruz.
// Bu sayfa, üzerine tıklandığında boş bir görüntüleyici açar.
const {
  viewerDivId,
  activeTool,
  selectedType,
  notification,
  annotationTypes,
  annotations,
  initViewer,
  loadData,
  setActiveTool,
  setSelectedType,
  handleAnnotationDeleted,
  handleAnnotationSelected,
  cleanup,
} = useAnnotationViewer(null); // <-- 'null' ile başlatıyoruz

onMounted(() => {
  // Modal'daki 'isOpen' watch'ı yerine onMounted kullanıyoruz.
  nextTick(() => {
    initViewer();
    loadData(); // Bu 'null' image ile bir şey yapmayacak, ki bu sorun değil.
  });
});

// onUnmounted'da cleanup'ı çağırmak iyi bir pratik olabilir
// import { onUnmounted } from 'vue';
// onUnmounted(() => {
//   cleanup();
// });
</script>
