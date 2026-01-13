<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
  >
    <div class="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-slate-50">
        <h3 class="text-lg font-semibold text-slate-800">Lokal Bölgeyi Etiketle</h3>
        <button @click="cancel" class="text-gray-400 hover:text-gray-600">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="p-6">
        <label class="block text-sm font-medium text-gray-700 mb-2">Anotasyon Tipi Seçin</label>
        <div class="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2">
          <button
            v-for="type in annotationTypes.filter((t) => !t.global)"
            :key="type.id"
            @click="selectedTypeId = type.id"
            :class="[
              'flex items-center justify-between p-3 rounded-md border transition-all text-left',
              selectedTypeId === type.id
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50',
            ]"
          >
            <div class="flex items-center gap-3">
              <span
                class="w-3 h-3 rounded-full"
                :style="{ backgroundColor: type.color || '#4f46e5' }"
              ></span>
              <span class="font-medium text-slate-700">{{ type.name }}</span>
            </div>
            <i v-if="selectedTypeId === type.id" class="fas fa-check-circle text-blue-500"></i>
          </button>
        </div>

        <div class="mt-4">
          <label class="block text-sm font-medium text-gray-700 mb-2"
            >Not/Açıklama (Opsiyonel)</label
          >
          <textarea
            v-model="description"
            rows="2"
            class="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            placeholder="Bu bölge hakkında ek bilgi..."
          ></textarea>
        </div>
      </div>

      <div class="px-6 py-4 bg-gray-50 flex justify-end gap-3">
        <button
          @click="cancel"
          class="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
        >
          İptal
        </button>
        <button
          @click="confirm"
          :disabled="!selectedTypeId"
          class="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Etiketi Ekle
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  isOpen: boolean;
  annotationTypes: any[];
}>();

const emit = defineEmits(['confirm', 'cancel']);

const selectedTypeId = ref<string | null>(null);
const description = ref('');

function confirm() {
  const type = props.annotationTypes.find((t) => t.id === selectedTypeId.value);
  emit('confirm', { type, description: description.value });
  reset();
}

function cancel() {
  emit('cancel');
  reset();
}

function reset() {
  selectedTypeId.value = null;
  description.value = '';
}
</script>
