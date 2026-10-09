<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[9999999] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4"
      @click.self="close"
    >
      <div class="rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col bg-white">
        <div class="p-6">
          <h3 class="text-lg font-bold text-gray-900">Veri setini ek kontrole gönder</h3>
          <p class="text-xs text-gray-500 mt-1">
            Veri setindeki her görüntü Ek Kontrol sekmesine gelir; uzman her birini ayrı ayrı
            tamamlar. Görüntüler ve etiketleri olduğu yerde kalır.
          </p>

          <label class="block mt-5">
            <span class="text-[11px] font-bold uppercase tracking-wide text-gray-400">Veri seti</span>
            <select
              v-model="wsId"
              class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option :value="''" disabled>Seçiniz…</option>
              <optgroup v-for="group in groups" :key="group.label" :label="group.label">
                <option v-for="ws in group.workspaces" :key="ws.id" :value="ws.id">{{ ws.name }}</option>
              </optgroup>
            </select>
          </label>

          <PathologistSelect v-model="assigneeId" class="mt-4" />

          <label class="block mt-4">
            <span class="text-[11px] font-bold uppercase tracking-wide text-gray-400">
              Sebebi (veri setinin üstünde gösterilir)
            </span>
            <textarea
              v-model="note"
              rows="3"
              :maxlength="RECHECK_NOTE_MAX"
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Örn. Yeni yüklendi; poligonlar ve global etiketler gözden geçirilmeli."
            />
          </label>
        </div>
        <div class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button
            class="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg"
            @click="close"
          >
            İptal
          </button>
          <button
            :disabled="!canSend || sending"
            class="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            @click="send"
          >
            {{ sending ? 'Gönderiliyor…' : 'Gönder' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useToast } from 'vue-toastification';
import { repositories } from '@/services';
import { RECHECK_NOTE_MAX } from '@/core/recheck';
import { OrganType, OrganTypeUtils } from '@/core/value-objects';
import type { Workspace } from '@/core/entities/Workspace';
import PathologistSelect from './PathologistSelect.vue';

const props = defineProps<{ isOpen: boolean; workspaces: Workspace[] }>();
const emit = defineEmits<{ close: []; sent: [wsId: string] }>();

const toast = useToast();
const wsId = ref('');
const note = ref('');
const assigneeId = ref('');
const sending = ref(false);

watch(
  () => props.isOpen,
  (open) => {
    if (!open) return;
    wsId.value = '';
    note.value = '';
    assigneeId.value = '';
  }
);

/** By organ, as in the Veri Etiketleyici dropdown. */
const groups = computed(() => {
  const byOrgan = new Map<OrganType, Workspace[]>();
  for (const ws of props.workspaces) {
    const organ = OrganTypeUtils.isValid(ws.organType) ? ws.organType : OrganType.Unknown;
    if (!byOrgan.has(organ)) byOrgan.set(organ, []);
    byOrgan.get(organ)!.push(ws);
  }
  return [...byOrgan.entries()]
    .map(([organ, list]) => ({
      organ,
      label: OrganTypeUtils.getTurkishLabel(organ),
      workspaces: [...list].sort((a, b) => a.name.localeCompare(b.name, 'tr')),
    }))
    .sort((a, b) =>
      a.organ === OrganType.Unknown ? 1 : b.organ === OrganType.Unknown ? -1 : a.label.localeCompare(b.label, 'tr')
    );
});

const canSend = computed(
  () => !!wsId.value && !!assigneeId.value && note.value.trim().length > 0
);

function close() {
  if (!sending.value) emit('close');
}

async function send() {
  if (!canSend.value) return;
  sending.value = true;
  try {
    const n = await repositories.recheck.requestWorkspace(wsId.value, note.value.trim(), assigneeId.value);
    toast.success(`${n} görüntü Ek Kontrol sekmesine gönderildi`);
    emit('sent', wsId.value);
    emit('close');
  } catch (e: any) {
    toast.error(e?.message || 'Gönderilemedi');
  } finally {
    sending.value = false;
  }
}
</script>
