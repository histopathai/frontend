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
        Test tamamlandı; cevaplarınız kaydedildi ve kilitlendi. Teşekkürler.
      </p>
      <p v-else class="mt-3 text-sm text-gray-500">
        Her görsel için gerçek mi sentetik mi olduğuna karar verin. Görsele tıklayarak büyütebilirsiniz
        (büyük görünümde <kbd>G</kbd> gerçek, <kbd>S</kbd> sentetik, <kbd>←</kbd>/<kbd>→</kbd> gezinme).
        Cevaplar anında kaydedilir; tamamlayana kadar değiştirebilirsiniz.
      </p>
    </div>

    <!-- Izgara -->
    <div class="flex-1 overflow-y-auto bg-gray-50 p-6">
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        <div
          v-for="item in visible"
          :key="item.id"
          class="overflow-hidden rounded-lg border bg-white shadow-sm"
          :class="answers[item.id] ? 'border-gray-200' : 'border-amber-300'"
        >
          <button class="relative block aspect-square w-full bg-gray-100" @click="openZoom(item.index)">
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
          </button>
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
        </div>
      </div>
      <p v-if="!visible.length" class="py-12 text-center text-sm text-gray-500">
        Cevaplanmamış görsel kalmadı.
      </p>
    </div>

    <!-- Büyük görünüm -->
    <div
      v-if="zoomIndex !== null"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      @click.self="zoomIndex = null"
    >
      <div class="flex max-h-full flex-col items-center gap-3">
        <div class="flex w-full items-center justify-between text-sm text-white">
          <span>{{ zoomIndex + 1 }} / {{ total }}</span>
          <button class="rounded px-2 py-1 hover:bg-white/10" @click="zoomIndex = null">Kapat (Esc)</button>
        </div>
        <img
          v-if="urls[zoomId!]"
          :src="urls[zoomId!]"
          class="max-h-[75vh] w-[min(75vh,90vw)] rounded bg-white object-contain"
          draggable="false"
        />
        <div class="flex items-center gap-2">
          <button class="rounded bg-white/10 px-3 py-2 text-white hover:bg-white/20" @click="step(-1)">←</button>
          <button
            v-for="opt in OPTIONS"
            :key="opt.value"
            class="min-w-28 rounded px-4 py-2 font-medium disabled:cursor-not-allowed"
            :class="answers[zoomId!] === opt.value ? 'bg-indigo-500 text-white' : 'bg-white text-gray-800 hover:bg-gray-100'"
            :disabled="completed"
            @click="choose(zoomId!, opt.value, true)"
          >
            {{ opt.label }} ({{ opt.key.toUpperCase() }})
          </button>
          <button class="rounded bg-white/10 px-3 py-2 text-white hover:bg-white/20" @click="step(1)">→</button>
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
          {{ total }} görselin hepsini cevapladınız. Tamamladıktan sonra cevaplarınızı değiştiremezsiniz.
        </p>
        <div class="mt-5 flex justify-end gap-2">
          <button class="rounded-md px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" @click="showConfirm = false">
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
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useToast } from 'vue-toastification';
import { useBlindTestImages } from '@/presentation/composables/blindtest/useBlindTestImages';
import { repositories } from '@/services';
import type { BlindTest, BlindTestLabel } from '@/core/repositories/IBlindTestRepository';

const props = defineProps<{ test: BlindTest }>();
const emit = defineEmits<{ (e: 'progress', answered: number, completed: boolean): void }>();

const OPTIONS: { value: BlindTestLabel; label: string; key: string }[] = [
  { value: 'real', label: 'Gerçek', key: 'g' },
  { value: 'synthetic', label: 'Sentetik', key: 's' },
];

const toast = useToast();
const { urls, failed, load, clear } = useBlindTestImages();

const answers = reactive<Record<string, BlindTestLabel>>({});
const saving = reactive<Record<string, boolean>>({});
const completedAt = ref<string | null>(null);
const onlyUnanswered = ref(false);
const zoomIndex = ref<number | null>(null);
const showConfirm = ref(false);
const completing = ref(false);

const total = computed(() => props.test.imageIds.length);
const answeredCount = computed(() => props.test.imageIds.filter((id) => answers[id]).length);
const percent = computed(() => (total.value ? (100 * answeredCount.value) / total.value : 0));
const completed = computed(() => completedAt.value !== null);
const canComplete = computed(() => !completed.value && total.value > 0 && answeredCount.value === total.value);
const items = computed(() => props.test.imageIds.map((id, index) => ({ id, index })));
const visible = computed(() => (onlyUnanswered.value ? items.value.filter((i) => !answers[i.id]) : items.value));
const zoomId = computed(() => (zoomIndex.value === null ? null : props.test.imageIds[zoomIndex.value]));

function reset() {
  clear();
  for (const k of Object.keys(answers)) delete answers[k];
  Object.assign(answers, props.test.answers);
  completedAt.value = props.test.completedAt;
  zoomIndex.value = null;
  load(props.test.id, props.test.imageIds);
}

watch(() => props.test, reset, { immediate: true });
watch([answeredCount, completed], () => emit('progress', answeredCount.value, completed.value));

async function choose(imageId: string, label: BlindTestLabel, advance = false) {
  if (completed.value || saving[imageId]) return;
  const previous = answers[imageId];
  answers[imageId] = label;
  if (advance) step(1);
  if (previous === label) return;
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

function openZoom(index: number) {
  zoomIndex.value = index;
}

function step(delta: number) {
  if (zoomIndex.value === null) return;
  const next = zoomIndex.value + delta;
  if (next >= 0 && next < total.value) zoomIndex.value = next;
}

function onKey(e: KeyboardEvent) {
  if (zoomIndex.value === null) return;
  const key = e.key.toLowerCase();
  if (key === 'escape') zoomIndex.value = null;
  else if (key === 'arrowleft') step(-1);
  else if (key === 'arrowright') step(1);
  else {
    const opt = OPTIONS.find((o) => o.key === key);
    if (opt && zoomId.value) choose(zoomId.value, opt.value, true);
  }
}

onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>
