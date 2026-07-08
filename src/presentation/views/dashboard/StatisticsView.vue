<template>
  <div class="space-y-6">
    <!-- Başlık + veri seti seçici -->
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">İstatistikler</h2>
        <p class="text-gray-500 mt-1">Veri setlerinin etiketleme ilerlemesi ve review güvenilirliği.</p>
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Veri Seti</label>
        <select
          v-model="selectedWorkspaceId"
          class="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:ring-2 focus:ring-indigo-400 outline-none min-w-[240px]"
        >
          <option v-for="ws in workspaces" :key="ws.id" :value="ws.id">{{ ws.name }}</option>
        </select>
      </div>
    </div>

    <!-- Veri seti bilgi kartı -->
    <div v-if="selectedWorkspace" class="card shadow-lg rounded-xl">
      <div class="card-body p-6">
        <div class="flex items-start justify-between gap-3 mb-4">
          <h3 class="text-lg font-semibold text-gray-900">{{ selectedWorkspace.name }}</h3>
          <span
            class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 whitespace-nowrap"
          >
            {{ organLabel }}
          </span>
        </div>

        <!-- Meta bilgiler -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
          <div>
            <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Doku Grubu</div>
            <div class="text-gray-800 mt-0.5">{{ organLabel }}</div>
          </div>
          <div>
            <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Organizasyon</div>
            <div class="text-gray-800 mt-0.5">{{ selectedWorkspace.organization || '—' }}</div>
          </div>
          <div>
            <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Lisans</div>
            <div class="text-gray-800 mt-0.5">{{ selectedWorkspace.license || '—' }}</div>
          </div>
          <div>
            <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Yayın Yılı</div>
            <div class="text-gray-800 mt-0.5">{{ selectedWorkspace.releaseYear || '—' }}</div>
          </div>
          <div v-if="selectedWorkspace.resourceURL" class="col-span-2 md:col-span-4">
            <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Kaynak</div>
            <a
              :href="selectedWorkspace.resourceURL"
              target="_blank"
              rel="noopener noreferrer"
              class="text-indigo-600 hover:underline break-all mt-0.5 inline-block"
            >
              {{ selectedWorkspace.resourceURL }}
            </a>
          </div>
          <div v-if="selectedWorkspace.description" class="col-span-2 md:col-span-4">
            <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Açıklama</div>
            <div class="text-gray-700 mt-0.5">{{ selectedWorkspace.description }}</div>
          </div>
        </div>

        <!-- Annotation türleri -->
        <div class="mt-5 pt-4 border-t border-gray-100">
          <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">
            Anotasyon Türleri
            <span class="text-gray-300">({{ wsAnnotationTypes.length }})</span>
          </div>
          <div v-if="wsAnnotationTypes.length === 0" class="text-sm text-gray-400 italic">
            Bu veri setinde tanımlı anotasyon türü yok.
          </div>
          <div v-else class="flex flex-wrap gap-2">
            <span
              v-for="at in wsAnnotationTypes"
              :key="at.id"
              class="inline-flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-full border text-xs font-medium bg-white"
              :class="at.global ? 'border-amber-200' : 'border-gray-200'"
            >
              <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ backgroundColor: at.color || '#94a3b8' }"></span>
              <span class="text-gray-800">{{ at.name }}</span>
              <span class="text-[9px] font-bold uppercase" :class="at.global ? 'text-amber-500' : 'text-gray-400'">
                {{ at.global ? 'Global' : 'Lokal' }}
              </span>
              <span class="text-[9px] text-gray-300">· {{ at.type }}</span>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- İç sekmeler -->
    <div class="flex items-center gap-1 border-b border-gray-200">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        @click="activeTab = tab.key"
        class="px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors"
        :class="
          activeTab === tab.key
            ? 'border-indigo-500 text-indigo-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'
        "
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- İçerik: v-if ile, pahalı review fetch'i ancak sekme seçilince çalışır -->
    <DatasetProgressPanel v-if="activeTab === 'progress'" :workspace="selectedWorkspace" />
    <ReviewReliabilityPanel v-else-if="activeTab === 'review'" :workspace="selectedWorkspace" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useWorkspaceStore } from '@/stores/workspace';
import { useAnnotationTypeStore } from '@/stores/annotation_type';
import { OrganTypeUtils, type OrganType } from '@/core/value-objects';
import DatasetProgressPanel from '@/presentation/components/dashboard/DatasetProgressPanel.vue';
import ReviewReliabilityPanel from '@/presentation/components/dashboard/ReviewReliabilityPanel.vue';

type TabKey = 'progress' | 'review';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'progress', label: 'Veri Seti İlerlemesi' },
  { key: 'review', label: 'Review Güvenilirliği' },
];

const activeTab = ref<TabKey>('progress');

const workspaceStore = useWorkspaceStore();
const annotationTypeStore = useAnnotationTypeStore();
const { workspaces } = storeToRefs(workspaceStore);
const { annotationTypes } = storeToRefs(annotationTypeStore);

const selectedWorkspaceId = ref<string | undefined>(undefined);
const selectedWorkspace = computed(
  () => workspaces.value.find((w) => w.id === selectedWorkspaceId.value) || null
);

// Yalnızca bu veri setine tanımlı (annotationTypeIds) anotasyon türleri
const wsAnnotationTypes = computed(() => {
  const ws = selectedWorkspace.value;
  if (!ws) return [];
  const ids = new Set(ws.annotationTypeIds || []);
  return annotationTypes.value.filter((at) => ids.has(at.id));
});

const organLabel = computed(() => {
  const ws = selectedWorkspace.value;
  if (!ws) return '—';
  return OrganTypeUtils.getLabel(ws.organType as OrganType) || String(ws.organType || '—');
});

// Seçili veri setinin anotasyon türlerini getir
watch(selectedWorkspaceId, (wsId) => {
  if (wsId) {
    annotationTypeStore.fetchAnnotationTypes(
      { limit: 100 },
      { parentId: wsId, refresh: true, showToast: false }
    );
  }
});

// İlk workspace hazır olunca otomatik seç
watch(
  workspaces,
  (list) => {
    if (!selectedWorkspaceId.value && list.length > 0) {
      selectedWorkspaceId.value = list[0]!.id;
    }
  },
  { immediate: true }
);

onMounted(() => {
  if (workspaces.value.length === 0) workspaceStore.fetchWorkspaces();
});
</script>
