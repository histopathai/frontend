<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    @click.self="$emit('close')"
  >
    <div class="card w-full max-w-md shadow-lg rounded-xl bg-white">
      <div class="card-header px-6 py-4 border-b border-gray-200">
        <h3 class="text-xl font-semibold text-gray-900">
          {{ isBatch ? t('patient.actions.transfer_selected') : t('patient.actions.transfer') }}
        </h3>
      </div>

      <div class="card-body p-6 space-y-4">
        <p class="text-sm text-gray-600" v-if="isBatch">
          <span
            v-html="t('patient.messages.batch_transfer_confirm', { count: patientIds.length })"
          ></span>
        </p>
        <p class="text-sm text-gray-600" v-else>
          <span v-html="t('patient.messages.transfer_confirm', { name: patientName })"></span>
        </p>

        <div>
          <label class="form-label">{{ t('patient.form.target_workspace') }}</label>
          <select v-model="selectedWorkspaceId" class="form-input">
            <option value="" disabled>{{ t('workspace.list.search_placeholder') }}</option>
            <option v-for="ws in availableWorkspaces" :key="ws.id" :value="ws.id">
              {{ ws.name }}
            </option>
          </select>
        </div>
      </div>

      <div
        class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 rounded-b-xl"
      >
        <button type="button" @click="$emit('close')" class="btn btn-outline">
          {{ t('patient.actions.cancel') }}
        </button>
        <button
          type="button"
          @click="handleTransfer"
          :disabled="!selectedWorkspaceId || loading"
          class="btn btn-primary"
        >
          {{ loading ? t('patient.list.loading') : t('patient.actions.transfer') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { usePatientStore } from '@/stores/patient';
import { useWorkspaceStore } from '@/stores/workspace';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  patientId: { type: String, default: '' },
  patientName: { type: String, default: '' },
  patientIds: { type: Array as () => string[], default: () => [] },

  currentWorkspaceId: { type: String, required: true },
});

const emit = defineEmits(['close', 'transferred']);
const { t } = useI18n();

const patientStore = usePatientStore();
const workspaceStore = useWorkspaceStore();

const selectedWorkspaceId = ref('');
const loading = computed(() => patientStore.isActionLoading);

const isBatch = computed(() => props.patientIds.length > 0);

const availableWorkspaces = computed(() =>
  workspaceStore.workspaces.filter((w) => w.id !== props.currentWorkspaceId)
);

async function handleTransfer() {
  if (!selectedWorkspaceId.value) return;

  let success = false;

  if (isBatch.value) {
    success = await patientStore.transferManyPatients({
      ids: props.patientIds,
      target: selectedWorkspaceId.value,
    });
  } else if (props.patientId) {
    success = await patientStore.transferPatient(
      props.patientId,
      props.currentWorkspaceId,
      selectedWorkspaceId.value
    );
  }

  if (success) {
    emit('transferred');
    emit('close');
  }
}
</script>
