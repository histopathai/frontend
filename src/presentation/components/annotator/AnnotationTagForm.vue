<template>
  <div class="space-y-4">
    <div v-for="tagDef in annotationType.tags" :key="tagDef.name" class="space-y-1">
      <label class="block text-xs font-medium text-gray-700">
        {{ tagDef.name }}
        <span class="text-red-500">*</span>
      </label>

      <input
        v-if="tagDef.type === 'TEXT'"
        type="text"
        :value="getValue(tagDef.name)"
        @input="(e) => updateValue(tagDef, (e.target as HTMLInputElement).value)"
        class="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
      />

      <input
        v-if="tagDef.type === 'NUMBER'"
        type="number"
        :min="tagDef.min"
        :max="tagDef.max"
        :value="getValue(tagDef.name)"
        @input="(e) => updateValue(tagDef, parseFloat((e.target as HTMLInputElement).value))"
        class="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
      />

      <div v-if="tagDef.type === 'BOOLEAN'" class="flex items-center">
        <button
          type="button"
          class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          :class="[getValue(tagDef.name) ? 'bg-indigo-600' : 'bg-gray-200']"
          @click="updateValue(tagDef, !getValue(tagDef.name))"
        >
          <span
            class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
            :class="[getValue(tagDef.name) ? 'translate-x-5' : 'translate-x-0']"
          />
        </button>
        <span class="ml-3 text-sm text-gray-500">{{
          getValue(tagDef.name) ? 'Evet' : 'Hayır'
        }}</span>
      </div>

      <select
        v-if="tagDef.type === 'SELECT'"
        :value="getValue(tagDef.name)"
        @change="(e) => updateValue(tagDef, (e.target as HTMLSelectElement).value)"
        class="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
      >
        <option value="" disabled>Seçiniz...</option>
        <option v-for="opt in tagDef.options" :key="opt" :value="opt">{{ opt }}</option>
      </select>

      <div v-if="tagDef.type === 'MULTI_SELECT'" class="space-y-1 bg-gray-50 p-2 rounded border">
        <div v-for="opt in tagDef.options" :key="opt" class="flex items-center">
          <input
            type="checkbox"
            :value="opt"
            :checked="(getValue(tagDef.name) || []).includes(opt)"
            @change="(e) => handleMultiSelect(tagDef, opt, (e.target as HTMLInputElement).checked)"
            class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label class="ml-2 text-sm text-gray-700">{{ opt }}</label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AnnotationType } from '@/core/entities/AnnotationType';
import type { TagDefinition, TagValue } from '@/core/types/tags';

const props = defineProps<{
  annotationType: AnnotationType;
  modelValue: TagValue[];
}>();

const emit = defineEmits(['update:modelValue']);

function getValue(tagName: string) {
  const tag = props.modelValue.find((t) => t.tagName === tagName);
  return tag ? tag.value : null;
}

function updateValue(tagDef: TagDefinition, newValue: any) {
  const newModel = [...props.modelValue];
  const index = newModel.findIndex((t) => t.tagName === tagDef.name);

  const newTagValue: TagValue = {
    tagName: tagDef.name,
    tagType: tagDef.type,
    value: newValue,
  };

  if (index >= 0) {
    newModel[index] = newTagValue;
  } else {
    newModel.push(newTagValue);
  }

  emit('update:modelValue', newModel);
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
