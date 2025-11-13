<template>
  <div class="absolute top-0 right-0 h-full w-64 bg-white z-20 shadow-lg flex flex-col">
    <div class="p-4 border-b">
      <h3 class="text-lg font-semibold text-gray-900">Annotasyonlar</h3>
    </div>

    <div class="p-4 border-b">
      <h4 class="text-sm font-medium text-gray-500 mb-2">Sınıflar</h4>
      <div v-if="annotationTypes.length === 0" class="text-xs text-gray-400">Sınıf bulunamadı.</div>
      <div v-else class="space-y-1">
        <button
          v-for="annType in annotationTypes"
          :key="annType.id"
          @click="$emit('type-selected', annType)"
          :class="[
            'w-full text-left px-3 py-2 rounded-md text-sm transition-all',
            selectedType?.id === annType.id
              ? 'font-semibold text-white'
              : 'font-medium text-gray-700 hover:bg-gray-100',
          ]"
          :style="{
            backgroundColor: selectedType?.id === annType.id ? annType.color : 'transparent',
            color: selectedType?.id === annType.id ? 'white' : annType.color,
          }"
        >
          {{ annType.name }}
        </button>
      </div>
    </div>

    <div class="flex-1 p-4 overflow-y-auto">
      <h4 class="text-sm font-medium text-gray-500 mb-2">
        İşaretlemeler ({{ annotations.length }})
      </h4>
      <div v-if="annotations.length === 0" class="text-xs text-gray-400 text-center py-4">
        Henüz bir işaretleme yapılmadı.
      </div>
      <ul v-else class="divide-y divide-gray-200">
        <li
          v-for="ann in annotations"
          :key="ann.id"
          @click="$emit('annotation-selected', ann)"
          class="py-2 px-1 rounded-md cursor-pointer hover:bg-gray-50 flex justify-between items-center"
        >
          <div class="flex items-center gap-2">
            <span
              class="w-3 h-3 rounded-full"
              :style="{ backgroundColor: getTypeColor(ann.annotationTypeId) }"
            ></span>
            <span class="text-sm text-gray-800">{{ getTypeName(ann.annotationTypeId) }}</span>
          </div>
          <button
            @click.stop="$emit('annotation-deleted', ann.id)"
            class="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-100"
            title="Sil"
          >
            <TrashIcon class="w-4 h-4" />
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { type PropType } from 'vue';
import type { Annotation } from '@/core/entities/Annotation';
import type { AnnotationType } from '@/core/entities/AnnotationType';
import { TrashIcon } from '@heroicons/vue/24/outline';

const props = defineProps({
  annotationTypes: {
    type: Array as PropType<AnnotationType[]>,
    default: () => [],
  },
  annotations: {
    type: Array as PropType<Annotation[]>,
    default: () => [],
  },
  selectedType: {
    type: Object as PropType<AnnotationType | null>,
    default: null,
  },
});

defineEmits(['type-selected', 'annotation-selected', 'annotation-deleted']);

const findType = (typeId: string) => {
  return props.annotationTypes.find((t) => t.id === typeId);
};

const getTypeName = (typeId: string) => {
  return findType(typeId)?.name || 'Bilinmeyen';
};

const getTypeColor = (typeId: string) => {
  return findType(typeId)?.color || '#9CA3AF'; // Varsa color, yoksa gray
};
</script>
