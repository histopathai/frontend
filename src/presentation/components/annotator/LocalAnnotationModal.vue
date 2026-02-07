<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4 transition-opacity"
    >
      <div
        class="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in flex flex-col max-h-[90vh]"
      >
        <div
          class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50"
        >
          <div>
            <h3 class="font-bold text-gray-900 text-lg">Bölgesel İşaretleme</h3>
            <p class="text-xs text-gray-500">
              {{
                isEditing ? 'Etiketi Düzenle veya Sil' : 'Lütfen bu alan için etiketleri doldurun'
              }}
            </p>
          </div>
          <button
            @click="handleCancel"
            class="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div class="p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1">
          <div v-if="localTypes.length === 0" class="flex flex-col items-center py-8 text-center">
            <div class="bg-amber-50 p-3 rounded-full mb-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-8 w-8 text-amber-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <p class="text-sm font-medium text-gray-700">Tanımlı Lokal Etiket Bulunamadı</p>
            <p class="text-xs text-gray-500 mt-1">
              Lütfen çalışma alanı ayarlarından lokal etiket ekleyin.
            </p>
          </div>

          <div
            v-for="type in localTypes"
            :key="type.id"
            class="group p-4 rounded-xl border border-gray-100 bg-gray-50/30 hover:bg-white hover:border-indigo-100 hover:shadow-sm transition-all space-y-3"
          >
            <div class="flex items-center gap-2">
              <span
                class="w-3 h-3 rounded-full shrink-0"
                :style="{ backgroundColor: type.color || '#ccc' }"
              ></span>
              <label class="text-sm font-bold text-gray-800">{{ type.name }}</label>
              <span v-if="type.required" class="text-rose-500 text-xs font-bold">* Zorunlu</span>
            </div>

            <div class="pl-5">
              <input
                v-if="type.type === TagType.Text"
                v-model="formValues[type.id]"
                type="text"
                class="w-full form-input-custom"
                placeholder="Metin giriniz..."
              />

              <div v-else-if="checkType(type.type, ['select', 'multi_select', 'multiselect'])">
                <div
                  v-if="!type.options || type.options.length === 0"
                  class="text-xs text-red-400 mb-1"
                >
                  Seçenek listesi boş.
                </div>

                <select
                  v-model="formValues[type.id]"
                  class="w-full form-select-custom"
                  :multiple="checkType(type.type, 'multi_select')"
                >
                  <option :value="undefined" disabled>Seçiniz...</option>
                  <option v-for="(opt, idx) in type.options || []" :key="idx" :value="opt">
                    {{ opt }}
                  </option>
                </select>
                <p v-if="checkType(type.type, 'multi_select')" class="text-xs text-gray-400 mt-1">
                  CTRL tuşuna basılı tutarak birden fazla seçebilirsiniz.
                </p>
              </div>

              <input
                v-else-if="checkType(type.type, 'number')"
                v-model.number="formValues[type.id]"
                type="number"
                :min="type.min"
                :max="type.max"
                class="w-full form-input-custom"
                placeholder="Sayısal değer..."
              />

              <div v-else-if="type.type === TagType.Boolean" class="flex gap-2">
                <button
                  @click="formValues[type.id] = true"
                  class="px-4 py-2 rounded-lg text-xs font-semibold border transition-all"
                  :class="
                    formValues[type.id] === true
                      ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  "
                >
                  EVET (Pozitif)
                </button>
                <button
                  @click="formValues[type.id] = false"
                  class="px-4 py-2 rounded-lg text-xs font-semibold border transition-all"
                  :class="
                    formValues[type.id] === false
                      ? 'bg-rose-500 text-white border-rose-600 shadow-sm'
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  "
                >
                  HAYIR (Negatif)
                </button>
              </div>

              <div v-else class="text-xs text-gray-400">
                Bu veri tipi desteklenmiyor: {{ type.type }}
              </div>
            </div>
          </div>
        </div>

        <div
          class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between gap-3 shrink-0"
        >
          <div>
            <button
              v-if="isEditing"
              @click="handleDelete"
              class="px-5 py-2.5 text-sm font-bold text-rose-500 hover:bg-rose-50 rounded-xl transition-colors border border-transparent hover:border-rose-100"
            >
              Sil
            </button>
          </div>

          <div class="flex gap-3">
            <button
              @click="handleCancel"
              class="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Vazgeç
            </button>
            <button
              @click="handleSave"
              :disabled="!isValid"
              class="px-8 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-40 disabled:grayscale transition-all shadow-md hover:shadow-indigo-200"
            >
              {{ isEditing ? 'Güncelle' : 'Kaydet' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { TagType } from '@/core/value-objects';

const props = defineProps<{
  isOpen: boolean;
  annotationTypes: any[];
  initialValues?: Record<string, any>;
}>();

const emit = defineEmits(['save', 'cancel', 'delete']);

const formValues = ref<Record<string, any>>({});

// Filtreleme mantığını güvenli hale getirdik
const localTypes = computed(() => {
  if (!props.annotationTypes) return [];
  return props.annotationTypes.filter((t) => {
    // Backend'den 'global', 'is_global' veya 'isGlobal' gelebilir
    const isGlobal = t.global ?? t.is_global ?? t.isGlobal ?? false;
    return !isGlobal;
  });
});

const isEditing = computed(
  () => props.initialValues && Object.keys(props.initialValues).length > 0
);

const isValid = computed(() => {
  // En az bir alan dolu olmalı
  return Object.values(formValues.value).some((v) => v !== null && v !== undefined && v !== '');
});

watch(
  () => props.isOpen,
  (val) => {
    if (val) {
      // Formu sıfırla veya initialValues ile doldur
      if (props.initialValues) {
        formValues.value = { ...props.initialValues };
      } else {
        formValues.value = {};
      }
    }
  }
);

// Helper: Tip kontrolü (Case-insensitive ve esnek)
function checkType(actualType: string, targetType: string | string[]): boolean {
  if (!actualType) return false;
  const normalizedActual = actualType.toString().toLowerCase();

  if (Array.isArray(targetType)) {
    return targetType.some(
      (t) => normalizedActual === t.toLowerCase() || normalizedActual.includes(t.toLowerCase())
    );
  }
  return (
    normalizedActual === targetType.toLowerCase() ||
    normalizedActual.includes(targetType.toLowerCase())
  );
}

function handleSave() {
  const results: any[] = [];

  Object.entries(formValues.value).forEach(([id, value]) => {
    // Boş değerleri filtrele
    if (value === null || value === undefined || value === '') return;

    const typeInfo = localTypes.value.find((t) => t.id === id);
    if (typeInfo) {
      results.push({ type: typeInfo, value });
    }
  });

  emit('save', results);
}

function handleCancel() {
  emit('cancel');
}

function handleDelete() {
  emit('delete');
}
</script>

<style scoped>
.form-input-custom {
  @apply w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all;
}
.form-select-custom {
  @apply w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all cursor-pointer appearance-none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 0.5rem center;
  background-repeat: no-repeat;
  background-size: 1.5em 1.5em;
  padding-right: 2.5rem;
}
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e5e7eb;
  border-radius: 10px;
}
.animate-fade-in {
  animation: fadeIn 0.2s ease-out;
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
