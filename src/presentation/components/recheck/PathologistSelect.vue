<template>
  <label class="block">
    <span class="text-[11px] font-bold uppercase tracking-wide text-gray-400">Kime gönderilsin</span>
    <select
      :value="modelValue"
      class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option value="" disabled>{{ loading ? 'Patologlar yükleniyor…' : 'Patolog seçiniz…' }}</option>
      <option v-for="p in pathologists" :key="p.id" :value="p.id">{{ p.name }}</option>
    </select>
    <span v-if="!loading && pathologists.length === 0" class="mt-1 block text-[11px] text-red-600">
      Aktif patolog bulunamadı.
    </span>
    <span class="mt-1 block text-[10px] text-gray-400">Yalnızca seçilen patolog (ve adminler) görür.</span>
  </label>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { usePathologists } from '@/presentation/composables/recheck/usePathologists';

defineProps<{ modelValue: string }>();
defineEmits<{ 'update:modelValue': [value: string] }>();

const { pathologists, load } = usePathologists();
const loading = ref(true);
onMounted(async () => {
  try {
    await load();
  } catch (e) {
    console.error('Failed to load the pathologists:', e);
  } finally {
    loading.value = false;
  }
});
</script>
