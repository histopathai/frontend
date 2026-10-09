<template>
  <div class="h-full flex flex-col bg-gray-50">
    <div class="px-3 pt-3 pb-2 border-b border-gray-200 bg-white">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-sm font-bold text-gray-900">Ek Kontrol</h2>
          <p class="text-[10px] text-gray-500">{{ openCount }} açık · {{ total }} toplam</p>
        </div>
        <button
          class="group flex items-center gap-1.5"
          title="Kontrolü tamamlanan görüntüleri gizle"
          @click="$emit('update:hideDone', !hideDone)"
        >
          <span
            class="text-[8px] font-black uppercase tracking-tight"
            :class="hideDone ? 'text-indigo-500' : 'text-gray-400 group-hover:text-indigo-400'"
            >Bitenleri Gizle</span
          >
          <span
            class="relative inline-flex h-3.5 w-7 rounded-full border-2 border-transparent transition-colors"
            :class="hideDone ? 'bg-indigo-600' : 'bg-gray-200'"
          >
            <span
              class="inline-block h-2.5 w-2.5 rounded-full bg-white shadow transition"
              :class="hideDone ? 'translate-x-3.5' : 'translate-x-0'"
            />
          </span>
        </button>
      </div>
      <button
        v-if="canRequest"
        class="mt-2 w-full px-2 py-1.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100"
        title="Bir veri setinin tüm görüntülerini sebebiyle birlikte Ek Kontrol'e gönder"
        @click="$emit('send-workspace')"
      >
        Veri setini ek kontrole gönder
      </button>
    </div>

    <div class="flex-1 overflow-y-auto">
      <p v-if="loading" class="p-4 text-xs text-gray-400">Yükleniyor…</p>
      <p v-else-if="groups.length === 0" class="p-4 text-xs text-gray-500">
        {{ total === 0 ? 'Ek kontrole gönderilmiş görüntü yok.' : 'Açık ek kontrol kalmadı.' }}
      </p>

      <section v-for="group in groups" :key="group.wsId" class="border-b border-gray-200">
        <h3
          class="sticky top-0 z-10 px-3 py-1.5 bg-gray-100/95 backdrop-blur text-[10px] font-black uppercase tracking-wide text-gray-500 flex justify-between"
        >
          <span class="truncate">{{ workspaceName(group.wsId) }}</span>
          <span class="shrink-0 ml-2 text-gray-400">{{ group.open }}/{{ group.requests.length }}</span>
        </h3>
        <div
          v-if="group.datasetNotes.length"
          class="mx-3 my-1.5 px-2 py-1.5 rounded-md bg-amber-50 border border-amber-200 text-[11px] text-amber-800"
        >
          <p class="font-bold">{{ DATASET_REASON_LABEL }}</p>
          <p v-for="(n, i) in group.datasetNotes" :key="i" class="mt-0.5">{{ n }}</p>
          <button
            v-if="canRequest"
            class="mt-1 text-[10px] font-bold text-red-600 hover:underline"
            @click="$emit('withdraw-workspace', group.wsId)"
          >
            Geri çek
          </button>
        </div>
        <ul>
          <li v-for="r in group.requests" :key="r.imageId">
            <button
              class="w-full text-left px-3 py-2 border-l-2 transition-colors"
              :class="
                r.imageId === selectedImageId
                  ? 'bg-indigo-50 border-indigo-500'
                  : 'border-transparent hover:bg-white'
              "
              @click="$emit('select', r)"
            >
              <div class="flex items-center gap-1.5">
                <span class="text-xs font-semibold text-gray-800 truncate">{{ r.imageName }}</span>
                <span
                  v-if="r.status === 'done'"
                  class="shrink-0 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700"
                  >Tamamlandı</span
                >
                <span v-if="r.patientName" class="ml-auto shrink-0 text-[10px] text-gray-400"
                  >Hasta {{ r.patientName }}</span
                >
              </div>
              <ul class="mt-1 space-y-0.5">
                <li v-if="ownReasons(r).length === 0" class="text-[11px] text-gray-400">Veri seti incelemesi</li>
                <li
                  v-for="(reason, i) in ownReasons(r)"
                  :key="i"
                  class="text-[11px] leading-snug"
                  :class="r.status === 'done' ? 'text-gray-400' : 'text-amber-700'"
                >
                  • {{ reasonSentence(reason) }}
                </li>
              </ul>
            </button>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  DATASET_REASON_LABEL,
  ownReasons,
  reasonSentence,
  type RecheckGroup,
  type RecheckRequest,
} from '@/core/recheck';

defineProps<{
  groups: RecheckGroup[];
  total: number;
  openCount: number;
  loading: boolean;
  hideDone: boolean;
  selectedImageId?: string;
  workspaceName: (wsId: string) => string;
  canRequest: boolean;
}>();

defineEmits<{
  select: [request: RecheckRequest];
  'update:hideDone': [value: boolean];
  'send-workspace': [];
  'withdraw-workspace': [wsId: string];
}>();
</script>
