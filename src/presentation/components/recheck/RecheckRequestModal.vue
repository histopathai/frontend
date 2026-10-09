<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[9999999] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4"
      @click.self="close"
    >
      <div class="rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col bg-white">
        <div class="p-6">
          <h3 class="text-lg font-bold text-gray-900">İncelemeye gönder</h3>
          <p class="text-xs text-gray-500 mt-1">
            <span class="font-semibold text-gray-700">{{ imageName }}</span> Ek Kontrol sekmesine
            gönderilir; görüntü ve etiketleri olduğu yerde kalır.
          </p>

          <fieldset class="mt-5 space-y-2">
            <legend class="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">Neden</legend>
            <label
              v-for="r in RECHECK_REASONS"
              :key="r.code"
              class="flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm"
              :class="reason === r.code ? 'border-indigo-400 bg-indigo-50 text-indigo-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'"
            >
              <input v-model="reason" type="radio" :value="r.code" class="accent-indigo-600" />
              {{ r.label }}
            </label>
          </fieldset>

          <label class="block mt-4">
            <span class="text-[11px] font-bold uppercase tracking-wide text-gray-400">
              {{ reason === 'other' ? 'Neden (görüntüde bu cümle gösterilir)' : 'Not (isteğe bağlı)' }}
            </span>
            <textarea
              v-model="note"
              rows="3"
              :maxlength="RECHECK_NOTE_MAX"
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              :placeholder="reason === 'other' ? 'Örn. Hiç etiket yok; tümör varsa işaretlenmeli' : ''"
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
import {
  RECHECK_NOTE_MAX,
  RECHECK_REASONS,
  type RecheckReasonCode,
  type RecheckRequest,
} from '@/core/recheck';

const props = defineProps<{ isOpen: boolean; imageId: string | null; imageName: string }>();
const emit = defineEmits<{ close: []; sent: [request: RecheckRequest] }>();

const toast = useToast();
const reason = ref<RecheckReasonCode>('subtype');
const note = ref('');
const sending = ref(false);

watch(
  () => props.isOpen,
  (open) => {
    if (!open) return;
    reason.value = 'subtype';
    note.value = '';
  }
);

const canSend = computed(
  () => !!props.imageId && (reason.value !== 'other' || note.value.trim().length > 0)
);

function close() {
  if (!sending.value) emit('close');
}

async function send() {
  if (!props.imageId || !canSend.value) return;
  sending.value = true;
  try {
    const request = await repositories.recheck.request(props.imageId, reason.value, note.value.trim());
    toast.success('Ek Kontrol sekmesine gönderildi');
    emit('sent', request);
    emit('close');
  } catch (e: any) {
    toast.error(e?.message || 'Gönderilemedi');
  } finally {
    sending.value = false;
  }
}
</script>
