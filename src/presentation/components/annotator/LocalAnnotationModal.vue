<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      @click.self="handleCancel"
    >
      <div
        class="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in mx-4"
      >
        <div
          class="px-5 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50"
        >
          <h3 class="font-bold text-gray-800">Anotasyon Detayları</h3>
          <button @click="handleCancel" class="text-gray-400 hover:text-gray-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div class="p-5 space-y-4">
          <div class="space-y-1">
            <label class="block text-xs font-medium text-gray-700">Etiket Tipi</label>
            <div v-if="localTypes.length === 0" class="text-xs text-red-500 bg-red-50 p-2 rounded">
              Bu çalışma alanı için tanımlı lokal anotasyon tipi bulunamadı.
            </div>
            <div class="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar">
              <button
                v-for="type in localTypes"
                :key="type.id"
                @click="selectedTypeId = type.id"
                class="flex items-center gap-2 px-3 py-2 border rounded-lg text-xs font-medium transition-all"
                :class="
                  selectedTypeId === type.id
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500'
                    : 'border-gray-200 hover:border-indigo-300 text-gray-600'
                "
              >
                <span
                  class="w-2 h-2 rounded-full flex-shrink-0"
                  :style="{ backgroundColor: type.color || '#ccc' }"
                ></span>
                <span class="truncate">{{ type.name }}</span>
              </button>
            </div>
          </div>

          <div v-if="selectedType" class="pt-2 border-t border-gray-100">
            <label class="block text-xs font-medium text-gray-700 mb-1">
              Değer ({{ selectedType.name }})
            </label>

            <input
              v-if="selectedType.type === 'TEXT'"
              v-model="tagValue"
              type="text"
              class="w-full form-input-sm"
              placeholder="Değer giriniz..."
            />

            <select
              v-else-if="['SELECT', 'MULTI_SELECT'].includes(selectedType.type)"
              v-model="tagValue"
              class="w-full form-select-sm"
            >
              <option :value="null" disabled>Seçiniz</option>
              <option v-for="opt in selectedType.options" :key="opt" :value="opt">{{ opt }}</option>
            </select>

            <input
              v-else-if="selectedType.type === 'NUMBER'"
              v-model.number="tagValue"
              type="number"
              class="w-full form-input-sm"
            />

            <div v-else-if="selectedType.type === 'BOOLEAN'" class="flex items-center gap-2">
              <button
                @click="tagValue = !tagValue"
                class="px-3 py-1.5 rounded text-xs border transition-colors"
                :class="
                  tagValue
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-gray-100 text-gray-600 border-gray-200'
                "
              >
                {{ tagValue ? 'Evet' : 'Hayır' }}
              </button>
            </div>
          </div>
        </div>

        <div class="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
          <button
            @click="handleCancel"
            class="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            İptal
          </button>
          <button
            @click="handleSave"
            :disabled="!isValid"
            class="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { AnnotationType } from '@/core/entities/AnnotationType';

const props = defineProps<{
  isOpen: boolean;
  annotationTypes: AnnotationType[];
}>();

const emit = defineEmits(['save', 'cancel']);

const selectedTypeId = ref<string | null>(null);
const tagValue = ref<any>(null);

// Sadece Local tipleri filtrele (Global: false)
const localTypes = computed(() => {
  return props.annotationTypes.filter((t) => !t.global);
});

const selectedType = computed(() => {
  return localTypes.value.find((t) => t.id === selectedTypeId.value);
});

const isValid = computed(() => {
  if (!selectedTypeId.value) return false;
  // Zorunluluk kontrolü eklenebilir
  if (tagValue.value === null || tagValue.value === '') return false;
  return true;
});

watch(
  () => props.isOpen,
  (val) => {
    if (!val) {
      selectedTypeId.value = null;
      tagValue.value = null;
    } else {
      const firstLocalType = localTypes.value[0];
      if (firstLocalType && !selectedTypeId.value) {
        selectedTypeId.value = firstLocalType.id;
      }
    }
  }
);

function handleSave() {
  if (!selectedType.value) return;

  emit('save', {
    typeId: selectedTypeId.value,
    type: selectedType.value,
    value: tagValue.value,
  });
}

function handleCancel() {
  emit('cancel');
}
</script>

<style scoped>
.form-input-sm {
  @apply border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all;
}
.form-select-sm {
  @apply border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all cursor-pointer;
}
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #e5e7eb;
  border-radius: 4px;
}
</style>
