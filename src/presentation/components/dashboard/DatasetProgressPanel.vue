<template>
  <div class="card shadow-lg rounded-xl">
    <div class="card-body p-6">
      <!-- Başlık + Veri seti seçici -->
      <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h3 class="text-xl font-semibold text-gray-900">Veri Seti İlerlemesi</h3>
          <p class="text-sm text-gray-500 mt-0.5">
            Seçili veri setinin ne kadarı etiketlenmiş?
          </p>
        </div>

        <div class="flex items-center gap-2">
          <select
            v-model="selectedWorkspaceId"
            class="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:ring-2 focus:ring-indigo-400 outline-none max-w-[220px]"
          >
            <option v-for="ws in workspaces" :key="ws.id" :value="ws.id">
              {{ ws.name }}
            </option>
          </select>
          <button
            @click="reload"
            :disabled="loading"
            class="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-indigo-600 transition-colors disabled:opacity-40"
            title="Yenile"
          >
            <svg
              class="w-4 h-4"
              :class="{ 'animate-spin': loading }"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h5M20 20v-5h-5M4 9a8 8 0 0113.657-3.657M20 15a8 8 0 01-13.657 3.657" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Boş durum -->
      <div v-if="!selectedWorkspaceId" class="py-12 text-center text-gray-400 text-sm">
        Görüntülemek için bir veri seti seçin.
      </div>

      <!-- Hata -->
      <div v-else-if="error" class="py-12 text-center text-sm text-red-500">
        {{ error }}
      </div>

      <!-- Yükleniyor -->
      <div v-else-if="loading && !progress" class="py-16 flex flex-col items-center gap-3 text-gray-400">
        <svg class="w-8 h-8 animate-spin text-indigo-400" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span class="text-sm">İlerleme hesaplanıyor…</span>
      </div>

      <template v-else-if="progress">
        <!-- Donut + Legend -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <!-- Donut + merkez metni -->
          <div class="relative mx-auto" style="width: 220px; height: 220px">
            <Doughnut :data="chartData" :options="chartOptions" />
            <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span class="text-3xl font-bold text-gray-900 leading-none">{{ progress.total }}</span>
              <span class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mt-1">Görüntü</span>
              <span class="text-xs font-bold text-indigo-600 mt-1">%{{ annotatedPct }} işlenmiş</span>
            </div>
          </div>

          <!-- Legend / tablo -->
          <div class="space-y-1.5">
            <div
              v-for="seg in segments"
              :key="seg.key"
              class="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span class="w-3 h-3 rounded-sm flex-shrink-0" :style="{ backgroundColor: seg.color }"></span>
              <span class="text-sm text-gray-700 flex-1">{{ seg.label }}</span>
              <span class="text-sm font-bold text-gray-900 tabular-nums">{{ seg.value }}</span>
              <span class="text-xs text-gray-400 w-10 text-right tabular-nums">%{{ pct(seg.value) }}</span>
            </div>
          </div>
        </div>

        <!-- Stat tile'lar -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-8">
          <div class="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
            <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Toplam Görüntü</div>
            <div class="text-2xl font-bold text-gray-900 mt-1 tabular-nums">{{ progress.total }}</div>
          </div>
          <div class="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
            <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wide">İşlenmiş</div>
            <div class="text-2xl font-bold text-gray-900 mt-1 tabular-nums">{{ progress.annotated }}</div>
            <div class="text-[11px] text-gray-400">%{{ annotatedPct }} · toplamın</div>
          </div>
          <div class="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
            <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Tamamlanan</div>
            <div class="text-2xl font-bold text-gray-900 mt-1 tabular-nums">{{ progress.completed }}</div>
            <div class="text-[11px] text-gray-400">mark as completed</div>
          </div>
          <div class="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
            <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wide">3. Taraf Review</div>
            <div class="text-2xl font-bold text-gray-900 mt-1 tabular-nums">{{ progress.reviewed }}</div>
            <div class="text-[11px] text-gray-400">%{{ reviewedOfAnnotatedPct }} · işlenmişin</div>
          </div>
        </div>

        <!-- Tamamlanma çubuğu (işlenmiş görüntüler içinde) -->
        <div class="mt-6">
          <div class="flex items-center justify-between text-xs mb-1.5">
            <span class="font-semibold text-gray-600">Tamamlandı olarak işaretlenen (işlenmiş içinde)</span>
            <span class="font-bold text-gray-900 tabular-nums">
              {{ progress.completedAmongAnnotated }} / {{ progress.annotated }}
              <span class="text-gray-400 font-normal">(%{{ completedPct }})</span>
            </span>
          </div>
          <div class="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              class="h-full rounded-full bg-emerald-500 transition-all duration-500"
              :style="{ width: completedPct + '%' }"
            ></div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { Doughnut } from 'vue-chartjs';
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js';
import { useWorkspaceStore } from '@/stores/workspace';
import { useDatasetProgress } from '@/presentation/composables/dashboard/useDatasetProgress';

ChartJS.register(ArcElement, Tooltip);

// Status-sıralı palet: yok → kısmi → review → tam (ayrımı yüksek, etiketle birlikte).
const COLORS = {
  full: '#16a34a', // yeşil
  partial: '#d97706', // amber
  reviewed: '#4f46e5', // indigo
  none: '#94a3b8', // slate
};

const workspaceStore = useWorkspaceStore();
const { workspaces } = storeToRefs(workspaceStore);

const { loading, error, progress, load } = useDatasetProgress();

const selectedWorkspaceId = ref<string | undefined>(undefined);

const selectedWorkspace = computed(
  () => workspaces.value.find((w) => w.id === selectedWorkspaceId.value) || null
);

const segments = computed(() => {
  const p = progress.value;
  if (!p) return [];
  return [
    { key: 'full', label: 'Tam etiketli', value: p.full, color: COLORS.full },
    { key: 'partial', label: 'Kısmi', value: p.partial, color: COLORS.partial },
    { key: 'reviewed', label: 'Review-onaylı (3. taraf)', value: p.reviewed, color: COLORS.reviewed },
    { key: 'none', label: 'Etiketlenmemiş', value: p.none, color: COLORS.none },
  ];
});

const chartData = computed(() => ({
  labels: segments.value.map((s) => s.label),
  datasets: [
    {
      data: segments.value.map((s) => s.value),
      backgroundColor: segments.value.map((s) => s.color),
      borderColor: '#ffffff',
      borderWidth: 2,
      hoverOffset: 4,
    },
  ],
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '68%',
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: any) => {
          const value = ctx.parsed as number;
          const total = progress.value?.total || 0;
          const p = total > 0 ? Math.round((value / total) * 100) : 0;
          return ` ${ctx.label}: ${value} (%${p})`;
        },
      },
    },
  },
};

function pct(value: number): number {
  const total = progress.value?.total || 0;
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

const annotatedPct = computed(() => pct(progress.value?.annotated || 0));

const completedPct = computed(() => {
  const p = progress.value;
  if (!p || p.annotated === 0) return 0;
  return Math.round((p.completedAmongAnnotated / p.annotated) * 100);
});

const reviewedOfAnnotatedPct = computed(() => {
  const p = progress.value;
  if (!p || p.annotated === 0) return 0;
  return Math.round((p.reviewed / p.annotated) * 100);
});

function reload() {
  if (selectedWorkspace.value) load(selectedWorkspace.value, { refresh: true });
}

watch(selectedWorkspaceId, () => {
  if (selectedWorkspace.value) load(selectedWorkspace.value);
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
  if (workspaces.value.length === 0) {
    workspaceStore.fetchWorkspaces();
  }
});
</script>
