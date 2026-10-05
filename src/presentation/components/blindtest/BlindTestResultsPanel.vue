<template>
  <div class="h-full overflow-y-auto bg-gray-50">
    <div class="border-b border-gray-200 bg-white px-6 py-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">{{ results.name }} — sonuçlar</h2>
          <p class="text-sm text-gray-500">
            Yalnızca admin görür. Model koşusu: <span class="font-mono">{{ results.runId }}</span>
          </p>
        </div>
        <div class="flex gap-2">
          <button
            class="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
            @click="exportUsers"
          >
            Katılımcılar CSV
          </button>
          <button
            class="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
            @click="exportImages"
          >
            Görseller CSV
          </button>
          <button
            class="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
            @click="$emit('refresh')"
          >
            Yenile
          </button>
        </div>
      </div>
    </div>

    <div class="space-y-6 p-6">
      <!-- Özet -->
      <section>
        <h3 class="mb-2 text-sm font-semibold text-gray-700">
          Havuzlanmış sonuç (tamamlayan {{ completedCount }} katılımcı,
          {{ results.pooled.answered }} cevap)
        </h3>
        <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div class="rounded-lg border border-gray-200 bg-white p-4">
            <div class="text-xs text-gray-500">Doğru ayırt etme</div>
            <div class="text-2xl font-semibold tabular-nums">
              {{ pct(results.pooled.accuracy) }}
            </div>
            <div class="text-xs text-gray-500">şans düzeyi %50</div>
          </div>
          <div class="rounded-lg border border-gray-200 bg-white p-4">
            <div class="text-xs text-gray-500">p (şansa karşı, iki yönlü binom)</div>
            <div class="text-2xl font-semibold tabular-nums">{{ pval(results.pooled.pValue) }}</div>
            <div class="text-xs text-gray-500">
              {{
                results.pooled.pValue < 0.05 ? 'şanstan anlamlı farklı' : 'şanstan ayırt edilemiyor'
              }}
            </div>
          </div>
          <div class="rounded-lg border border-gray-200 bg-white p-4">
            <div class="text-xs text-gray-500">Sentetiklerin "gerçek" sanılma oranı</div>
            <div class="text-2xl font-semibold tabular-nums">
              {{ pct(results.pooled.syntheticCalledReal) }}
            </div>
          </div>
          <div class="rounded-lg border border-gray-200 bg-white p-4">
            <div class="text-xs text-gray-500">Karışıklık matrisi (satır: doğru, sütun: cevap)</div>
            <table class="mt-1 text-sm tabular-nums">
              <tbody>
                <tr class="text-xs text-gray-500">
                  <td></td>
                  <td class="px-2">gerçek</td>
                  <td class="px-2">sentetik</td>
                </tr>
                <tr>
                  <td class="pr-2 text-xs text-gray-500">gerçek</td>
                  <td class="px-2">{{ results.pooled.confusion.realAsReal }}</td>
                  <td class="px-2">{{ results.pooled.confusion.realAsSynthetic }}</td>
                </tr>
                <tr>
                  <td class="pr-2 text-xs text-gray-500">sentetik</td>
                  <td class="px-2">{{ results.pooled.confusion.syntheticAsReal }}</td>
                  <td class="px-2">{{ results.pooled.confusion.syntheticAsSynthetic }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- Katılımcılar -->
      <section>
        <h3 class="mb-2 text-sm font-semibold text-gray-700">Katılımcılar</h3>
        <p class="mb-2 text-xs text-gray-500">
          Her satır o kullanıcının kendi cevaplarından hesaplanır; yarım kalan testler de kendi
          satırında görünür (havuzlanmış sonuca yalnızca tamamlananlar girer).
        </p>
        <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table class="min-w-full whitespace-nowrap text-sm">
            <thead class="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th rowspan="2" class="px-3 py-2 text-left align-bottom">Kullanıcı</th>
                <th rowspan="2" class="px-3 py-2 text-left align-bottom">Rol</th>
                <th rowspan="2" class="px-3 py-2 text-right align-bottom">Cevap</th>
                <th rowspan="2" class="px-3 py-2 text-right align-bottom">Doğru</th>
                <th rowspan="2" class="px-3 py-2 text-right align-bottom">Doğruluk</th>
                <th rowspan="2" class="px-3 py-2 text-right align-bottom">p</th>
                <th colspan="4" class="border-x border-gray-200 px-3 pt-2 text-center">
                  Karışıklık matrisi (doğru → cevap)
                </th>
                <th rowspan="2" class="px-3 py-2 text-right align-bottom">
                  Sentetik → gerçek oranı
                </th>
                <th rowspan="2" class="px-3 py-2 text-left align-bottom">Başladı</th>
                <th rowspan="2" class="px-3 py-2 text-left align-bottom">Son cevap</th>
                <th rowspan="2" class="px-3 py-2 text-left align-bottom">Durum</th>
              </tr>
              <tr>
                <th class="border-l border-gray-200 px-3 pb-2 text-right">gerçek → gerçek</th>
                <th class="px-3 pb-2 text-right">gerçek → sentetik</th>
                <th class="px-3 pb-2 text-right">sentetik → gerçek</th>
                <th class="border-r border-gray-200 px-3 pb-2 text-right">sentetik → sentetik</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="u in results.users" :key="u.userId">
                <td class="px-3 py-2">
                  <div class="font-medium text-gray-900">{{ userLabel(u.userId).name }}</div>
                  <div v-if="userLabel(u.userId).email" class="text-xs text-gray-500">
                    {{ userLabel(u.userId).email }}
                  </div>
                  <div class="font-mono text-xs text-gray-400">{{ u.userId }}</div>
                </td>
                <td class="px-3 py-2">{{ u.userRole }}</td>
                <td class="px-3 py-2 text-right tabular-nums">
                  {{ u.score.answered }} / {{ total }}
                </td>
                <td class="px-3 py-2 text-right tabular-nums">{{ u.score.correct }}</td>
                <td class="px-3 py-2 text-right tabular-nums">{{ pct(u.score.accuracy) }}</td>
                <td class="px-3 py-2 text-right tabular-nums">{{ pval(u.score.pValue) }}</td>
                <td class="border-l border-gray-100 px-3 py-2 text-right tabular-nums">
                  {{ u.score.confusion.realAsReal }}
                </td>
                <td class="px-3 py-2 text-right tabular-nums">
                  {{ u.score.confusion.realAsSynthetic }}
                </td>
                <td class="px-3 py-2 text-right tabular-nums">
                  {{ u.score.confusion.syntheticAsReal }}
                </td>
                <td class="border-r border-gray-100 px-3 py-2 text-right tabular-nums">
                  {{ u.score.confusion.syntheticAsSynthetic }}
                </td>
                <td class="px-3 py-2 text-right tabular-nums">
                  {{ pct(u.score.syntheticCalledReal) }}
                </td>
                <td class="px-3 py-2 tabular-nums">{{ date(u.startedAt) }}</td>
                <td class="px-3 py-2 tabular-nums">{{ date(u.updatedAt) }}</td>
                <td class="px-3 py-2">
                  <span
                    class="rounded px-2 py-0.5 text-xs"
                    :class="
                      u.completedAt ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                    "
                  >
                    {{ u.completedAt ? `tamamladı ${date(u.completedAt)}` : 'devam ediyor' }}
                  </span>
                </td>
              </tr>
              <tr v-if="!results.users.length">
                <td colspan="14" class="px-3 py-6 text-center text-gray-500">
                  Henüz katılımcı yok.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Görseller -->
      <section>
        <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 class="text-sm font-semibold text-gray-700">
            Görseller (oylar yalnızca tamamlanmış testlerden)
          </h3>
          <div class="flex items-center gap-2 text-sm">
            <select v-model="labelFilter" class="rounded-md border-gray-300 py-1 text-sm">
              <option value="all">Tümü</option>
              <option value="real">Gerçek</option>
              <option value="synthetic">Sentetik</option>
            </select>
            <select v-model="sortBy" class="rounded-md border-gray-300 py-1 text-sm">
              <option value="order">Set sırası</option>
              <option value="fooled">En çok yanıltan önce</option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
          <div
            v-for="img in shownImages"
            :key="img.imageId"
            class="overflow-hidden rounded-md border border-gray-200 bg-white"
            :title="sourceText(img)"
          >
            <div class="aspect-square bg-gray-100">
              <img
                v-if="urls[img.imageId]"
                :src="urls[img.imageId]"
                class="h-full w-full object-cover"
              />
            </div>
            <div class="flex items-center justify-between px-1.5 py-1 text-xs">
              <span
                class="rounded px-1.5 py-0.5 font-medium"
                :class="
                  img.label === 'real'
                    ? 'bg-sky-100 text-sky-800'
                    : 'bg-fuchsia-100 text-fuchsia-800'
                "
              >
                {{ img.label === 'real' ? 'gerçek' : 'sentetik' }}
              </span>
              <span class="tabular-nums text-gray-600" title="gerçek / sentetik oyu">
                {{ img.votedReal }}G · {{ img.votedSynthetic }}S
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useBlindTestImages } from '@/presentation/composables/blindtest/useBlindTestImages';
import type {
  BlindTestImageResult,
  BlindTestResults,
} from '@/core/repositories/IBlindTestRepository';
import type { User } from '@/core/entities/User';

const props = defineProps<{ results: BlindTestResults; users: Record<string, User> }>();
defineEmits<{ (e: 'refresh'): void }>();

const { urls, load, clear } = useBlindTestImages();
const labelFilter = ref<'all' | 'real' | 'synthetic'>('all');
const sortBy = ref<'order' | 'fooled'>('order');

const total = computed(() => props.results.images.length);
const completedCount = computed(() => props.results.users.filter((u) => u.completedAt).length);

/** How often an image was taken for the other kind. */
function fooled(img: BlindTestImageResult) {
  return img.label === 'real' ? img.votedSynthetic : img.votedReal;
}

const shownImages = computed(() => {
  let list = props.results.images.filter(
    (i) => labelFilter.value === 'all' || i.label === labelFilter.value
  );
  if (sortBy.value === 'fooled') list = [...list].sort((a, b) => fooled(b) - fooled(a));
  return list;
});

watch(
  () => props.results.id,
  () => {
    clear();
    load(
      props.results.id,
      props.results.images.map((i) => i.imageId)
    );
  },
  { immediate: true }
);

function userLabel(userId: string) {
  const u = props.users[userId];
  return u
    ? { name: u.displayName || u.email, email: u.email }
    : { name: '(kullanıcı bulunamadı)', email: '' };
}

const pct = (x: number) => `%${(100 * (x || 0)).toFixed(1)}`;
const pval = (p: number) => (p < 0.001 ? '< 0.001' : p.toFixed(3));
const date = (s: string) =>
  new Date(s).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
const sourceText = (img: BlindTestImageResult) =>
  Object.entries(img.source)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');

function download(name: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}

function exportUsers() {
  const header = [
    'user_id',
    'name',
    'email',
    'role',
    'answered',
    'correct',
    'accuracy',
    'p_value',
    'synthetic_called_real',
    'real_as_real',
    'real_as_synthetic',
    'synthetic_as_real',
    'synthetic_as_synthetic',
    'started_at',
    'completed_at',
  ];
  const rows = props.results.users.map((u) => {
    const c = u.score.confusion;
    const user = props.users[u.userId];
    return [
      u.userId,
      user?.displayName ?? '',
      user?.email ?? '',
      u.userRole,
      u.score.answered,
      u.score.correct,
      u.score.accuracy,
      u.score.pValue,
      u.score.syntheticCalledReal,
      c.realAsReal,
      c.realAsSynthetic,
      c.syntheticAsReal,
      c.syntheticAsSynthetic,
      u.startedAt,
      u.completedAt ?? '',
    ];
  });
  download(`${props.results.id}_participants.csv`, [header, ...rows]);
}

function exportImages() {
  const keys = ['dataset', 'image_id', 'patch_id', 'cond_patch_id', 'seed'];
  const header = [
    'image_id',
    'label',
    'voted_real',
    'voted_synthetic',
    ...keys.map((k) => `source_${k}`),
  ];
  const rows = props.results.images.map((i) => [
    i.imageId,
    i.label,
    i.votedReal,
    i.votedSynthetic,
    ...keys.map((k) => i.source[k] ?? ''),
  ]);
  download(`${props.results.id}_images.csv`, [header, ...rows]);
}
</script>
