<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[9999999] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4 transition-opacity"
    >
      <div
        class="glass-panel rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in flex flex-col border border-white/40 bg-white/95"
      >
        <div class="p-6">
          <div class="flex items-center gap-4 mb-4">
            <div class="bg-red-100 p-3 rounded-full text-red-600">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 class="text-lg font-bold text-gray-900">{{ title || 'Silme Onayı' }}</h3>
          </div>
          <p class="text-gray-600 text-sm pl-1">{{ message || 'Bu kaydı silmek istediğinize emin misiniz?' }}</p>
        </div>
        <div class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button
            @click="$emit('cancel')"
            class="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
          >
            İptal
          </button>
          <button
            @click="$emit('confirm')"
            class="px-4 py-2 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg shadow-md hover:shadow-lg transition-all active:scale-95"
          >
            Evet, Sil
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  isOpen: boolean;
  title?: string;
  message?: string;
}>();

defineEmits(['confirm', 'cancel']);
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.2s ease-out;
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
</style>
