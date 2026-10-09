<template>
  <div class="flex w-full overflow-hidden" style="height: calc(100vh - 41px)">
    <aside class="w-85 h-full flex-shrink-0 border-r border-gray-200">
      <RecheckSidebar
        :groups="nav.groups.value"
        :total="nav.requests.value.length"
        :open-count="nav.openCount.value"
        :loading="nav.loadingList.value"
        :hide-done="nav.hideDone.value"
        :selected-image-id="nav.selectedImageId.value"
        :workspace-name="nav.workspaceName"
        :can-request="canRequest"
        @select="nav.select"
        @update:hide-done="(v) => (nav.hideDone.value = v)"
        @send-workspace="isWorkspaceModalOpen = true"
        @withdraw-workspace="(wsId) => (withdrawWsId = wsId)"
      />
    </aside>

    <main class="flex-1 h-full flex flex-col bg-white min-w-0 overflow-hidden">
      <!-- Why the image is here -->
      <div
        v-if="request"
        class="px-4 py-2 border-b flex items-start gap-3"
        :class="request.status === 'done' ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'"
      >
        <div class="flex-1 min-w-0">
          <p
            class="text-[10px] font-black uppercase tracking-wide"
            :class="request.status === 'done' ? 'text-emerald-600' : 'text-amber-600'"
          >
            {{ request.status === 'done' ? 'Ek kontrol tamamlandı' : 'Neden ek kontrole geldi' }}
          </p>
          <ul class="mt-0.5 space-y-0.5">
            <li v-for="(reason, i) in request.reasons" :key="i" class="text-sm text-gray-800">
              <span class="font-semibold">{{ reasonSentence(reason) }}</span>
              <span v-if="reason.code !== 'other' && reason.note" class="text-gray-600"> — {{ reason.note }}</span>
            </li>
          </ul>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button
            v-if="canRequest"
            class="px-2.5 py-1.5 text-xs font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            @click="isModalOpen = true"
          >
            Neden ekle
          </button>
          <button
            v-if="canRequest"
            class="px-2.5 py-1.5 text-xs font-bold text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50"
            @click="isCancelOpen = true"
          >
            Listeden çıkar
          </button>
          <template v-if="canComplete">
            <button
              v-if="request.status === 'open'"
              class="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-sm"
              @click="nav.setDone(true)"
            >
              Kontrolü tamamla
            </button>
            <button
              v-else
              class="px-3 py-1.5 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              @click="nav.setDone(false)"
            >
              Yeniden aç
            </button>
          </template>
        </div>
      </div>

      <PatientMetadataBar
        :patient="nav.selectedPatient.value"
        :image="nav.selectedImage.value"
        :is-drawing-mode="isDrawingMode"
        :current-index="nav.selectedIndex.value"
        :total-count="nav.visible.value.length"
        @start-drawing="isDrawingMode = true"
        @stop-drawing="isDrawingMode = false"
        @prev="nav.prev"
        @next="nav.next"
        @refresh-viewer="refreshViewer"
      />

      <div class="flex-1 w-full overflow-hidden relative flex">
        <div class="flex-1 relative">
          <Viewer
            ref="viewerRef"
            :selected-image="nav.selectedImage.value"
            :is-drawing-mode="isDrawingMode"
            @prev-image="nav.prev"
            @next-image="nav.next"
          />
          <div
            v-if="nav.loadingImage.value"
            class="absolute inset-0 flex items-center justify-center bg-white/60 text-sm text-gray-500"
          >
            Görüntü açılıyor…
          </div>
        </div>

        <button
          v-if="nav.selectedImageId.value && !isActivityPanelOpen"
          class="absolute right-3 top-3 z-20 px-2.5 py-1.5 bg-white/90 border border-gray-200 rounded-lg shadow-md text-[10px] font-bold text-gray-500 hover:text-indigo-600"
          title="Etkinlikleri Göster"
          @click="isActivityPanelOpen = true"
        >
          Etkinlikler
        </button>
        <ActivityPanel
          :is-open="isActivityPanelOpen"
          :selected-image-id="nav.selectedImageId.value"
          @close="isActivityPanelOpen = false"
          @focus-annotation="(id: string) => viewerRef?.highlightAnnotation(id)"
        />
      </div>
    </main>

    <RecheckRequestModal
      :is-open="isModalOpen"
      :image-id="request?.imageId ?? null"
      :image-name="request?.imageName ?? ''"
      @close="isModalOpen = false"
      @sent="nav.upsert"
    />
    <RecheckWorkspaceModal
      :is-open="isWorkspaceModalOpen"
      :workspaces="nav.allWorkspaces.value"
      @close="isWorkspaceModalOpen = false"
      @sent="nav.reload"
    />
    <ConfirmModal
      :is-open="!!withdrawWsId"
      title="Veri setini geri çek"
      :message="`${withdrawWsId ? nav.workspaceName(withdrawWsId) : ''} veri seti Ek Kontrol listesinden geri çekilir; tek tek gönderilmiş görüntüler listede kalır.`"
      @confirm="withdraw"
      @cancel="withdrawWsId = null"
    />
    <ConfirmModal
      :is-open="isCancelOpen"
      title="Ek Kontrolden çıkar"
      message="Görüntü bu listeden çıkarılır; görüntü ve etiketleri değişmez."
      @confirm="cancelRequest"
      @cancel="isCancelOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { reasonSentence } from '@/core/recheck';
import { useRecheckNavigation } from '@/presentation/composables/recheck/useRecheckNavigation';
import RecheckSidebar from '@/presentation/components/recheck/RecheckSidebar.vue';
import RecheckRequestModal from '@/presentation/components/recheck/RecheckRequestModal.vue';
import RecheckWorkspaceModal from '@/presentation/components/recheck/RecheckWorkspaceModal.vue';
import ConfirmModal from '@/presentation/components/common/ConfirmModal.vue';
import PatientMetadataBar from '@/presentation/components/annotator/PatientMetadataBar.vue';
import Viewer from '@/presentation/components/annotator/Viewer.vue';
import ActivityPanel from '@/presentation/components/annotator/ActivityPanel.vue';

const authStore = useAuthStore();
const nav = useRecheckNavigation();

const request = computed(() => nav.selectedRequest.value);
const canRequest = computed(() => authStore.can('recheck.request'));
const canComplete = computed(() => authStore.can('recheck.complete'));

const isDrawingMode = ref(false);
const isActivityPanelOpen = ref(false);
const isModalOpen = ref(false);
const isCancelOpen = ref(false);
const isWorkspaceModalOpen = ref(false);
const withdrawWsId = ref<string | null>(null);
const viewerRef = ref<InstanceType<typeof Viewer> | null>(null);

function refreshViewer() {
  if (nav.selectedImageId.value) viewerRef.value?.loadAnnotations(nav.selectedImageId.value);
}

async function withdraw() {
  const wsId = withdrawWsId.value;
  withdrawWsId.value = null;
  if (wsId) await nav.withdrawWorkspace(wsId);
}

async function cancelRequest() {
  isCancelOpen.value = false;
  await nav.cancel();
}
</script>

<style scoped>
.w-85 {
  width: clamp(240px, 18vw, 320px);
}
</style>
