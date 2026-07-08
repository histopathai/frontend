<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-2xl font-bold text-gray-900">İstatistikler</h2>
      <p class="text-gray-500 mt-1">Veri setlerinin etiketleme ilerlemesi ve review güvenilirliği.</p>
    </div>

    <!-- İç sekmeler -->
    <div class="flex items-center gap-1 border-b border-gray-200">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        @click="activeTab = tab.key"
        class="px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors"
        :class="
          activeTab === tab.key
            ? 'border-indigo-500 text-indigo-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'
        "
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- İçerik: v-if ile, pahalı review fetch'i ancak sekme seçilince çalışır -->
    <DatasetProgressPanel v-if="activeTab === 'progress'" />
    <ReviewReliabilityPanel v-else-if="activeTab === 'review'" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import DatasetProgressPanel from '@/presentation/components/dashboard/DatasetProgressPanel.vue';
import ReviewReliabilityPanel from '@/presentation/components/dashboard/ReviewReliabilityPanel.vue';

type TabKey = 'progress' | 'review';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'progress', label: 'Veri Seti İlerlemesi' },
  { key: 'review', label: 'Review Güvenilirliği' },
];

const activeTab = ref<TabKey>('progress');
</script>
