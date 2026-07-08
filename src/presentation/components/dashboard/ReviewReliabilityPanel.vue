<template>
  <div class="card shadow-lg rounded-xl">
    <div class="card-body p-6">
      <!-- Başlık + Yenile -->
      <div class="flex items-center justify-between gap-3 mb-2">
        <p class="text-sm text-gray-500">
          Dışarıdan gelen (3. taraf) etiketlerin uzman review'inde ne kadarı doğrudan kabul
          edildi, revize edildi veya reddedildi?
        </p>
        <button
          @click="reload"
          :disabled="loading || !workspace"
          class="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-indigo-600 transition-colors disabled:opacity-40"
          title="Yenile"
        >
          <svg class="w-4 h-4" :class="{ 'animate-spin': loading }" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h5M20 20v-5h-5M4 9a8 8 0 0113.657-3.657M20 15a8 8 0 01-13.657 3.657" />
          </svg>
        </button>
      </div>

      <!-- Boş / hata / yükleniyor -->
      <div v-if="!workspace" class="py-12 text-center text-gray-400 text-sm">
        Görüntülemek için bir veri seti seçin.
      </div>
      <div v-else-if="error" class="py-12 text-center text-sm text-red-500">{{ error }}</div>
      <div v-else-if="loading" class="py-16 flex flex-col items-center gap-3 text-gray-400">
        <svg class="w-8 h-8 animate-spin text-indigo-400" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span class="text-sm">
          Review'lar çekiliyor…
          <template v-if="totalToFetch > 0">{{ fetched }} / {{ totalToFetch }}</template>
        </span>
      </div>

      <!-- Sonuç -->
      <template v-else-if="result">
        <div v-if="result.totalReviewed === 0" class="py-12 text-center text-gray-400 text-sm">
          Bu veri setinde review görmüş 3. taraf etiket bulunamadı.
        </div>

        <template v-else>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-center mt-4">
            <!-- Donut + merkez -->
            <div class="relative mx-auto" style="width: 220px; height: 220px">
              <Doughnut :data="chartData" :options="chartOptions" />
              <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span class="text-3xl font-bold text-emerald-600 leading-none">%{{ acceptancePct }}</span>
                <span class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mt-1">Kabul oranı</span>
                <span class="text-xs text-gray-400 mt-1">{{ result.totalReviewed }} etiket</span>
              </div>
            </div>

            <!-- Legend -->
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
              <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Review'lı 3. Taraf</div>
              <div class="text-2xl font-bold text-gray-900 mt-1 tabular-nums">{{ result.totalReviewed }}</div>
            </div>
            <div class="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
              <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Kabul edilen</div>
              <div class="text-2xl font-bold text-emerald-600 mt-1 tabular-nums">{{ result.approved }}</div>
            </div>
            <div class="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
              <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Revize edilen</div>
              <div class="text-2xl font-bold text-amber-600 mt-1 tabular-nums">{{ result.modified }}</div>
            </div>
            <div class="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
              <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Reddedilen</div>
              <div class="text-2xl font-bold text-red-600 mt-1 tabular-nums">{{ result.rejected }}</div>
            </div>
          </div>

          <p v-if="result.unknown > 0" class="text-[11px] text-gray-400 mt-4">
            {{ result.unknown }} etiketin review kaydına ulaşılamadı (statü okunamadı).
          </p>
          <p v-if="result.truncated" class="text-[11px] text-amber-600 mt-1">
            Büyük veri seti: ilk {{ result.totalReviewed }} review'lı etiket üzerinden hesaplandı.
            Kesin sonuç için backend aggregation önerilir.
          </p>
        </template>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { Doughnut } from 'vue-chartjs';
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js';
import type { Workspace } from '@/core/entities/Workspace';
import { useReviewReliability } from '@/presentation/composables/dashboard/useReviewReliability';

ChartJS.register(ArcElement, Tooltip);

const props = defineProps<{ workspace: Workspace | null }>();

// Status paleti: kabul=iyi(yeşil), revize=uyarı(amber), reddet=kritik(kırmızı).
const COLORS = {
  approved: '#16a34a',
  modified: '#d97706',
  rejected: '#dc2626',
  unknown: '#94a3b8',
};

const { loading, error, result, fetched, totalToFetch, load } = useReviewReliability();

const segments = computed(() => {
  const r = result.value;
  if (!r) return [];
  const segs = [
    { key: 'approved', label: 'Doğrudan kabul', value: r.approved, color: COLORS.approved },
    { key: 'modified', label: 'Revize edildi', value: r.modified, color: COLORS.modified },
    { key: 'rejected', label: 'Reddedildi', value: r.rejected, color: COLORS.rejected },
  ];
  if (r.unknown > 0) segs.push({ key: 'unknown', label: 'Bilinmiyor', value: r.unknown, color: COLORS.unknown });
  return segs;
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
        label: (ctx: any) => ` ${ctx.label}: ${ctx.parsed} (%${pct(ctx.parsed)})`,
      },
    },
  },
};

function pct(value: number): number {
  const total = result.value?.totalReviewed || 0;
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

const acceptancePct = computed(() => pct(result.value?.approved || 0));

function reload() {
  if (props.workspace) load(props.workspace, { refresh: true });
}

watch(
  () => props.workspace,
  (ws) => {
    if (ws) load(ws);
  },
  { immediate: true }
);
</script>
