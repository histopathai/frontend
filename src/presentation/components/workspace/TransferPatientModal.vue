<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    @click.self="$emit('close')"
  >
    <div class="card w-full max-w-md shadow-lg rounded-xl bg-white">
      <div class="card-header px-6 py-4 border-b border-gray-200">
        <h3 class="text-xl font-semibold text-gray-900">Hastayı Taşı</h3>
      </div>

      <div class="card-body p-6 space-y-4">
        <p class="text-sm text-gray-600">
          <strong>{{ patientName }}</strong> adlı hastayı taşımak istediğiniz hedef çalışma alanını
          seçin.
        </p>

        <div>
          <label class="form-label">Hedef Çalışma Alanı</label>
          <select v-model="selectedWorkspaceId" class="form-input">
            <option value="" disabled>Seçiniz</option>
            <option v-for="ws in availableWorkspaces" :key="ws.id" :value="ws.id">
              {{ ws.name }}
            </option>
          </select>
        </div>
      </div>

      <div
        class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 rounded-b-xl"
      >
        <button type="button" @click="$emit('close')" class="btn btn-outline">İptal</button>
        <button
          type="button"
          @click="handleTransfer"
          :disabled="!selectedWorkspaceId || loading"
          class="btn btn-primary"
        >
          {{ loading ? 'Taşınıyor...' : 'Taşı' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useWorkspaceStore } from '@/stores/workspace';

const props = defineProps({
  patientId: { type: String, required: true },
  patientName: { type: String, required: true },
  currentWorkspaceId: { type: String, required: true },
});

const emit = defineEmits(['close', 'transferred']);
const store = useWorkspaceStore();

const selectedWorkspaceId = ref('');
const loading = computed(() => store.loading);

const availableWorkspaces = computed(() =>
  store.workspaces.filter((w) => w.id !== props.currentWorkspaceId)
);

async function handleTransfer() {
  if (!selectedWorkspaceId.value) return;

  const success = await store.transferPatient(
    props.patientId,
    props.currentWorkspaceId,
    selectedWorkspaceId.value
  );

  if (success) {
    emit('transferred');
    emit('close');
  }
}
</script>
