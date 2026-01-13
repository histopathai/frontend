<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
    @click.self="cancel"
  >
    <div class="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-slate-50">
        <h3 class="text-lg font-semibold text-slate-800">
          <i class="fas fa-draw-polygon text-blue-600 mr-2"></i>
          Lokal Bölgeyi Etiketle
        </h3>
        <button @click="cancel" class="text-gray-400 hover:text-gray-600 transition">
          <i class="fas fa-times text-lg"></i>
        </button>
      </div>

      <div class="p-6">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Anotasyon Tipi Seçin
          <span class="text-xs text-gray-400 ml-1"
            >({{ localAnnotationTypes.length }} tip mevcut)</span
          >
        </label>

        <div class="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
          <button
            v-for="type in localAnnotationTypes"
            :key="type.id"
            @click="selectType(type)"
            :class="[
              'flex items-center justify-between p-3 rounded-md border transition-all text-left',
              selectedTypeId === type.id
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50',
            ]"
          >
            <div class="flex items-center gap-3">
              <span
                class="w-3 h-3 rounded-full flex-shrink-0"
                :style="{ backgroundColor: type.color || '#6366f1' }"
              ></span>
              <span class="font-medium text-slate-700 text-sm">
                {{ type.name }}
              </span>
            </div>
            <i v-if="selectedTypeId === type.id" class="fas fa-check-circle text-blue-500"></i>
          </button>
        </div>

        <div
          v-if="localAnnotationTypes.length === 0"
          class="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg"
        >
          <i class="fas fa-inbox text-3xl mb-2"></i>
          <p class="text-sm">Bu workspace için lokal etiket tanımlanmamış</p>
        </div>

        <div v-if="selectedType" class="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
          <div class="flex items-center gap-2 mb-2">
            <span
              class="w-3 h-3 rounded-full"
              :style="{ backgroundColor: selectedType.color || '#6366f1' }"
            ></span>
            <span class="text-sm font-bold text-blue-900">
              {{ selectedType.name }}
            </span>
          </div>
          <p v-if="selectedType.description" class="text-xs text-blue-700">
            {{ selectedType.description }}
          </p>
        </div>

        <div class="mt-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Not/Açıklama <span class="text-gray-400 text-xs">(Opsiyonel)</span>
          </label>
          <textarea
            v-model="description"
            rows="2"
            class="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            placeholder="Bu bölge hakkında ek bilgi ekleyebilirsiniz..."
          ></textarea>
        </div>
      </div>

      <div class="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-100">
        <button
          @click="cancel"
          class="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition"
        >
          <i class="fas fa-times mr-1"></i>
          İptal
        </button>
        <button
          @click="confirm"
          :disabled="!selectedTypeId"
          class="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
        >
          <i class="fas fa-check"></i>
          Etiketi Ekle
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { AnnotationType } from '@/core/entities/AnnotationType';

const props = defineProps<{
  isOpen: boolean;
  localAnnotationTypes: AnnotationType[];
}>();

const emit = defineEmits(['confirm', 'cancel']);

const selectedTypeId = ref<string | null>(null);
const description = ref('');

const selectedType = computed(() => {
  if (!selectedTypeId.value) return null;
  return props.localAnnotationTypes.find((t) => t.id === selectedTypeId.value);
});

function selectType(type: AnnotationType) {
  selectedTypeId.value = type.id;
  console.log('📝 [LocalModal] Tip seçildi:', {
    id: type.id,
    name: type.name,
    color: type.color,
  });
}

function confirm() {
  if (!selectedType.value) {
    console.error('❌ [LocalModal] Tip seçilmedi!');
    return;
  }

  console.log('✅ [LocalModal] Onaylandı:', {
    type: selectedType.value.name,
    description: description.value,
  });

  emit('confirm', { type: selectedType.value, description: description.value });
  reset();
}

function cancel() {
  console.log('❌ [LocalModal] İptal edildi');
  emit('cancel');
  reset();
}

function reset() {
  selectedTypeId.value = null;
  description.value = '';
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
