<template>
  <TransitionRoot as="template" :show="isOpen">
    <Dialog as="div" class="relative z-40" @close="closeModal">
      <TransitionChild
        as="template"
        enter="duration-300 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-200 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black bg-opacity-75" />
      </TransitionChild>

      <div class="fixed inset-0 z-50 flex items-center justify-center">
        <TransitionChild
          as="template"
          enter="duration-300 ease-out"
          enter-from="opacity-0 scale-95"
          enter-to="opacity-100 scale-100"
          leave="duration-200 ease-in"
          leave-from="opacity-100 scale-100"
          leave-to="opacity-0 scale-95"
        >
          <DialogPanel
            class="relative w-full h-full transform overflow-hidden bg-white text-left shadow-xl transition-all flex"
          >
            <div class="flex-1 h-full bg-black relative">
              <div :id="viewerDivId" ref="viewerDiv" class="w-full h-full"></div>

              <ViewerToolbar
                :active-tool="activeTool"
                @tool-selected="setActiveTool($event as ToolName)"
              />

              <AnnotationNotification
                v-if="notification"
                :message="notification.message"
                :status="notification.status"
              />
            </div>

            <AnnotationSidebar
              :annotation-types="annotationTypes"
              :annotations="annotations"
              :selected-type="selectedType"
              @type-selected="setSelectedType"
              @annotation-selected="handleAnnotationSelected($event.id)"
              @annotation-deleted="handleAnnotationDeleted"
            />

            <button
              type="button"
              class="absolute top-4 left-4 z-20 btn btn-outline bg-white"
              @click="closeModal"
            >
              Geri Dön (Kapat)
            </button>
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { Dialog, DialogPanel, TransitionChild, TransitionRoot } from '@headlessui/vue';
import { useAnnotationViewer } from '@/presentation/composables/viewer/useAnnotationViewer';
import ViewerToolbar from '@/presentation/components/viewer/ViewerToolbar.vue';
import AnnotationSidebar from '@/presentation/components/viewer/AnnotationSidebar.vue';
import AnnotationNotification from '@/presentation/components/viewer/AnnotationNotification.vue';
import type { ToolName } from '@/presentation/components/viewer/ViewerToolbar.vue';
import type { Image } from '@/core/entities/Image';
import type { PropType } from 'vue';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  image: {
    type: Object as PropType<Image | null>,
    default: null,
  },
});

const emit = defineEmits(['close']);

const viewerDiv = ref<HTMLElement | null>(null);

// Composable'ı başlat
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
} = useAnnotationViewer(props.image);

const closeModal = () => {
  emit('close');
};

watch(
  () => props.isOpen,
  (newVal) => {
    if (newVal && props.image) {
      // Modal açıldığında ve DOM hazır olduğunda OSD'yi başlat
      nextTick(() => {
        initViewer();
        loadData();
      });
    } else {
      // Modal kapandığında OSD'yi ve store'u temizle
      cleanup();
    }
  }
);
</script>
