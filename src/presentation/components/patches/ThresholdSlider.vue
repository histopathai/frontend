<template>
  <div class="mb-2 last:mb-0" :title="hint">
    <div class="flex items-center justify-between">
      <label class="text-[10px] font-bold text-gray-500">{{ label }}</label>
      <span class="text-[11px] font-bold tabular-nums text-gray-700">{{
        modelValue.toFixed(2)
      }}</span>
    </div>
    <input
      type="range"
      min="0"
      max="1"
      step="0.05"
      class="w-full"
      :value="modelValue"
      @input="$emit('update:modelValue', Number(($event.target as HTMLInputElement).value))"
    />
    <p class="text-[10px] leading-snug text-gray-400">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{ modelValue: number; label: string; hint: string }>();
defineEmits<{ 'update:modelValue': [value: number] }>();
</script>
