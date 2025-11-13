<template>
  <Modal :is-open="isOpen" title="Görüntüyü Taşı" @close="closeModal">
    <div v-if="image">
      <p class="text-sm text-gray-600">
        <strong>'{{ image.name }}'</strong> adlı görüntüyü hangi hastaya taşımak istiyorsunuz?
      </p>
      <p class="text-xs text-gray-500 mb-4">
        Mevcut Konum: {{ currentWorkspaceName }} / {{ currentPatientName }}
      </p>

      <div v-if="availableTargets.length > 0">
        <label for="target-patient" class="form-label">Hedef Hasta:</label>
        <select v-model="selectedTargetId" id="target-patient" class="form-input">
          <option disabled value="">-- Çalışma Alanı / Hasta --</option>
          <optgroup
            v-for="target in availableTargets"
            :key="target.workspace.id"
            :label="target.workspace.name"
          >
            <option v-for="patient in target.patients" :key="patient.id" :value="patient.id">
              {{ patient.name }}
            </option>
          </optgroup>
        </select>
      </div>
      <p v-else class="text-sm text-yellow-700 bg-yellow-50 p-3 rounded-md">
        Taşınabilecek başka bir hasta bulunamadı.
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
import type { Image } from '@/core/entities/Image';
import type { Patient } from '@/core/entities/Patient';
import type { Workspace } from '@/core/entities/Workspace';
import type { PropType } from 'vue';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  image: {
    type: Object as PropType<Image | null>,
    default: null,
  },
  allWorkspaces: {
    type: Array as PropType<Workspace[]>,
    required: true,
  },
  patientsByWorkspace: {
    type: Map as PropType<Map<string, Patient[]>>,
    required: true,
  },
});

const emit = defineEmits(['close', 'confirm']);

const selectedTargetId = ref('');

const currentPatient = computed(() => {
  if (!props.image) return null;
  for (const patients of props.patientsByWorkspace.values()) {
    const found = patients.find((p) => p.id === props.image?.patientId);
    if (found) return found;
  }
  return null;
});

const currentWorkspace = computed(() => {
  return props.allWorkspaces.find((ws) => ws.id === currentPatient.value?.workspaceId);
});

const currentWorkspaceName = computed(() => currentWorkspace.value?.name || 'Bilinmiyor');
const currentPatientName = computed(() => currentPatient.value?.name || 'Bilinmiyor');

const availableTargets = computed(() => {
  const targets: { workspace: Workspace; patients: Patient[] }[] = [];

  for (const ws of props.allWorkspaces) {
    const patientsInWs = props.patientsByWorkspace.get(ws.id) || [];
    const eligiblePatients = patientsInWs.filter((p) => p.id !== props.image?.patientId);

    if (eligiblePatients.length > 0) {
      targets.push({
        workspace: ws,
        patients: eligiblePatients,
      });
    }
  }
  return targets;
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
