<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    @click.self="$emit('close')"
  >
    <div class="card w-full max-w-md shadow-lg rounded-xl bg-white">
      <div class="card-header px-6 py-4 border-b border-gray-200 flex items-center">
        <div class="p-2 bg-red-100 rounded-full mr-3 flex-shrink-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="w-6 h-6 text-red-600"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>
        <h3 class="text-xl font-semibold text-gray-900">{{ title }}</h3>
      </div>

      <div class="card-body p-6 space-y-4">
        <p class="text-gray-600 text-sm leading-relaxed">
          Bu işlem <strong>geri alınamaz.</strong> <br />
          <strong>'{{ itemName }}'</strong> silinecek.
          <span v-if="warningText" class="block mt-2">{{ warningText }}</span>
        </p>

        <div class="mt-4">
          <label class="block text-sm text-gray-700 mb-1">
            Onaylamak için lütfen <strong>{{ itemName }}</strong> yazın:
          </label>
          <input
            type="text"
            v-model="confirmationInput"
            class="form-input w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
            :placeholder="itemName"
            @paste.prevent
          />
        </div>
      </div>

      <div
        class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 rounded-b-xl"
      >
        <button
          type="button"
          @click="$emit('close')"
          class="btn btn-outline bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-md text-sm font-medium"
        >
          İptal
        </button>

        <button
          type="button"
          @click="$emit('confirm')"
          :disabled="!isConfirmed || loading"
          class="btn btn-danger bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          <span v-if="loading" class="mr-2">Siliniyor...</span>
          <span v-else>Sil</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps({
  title: {
    type: String,
    default: 'Silme İşlemi',
  },
  itemName: {
    type: String,
    required: true,
  },
  warningText: {
    type: String,
    default: '',
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

defineEmits(['close', 'confirm']);

const confirmationInput = ref('');
const isConfirmed = computed(() => {
  return confirmationInput.value === props.itemName;
});
</script>
