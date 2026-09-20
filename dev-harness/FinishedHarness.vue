<template>
  <div class="harness">
    <div class="harness-bar">
      <strong>Bitenleri Gizle — deneme düzeneği</strong>
      <a v-for="m in MODES" :key="m.mode" :href="`?mode=${m.mode}`" :class="{ active: m.mode === mode }">{{
        m.label
      }}</a>
      <span>sahte veri · hiçbir şey kaydedilmez</span>
    </div>
    <div class="harness-body">
      <aside class="harness-sidebar">
        <AnnotatorSidebar
          :workspaces="nav.workspaces.value"
          :patients="nav.currentPatients.value"
          :images="nav.currentImages.value"
          :selected-workspace-id="nav.selectedWorkspaceId.value"
          :selected-patient-id="nav.selectedPatientId.value"
          :selected-image-id="nav.selectedImageId.value"
          :loading="nav.loading.value"
          :current-page="nav.currentPage.value"
          :total-pages="nav.totalPages.value"
          :has-more="nav.hasMore.value"
          :completion-mode="nav.completionMode"
          :hide-finished="nav.hideFinished.value"
          :patient-progress="nav.patientProgress"
          :is-image-finished="nav.isImageFinished"
          @update:hide-finished="nav.setHideFinished"
          @workspace-selected="nav.selectWorkspace"
          @patient-selected="nav.selectPatient"
          @image-selected="nav.selectImage"
          @clear-selection="nav.clearImageSelection"
          @page-change="nav.setPage"
        />
      </aside>
      <main class="harness-main">
        <h2 id="selected-image">{{ nav.selectedImage.value?.name ?? 'Görüntü seçili değil' }}</h2>
        <p>{{ nav.selectedImageIndex.value + 1 }} / {{ nav.currentImages.value.length }}</p>
        <div class="harness-actions">
          <button id="prev" @click="nav.prevImage">‹ Önceki</button>
          <button id="next" @click="nav.nextImage">Sonraki ›</button>
          <button v-if="mode === 'labeling'" id="finish" :disabled="!nav.selectedImage.value" @click="finish">
            İşaretleme Tamamlandı
          </button>
          <button v-if="mode === 'tissue'" id="finish" :disabled="!nav.selectedImage.value" @click="approve">
            Maskeyi onayla
          </button>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import type { CompletionMode } from '@/core/completion';
import type { TissueMaskStatus } from '@/core/entities/TissueMask';
import AnnotatorSidebar from '@/presentation/components/annotator/AnnotatorSidebar.vue';
import { useAnnotatorNavigation } from '@/presentation/composables/annotator/useAnnotatorNavigation';
import { useImageStore } from '@/stores/image';

const props = defineProps({
  mode: { type: String as PropType<CompletionMode>, required: true },
  masks: { type: Object as PropType<Map<string, TissueMaskStatus>>, required: true },
});

const MODES = [
  { mode: 'labeling', label: 'Veri Etiketleyici' },
  { mode: 'tissue', label: 'Doku Maskeleri' },
  { mode: 'none', label: 'Patch Izgarası' },
];

const nav = useAnnotatorNavigation({ completion: props.mode });
const imageStore = useImageStore();

// What PatientMetadataBar does: mark, then move on.
async function finish() {
  const image = nav.selectedImage.value;
  if (image && (await imageStore.markAsCompleted(image.id))) nav.nextImage();
}

// What TissueMaskView does when the editor's mask changes; the tab does not move on.
function approve() {
  const image = nav.selectedImage.value;
  if (!image) return;
  props.masks.set(image.id, 'approved');
  nav.setMaskStatus(image.id, 'approved');
}
</script>

<style>
.harness {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: system-ui, sans-serif;
}
.harness-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 6px 12px;
  background: #1e1b4b;
  color: #e0e7ff;
  font-size: 12px;
}
.harness-bar a {
  color: #a5b4fc;
  text-decoration: none;
}
.harness-bar a.active {
  color: #fff;
  font-weight: 700;
  text-decoration: underline;
}
.harness-bar span {
  margin-left: auto;
  opacity: 0.7;
}
.harness-body {
  display: flex;
  flex: 1;
  min-height: 0;
}
.harness-sidebar {
  width: 320px;
  flex-shrink: 0;
  height: 100%;
}
.harness-main {
  flex: 1;
  padding: 24px;
}
.harness-main h2 {
  font-size: 16px;
  font-weight: 700;
}
.harness-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}
.harness-actions button {
  padding: 6px 12px;
  border: 1px solid #c7d2fe;
  border-radius: 6px;
  background: #eef2ff;
  font-size: 12px;
}
.harness-actions button:disabled {
  opacity: 0.4;
}
</style>
