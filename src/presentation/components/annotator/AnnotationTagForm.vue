<template>
  <div class="space-y-5">
    <div v-for="type in annotationTypes" :key="type.id" class="space-y-1">
      <label class="block text-xs font-medium text-gray-700">
        {{ type.name }}
        <span v-if="type.required" class="text-red-500">*</span>
      </label>

      <input
        v-if="type.type === TagType.Text"
        type="text"
        :value="modelValue[type.id]"
        @input="(e) => updateValue(type.id, (e.target as HTMLInputElement).value)"
        class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        placeholder="Değer giriniz..."
      />

      <input
        v-if="type.type === TagType.Number"
        type="number"
        :min="type.min"
        :max="type.max"
        :value="modelValue[type.id]"
        @input="(e) => updateValue(type.id, parseFloat((e.target as HTMLInputElement).value))"
        class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
      />

      <div v-if="type.type === TagType.Boolean" class="flex items-center">
        <button
          type="button"
          class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          :class="[modelValue[type.id] ? 'bg-indigo-600' : 'bg-gray-200']"
          @click="updateValue(type.id, !modelValue[type.id])"
        >
          <span
            class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
            :class="[modelValue[type.id] ? 'translate-x-5' : 'translate-x-0']"
          />
        </button>
        <span class="ml-3 text-sm text-gray-500">
          {{ modelValue[type.id] ? 'Evet' : 'Hayır' }}
        </span>
      </div>

      <select
        v-if="type.type === TagType.Select"
        :value="modelValue[type.id] || ''"
        @change="(e) => updateValue(type.id, (e.target as HTMLSelectElement).value)"
        class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
      >
        <option value="" disabled>Seçiniz...</option>
        <option v-for="opt in type.options" :key="opt" :value="opt">
          {{ opt }}
        </option>
      </select>

      <div
        v-if="type.type === TagType.MultiSelect"
        class="space-y-2 rounded-md border border-gray-200 bg-gray-50 p-3 max-h-40 overflow-y-auto"
      >
        <div v-for="opt in type.options" :key="opt" class="flex items-center">
          <input
            type="checkbox"
            :checked="(modelValue[type.id] || []).includes(opt)"
            @change="(e) => handleMultiSelect(type.id, opt, (e.target as HTMLInputElement).checked)"
            class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label class="ml-2 text-sm text-gray-700">{{ opt }}</label>
        </div>
      </div>
    </div>

    <div class="pt-4 border-t border-gray-100">
      <button
        type="button"
        @click="handleSave"
        class="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
      >
        Kaydet
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { AnnotationType } from '@/core/entities/AnnotationType';
import { TagType } from '@/core/value-objects';

const props = defineProps<{
  annotationTypes: AnnotationType[];
  modelValue: Record<string, any>;
}>();

const emit = defineEmits(['update:modelValue', 'save']);

function updateValue(typeId: string, value: any) {
  const newValues = { ...props.modelValue, [typeId]: value };
  emit('update:modelValue', newValues);
}

function handleMultiSelect(typeId: string, option: string, isChecked: boolean) {
  const currentValues = (props.modelValue[typeId] as string[]) || [];
  let newValuesArray = [...currentValues];

  if (isChecked) {
    if (!newValuesArray.includes(option)) newValuesArray.push(option);
  } else {
    newValuesArray = newValuesArray.filter((v) => v !== option);
  }

  updateValue(typeId, newValuesArray);
}

function handleSave() {
  const results = props.annotationTypes
    .map((type) => {
      const val = props.modelValue[type.id];
      if (val === undefined || val === null || val === '') return null;

      return {
        type: type,
        value: val,
      };
    })
    .filter((r) => r !== null);

  emit('save', results);
}
</script>
