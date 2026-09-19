<template>
  <aside
    class="w-80 h-full flex-shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-hidden"
  >
    <!-- Result: the number the user is steering, always in view -->
    <div class="px-4 py-3 border-b border-gray-100">
      <div class="flex items-baseline justify-between">
        <span class="text-[10px] font-black uppercase tracking-wider text-gray-400">Patch</span>
        <span
          v-if="grid.computing.value || grid.loading.value"
          class="text-[10px] font-bold text-indigo-500"
        >
          {{ grid.loading.value ? loadingText : 'hesaplanıyor…' }}
        </span>
        <span v-else-if="grid.cells.value" class="text-[10px] text-gray-400">
          {{ grid.elapsedMs.value.toFixed(0) }} ms
        </span>
      </div>
      <p class="mt-0.5 text-2xl font-black tabular-nums text-gray-800">
        {{ grid.kept.value.length.toLocaleString('tr-TR') }}
        <span v-if="grid.cells.value" class="text-xs font-bold text-gray-400">
          / {{ grid.cells.value.count.toLocaleString('tr-TR') }} aday
        </span>
      </p>

      <!-- Whose labels the patches are made from. Always in view, so it can be changed while
           looking at an image; the options are the annotators of the workspace. -->
      <div v-if="s.source === 'annotation'" class="mt-2 space-y-1.5">
        <label class="flex items-center gap-2">
          <span class="w-16 flex-shrink-0 text-[10px] font-bold text-gray-500">Annotator</span>
          <select
            class="select-input"
            :value="grid.annotator.value?.ownerId ?? ''"
            :disabled="!grid.annotators.value.length"
            @change="grid.pickAnnotator(($event.target as HTMLSelectElement).value)"
          >
            <option value="" disabled>
              {{ grid.catalogLoading.value ? 'yükleniyor…' : 'Annotator seçin…' }}
            </option>
            <option v-for="a in grid.annotators.value" :key="a.ownerId" :value="a.ownerId">
              {{ annotatorOption(a) }}
            </option>
          </select>
        </label>
        <label v-if="grid.annotator.value" class="flex items-center gap-2">
          <span class="w-16 flex-shrink-0 text-[10px] font-bold text-gray-500">Tür</span>
          <select
            class="select-input"
            :value="grid.chosenSet.value?.annotationTypeId ?? ''"
            @change="grid.pickType(($event.target as HTMLSelectElement).value)"
          >
            <option value="" disabled>Annotation türü seçin…</option>
            <option
              v-for="set in grid.annotator.value.sets"
              :key="set.annotationTypeId"
              :value="set.annotationTypeId"
            >
              {{ set.annotationType }} — {{ set.polygons.toLocaleString('tr-TR') }} poligon
            </option>
          </select>
        </label>

        <!-- Which annotator these patches were made with -->
        <p
          v-if="grid.provenance.value && grid.labelSet.value"
          class="rounded-lg bg-indigo-50 px-2 py-1.5 text-[11px] text-indigo-800"
        >
          Bu patch'ler <span class="font-black">{{ grid.provenance.value.owner }}</span>
          <span v-if="resourceText(grid.provenance.value.resource)" class="text-indigo-500">
            ({{ resourceText(grid.provenance.value.resource) }})</span
          >
          annotator'ının <span class="font-bold">{{ grid.provenance.value.annotationType }}</span>
          etiketlerinden çıkarıldı.
        </p>
      </div>

      <p
        v-if="grid.blocker.value"
        class="mt-2 rounded-lg bg-amber-50 px-2 py-1.5 text-[11px] text-amber-700"
      >
        {{ grid.blocker.value }}
      </p>
      <p
        v-else-if="grid.computeError.value"
        class="mt-2 rounded-lg bg-rose-50 px-2 py-1.5 text-[11px] text-rose-700"
      >
        {{ grid.computeError.value }}
      </p>
      <p
        v-else-if="s.source === 'annotation' && grid.mask.value && !grid.tissueUsable.value"
        class="mt-2 rounded-lg bg-rose-50 px-2 py-1.5 text-[11px] text-rose-700"
      >
        Doku maskesi reddedilmiş: annotation patch'leri dokuya göre süzülmeden gösteriliyor.
      </p>
      <p
        v-else-if="
          s.source === 'annotation' && !grid.mask.value && !grid.loading.value && grid.image.value
        "
        class="mt-2 rounded-lg bg-sky-50 px-2 py-1.5 text-[11px] text-sky-700"
      >
        Doku maskesi yok: annotation patch'leri dokuya göre süzülmeden gösteriliyor.
      </p>
      <!-- The images the chosen annotator labelled: a few among many, so go straight to them -->
      <div
        v-if="
          s.source === 'annotation' && grid.imagesWithSet.value && grid.imagesWithSet.value.total
        "
        class="mt-2 flex items-center justify-between gap-2 text-[11px] text-gray-500"
      >
        <span>
          Bu annotator'ın görüntüleri:
          <span class="font-bold text-gray-700">
            {{ grid.imagesWithSet.value.position ?? '–' }} / {{ grid.imagesWithSet.value.total }}
          </span>
        </span>
        <span class="flex gap-1">
          <button
            class="rounded border border-gray-200 px-1.5 py-0.5 font-bold hover:bg-gray-50 disabled:opacity-40"
            :disabled="!grid.neighbour(-1)"
            title="Bu annotator'ın etiketlediği önceki görüntü"
            @click="$emit('open-image', grid.neighbour(-1)!)"
          >
            ‹
          </button>
          <button
            class="rounded border border-gray-200 px-1.5 py-0.5 font-bold hover:bg-gray-50 disabled:opacity-40"
            :disabled="!grid.neighbour(1)"
            title="Bu annotator'ın etiketlediği sonraki görüntü"
            @click="$emit('open-image', grid.neighbour(1)!)"
          >
            ›
          </button>
        </span>
      </div>
      <!-- Its own v-if: this can hold together with any of the notes above -->
      <p
        v-if="grid.unresolved.value && grid.cells.value"
        class="mt-2 rounded-lg bg-amber-50 px-2 py-1.5 text-[11px] text-amber-700"
      >
        Çakışan {{ grid.unresolved.value }} poligon ayrıştırılamadı: çakıştıkları alan iki kez
        sayılıyor, o bölgedeki kaplama değerleri yaklaşıktır.
      </p>
    </div>

    <div class="flex-1 overflow-y-auto">
      <!-- Selected patch: first, so that clicking a patch shows it without scrolling -->
      <section
        v-if="selectedIndex !== null && grid.cells.value && grid.image.value"
        class="px-4 py-3 border-b border-gray-100 bg-indigo-50/40"
      >
        <div class="flex items-center justify-between mb-2">
          <h3 class="section-title !mb-0">Seçili patch</h3>
          <div class="flex gap-2 text-[10px] font-bold">
            <button class="text-gray-400 hover:text-indigo-600" @click="$emit('locate')">
              Göster
            </button>
            <button class="text-gray-400 hover:text-indigo-600" @click="$emit('deselect')">
              Kapat
            </button>
          </div>
        </div>
        <!-- Side by side: the preview must not push the controls out of view -->
        <div class="flex items-start gap-3">
          <div class="w-32 flex-shrink-0">
            <PatchPreview
              :key="grid.image.value.id"
              :image="grid.image.value"
              :x0="grid.cells.value.x0[selectedIndex]!"
              :y0="grid.cells.value.y0[selectedIndex]!"
              :size0="grid.cells.value.size0"
            />
          </div>
          <PatchFacts
            class="min-w-0 flex-1 text-[11px] text-gray-700"
            :cells="grid.cells.value"
            :index="selectedIndex"
            :label-colors="labelColors"
            :provenance="provenance"
          />
        </div>
        <p class="mt-1.5 text-[10px] text-gray-400">
          Level-0'da {{ grid.cells.value.size0 }}px → {{ s.patchSize }}px olarak okunur. Oklarla
          komşu patch'e geçin.
        </p>
      </section>
      <!-- Target -->
      <section class="px-4 py-3 border-b border-gray-100">
        <h3 class="section-title">Hedef</h3>
        <label class="field-label">patch_size <span class="text-gray-300">piksel</span></label>
        <div class="flex gap-1">
          <button
            v-for="size in PATCH_SIZES"
            :key="size"
            class="chip"
            :class="s.patchSize === size ? 'chip-on' : 'chip-off'"
            @click="s.patchSize = size"
          >
            {{ size }}
          </button>
          <input
            type="number"
            min="1"
            step="1"
            class="number-input w-16"
            :value="s.patchSize"
            title="Özel patch_size"
            @change="setInt('patchSize', $event)"
          />
        </div>

        <label class="field-label mt-2.5">mpp <span class="text-gray-300">µm / piksel</span></label>
        <div class="flex gap-1">
          <button
            v-for="mpp in MPPS"
            :key="mpp"
            class="chip"
            :class="s.mpp === mpp ? 'chip-on' : 'chip-off'"
            @click="s.mpp = mpp"
          >
            {{ mpp }}
          </button>
          <input
            type="number"
            min="0.01"
            step="0.05"
            class="number-input w-16"
            :value="s.mpp"
            title="Özel mpp"
            @change="setFloat('mpp', $event, 0.01, 100)"
          />
        </div>

        <div class="mt-2.5 flex items-center gap-2">
          <label class="field-label !mb-0 w-14">overlap</label>
          <input
            v-model.number="s.overlap"
            type="range"
            min="0"
            max="0.9"
            step="0.05"
            class="flex-1"
          />
          <span class="w-9 text-right text-[11px] font-bold tabular-nums text-gray-600">
            {{ Math.round(s.overlap * 100) }}%
          </span>
        </div>

        <p v-if="grid.specText.value" class="mt-2 text-[10px] leading-snug text-gray-500">
          {{ grid.specText.value }}
        </p>
        <p
          v-if="grid.upsampled.value"
          class="mt-1 rounded bg-amber-50 px-2 py-1 text-[10px] text-amber-700"
        >
          Hedef mpp taramadan ince: patch'ler büyütülerek okunur, gerçek ayrıntı kazanılmaz.
        </p>
      </section>

      <!-- Source -->
      <section class="px-4 py-3 border-b border-gray-100">
        <h3 class="section-title">Kaynak</h3>
        <div class="segmented">
          <button
            :class="s.source === 'tissue' ? 'seg-on' : 'seg-off'"
            @click="s.source = 'tissue'"
          >
            Doku maskesi
          </button>
          <button
            :class="s.source === 'annotation' ? 'seg-on' : 'seg-off'"
            @click="s.source = 'annotation'"
          >
            Annotation
            <span
              v-if="grid.annotators.value.length"
              class="text-[9px] opacity-60"
              title="Bu workspace'te etiketi olan annotator sayısı"
              >{{ grid.annotators.value.length }}</span
            >
          </button>
        </div>

        <div
          v-if="s.source === 'tissue'"
          class="mt-2 flex items-center justify-between text-[11px]"
        >
          <span class="text-gray-500">Maske durumu</span>
          <span class="rounded-full px-2 py-0.5 text-[10px] font-bold" :class="maskStatus.cls">
            {{ maskStatus.text }}
          </span>
        </div>

        <!-- The chosen label set as it is on this image -->
        <div
          v-else-if="grid.labelSet.value"
          class="mt-2 rounded-lg border border-gray-200 px-2.5 py-1.5"
        >
          <div class="flex items-center justify-between gap-2 text-[11px]">
            <span class="truncate font-bold text-gray-700">Bu görüntüde</span>
            <span class="flex-shrink-0 text-[10px] text-gray-400">
              {{ grid.labelSet.value.polygons.length }} poligon<template
                v-if="grid.labelSet.value.sideUm !== null"
              >
                · ortanca {{ grid.labelSet.value.sideUm }} µm</template
              >
            </span>
          </div>
          <div class="mt-1 flex flex-wrap gap-1">
            <span
              v-for="l in grid.labelSet.value.labelCounts"
              :key="l.label"
              class="rounded bg-gray-50 px-1 text-[9px] font-semibold text-gray-500 ring-1 ring-gray-200"
            >
              {{ l.label }} · {{ l.count }}
            </span>
          </div>
        </div>
        <p v-else-if="otherAnnotatorsHere" class="mt-2 text-[10px] leading-snug text-gray-400">
          Bu görüntüde etiketi olanlar: {{ otherAnnotatorsHere }}. Etiketler asla birlikte
          değerlendirilmez; birini görmek için yukarıdan o annotator'ı seçin.
        </p>
      </section>

      <!-- Placement -->
      <section class="px-4 py-3 border-b border-gray-100">
        <h3 class="section-title">Yerleşim</h3>
        <div class="segmented">
          <button
            :class="s.placement === 'grid' ? 'seg-on' : 'seg-off'"
            @click="s.placement = 'grid'"
          >
            Izgara
          </button>
          <button
            :class="s.placement === 'center' ? 'seg-on' : 'seg-off'"
            @click="s.placement = 'center'"
          >
            Merkezli
          </button>
        </div>
        <p class="mt-1.5 text-[10px] leading-snug text-gray-400">
          {{
            s.placement === 'grid'
              ? "Slaytın (0,0)'ına bağlı ızgara; her kare kaplamasına göre alınır."
              : s.source === 'tissue'
                ? 'Her doku parçasının merkezine bir patch (TMA çekirdekleri, küçük fragmanlar).'
                : "Her poligonun merkezine bir patch — patch'ten küçük nesneler (bezler) için."
          }}
        </p>

        <label
          v-if="s.placement === 'center'"
          class="mt-2 flex items-start gap-1.5 text-[11px] text-gray-600"
        >
          <input v-model="s.merge" type="checkbox" class="mt-0.5 rounded" />
          <span>
            <span class="font-semibold">merge</span> — bir patch'e birlikte sığan
            {{ s.source === 'tissue' ? 'parçalar' : 'aynı etiketli poligonlar' }} tek patch paylaşır
          </span>
        </label>

        <button
          v-if="
            s.source === 'annotation' &&
            s.placement === 'grid' &&
            grid.polygonsSmallerThanPatch.value
          "
          class="mt-2 w-full rounded-lg bg-amber-50 px-2 py-1.5 text-left text-[11px] text-amber-700 hover:bg-amber-100"
          @click="s.placement = 'center'"
        >
          Poligonlar (ortanca {{ grid.labelSet.value?.sideUm }} µm) patch'ten ({{ footprintUm }} µm)
          küçük: ızgara bunları etiketleyemez.
          <span class="font-bold underline">Merkezli yerleşime geç</span>
        </button>
        <p
          v-if="grid.crowded.value"
          class="mt-2 rounded-lg bg-amber-50 px-2 py-1.5 text-[11px] text-amber-700"
        >
          {{ grid.crowded.value.polygons }} poligon {{ grid.crowded.value.patches }} patch
          paylaşıyor ({{ (grid.crowded.value.polygons / grid.crowded.value.patches).toFixed(1) }} /
          patch): patch bu nesnelerden çok büyük, nesneyi değil bölgeyi etiketliyor — ızgara +
          min_purity bunu daha iyi anlatır.
        </p>
      </section>

      <!-- Thresholds: filter instantly, nothing is recomputed -->
      <section class="px-4 py-3 border-b border-gray-100">
        <div class="flex items-center justify-between mb-2">
          <h3 class="section-title !mb-0">Eşikler</h3>
          <button
            class="text-[10px] font-bold text-gray-400 hover:text-indigo-600"
            @click="grid.resetSettings()"
          >
            Varsayılanlar
          </button>
        </div>
        <ThresholdSlider
          v-for="t in thresholds"
          :key="t.key"
          v-model="s[t.key]"
          :label="t.label"
          :hint="t.hint"
        />
      </section>

      <!-- Colouring -->
      <section class="px-4 py-3 border-b border-gray-100">
        <h3 class="section-title">Görünüm</h3>
        <div class="flex flex-wrap gap-1">
          <button
            v-for="c in colorings"
            :key="c.key"
            class="chip"
            :class="s.colorBy === c.key ? 'chip-on' : 'chip-off'"
            @click="s.colorBy = c.key"
          >
            {{ c.label }}
          </button>
        </div>
        <div v-if="s.colorBy !== 'label'" class="mt-2">
          <div class="h-2 rounded-full" :style="{ background: RAMP_CSS }"></div>
          <div class="mt-0.5 flex justify-between text-[9px] text-gray-400">
            <span>0%</span><span>100%</span>
          </div>
        </div>

        <div class="mt-2 grid grid-cols-3 gap-1 text-[11px] font-semibold text-gray-600">
          <label class="flex items-center gap-1" title="G">
            <input
              type="checkbox"
              class="rounded"
              :checked="showPatches"
              @change="$emit('update:showPatches', !showPatches)"
            />
            Patch
          </label>
          <label class="flex items-center gap-1" title="M">
            <input
              type="checkbox"
              class="rounded"
              :checked="showTissue"
              @change="$emit('update:showTissue', !showTissue)"
            />
            Doku
          </label>
          <label class="flex items-center gap-1" title="A">
            <input
              type="checkbox"
              class="rounded"
              :checked="showAnnotations"
              @change="$emit('update:showAnnotations', !showAnnotations)"
            />
            Poligon
          </label>
        </div>
        <div class="mt-2 flex items-center gap-2">
          <span class="text-[10px] font-bold text-gray-400">Dolgu</span>
          <input
            type="range"
            min="0"
            max="0.8"
            step="0.05"
            class="flex-1"
            :value="fillOpacity"
            @input="$emit('update:fillOpacity', Number(($event.target as HTMLInputElement).value))"
          />
        </div>
      </section>

      <!-- Summary per label -->
      <section v-if="grid.summary.value.length" class="px-4 py-3 border-b border-gray-100">
        <h3 class="section-title">Özet</h3>
        <table class="w-full text-[11px]">
          <thead>
            <tr class="text-[9px] font-bold uppercase text-gray-400">
              <th class="text-left font-bold">Etiket</th>
              <th class="text-right font-bold">Patch</th>
              <th class="text-right font-bold">Kaplama</th>
              <th
                v-if="labelled"
                class="text-right font-bold"
                title="Başka etiket de taşıyan patch oranı (purity &lt; 1)"
              >
                Karışık
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in grid.summary.value" :key="row.label" class="border-t border-gray-100">
              <td class="py-1">
                <span class="flex items-center gap-1.5 font-semibold text-gray-700">
                  <span
                    v-if="labelled"
                    class="inline-block h-2.5 w-2.5 rounded-sm"
                    :style="{
                      background: labelColors[grid.cells.value!.labels.indexOf(row.label)],
                    }"
                  ></span>
                  {{ labelled ? row.label : 'Doku' }}
                </span>
              </td>
              <td class="text-right tabular-nums text-gray-700">
                {{ row.patches.toLocaleString('tr-TR') }}
              </td>
              <td class="text-right tabular-nums text-gray-500">
                {{ (row.coverage * 100).toFixed(0) }}%
              </td>
              <td
                v-if="labelled"
                class="text-right tabular-nums"
                :class="row.mixed > 0.25 ? 'text-amber-600' : 'text-gray-500'"
              >
                {{ (row.mixed * 100).toFixed(0) }}%
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>

    <!-- Output: the parameters as the call that reproduces them in dev-ingestor -->
    <div class="border-t border-gray-200 px-4 py-3">
      <details class="mb-2">
        <summary
          class="cursor-pointer text-[10px] font-bold uppercase tracking-wider text-gray-400"
        >
          Python önizleme
        </summary>
        <pre
          class="mt-1.5 max-h-44 overflow-auto rounded-lg bg-gray-900 p-2 text-[10px] leading-snug text-gray-100"
          >{{ grid.snippet.value }}</pre
        >
      </details>
      <button
        class="w-full rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-40"
        :disabled="!canCopy"
        title="pl.workspace_patches(ds, **params) için parametreleri kopyalar"
        @click="copy"
      >
        {{ copied ? 'Kopyalandı ✓' : 'Parametreleri Python olarak kopyala' }}
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useToast } from 'vue-toastification';
import type { Annotator } from '@/core/patches';
import type { ColorBy, PatchGrid } from '@/presentation/composables/patches/usePatchGrid';
import PatchFacts from './PatchFacts.vue';
import PatchPreview from './PatchPreview.vue';
import ThresholdSlider from './ThresholdSlider.vue';
import { RAMP_CSS } from './colors';

const PATCH_SIZES = [224, 256, 512, 1024];
const MPPS = [0.25, 0.5, 1, 2];

const props = defineProps<{
  grid: PatchGrid;
  labelColors: string[];
  selectedIndex: number | null;
  provenance: string | null;
  showPatches: boolean;
  showTissue: boolean;
  showAnnotations: boolean;
  fillOpacity: number;
}>();

defineEmits<{
  'update:showPatches': [value: boolean];
  'update:showTissue': [value: boolean];
  'update:showAnnotations': [value: boolean];
  'update:fillOpacity': [value: number];
  locate: [];
  deselect: [];
  'open-image': [imageId: string];
}>();

const toast = useToast();
const s = props.grid.settings;

const labelled = computed(() => props.grid.cells.value?.source === 'annotation');
const footprintUm = computed(() => Math.round(s.patchSize * s.mpp));
const loadingText = computed(() =>
  props.grid.loadedAnnotations.value > 100
    ? `${props.grid.loadedAnnotations.value.toLocaleString('tr-TR')} annotation yüklendi…`
    : 'yükleniyor…'
);

const RESOURCE: Record<string, string> = { imported: 'içe aktarılan', model: 'model' };

/** What kind of annotator this is, where it is not a person drawing by hand. */
function resourceText(resource: string): string {
  return resource
    .split('|')
    .filter((r) => r !== 'manual')
    .map((r) => RESOURCE[r] ?? r)
    .join(' + ');
}

function annotatorOption(a: Annotator): string {
  const kind = resourceText(a.resource);
  const images = a.images === null ? '' : ` · ${a.images.toLocaleString('tr-TR')} görüntü`;
  const here = props.grid.sets.value.some((s) => s.ownerId === a.ownerId)
    ? ''
    : ' · bu görüntüde yok';
  return `${a.owner}${kind ? ` (${kind})` : ''} — ${a.polygons.toLocaleString('tr-TR')} poligon${images}${here}`;
}

/** Who else drew on this image — never shown together with the chosen annotator's labels. */
const otherAnnotatorsHere = computed(() =>
  [...new Set(props.grid.sets.value.map((s) => s.owner))].join(', ')
);

const maskStatus = computed(() => {
  switch (props.grid.mask.value?.status) {
    case 'approved':
      return { text: 'Onaylı', cls: 'bg-emerald-50 text-emerald-700' };
    case 'edited':
      return { text: 'Düzenlendi', cls: 'bg-sky-50 text-sky-700' };
    case 'auto':
      return { text: 'Otomatik', cls: 'bg-gray-100 text-gray-600' };
    case 'rejected':
      return { text: 'Reddedildi', cls: 'bg-rose-50 text-rose-700' };
    default:
      return { text: 'Yok', cls: 'bg-amber-50 text-amber-700' };
  }
});

type ThresholdKey = 'minCoverage' | 'minPurity' | 'minTissue' | 'minInside';

// Only the thresholds that the chosen source and placement read.
const thresholds = computed<{ key: ThresholdKey; label: string; hint: string }[]>(() => {
  const coverage = {
    key: 'minCoverage' as const,
    label: 'min_coverage',
    hint:
      s.source === 'tissue'
        ? 'Karenin en az bu kadarı dokunun içinde olmalı'
        : 'Karenin en az bu kadarı kendi etiketini taşımalı',
  };
  if (s.source === 'tissue') return [coverage];
  return [
    s.placement === 'center'
      ? {
          key: 'minInside' as const,
          label: 'min_inside',
          hint: "Poligonun en az bu kadarı patch'e sığmalı",
        }
      : coverage,
    {
      key: 'minPurity' as const,
      label: 'min_purity',
      hint: "Etiketli alanın en az bu kadarı patch'in kendi etiketi olmalı",
    },
    {
      key: 'minTissue' as const,
      label: 'min_tissue',
      hint: 'Karenin en az bu kadarı doku maskesinin içinde olmalı',
    },
  ];
});

const colorings = computed<{ key: ColorBy; label: string }[]>(() => {
  const inside = s.placement === 'center' ? [{ key: 'inside' as const, label: 'İçeride' }] : [];
  if (s.source === 'tissue') return [{ key: 'coverage', label: 'Kaplama' }, ...inside];
  return [
    { key: 'label', label: 'Etiket' },
    { key: 'coverage', label: 'Kaplama' },
    { key: 'purity', label: 'Saflık' },
    { key: 'tissueCoverage', label: 'Doku' },
    ...inside,
  ];
});

function setInt(key: 'patchSize', event: Event) {
  const value = Math.round(Number((event.target as HTMLInputElement).value));
  if (value >= 1 && value <= 16384) s[key] = value;
  else (event.target as HTMLInputElement).value = String(s[key]);
}

function setFloat(key: 'mpp', event: Event, min: number, max: number) {
  const value = Number((event.target as HTMLInputElement).value);
  if (value >= min && value <= max) s[key] = value;
  else (event.target as HTMLInputElement).value = String(s[key]);
}

// The label set is a choice for the workspace: it can be copied from an image that lacks it.
const canCopy = computed(() => s.source === 'tissue' || !!props.grid.chosenSet.value);

const copied = ref(false);
async function copy() {
  try {
    await navigator.clipboard.writeText(props.grid.snippet.value);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1800);
  } catch {
    toast.error('Panoya kopyalanamadı; "Python önizleme"den elle kopyalayın.');
  }
}
</script>

<style scoped>
.section-title {
  @apply mb-2 text-[10px] font-black uppercase tracking-wider text-gray-400;
}
.field-label {
  @apply mb-1 block text-[10px] font-bold text-gray-500;
}
.chip {
  @apply rounded-md border px-2 py-1 text-[11px] font-bold transition-colors;
}
.chip-on {
  @apply border-indigo-500 bg-indigo-50 text-indigo-700;
}
.chip-off {
  @apply border-gray-200 text-gray-600 hover:bg-gray-50;
}
.select-input {
  @apply min-w-0 flex-1 rounded-md border-gray-300 py-1 pl-2 pr-7 text-[11px] font-bold text-gray-700 focus:border-indigo-500 focus:ring-indigo-500;
}
.number-input {
  @apply rounded-md border-gray-200 px-1.5 py-1 text-[11px] font-bold text-gray-700 focus:border-indigo-500 focus:ring-indigo-500;
}
.segmented {
  @apply grid grid-cols-2 gap-0.5 rounded-lg border border-gray-200 bg-gray-100 p-0.5;
}
.seg-on,
.seg-off {
  @apply rounded-md px-2 py-1 text-[11px] font-bold transition-colors;
}
.seg-on {
  @apply bg-white text-indigo-600 shadow-sm;
}
.seg-off {
  @apply text-gray-500 hover:text-gray-700;
}
</style>
