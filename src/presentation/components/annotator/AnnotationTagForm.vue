<template>
  <div class="space-y-4">
    <div class="space-y-1">
      <label class="block text-xs font-medium text-gray-700">
        {{ annotationType.name }}
        <span v-if="annotationType.required" class="text-red-500">*</span>
      </label>

      <input
        v-if="annotationType.type === 'TEXT'"
        type="text"
        :value="currentValue"
        @input="(e) => updateValue((e.target as HTMLInputElement).value)"
        class="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
      />

      <input
        v-if="annotationType.type === 'NUMBER'"
        type="number"
        :min="annotationType.min"
        :max="annotationType.max"
        :value="currentValue"
        @input="(e) => updateValue(parseFloat((e.target as HTMLInputElement).value))"
        class="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
      />

      <div v-if="annotationType.type === 'BOOLEAN'" class="flex items-center">
        <button
          type="button"
          class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          :class="[currentValue ? 'bg-indigo-600' : 'bg-gray-200']"
          @click="updateValue(!currentValue)"
        >
          <span
            class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
            :class="[currentValue ? 'translate-x-5' : 'translate-x-0']"
          />
        </button>
        <span class="ml-3 text-sm text-gray-500">{{ currentValue ? 'Evet' : 'Hayır' }}</span>
      </div>

      <select
        v-if="annotationType.type === 'SELECT'"
        :value="currentValue"
        @change="(e) => updateValue((e.target as HTMLSelectElement).value)"
        class="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
      >
        <option value="" disabled>Seçiniz...</option>
        <option v-for="opt in annotationType.options" :key="opt" :value="opt">{{ opt }}</option>
      </select>

      <div
        v-if="annotationType.type === 'MULTI_SELECT'"
        class="space-y-1 bg-gray-50 p-2 rounded border"
      >
        <div v-for="opt in annotationType.options" :key="opt" class="flex items-center">
          <input
            type="checkbox"
            :value="opt"
            :checked="(currentValue || []).includes(opt)"
            @change="(e) => handleMultiSelect(opt, (e.target as HTMLInputElement).checked)"
            class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label class="ml-2 text-sm text-gray-700">{{ opt }}</label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { AnnotationType } from '@/core/entities/AnnotationType';
import type { TagValue } from '@/core/types/tags';

const props = defineProps<{
  annotationType: AnnotationType;
  modelValue: TagValue[];
}>();

const emit = defineEmits(['update:modelValue']);
const currentValue = computed(() => {
  const tag = props.modelValue.find((t) => t.tagName === props.annotationType.name);
  return tag ? tag.value : null;
});

function updateValue(newValue: any) {
  const newModel = [...props.modelValue];
  const index = newModel.findIndex((t) => t.tagName === props.annotationType.name);

  const newTagValue: TagValue = {
    tagName: props.annotationType.name,
    tagType: props.annotationType.type,
    value: newValue,
  };

  if (index >= 0) {
    newModel[index] = newTagValue;
  } else {
    newModel.push(newTagValue);
  }

  emit('update:modelValue', newModel);
}

function handleMultiSelect(option: string, isChecked: boolean) {
  const currentVal: string[] = currentValue.value || [];
  let newVal = [...currentVal];

  if (isChecked) {
    if (!newVal.includes(option)) newVal.push(option);
  } else {
    newVal = newVal.filter((v) => v !== option);
  }

  updateValue(newVal);
}
</script>
