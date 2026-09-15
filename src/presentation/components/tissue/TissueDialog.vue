<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[9999999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div class="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div class="p-6">
          <h3 class="text-lg font-bold text-gray-900">{{ title }}</h3>
          <p class="mt-2 text-sm text-gray-600">{{ message }}</p>
          <textarea
            v-if="withReason"
            v-model="reason"
            rows="3"
            maxlength="1000"
            placeholder="Gerekçe (isteğe bağlı): ör. IHC boyama, doku yok, bulanık tarama"
            class="mt-3 w-full rounded-lg border-gray-200 text-sm"
          />
        </div>
        <div class="flex justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
          <button
            class="rounded-lg px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200"
            @click="$emit('cancel')"
          >
            {{ cancelLabel }}
          </button>
          <button
            class="rounded-lg px-4 py-2 text-sm font-bold text-white shadow-md"
            :class="confirmClass"
            @click="$emit('confirm', reason)"
          >
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel?: string;
    confirmClass?: string;
    withReason?: boolean;
    initialReason?: string;
  }>(),
  {
    cancelLabel: 'İptal',
    confirmClass: 'bg-indigo-600 hover:bg-indigo-700',
    withReason: false,
    initialReason: '',
  }
);

defineEmits<{ confirm: [reason: string]; cancel: [] }>();

const reason = ref(props.initialReason);
watch(
  () => props.isOpen,
  (open) => {
    if (open) reason.value = props.initialReason;
  }
);
</script>
