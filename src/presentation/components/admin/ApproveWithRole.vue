<template>
  <div class="inline-flex items-center gap-2">
    <select
      v-model="role"
      :disabled="disabled"
      class="rounded-md border-gray-300 py-1 pl-2 pr-7 text-sm text-gray-700 focus:border-indigo-500 focus:ring-indigo-500"
      aria-label="Kullanıcı grubu"
    >
      <option value="" disabled>Grup seçin…</option>
      <option value="pathologist">Patolog</option>
      <option value="datascientist">Veri Bilimci</option>
    </select>
    <button
      class="btn btn-primary btn-sm"
      :disabled="disabled || !role"
      :title="role ? '' : 'Önce kullanıcının grubunu seçin'"
      @click="role && $emit('approve', role)"
    >
      Onayla
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

// Approving a new user always places them in a group. There is deliberately no
// preselected group: who may change records is a decision, not a default.
defineProps<{ disabled?: boolean }>();
defineEmits<{ approve: [role: 'pathologist' | 'datascientist'] }>();

const role = ref<'' | 'pathologist' | 'datascientist'>('');
</script>
