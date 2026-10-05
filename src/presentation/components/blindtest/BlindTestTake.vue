<template>
  <div class="flex h-full flex-col">
    <!-- Başlık ve ilerleme -->
    <div class="border-b border-gray-200 bg-white px-6 py-4">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">{{ test.name }}</h2>
          <p class="text-sm text-gray-500">{{ test.description }}</p>
        </div>
        <div class="flex items-center gap-3">
          <label class="flex items-center gap-2 text-sm text-gray-600">
            <input v-model="onlyUnanswered" type="checkbox" class="rounded border-gray-300" />
            Yalnızca cevaplanmamışlar
          </label>
          <button
            class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            :disabled="!canComplete || completing"
            @click="showConfirm = true"
          >
            {{ completed ? 'Tamamlandı' : 'Testi tamamla' }}
          </button>
        </div>
      </div>
      <div class="mt-3 flex items-center gap-3">
        <div class="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
          <div class="h-full bg-indigo-500 transition-all" :style="{ width: `${percent}%` }" />
        </div>
        <span class="text-sm tabular-nums text-gray-600">{{ answeredCount }} / {{ total }}</span>
      </div>
      <p v-if="completed" class="mt-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
        Test tamamlandı; cevaplarınız kaydedildi ve kilitlendi. Notlarınızı eklemeye ve düzenlemeye
        devam edebilirsiniz. Teşekkürler.
      </p>
      <p v-else class="mt-3 text-sm text-gray-500">
        Her görsel için gerçek mi sentetik mi olduğuna karar verin. Cevaplar anında kaydedilir;
        tamamlayana kadar değiştirebilirsiniz. Bir görsele neden gerçek ya da sentetik dediğinizi
        "Not ekle" ile açıklayabilirsiniz; notlar test tamamlandıktan sonra da eklenip
        düzenlenebilir.
      </p>
    </div>

    <!-- Izgara -->
    <div class="flex-1 overflow-y-auto bg-gray-50 p-6">
      <div
        class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
      >
        <div
          v-for="item in visible"
          :key="item.id"
          class="overflow-hidden rounded-lg border bg-white shadow-sm"
          :class="answers[item.id] ? 'border-gray-200' : 'border-amber-300'"
        >
          <div
            class="relative mx-auto flex aspect-square w-full max-w-[256px] select-none items-center justify-center bg-gray-100"
            @contextmenu.prevent
          >
            <img
              v-if="urls[item.id]"
              :src="urls[item.id]"
              :alt="`Görsel ${item.index + 1}`"
              class="h-full w-full object-cover"
              draggable="false"
            />
            <span v-else-if="failed[item.id]" class="text-xs text-red-600">Yüklenemedi</span>
            <span v-else class="text-xs text-gray-400">Yükleniyor…</span>
            <span class="absolute left-1 top-1 rounded bg-black/50 px-1.5 text-xs text-white">
              {{ item.index + 1 }}
            </span>
            <span
              v-if="notes[item.id]"
              class="absolute right-1 top-1 rounded bg-amber-400 px-1.5 text-xs font-medium text-gray-900"
              title="Bu görsel için notunuz var"
              >not</span
            >
          </div>
          <div class="grid grid-cols-2 gap-1 p-1">
            <button
              v-for="opt in OPTIONS"
              :key="opt.value"
              class="rounded px-2 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed"
              :class="
                answers[item.id] === opt.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:hover:bg-gray-100'
              "
              :disabled="completed || saving[item.id]"
              @click="choose(item.id, opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>
          <button
            class="w-full border-t border-gray-100 px-2 py-1 text-left text-xs hover:bg-gray-50"
            :class="notes[item.id] ? 'text-amber-700' : 'text-gray-500'"
            :title="notes[item.id] || 'Bu görsel için not yazın'"
            @click="openNote(item)"
          >
            <span class="block truncate">{{
              notes[item.id] ? `Not: ${notes[item.id]}` : '+ Not ekle'
            }}</span>
          </button>
        </div>
      </div>
      <p v-if="!visible.length" class="py-12 text-center text-sm text-gray-500">
        Cevaplanmamış görsel kalmadı.
      </p>
    </div>

    <!-- Not penceresi -->
    <div v-if="noteFor" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div class="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl" @keydown="onNoteKey">
        <div class="flex items-start gap-3">
          <img
            v-if="urls[noteFor.id]"
            :src="urls[noteFor.id]"
            class="h-24 w-24 flex-shrink-0 select-none rounded object-cover"
            draggable="false"
            @contextmenu.prevent
          />
          <div class="min-w-0">
            <h3 class="text-base font-semibold text-gray-900">
              Görsel {{ noteFor.index + 1 }} — not
            </h3>
            <p class="text-sm text-gray-500">
              Bu görsele neden {{ answerText(answers[noteFor.id]) }} dediğinizi açıklayın (isteğe
              bağlı).
            </p>
          </div>
        </div>
        <textarea
          ref="noteBox"
          v-model="draft"
          rows="5"
          :maxlength="NOTE_MAX"
          class="mt-3 w-full resize-y rounded border-gray-300 text-sm"
          placeholder="Ör. çekirdek kromatini fazla düzgün, hücre sınırları bulanık…"
        />
        <div class="mt-1 text-right text-xs tabular-nums text-gray-500">
          {{ draft.length }} / {{ NOTE_MAX }}
        </div>
        <div class="mt-3 flex items-center justify-between">
          <button
            v-if="notes[noteFor.id]"
            class="text-sm text-red-600 hover:underline disabled:opacity-50"
            :disabled="noteSaving"
            @click="saveNote('')"
          >
            Notu sil
          </button>
          <span v-else />
          <div class="flex gap-2">
            <button
              class="rounded-md px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              :disabled="noteSaving"
              @click="noteFor = null"
            >
              Vazgeç (Esc)
            </button>
            <button
              class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-gray-300"
              :disabled="noteSaving || draft.trim() === (notes[noteFor.id] ?? '')"
              @click="saveNote(draft)"
            >
              {{ noteSaving ? 'Kaydediliyor…' : 'Kaydet (Ctrl+Enter)' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="showConfirm"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="showConfirm = false"
    >
      <div class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 class="text-base font-semibold text-gray-900">Testi tamamla</h3>
        <p class="mt-2 text-sm text-gray-600">
          {{ total }} görselin hepsini cevapladınız. Tamamladıktan sonra cevaplarınızı
          değiştiremezsiniz.
        </p>
        <div class="mt-5 flex justify-end gap-2">
          <button
            class="rounded-md px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            @click="showConfirm = false"
          >
            Vazgeç
          </button>
          <button
            class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            @click="complete"
          >
            Tamamla
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { useToast } from 'vue-toastification';
import { useBlindTestImages } from '@/presentation/composables/blindtest/useBlindTestImages';
import { repositories } from '@/services';
import { BLIND_TEST_NOTE_MAX as NOTE_MAX } from '@/core/repositories/IBlindTestRepository';
import type { BlindTest, BlindTestLabel } from '@/core/repositories/IBlindTestRepository';

const props = defineProps<{ test: BlindTest }>();
const emit = defineEmits<{ (e: 'progress', answered: number, completed: boolean): void }>();

const OPTIONS: { value: BlindTestLabel; label: string }[] = [
  { value: 'real', label: 'Gerçek' },
  { value: 'synthetic', label: 'Sentetik' },
];

const toast = useToast();
const { urls, failed, load, clear } = useBlindTestImages();

const answers = reactive<Record<string, BlindTestLabel>>({});
const saving = reactive<Record<string, boolean>>({});
const notes = reactive<Record<string, string>>({});
const draft = ref('');
const noteFor = ref<{ id: string; index: number } | null>(null);
const noteSaving = ref(false);
const noteBox = ref<HTMLTextAreaElement | null>(null);
const completedAt = ref<string | null>(null);
const onlyUnanswered = ref(false);
const showConfirm = ref(false);
const completing = ref(false);

const total = computed(() => props.test.imageIds.length);
const answeredCount = computed(() => props.test.imageIds.filter((id) => answers[id]).length);
const percent = computed(() => (total.value ? (100 * answeredCount.value) / total.value : 0));
const completed = computed(() => completedAt.value !== null);
const canComplete = computed(
  () => !completed.value && total.value > 0 && answeredCount.value === total.value
);
const items = computed(() => props.test.imageIds.map((id, index) => ({ id, index })));
const visible = computed(() =>
  onlyUnanswered.value ? items.value.filter((i) => !answers[i.id]) : items.value
);

function reset() {
  clear();
  for (const k of Object.keys(answers)) delete answers[k];
  Object.assign(answers, props.test.answers);
  for (const k of Object.keys(notes)) delete notes[k];
  Object.assign(notes, props.test.notes);
  noteFor.value = null;
  completedAt.value = props.test.completedAt;
  load(props.test.id, props.test.imageIds);
}

watch(() => props.test, reset, { immediate: true });
watch([answeredCount, completed], () => emit('progress', answeredCount.value, completed.value));

async function choose(imageId: string, label: BlindTestLabel) {
  if (completed.value || saving[imageId]) return;
  const previous = answers[imageId];
  if (previous === label) return;
  answers[imageId] = label;
  saving[imageId] = true;
  try {
    await repositories.blindTest.answer(props.test.id, imageId, label);
  } catch (e: any) {
    if (previous) answers[imageId] = previous;
    else delete answers[imageId];
    toast.error(e?.message || 'Cevap kaydedilemedi');
  } finally {
    delete saving[imageId];
  }
}

async function complete() {
  showConfirm.value = false;
  completing.value = true;
  try {
    const progress = await repositories.blindTest.complete(props.test.id);
    completedAt.value = progress.completedAt;
    toast.success('Test tamamlandı');
  } catch (e: any) {
    toast.error(e?.message || 'Test tamamlanamadı');
  } finally {
    completing.value = false;
  }
}

function answerText(label?: BlindTestLabel) {
  return label === 'real' ? 'gerçek' : label === 'synthetic' ? 'sentetik' : 'gerçek ya da sentetik';
}

function openNote(item: { id: string; index: number }) {
  noteFor.value = item;
  draft.value = notes[item.id] ?? '';
  nextTick(() => noteBox.value?.focus());
}

/** Saves the note (empty removes it); on failure the window stays open so nothing typed is lost. */
async function saveNote(text: string) {
  const item = noteFor.value;
  if (!item || noteSaving.value) return;
  text = text.trim();
  noteSaving.value = true;
  try {
    await repositories.blindTest.note(props.test.id, item.id, text);
    if (text) notes[item.id] = text;
    else delete notes[item.id];
    noteFor.value = null;
  } catch (e: any) {
    toast.error(e?.message || 'Not kaydedilemedi');
  } finally {
    noteSaving.value = false;
  }
}

function onNoteKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && !noteSaving.value) noteFor.value = null;
  else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveNote(draft.value);
}
</script>
