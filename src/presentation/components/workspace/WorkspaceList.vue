<template>
  <div class="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
    <div
      v-if="selectedIds.length > 0"
      class="bg-indigo-50 px-6 py-3 flex items-center justify-between border-b border-indigo-100"
    >
      <div class="text-sm font-medium text-indigo-700">{{ selectedIds.length }} öğe seçildi</div>
      <button
        @click="$emit('delete-selected', selectedIds)"
        class="btn btn-sm btn-danger bg-white border border-red-200 text-red-600 hover:bg-red-50"
      >
        Seçilenleri Sil
      </button>
    </div>

    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th scope="col" class="px-6 py-3 w-10">
              <input
                v-if="workspaces.length > 0"
                type="checkbox"
                class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                :checked="isAllSelected"
                :indeterminate="isIndeterminate"
                @change="toggleSelectAll"
              />
            </th>
            <th
              scope="col"
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              {{ t('workspace.form.name') }}
            </th>
            <th
              scope="col"
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              {{ t('workspace.form.organization') }}
            </th>
            <th
              scope="col"
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              {{ t('workspace.form.organ_type') }}
            </th>
            <th
              scope="col"
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              {{ t('workspace.form.license') }}
            </th>
            <th
              scope="col"
              class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              {{ t('workspace.form.release_year') }}
            </th>
            <th scope="col" class="relative px-6 py-3">
              <span class="sr-only">İşlemler</span>
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-if="workspaces.length === 0">
            <td colspan="7" class="px-6 py-10 text-center text-gray-500">
              {{ t('workspace.list.empty') }}
            </td>
          </tr>

          <tr
            v-for="ws in workspaces"
            :key="ws.id"
            @click="goToDetail(ws.id)"
            class="hover:bg-indigo-50 transition-colors cursor-pointer group"
            :class="{ 'bg-indigo-50/50': selectedIds.includes(ws.id) }"
          >
            <td class="px-6 py-4 whitespace-nowrap" @click.stop>
              <input
                type="checkbox"
                class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                :value="ws.id"
                v-model="selectedIds"
              />
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex items-center">
                <div
                  class="flex-shrink-0 h-10 w-10 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center group-hover:bg-indigo-200 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    class="w-6 h-6"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"
                    />
                  </svg>
                </div>
                <div class="ml-4">
                  <div class="text-sm font-medium text-gray-900">{{ ws.name }}</div>
                  <div class="text-xs text-gray-500 max-w-xs truncate">
                    {{ ws.description }}
                  </div>
                </div>
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm text-gray-900">{{ ws.organization }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {{ ws.organType }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ ws.license }}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {{ ws.releaseYear || '-' }}
            </td>

            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" @click.stop>
              <div class="flex justify-end items-center gap-6">
                <button
                  @click="$emit('edit', ws)"
                  class="text-indigo-600 hover:text-indigo-900 font-medium transition-colors"
                >
                  {{ t('workspace.actions.edit') }}
                </button>

                <button
                  @click="$emit('delete', ws)"
                  class="text-red-600 hover:text-red-900 font-medium transition-colors"
                >
                  {{ t('workspace.actions.delete') }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="workspaces.length > 0"
      class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6"
    >
      <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <div>
          <p class="text-sm text-gray-700">
            {{ t('common.page') }} <span class="font-medium">{{ currentPage }}</span>
          </p>
        </div>
        <div>
          <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
            <button
              @click="$emit('page-change', currentPage - 1)"
              :disabled="currentPage === 1"
              class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
            >
              &lt;
            </button>
            <span
              class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
            >
              {{ currentPage }}
            </span>
            <button
              @click="$emit('page-change', currentPage + 1)"
              :disabled="!hasMore"
              class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
            >
              &gt;
            </button>
          </nav>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import type { PropType } from 'vue';
import type { Workspace } from '@/core/entities/Workspace';

const props = defineProps({
  workspaces: {
    type: Array as PropType<Workspace[]>,
    default: () => [],
  },
  currentPage: {
    type: Number,
    default: 1,
  },
  hasMore: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['page-change', 'edit', 'delete', 'delete-selected']);

const router = useRouter();
const { t } = useI18n();

const selectedIds = ref<string[]>([]);

watch(
  () => props.workspaces,
  (newWorkspaces) => {
    const currentIds = new Set(newWorkspaces.map((w) => w.id));
    selectedIds.value = selectedIds.value.filter((id) => currentIds.has(id));
  }
);

const isAllSelected = computed(() => {
  return props.workspaces.length > 0 && selectedIds.value.length === props.workspaces.length;
});

const isIndeterminate = computed(() => {
  return selectedIds.value.length > 0 && selectedIds.value.length < props.workspaces.length;
});

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedIds.value = [];
  } else {
    selectedIds.value = props.workspaces.map((w) => w.id);
  }
}

function goToDetail(workspaceId: string) {
  router.push({ name: 'WorkspaceDetail', params: { workspaceId } });
}
</script>
