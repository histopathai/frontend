<template>
  <div class="absolute top-4 left-1/2 -translate-x-1/2 z-20 p-1 bg-white rounded-md shadow-lg">
    <div class="flex items-center gap-1">
      <button
        v-for="tool in tools"
        :key="tool.id"
        @click="$emit('tool-selected', tool.id)"
        :class="[
          'p-2 rounded-md transition-colors',
          activeTool === tool.id ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100',
        ]"
        :title="tool.name"
      >
        <component :is="tool.icon" class="w-5 h-5" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue';
import { HandRaisedIcon, PaintBrushIcon, MinusIcon, StopIcon } from '@heroicons/vue/24/outline';
import type { PropType } from 'vue';

export type ToolName = 'PAN' | 'BRUSH' | 'ERASER' | 'BBOX';

defineProps({
  activeTool: {
    type: String as PropType<ToolName>,
    required: true,
  },
});

defineEmits(['tool-selected']);

const tools = shallowRef([
  { id: 'PAN', name: 'Gezinme (Pan)', icon: HandRaisedIcon },
  { id: 'BRUSH', name: 'Fırça', icon: PaintBrushIcon },
  { id: 'ERASER', name: 'Silgi', icon: MinusIcon },
  { id: 'BBOX', name: 'Dörtgen (BBox)', icon: StopIcon },
]);
</script>
