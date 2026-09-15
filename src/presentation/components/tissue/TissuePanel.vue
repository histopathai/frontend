<template>
  <aside
    class="w-72 h-full flex-shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-hidden"
  >
    <!-- Status -->
    <div class="px-4 py-3 border-b border-gray-100">
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-black uppercase tracking-wider text-gray-400"
          >Doku Maskı</span
        >
        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold" :class="statusClass">
          {{ statusLabel }}
        </span>
      </div>
      <p v-if="editor.mask.value?.approvedAt" class="mt-1 text-[10px] text-gray-400">
        Onay: {{ formatDate(editor.mask.value.approvedAt) }}
      </p>
      <p v-else-if="editor.mask.value?.editedAt" class="mt-1 text-[10px] text-gray-400">
        Son düzenleme: {{ formatDate(editor.mask.value.editedAt) }}
      </p>

      <dl class="mt-3 grid grid-cols-3 gap-2 text-center">
        <div class="rounded-lg bg-gray-50 py-1.5">
          <dt class="text-[9px] font-bold text-gray-400 uppercase">Doku</dt>
          <dd class="text-xs font-black text-gray-700">
            {{ (editor.ratio.value * 100).toFixed(1) }}%
          </dd>
        </div>
        <div class="rounded-lg bg-gray-50 py-1.5">
          <dt class="text-[9px] font-bold text-gray-400 uppercase">Bölge</dt>
          <dd class="text-xs font-black text-gray-700">{{ editor.polygonCount.value }}</dd>
        </div>
        <div
          class="rounded-lg py-1.5"
          :class="editor.overPointLimit.value ? 'bg-red-50' : 'bg-gray-50'"
        >
          <dt class="text-[9px] font-bold text-gray-400 uppercase">Nokta</dt>
          <dd
            class="text-xs font-black"
            :class="editor.overPointLimit.value ? 'text-red-600' : 'text-gray-700'"
          >
            {{ editor.totalPoints.value.toLocaleString('tr-TR') }}
          </dd>
        </div>
      </dl>

      <p
        v-if="editor.previewState.value === 'missing'"
        class="mt-3 rounded-lg bg-amber-50 px-2 py-1.5 text-[11px] text-amber-700"
      >
        Bu görüntünün doku önizlemesi yok. Görüntü tissue adımı eklenmeden önce işlenmiş olabilir
        (backfill gerekli).
      </p>
      <p
        v-else-if="editor.previewState.value === 'ready' && !editor.mask.value"
        class="mt-3 rounded-lg bg-sky-50 px-2 py-1.5 text-[11px] text-sky-700"
      >
        Kayıtlı maske yok; varsayılan hesaplama gösteriliyor.
      </p>
    </div>

    <div class="flex-1 overflow-y-auto">
      <!-- Tools -->
      <section class="px-4 py-3 border-b border-gray-100">
        <h3 class="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">Araçlar</h3>
        <div class="grid grid-cols-3 gap-1.5">
          <button
            v-for="t in tools"
            :key="t.id"
            :title="t.hint"
            class="rounded-lg border px-2 py-1.5 text-[11px] font-bold transition-colors"
            :class="
              editor.tool.value === t.id
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            "
            @click="setTool(t.id)"
          >
            {{ t.label }}
            <span class="block text-[9px] font-semibold text-gray-400">{{ t.key }}</span>
          </button>
        </div>
        <p class="mt-2 text-[10px] leading-snug text-gray-400">{{ toolHint }}</p>
        <div class="mt-2 flex gap-1.5">
          <button
            class="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            :disabled="!editor.canUndo.value"
            @click="editor.undo()"
          >
            Geri al
          </button>
          <button
            class="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            :disabled="editor.selectedIndex.value < 0"
            @click="editor.deleteSelected()"
          >
            Seçiliyi sil
          </button>
        </div>
        <div class="mt-3 flex items-center gap-2">
          <label class="flex items-center gap-1.5 text-[11px] font-semibold text-gray-600">
            <input
              type="checkbox"
              :checked="overlayVisible"
              class="rounded"
              @change="$emit('update:overlayVisible', !overlayVisible)"
            />
            Maskeyi göster
          </label>
          <input
            type="range"
            min="0"
            max="0.6"
            step="0.05"
            class="flex-1"
            :value="fillOpacity"
            @input="$emit('update:fillOpacity', Number(($event.target as HTMLInputElement).value))"
          />
        </div>
      </section>

      <!-- Parameters -->
      <section class="px-4 py-3">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-[10px] font-black uppercase tracking-wider text-gray-400">
            Parametreler
          </h3>
          <span v-if="editor.computing.value" class="text-[10px] font-bold text-indigo-500"
            >hesaplanıyor…</span
          >
          <span v-else-if="editor.lastComputeMs.value !== null" class="text-[10px] text-gray-400">
            {{ Math.round(editor.lastComputeMs.value) }} ms
          </span>
        </div>

        <fieldset
          :disabled="editor.previewState.value !== 'ready'"
          class="space-y-3 disabled:opacity-50"
        >
          <label class="block">
            <span class="text-[11px] font-bold text-gray-600">Yöntem</span>
            <select
              class="mt-1 w-full rounded-lg border-gray-200 text-xs"
              :value="editor.params.value.method"
              @change="
                editor.requestParams({
                  method: ($event.target as HTMLSelectElement).value as TissueMethod,
                })
              "
            >
              <option value="saturation-gray">Doygunluk + parlaklık</option>
              <option value="otsu-saturation">Otsu (doygunluk)</option>
              <option value="otsu-gray">Otsu (gri)</option>
            </select>
          </label>

          <div
            v-for="field in numericFields"
            :key="field.key"
            :class="{
              'opacity-40':
                field.onlySaturationGray && editor.params.value.method !== 'saturation-gray',
            }"
          >
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-gray-600" :title="field.hint">{{
                field.label
              }}</span>
              <input
                type="number"
                class="w-20 rounded border-gray-200 px-1.5 py-0.5 text-right text-[11px]"
                :min="field.min"
                :max="field.max"
                :step="field.step"
                :value="editor.params.value[field.key]"
                :disabled="
                  field.onlySaturationGray && editor.params.value.method !== 'saturation-gray'
                "
                @change="setNumber(field.key, ($event.target as HTMLInputElement).value)"
              />
            </div>
            <input
              type="range"
              class="w-full"
              :min="field.min"
              :max="field.sliderMax ?? field.max"
              :step="field.step"
              :value="editor.params.value[field.key]"
              :disabled="
                field.onlySaturationGray && editor.params.value.method !== 'saturation-gray'
              "
              @input="setNumber(field.key, ($event.target as HTMLInputElement).value)"
            />
          </div>

          <button
            type="button"
            class="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-[11px] font-bold text-gray-600 hover:bg-gray-50"
            @click="editor.resetToDefaults()"
          >
            Varsayılanlara dön
          </button>
        </fieldset>
      </section>
    </div>

    <!-- Actions -->
    <div class="px-4 py-3 border-t border-gray-200 space-y-2">
      <p v-if="editor.overPointLimit.value" class="text-[10px] text-red-600">
        Nokta sayısı sınırı aşıyor; sadeleştirme toleransını artırın.
      </p>
      <button
        class="w-full rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white shadow hover:bg-indigo-700 disabled:opacity-40"
        :disabled="!editor.canSave.value"
        @click="editor.save()"
      >
        {{ editor.saving.value ? 'Kaydediliyor…' : editor.dirty.value ? 'Kaydet' : 'Kaydedildi' }}
      </button>
      <button
        class="w-full rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700 disabled:opacity-40"
        :disabled="!editor.canApprove.value"
        :title="editor.dirty.value ? 'Önce kaydedin' : ''"
        @click="editor.approve()"
      >
        {{ editor.status.value === 'approved' ? 'Onaylı' : 'Onayla' }}
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  MAX_CLOSING_RADIUS,
  MAX_SIMPLIFY_TOLERANCE,
  type TissueMethod,
  type TissueParams,
} from '@/core/tissue';
import type {
  TissueMaskEditor,
  TissueTool,
} from '@/presentation/composables/tissue/useTissueMaskEditor';

const props = defineProps<{
  editor: TissueMaskEditor;
  overlayVisible: boolean;
  fillOpacity: number;
}>();

defineEmits<{
  'update:overlayVisible': [value: boolean];
  'update:fillOpacity': [value: number];
}>();

type NumericKey = Exclude<keyof TissueParams, 'method'>;

const numericFields: Array<{
  key: NumericKey;
  label: string;
  hint: string;
  min: number;
  max: number;
  sliderMax?: number;
  step: number;
  integer?: boolean;
  onlySaturationGray?: boolean;
}> = [
  {
    key: 'saturation_threshold',
    label: 'Doygunluk eşiği',
    hint: 'Bu değerin üstündeki doygunluk doku sayılır',
    min: 0,
    max: 1,
    sliderMax: 0.3,
    step: 0.005,
    onlySaturationGray: true,
  },
  {
    key: 'gray_threshold',
    label: 'Parlaklık eşiği',
    hint: 'Bu değerin altındaki gri seviye doku sayılır',
    min: 0,
    max: 1,
    step: 0.005,
    onlySaturationGray: true,
  },
  {
    key: 'closing_radius',
    label: 'Kapama yarıçapı',
    hint: 'Küçük çatlakları kapatır (önizleme pikseli)',
    min: 0,
    max: MAX_CLOSING_RADIUS,
    sliderMax: 15,
    step: 1,
    integer: true,
  },
  {
    key: 'min_object_area',
    label: 'Min. nesne alanı',
    hint: 'Bu alan ve altındaki doku adacıkları silinir (önizleme pikseli)',
    min: 0,
    max: 1_000_000,
    sliderMax: 20000,
    step: 50,
    integer: true,
  },
  {
    key: 'min_hole_area',
    label: 'Min. delik alanı',
    hint: 'Bu alan ve altındaki delikler doldurulur (önizleme pikseli)',
    min: 0,
    max: 1_000_000,
    sliderMax: 20000,
    step: 50,
    integer: true,
  },
  {
    key: 'simplify_tolerance',
    label: 'Sadeleştirme',
    hint: 'Douglas-Peucker toleransı (önizleme pikseli); arttıkça nokta sayısı azalır',
    min: 0,
    max: MAX_SIMPLIFY_TOLERANCE,
    sliderMax: 8,
    step: 0.25,
  },
];

function setNumber(key: NumericKey, raw: string) {
  const field = numericFields.find((f) => f.key === key)!;
  let value = Number(raw);
  if (!Number.isFinite(value)) return;
  if (field.integer) value = Math.round(value);
  value = Math.min(Math.max(value, field.min), field.max);
  props.editor.requestParams({ [key]: value } as Partial<TissueParams>);
}

const tools: Array<{ id: TissueTool; label: string; key: string; hint: string }> = [
  { id: 'select', label: 'Seç', key: 'V', hint: 'Bölge seç, noktaları sürükle' },
  { id: 'delete', label: 'Sil', key: 'X', hint: 'Tıklanan bölgeyi sil' },
  { id: 'draw', label: 'Çiz', key: 'D', hint: 'Yeni bölge çiz' },
];

const toolHint = computed(() => {
  switch (props.editor.tool.value) {
    case 'select':
      return 'Bölgeye tıklayıp seçin. Noktayı sürükleyin; kenar ortasındaki noktadan sürükleyince yeni nokta eklenir; Alt+tık noktayı siler.';
    case 'delete':
      return 'Silmek istediğiniz bölgeye (kalem izi, artefakt) tıklayın.';
    case 'draw':
      return 'Tıklayarak köşe ekleyin; çift tık veya Enter ile bitirin, Esc ile iptal edin.';
    default:
      return '';
  }
});

function setTool(tool: TissueTool) {
  props.editor.cancelDraft();
  props.editor.tool.value = tool;
}

const statusLabel = computed(() => {
  if (props.editor.dirty.value) return 'Kaydedilmedi';
  switch (props.editor.status.value) {
    case 'auto':
      return 'Otomatik';
    case 'edited':
      return 'Düzenlendi';
    case 'approved':
      return 'Onaylandı';
    default:
      return 'Maske yok';
  }
});

const statusClass = computed(() => {
  if (props.editor.dirty.value) return 'bg-amber-100 text-amber-700';
  switch (props.editor.status.value) {
    case 'auto':
      return 'bg-sky-100 text-sky-700';
    case 'edited':
      return 'bg-indigo-100 text-indigo-700';
    case 'approved':
      return 'bg-emerald-100 text-emerald-700';
    default:
      return 'bg-gray-100 text-gray-500';
  }
});

function formatDate(d: Date) {
  return d.toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
}
</script>
