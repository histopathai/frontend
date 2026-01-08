<template>
  <div
    class="w-full h-14 bg-white border-b border-gray-200 flex items-center px-4 shadow-sm z-30 relative shrink-0 transition-all duration-300"
    :class="{ 'bg-indigo-50/50': selectedAnnotation }"
  >
    <div
      v-if="!selectedAnnotation"
      class="flex items-center gap-6 w-full text-gray-600 animate-fade-in"
    >
      <div class="flex items-center gap-3">
        <div class="p-1.5 bg-gray-100 rounded-full">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 text-gray-500"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
        <div class="flex flex-col">
          <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">Hasta</span>
          <span class="text-sm font-semibold text-gray-900 leading-tight">
            {{ patientStore.currentPatient?.name || 'Yükleniyor...' }}
          </span>
        </div>
      </div>

      <div class="h-8 w-px bg-gray-200"></div>

      <div class="flex flex-col">
        <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">Görüntü</span>
        <span class="text-sm text-gray-700 leading-tight">
          {{ imageStore.currentImage?.name || 'Görüntü Seçilmedi' }}
        </span>
      </div>

      <div class="ml-auto text-xs text-gray-400 italic">Düzenlemek için bir çizim seçin.</div>
    </div>

    <div
      v-else
      class="flex items-center gap-6 w-full overflow-x-auto custom-scrollbar pb-1 animate-slide-in"
    >
      <div class="shrink-0 flex items-center gap-3 border-r border-indigo-100 pr-6 mr-2">
        <div class="flex flex-col items-end">
          <span class="text-[10px] font-bold text-indigo-400 uppercase tracking-wider"
            >Seçili Alan</span
          >
          <span class="text-sm font-bold text-indigo-900 whitespace-nowrap leading-tight">
            {{ selectedType?.name || 'Bilinmeyen Tip' }}
          </span>
        </div>
        <div
          class="w-3 h-8 rounded-full shadow-sm"
          :style="{ backgroundColor: selectedType?.color || '#ccc' }"
        ></div>
      </div>

      <div class="flex items-center gap-5">
        <div
          v-for="tag in selectedType?.tags || []"
          :key="tag.name"
          class="flex flex-col justify-center group"
        >
          <label
            class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5 whitespace-nowrap transition-colors group-hover:text-indigo-500"
          >
            {{ tag.name }} <span class="text-red-400">*</span>
          </label>

          <input
            v-if="tag.type === 'TEXT'"
            type="text"
            :value="getValue(tag.name)"
            @input="(e) => updateValue(tag, (e.target as HTMLInputElement).value)"
            class="h-8 w-40 text-sm border-gray-300 rounded shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white"
            placeholder="..."
          />

          <div v-if="tag.type === 'NUMBER'" class="relative">
            <input
              type="number"
              :min="tag.min"
              :max="tag.max"
              :value="getValue(tag.name)"
              @input="(e) => updateValue(tag, parseFloat((e.target as HTMLInputElement).value))"
              class="h-8 w-24 text-sm border-gray-300 rounded shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white pr-2"
            />
            <span
              v-if="tag.min !== undefined && tag.max !== undefined"
              class="absolute right-2 top-2 text-[9px] text-gray-400 pointer-events-none"
            >
              {{ tag.min }}-{{ tag.max }}
            </span>
          </div>

          <button
            v-if="tag.type === 'BOOLEAN'"
            @click="updateValue(tag, !getValue(tag.name))"
            class="h-8 px-3 rounded text-xs font-semibold border transition-all flex items-center gap-2"
            :class="
              getValue(tag.name)
                ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
            "
          >
            <span
              class="w-2.5 h-2.5 rounded-full transition-colors"
              :class="getValue(tag.name) ? 'bg-green-500 shadow-green-200 shadow' : 'bg-gray-300'"
            ></span>
            {{ getValue(tag.name) ? 'EVET' : 'HAYIR' }}
          </button>

          <select
            v-if="tag.type === 'SELECT'"
            :value="getValue(tag.name)"
            @change="(e) => updateValue(tag, (e.target as HTMLSelectElement).value)"
            class="h-8 text-sm border-gray-300 rounded shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white min-w-[140px] cursor-pointer"
          >
            <option value="" disabled class="text-gray-400">Seçiniz...</option>
            <option v-for="opt in tag.options" :key="opt" :value="opt">{{ opt }}</option>
          </select>

          <div v-if="tag.type === 'MULTI_SELECT'" class="relative group/multi">
            <div
              class="h-8 border border-gray-300 rounded px-3 flex items-center bg-white min-w-[140px] max-w-[200px] cursor-pointer hover:border-indigo-400 transition-colors"
            >
              <span class="text-sm text-gray-700 truncate block w-full">
                {{
                  (getValue(tag.name) || []).length > 0
                    ? (getValue(tag.name) || []).join(', ')
                    : 'Seçim Yapınız...'
                }}
              </span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4 text-gray-400 ml-2 shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>

            <div
              class="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 shadow-xl rounded-lg p-2 hidden group-hover/multi:block z-50 animate-fade-in"
            >
              <div class="max-h-60 overflow-y-auto custom-scrollbar space-y-1">
                <label
                  v-for="opt in tag.options"
                  :key="opt"
                  class="flex items-center p-2 hover:bg-indigo-50 rounded cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    :checked="(getValue(tag.name) || []).includes(opt)"
                    @change="
                      (e) => handleMultiSelect(tag, opt, (e.target as HTMLInputElement).checked)
                    "
                    class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 mr-3"
                  />
                  <span class="text-sm text-gray-700">{{ opt }}</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="ml-auto pl-4 border-l border-indigo-100">
        <button
          @click="annotationStore.selectAnnotation(null)"
          class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          title="Seçimi Kaldır"
        >
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { usePatientStore } from '@/stores/patient';
import { useImageStore } from '@/stores/image';
import { useAnnotationStore } from '@/stores/annotation';
import { useAnnotationTypeStore } from '@/stores/annotation_type';
import type { TagDefinition, TagValue } from '@/core/types/tags';

const patientStore = usePatientStore();
const imageStore = useImageStore();
const annotationStore = useAnnotationStore();
const annotationTypeStore = useAnnotationTypeStore();

const selectedAnnotation = computed(() => annotationStore.currentAnnotation);
const selectedType = computed(() => {
  if (!selectedAnnotation.value) return null;
  return annotationTypeStore.getAnnotationTypeById(selectedAnnotation.value.typeId || '');
});

function getValue(tagName: string): any {
  if (!selectedAnnotation.value || !selectedAnnotation.value.data) return null;
  const tag = selectedAnnotation.value.data.find((t) => t.tagName === tagName);
  return tag ? tag.value : null;
}

function updateValue(tagDef: TagDefinition, newValue: any) {
  if (!selectedAnnotation.value) return;
  const currentData = [...(selectedAnnotation.value.data || [])];
  const index = currentData.findIndex((t) => t.tagName === tagDef.name);

  const newTagValue: TagValue = {
    tagName: tagDef.name,
    tagType: tagDef.type,
    value: newValue,
  };

  if (index >= 0) {
    currentData[index] = newTagValue;
  } else {
    currentData.push(newTagValue);
  }
  annotationStore.updateAnnotation(selectedAnnotation.value.id, {
    data: currentData,
  });
}

function handleMultiSelect(tagDef: TagDefinition, option: string, isChecked: boolean) {
  const currentVal: string[] = getValue(tagDef.name) || [];
  let newVal = [...currentVal];

  if (isChecked) {
    if (!newVal.includes(option)) newVal.push(option);
  } else {
    newVal = newVal.filter((v) => v !== option);
  }

  updateValue(tagDef, newVal);
}
</script>

<style scoped>
/* Yatay Scrollbar Özelleştirme */
.custom-scrollbar::-webkit-scrollbar {
  height: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #d1d5db;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: #9ca3af;
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}
.animate-slide-in {
  animation: slideIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
