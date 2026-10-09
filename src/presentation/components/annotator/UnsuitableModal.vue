<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[9999999] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4"
      @click.self="close"
    >
      <div class="rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col bg-white">
        <div class="p-6">
          <h3 class="text-lg font-bold text-gray-900">Çalışmaya uygun değil</h3>
          <p class="text-xs text-gray-500 mt-1">
            <span class="font-semibold text-gray-700">{{ imageName }}</span> çalışmanın dışında
            sayılır ve bitmiş olarak işaretlenir. Etiketleri silinmez; işaret istendiğinde geri alınır.
          </p>
          <label class="block mt-4">
            <span class="text-[11px] font-bold uppercase tracking-wide text-gray-400">Not (isteğe bağlı)</span>
            <textarea
              v-model="note"
              rows="3"
              maxlength="500"
              class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              placeholder="Örn. Tümör dokusu yetersiz."
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
            :disabled="saving"
            class="px-4 py-2 text-sm font-bold text-white bg-gray-700 hover:bg-gray-800 rounded-lg shadow-md disabled:opacity-50"
            @click="save"
          >
            {{ saving ? 'Kaydediliyor…' : 'Uygun değil olarak işaretle' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  isOpen: boolean;
  imageName: string;
  /** Saves; resolves true when it worked, so the dialog closes. */
  submit: (note: string) => Promise<boolean>;
}>();
const emit = defineEmits<{ close: [] }>();

const note = ref('');
const saving = ref(false);

watch(
  () => props.isOpen,
  (open) => {
    if (open) note.value = '';
  }
);

function close() {
  if (!saving.value) emit('close');
}

async function save() {
  saving.value = true;
  try {
    if (await props.submit(note.value.trim())) emit('close');
  } finally {
    saving.value = false;
  }
}
</script>
