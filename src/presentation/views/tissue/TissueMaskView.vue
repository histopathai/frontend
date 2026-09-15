<template>
  <div class="flex w-full overflow-hidden" style="height: calc(100vh - 41px)">
    <aside class="tissue-sidebar h-full flex-shrink-0 border-r border-gray-200">
      <AnnotatorSidebar
        :workspaces="workspaces"
        :patients="currentPatients"
        :images="currentImages"
        :selected-workspace-id="selectedWorkspaceId"
        :selected-patient-id="selectedPatientId"
        :selected-image-id="selectedImageId"
        :loading="loading"
        :current-page="currentPage"
        :total-pages="totalPages"
        :has-more="hasMore"
        @workspace-selected="(ws: Workspace) => guard(() => selectWorkspace(ws))"
        @patient-selected="(p: Patient | null) => guard(() => selectPatient(p))"
        @image-selected="(img: Image) => guard(() => selectImage(img))"
        @clear-selection="guard(clearImageSelection)"
        @page-change="(page: number) => guard(() => setPage(page))"
        @load-more="loadMorePatients"
      />
    </aside>

    <main class="flex-1 h-full flex flex-col bg-white min-w-0 overflow-hidden">
      <header class="h-10 flex items-center justify-between gap-3 px-4 border-b border-gray-200">
        <div class="min-w-0 flex items-center gap-2">
          <h2 class="truncate text-xs font-black text-gray-700">
            {{ selectedImage?.name || 'Görüntü seçin' }}
          </h2>
          <span v-if="editor.loading.value" class="text-[10px] font-bold text-indigo-500"
            >yükleniyor…</span
          >
        </div>
        <div class="flex items-center gap-1">
          <button
            class="rounded px-2 py-1 text-[11px] font-bold text-gray-500 hover:bg-gray-100 disabled:opacity-40"
            :disabled="selectedImageIndex <= 0 && !selectedPatient"
            title="Önceki görüntü"
            @click="guard(prevImage)"
          >
            ‹ Önceki
          </button>
          <span v-if="currentImages.length" class="text-[10px] text-gray-400">
            {{ selectedImageIndex + 1 }} / {{ currentImages.length }}
          </span>
          <button
            class="rounded px-2 py-1 text-[11px] font-bold text-gray-500 hover:bg-gray-100"
            title="Sonraki görüntü"
            @click="guard(nextImage)"
          >
            Sonraki ›
          </button>
        </div>
      </header>

      <div class="flex-1 relative min-h-0">
        <TissueViewer
          v-if="selectedImage"
          ref="viewerRef"
          :editor="editor"
          :image="selectedImage"
          :overlay-visible="overlayVisible"
          :fill-opacity="fillOpacity"
        />
        <div v-else class="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
          Soldan bir görüntü seçin
        </div>
      </div>
    </main>

    <TissuePanel
      v-model:overlay-visible="overlayVisible"
      v-model:fill-opacity="fillOpacity"
      :editor="editor"
    />

    <ConfirmModal
      :is-open="!!editor.pendingParams.value"
      title="Elle yapılan düzenlemeler"
      message="Parametre değişikliği maskeyi yeniden hesaplar; elle yaptığınız düzenlemeler silinecek."
      @confirm="editor.confirmPendingParams()"
      @cancel="editor.cancelPendingParams()"
    />
    <ConfirmModal
      :is-open="!!pendingNavigation"
      title="Kaydedilmemiş değişiklikler"
      message="Bu görüntüdeki kaydedilmemiş maske değişiklikleri silinecek."
      @confirm="confirmNavigation"
      @cancel="pendingNavigation = null"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, shallowRef, watch } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import type { Image } from '@/core/entities/Image';
import type { Patient } from '@/core/entities/Patient';
import type { Workspace } from '@/core/entities/Workspace';
import AnnotatorSidebar from '@/presentation/components/annotator/AnnotatorSidebar.vue';
import ConfirmModal from '@/presentation/components/common/ConfirmModal.vue';
import TissuePanel from '@/presentation/components/tissue/TissuePanel.vue';
import TissueViewer from '@/presentation/components/tissue/TissueViewer.vue';
import { useAnnotatorNavigation } from '@/presentation/composables/annotator/useAnnotatorNavigation';
import { useTissueMaskEditor } from '@/presentation/composables/tissue/useTissueMaskEditor';
import { useTissueShortcuts } from '@/presentation/composables/tissue/useTissueShortcuts';

const {
  loading,
  workspaces,
  currentPatients,
  currentImages,
  selectedWorkspaceId,
  selectedPatientId,
  selectedImageId,
  selectedPatient,
  selectedImage,
  selectedImageIndex,
  selectWorkspace,
  selectPatient,
  selectImage,
  clearImageSelection,
  nextImage,
  prevImage,
  currentPage,
  totalPages,
  hasMore,
  setPage,
  loadMorePatients,
} = useAnnotatorNavigation();

const editor = useTissueMaskEditor();
const viewerRef = ref<InstanceType<typeof TissueViewer> | null>(null);
const overlayVisible = ref(true);
const fillOpacity = ref(0.25);

watch(
  () => selectedImage.value?.id,
  () => editor.load(selectedImage.value),
  { immediate: true }
);

// --- Unsaved changes ------------------------------------------------------------

const pendingNavigation = shallowRef<(() => void) | null>(null);

function guard(action: () => void) {
  if (editor.dirty.value) pendingNavigation.value = action;
  else action();
}

function confirmNavigation() {
  const action = pendingNavigation.value;
  pendingNavigation.value = null;
  editor.dirty.value = false;
  action?.();
}

onBeforeRouteLeave(() => {
  if (!editor.dirty.value) return true;
  return window.confirm('Kaydedilmemiş maske değişiklikleri silinecek. Devam edilsin mi?');
});

function onBeforeUnload(event: BeforeUnloadEvent) {
  if (editor.dirty.value) event.preventDefault();
}

useTissueShortcuts(editor, () => viewerRef.value?.fitToSelection());

onMounted(() => window.addEventListener('beforeunload', onBeforeUnload));
onUnmounted(() => window.removeEventListener('beforeunload', onBeforeUnload));
</script>

<style scoped>
.tissue-sidebar {
  width: clamp(240px, 18vw, 320px);
}
</style>
