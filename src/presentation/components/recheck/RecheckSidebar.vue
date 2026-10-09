<template>
  <div class="flex flex-col h-full bg-white border-r border-gray-200 shadow-[2px_0_8px_rgba(0,0,0,0.02)]">
    <!-- Header: as in Veri Etiketleyici -->
    <div class="p-4 border-b border-gray-200 bg-gray-50/50 space-y-3">
      <div>
        <div class="flex items-center justify-between mb-1.5">
          <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Çalışma Alanı
          </label>
          <button
            type="button"
            role="switch"
            :aria-checked="hideDone"
            class="flex items-center gap-1.5 group"
            title="Kontrolü tamamlanan görüntüleri ve hastaları gizle"
            @click="$emit('update:hideDone', !hideDone)"
          >
            <span
              class="text-[8px] font-black uppercase tracking-tight transition-colors"
              :class="hideDone ? 'text-indigo-500' : 'text-gray-400 group-hover:text-indigo-400'"
              >Bitenleri Gizle</span
            >
            <span
              class="relative inline-flex h-3.5 w-7 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out shadow-sm"
              :class="hideDone ? 'bg-indigo-600' : 'bg-gray-200'"
            >
              <span
                class="pointer-events-none inline-block h-2.5 w-2.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                :class="hideDone ? 'translate-x-3.5' : 'translate-x-0'"
              ></span>
            </span>
          </button>
        </div>
        <div class="relative">
          <select
            :value="selectedWsId"
            class="appearance-none block w-full pl-3 pr-8 py-2 text-xs bg-white border border-gray-300 text-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-all cursor-pointer hover:border-indigo-300"
            @change="$emit('select-workspace', ($event.target as HTMLSelectElement).value)"
          >
            <option :value="undefined" disabled>
              {{ workspaceGroups.length ? 'Seçiniz...' : 'Ek kontrolde veri seti yok' }}
            </option>
            <optgroup v-for="organ in organGroups" :key="organ.label" :label="organ.label">
              <option v-for="g in organ.groups" :key="g.wsId" :value="g.wsId">
                {{ workspaceName(g.wsId) }} ({{ g.open }} açık)
              </option>
            </optgroup>
          </select>
          <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
            <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      <div v-if="selectedWsId" class="relative">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg class="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Listede ara..."
          class="block w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
        />
      </div>

      <button
        v-if="canRequest"
        class="w-full px-2 py-1.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100"
        title="Bir veri setinin tüm görüntülerini sebebiyle birlikte Ek Kontrol'e gönder"
        @click="$emit('send-workspace')"
      >
        Veri setini ek kontrole gönder
      </button>
    </div>

    <!-- Why the whole workspace is here -->
    <div
      v-if="currentGroup?.datasetNotes.length"
      class="mx-3 mt-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800"
    >
      <p class="font-bold">{{ DATASET_REASON_LABEL }}</p>
      <p v-for="(n, i) in currentGroup.datasetNotes" :key="i" class="mt-0.5">{{ n }}</p>
      <button
        v-if="canRequest"
        class="mt-1 text-[10px] font-bold text-red-600 hover:underline"
        @click="$emit('withdraw-workspace', currentGroup.wsId)"
      >
        Geri çek
      </button>
    </div>

    <!-- Patients and their images -->
    <div class="flex-1 overflow-y-auto">
      <div v-if="loading && patients.length === 0" class="flex flex-col items-center justify-center h-32 text-gray-400 text-sm">
        <div class="animate-spin rounded-full h-6 w-6 border-2 border-indigo-500 border-t-transparent mb-2"></div>
        Veriler yükleniyor...
      </div>
      <div v-else-if="!selectedWsId" class="flex items-center justify-center h-48 text-xs text-gray-500">
        Veri Seti Seçilmedi
      </div>
      <div v-else class="py-2">
        <p v-if="filteredPatients.length === 0" class="p-6 text-center text-gray-400 text-xs italic">
          <span v-if="searchQuery">"{{ searchQuery }}" bulunamadı.</span>
          <span v-else-if="hideDone">Bu veri setinde açık ek kontrol kalmadı.</span>
          <span v-else>Bu veri setinde ek kontrol yok.</span>
        </p>

        <div v-for="p in filteredPatients" :key="p.patientId" class="border-b border-gray-50 last:border-0">
          <div
            class="relative flex items-center justify-between px-4 py-3 cursor-pointer transition-all duration-200 hover:bg-gray-50 select-none group"
            :class="{ 'bg-indigo-50/60': isExpanded(p.patientId) }"
            @click="$emit('toggle-patient', p.patientId)"
          >
            <div
              class="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600 rounded-r transition-transform duration-200"
              :class="isExpanded(p.patientId) ? 'scale-y-100' : 'scale-y-0'"
            ></div>
            <div class="flex items-center gap-3 overflow-hidden">
              <div
                class="p-1.5 rounded-md transition-colors"
                :class="isExpanded(p.patientId) ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500 group-hover:bg-white'"
              >
                <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div class="flex flex-col min-w-0" :title="p.patientName">
                <span class="text-xs font-medium text-gray-700 truncate" :class="{ 'text-indigo-700': isExpanded(p.patientId) }">
                  {{ p.patientName }}
                </span>
                <div class="flex items-center gap-1.5 mt-0.5">
                  <span class="text-[9px] text-gray-400 uppercase font-bold tracking-tight">{{ p.requests.length }} GÖRÜNTÜ</span>
                  <span
                    v-if="p.done > 0"
                    class="text-[8px] bg-indigo-50 text-indigo-600 font-black px-1.5 py-0.5 rounded-full border border-indigo-100 shadow-sm uppercase tracking-tighter"
                  >
                    {{ p.done }} BİTTİ
                  </span>
                </div>
              </div>
            </div>
            <svg
              class="h-3.5 w-3.5 text-gray-400 transition-transform duration-300"
              :class="{ 'rotate-90 text-indigo-500': isExpanded(p.patientId) }"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>

          <div v-if="isExpanded(p.patientId)" class="overflow-hidden bg-gray-50/50 shadow-inner">
            <ul class="py-2 pl-4 pr-2 space-y-1">
              <li
                v-for="r in p.requests"
                :key="r.imageId"
                class="relative group flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-all border"
                :class="
                  r.imageId === selectedImageId
                    ? 'bg-indigo-50/60 border-indigo-400 shadow-sm ring-1 ring-indigo-100 z-10'
                    : 'border-transparent hover:bg-white hover:border-gray-200 hover:shadow-sm text-gray-600'
                "
                @click="$emit('select', r)"
              >
                <div class="h-9 w-9 flex-shrink-0 rounded bg-gray-200 overflow-hidden border border-gray-200">
                  <img :src="thumbnailUrl(r.imageId)" alt="" class="w-full h-full object-cover" loading="lazy" />
                </div>
                <div class="min-w-0 flex-1 select-none" :title="r.imageName">
                  <div class="flex items-center gap-1.5">
                    <p
                      class="text-[11px] font-semibold truncate"
                      :class="r.imageId === selectedImageId ? 'text-indigo-800' : 'text-gray-700'"
                    >
                      {{ r.imageName }}
                    </p>
                    <span
                      v-if="r.status === 'done'"
                      class="shrink-0 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full"
                      :class="r.outcome === 'undecided' || r.outcome === 'unsuitable' ? 'bg-gray-200 text-gray-600' : 'bg-emerald-100 text-emerald-700'"
                      :title="r.completionNote"
                      >{{ finishedBadge(r) }}</span
                    >
                  </div>
                  <p
                    v-for="(reason, i) in ownReasons(r)"
                    :key="i"
                    class="mt-0.5 text-[10px] leading-snug"
                    :class="
                      reason.resolvedAt
                        ? 'text-emerald-600 line-through decoration-emerald-300'
                        : r.status === 'done'
                          ? 'text-gray-400'
                          : 'text-amber-700'
                    "
                    :title="reason.resolvedAt ? 'Giderildi: etiket girildi' : ''"
                  >
                    <span v-if="reason.resolvedAt" class="no-underline">✓ </span>{{ reasonSentence(reason) }}
                  </p>
                  <p v-if="ownReasons(r).length === 0" class="mt-0.5 text-[10px] text-gray-400">Veri seti incelemesi</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <div class="border-t border-gray-200 bg-gray-50 px-4 py-2 text-[10px] font-medium text-gray-500 shrink-0">
      {{ openCount }} açık · {{ total }} toplam ek kontrol
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  DATASET_REASON_LABEL,
  finishedBadge,
  ownReasons,
  reasonSentence,
  type RecheckGroup,
  type RecheckPatientGroup,
  type RecheckRequest,
} from '@/core/recheck';
import { OrganType, OrganTypeUtils } from '@/core/value-objects';
import type { Workspace } from '@/core/entities/Workspace';

const props = defineProps<{
  workspaceGroups: RecheckGroup[];
  workspaces: Workspace[];
  selectedWsId?: string;
  currentGroup: RecheckGroup | null;
  patients: RecheckPatientGroup[];
  expandedPatientId?: string;
  selectedImageId?: string;
  total: number;
  openCount: number;
  loading: boolean;
  hideDone: boolean;
  canRequest: boolean;
  workspaceName: (wsId: string) => string;
}>();

defineEmits<{
  'select-workspace': [wsId: string];
  'toggle-patient': [patientId: string];
  select: [request: RecheckRequest];
  'update:hideDone': [value: boolean];
  'send-workspace': [];
  'withdraw-workspace': [wsId: string];
}>();

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const thumbnailUrl = (imageId: string) => `${API_BASE_URL}/api/v1/proxy/${imageId}/thumbnail.jpg`;

const searchQuery = ref('');
watch(
  () => props.selectedWsId,
  () => (searchQuery.value = '')
);

const isExpanded = (patientId: string) => props.expandedPatientId === patientId;

/** Patients whose name, or one of whose images' names, has the query. */
const filteredPatients = computed(() => {
  const q = searchQuery.value.trim().toLocaleLowerCase('tr');
  if (!q) return props.patients;
  return props.patients.filter(
    (p) =>
      p.patientName.toLocaleLowerCase('tr').includes(q) ||
      p.requests.some((r) => r.imageName.toLocaleLowerCase('tr').includes(q))
  );
});

/** The workspaces with requests, by organ, as the Veri Etiketleyici dropdown groups them. */
const organGroups = computed(() => {
  const organOf = (wsId: string) => {
    const organ = props.workspaces.find((w) => w.id === wsId)?.organType;
    return organ && OrganTypeUtils.isValid(organ) ? organ : OrganType.Unknown;
  };
  const byOrgan = new Map<OrganType, RecheckGroup[]>();
  for (const g of props.workspaceGroups) {
    const organ = organOf(g.wsId);
    if (!byOrgan.has(organ)) byOrgan.set(organ, []);
    byOrgan.get(organ)!.push(g);
  }
  return [...byOrgan.entries()]
    .map(([organ, groups]) => ({
      organ,
      label: OrganTypeUtils.getTurkishLabel(organ),
      groups: [...groups].sort((a, b) =>
        props.workspaceName(a.wsId).localeCompare(props.workspaceName(b.wsId), 'tr')
      ),
    }))
    .sort((a, b) =>
      a.organ === OrganType.Unknown ? 1 : b.organ === OrganType.Unknown ? -1 : a.label.localeCompare(b.label, 'tr')
    );
});
</script>
