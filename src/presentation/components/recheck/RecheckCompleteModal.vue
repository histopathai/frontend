<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[9999999] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4"
      @click.self="close"
    >
      <div class="rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col bg-white">
        <div class="p-6">
          <h3 class="text-lg font-bold text-gray-900">Kontrolü tamamla</h3>
          <p class="text-xs text-gray-500 mt-1">
            <span class="font-semibold text-gray-700">{{ imageName }}</span> için incelemenin sonucu
          </p>

          <fieldset class="mt-5 space-y-2">
            <legend class="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">Sonuç</legend>
            <label
              v-for="o in RECHECK_OUTCOMES"
              :key="o.code"
              class="flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm"
              :class="outcome === o.code ? 'border-emerald-400 bg-emerald-50 text-emerald-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'"
            >
              <input v-model="outcome" type="radio" :value="o.code" class="accent-emerald-600" />
              {{ o.label }}
            </label>
          </fieldset>

          <label class="block mt-4">
            <span class="text-[11px] font-bold uppercase tracking-wide text-gray-400">
              Açıklama {{ needsNote ? '(zorunlu)' : '(isteğe bağlı)' }}
            </span>
            <textarea
              v-model="note"
              rows="3"
              :maxlength="RECHECK_NOTE_MAX"
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              :placeholder="placeholder"
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
            :disabled="!canSave || saving"
            class="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            @click="save"
          >
            {{ saving ? 'Kaydediliyor…' : 'Tamamla' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RECHECK_NOTE_MAX, RECHECK_OUTCOMES, type RecheckOutcome } from '@/core/recheck';

const props = defineProps<{
  isOpen: boolean;
  imageName: string;
  /** Saves; resolves true when it worked, so the dialog closes. */
  submit: (outcome: RecheckOutcome, note: string) => Promise<boolean>;
}>();
const emit = defineEmits<{ close: [] }>();

const outcome = ref<RecheckOutcome | null>(null);
const note = ref('');
const saving = ref(false);

watch(
  () => props.isOpen,
  (open) => {
    if (!open) return;
    outcome.value = null;
    note.value = '';
  }
);

const needsNote = computed(
  () => RECHECK_OUTCOMES.find((o) => o.code === outcome.value)?.needsNote ?? false
);
const placeholder = computed(() =>
  outcome.value === 'no_change'
    ? 'Örn. Kanal yapıları belirgin, tek sıra dizilim yok; IDC ile uyumlu.'
    : outcome.value === 'undecided'
      ? 'Örn. E-cadherin boyaması olmadan ayırt edilemiyor.'
      : 'Örn. Alt tip ILC olarak değiştirildi.'
);
const canSave = computed(
  () => !!outcome.value && (!needsNote.value || note.value.trim().length > 0)
);

function close() {
  if (!saving.value) emit('close');
}

async function save() {
  if (!outcome.value || !canSave.value) return;
  saving.value = true;
  try {
    if (await props.submit(outcome.value, note.value.trim())) emit('close');
  } finally {
    saving.value = false;
  }
}
</script>
