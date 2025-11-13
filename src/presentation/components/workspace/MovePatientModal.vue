<template>
  <Modal :is-open="isOpen" title="Hastayı Taşı" @close="closeModal">
    <div v-if="patient">
      <p class="text-sm text-gray-600">
        <strong>'{{ patient.name }}'</strong> adlı hastayı hangi çalışma alanına taşımak
        istiyorsunuz?
      </p>
      <p class="text-xs text-gray-500 mb-4">Mevcut Alan: {{ currentWorkspaceName }}</p>

      <div v-if="availableWorkspaces.length > 0">
        <label for="target-ws" class="form-label">Hedef Çalışma Alanı:</label>
        <select v-model="selectedTargetId" id="target-ws" class="form-input">
          <option disabled value="">-- Seçiniz --</option>
          <option v-for="ws in availableWorkspaces" :key="ws.id" :value="ws.id">
            {{ ws.name }}
          </option>
        </select>
      </div>
      <p v-else class="text-sm text-yellow-700 bg-yellow-50 p-3 rounded-md">
        Taşınabilecek başka bir çalışma alanı bulunamadı.
      </p>
    </div>

    <template #actions>
      <button
        type="button"
        class="btn btn-primary"
        @click="confirmMove"
        :disabled="!selectedTargetId"
      >
        Taşı
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import Modal from '@/presentation/components/common/Modal.vue';
import type { Patient } from '@/core/entities/Patient';
import type { Workspace } from '@/core/entities/Workspace';
import type { PropType } from 'vue';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  patient: {
    type: Object as PropType<Patient | null>,
    default: null,
  },
  allWorkspaces: {
    type: Array as PropType<Workspace[]>,
    required: true,
  },
});

const emit = defineEmits(['close', 'confirm']);

const selectedTargetId = ref('');

const currentWorkspaceName = computed(() => {
  if (!props.patient) return '';
  const current = props.allWorkspaces.find((ws) => ws.id === props.patient?.workspaceId);
  return current?.name || 'Bilinmiyor';
});

const availableWorkspaces = computed(() => {
  return props.allWorkspaces.filter((ws) => ws.id !== props.patient?.workspaceId);
});

watch(
  () => props.isOpen,
  (newVal) => {
    if (newVal) {
      selectedTargetId.value = '';
    }
  }
);

const confirmMove = () => {
  if (selectedTargetId.value) {
    emit('confirm', selectedTargetId.value);
  }
};

const closeModal = () => {
  emit('close');
};
</script>
