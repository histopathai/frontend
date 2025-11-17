<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    <div v-for="ws in workspaces" :key="ws.id" class="card shadow-lg rounded-xl">
      <div class="card-body p-6">
        <h4 class="text-lg font-bold text-indigo-700">{{ ws.name }}</h4>
        <p class="text-sm text-gray-600 mt-1">{{ ws.organization }}</p>
        <p class="text-sm text-gray-500 mt-2 line-clamp-2">{{ ws.description }}</p>
        <div class="mt-4 pt-4 border-t border-gray-100 flex justify-between">
          <span
            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
          >
            {{ ws.organType }}
          </span>
          <span class="text-xs text-gray-500">{{ ws.license }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import type { Workspace } from '@/core/entities/Workspace';

defineProps({
  workspaces: {
    type: Array as PropType<Workspace[]>,
    default: () => [],
  },
});
</script>
