<template>
  <div>
    <div class="flex items-center gap-1.5 font-bold">
      <span
        v-if="label !== null"
        class="inline-block h-2.5 w-2.5 rounded-sm"
        :style="{ background: labelColors[cells.label[index]!] }"
      ></span>
      <span>{{ label ?? 'Doku' }}</span>
      <span :class="muted">
        {{
          cells.placement === 'grid'
            ? `sütun ${cells.col[index]}, satır ${cells.row[index]}`
            : 'merkezli'
        }}
      </span>
    </div>

    <dl class="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
      <dt :class="muted">x0, y0</dt>
      <dd class="font-mono">{{ cells.x0[index] }}, {{ cells.y0[index] }}</dd>
      <dt :class="muted">{{ label === null ? 'doku kaplama' : 'etiket kaplama' }}</dt>
      <dd>{{ percent(cells.coverage[index]!) }}</dd>
      <template v-if="label !== null">
        <dt :class="muted">saflık</dt>
        <dd>
          {{ percent(cells.purity[index]!) }}
          <span v-if="cells.purity[index]! < 1" class="font-bold text-amber-500"
            >karışık bölge</span
          >
        </dd>
        <dt :class="muted">doku</dt>
        <dd>
          {{
            Number.isNaN(cells.tissueCoverage[index]!)
              ? 'maske yok'
              : percent(cells.tissueCoverage[index]!)
          }}
        </dd>
      </template>
      <template v-if="cells.placement === 'center'">
        <dt :class="muted">içeride</dt>
        <dd>{{ percent(cells.inside[index]!) }}</dd>
        <dt :class="muted">{{ label === null ? 'parça' : 'poligon' }}</dt>
        <dd>{{ cells.nPolygons[index] }}</dd>
      </template>
    </dl>

    <!-- Every label in the patch, largest first: G4 62% · G3 31% -->
    <div
      v-if="shares.length > 1"
      class="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-gray-500/30"
    >
      <div
        v-for="s in shares"
        :key="s.label"
        :style="{
          width: `${s.share * 100}%`,
          background: labelColors[cells.labels.indexOf(s.label)],
        }"
      ></div>
    </div>
    <p v-if="shares.length > 1" class="mt-1" :class="muted">
      {{ shares.map((s) => `${s.label} ${percent(s.share)}`).join(' · ') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { labelCoverage, type PatchCells } from '@/core/patches';

const props = defineProps<{
  cells: PatchCells;
  index: number;
  labelColors: string[];
  /** On a dark background (the hover tooltip). */
  dark?: boolean;
}>();

const muted = computed(() => (props.dark ? 'text-gray-400' : 'text-gray-400'));
const label = computed(() =>
  props.cells.source === 'annotation'
    ? (props.cells.labels[props.cells.label[props.index]!] ?? '?')
    : null
);
const shares = computed(() =>
  props.cells.source === 'annotation' ? labelCoverage(props.cells, props.index) : []
);
const percent = (v: number) => `${(v * 100).toFixed(1)}%`;
</script>
