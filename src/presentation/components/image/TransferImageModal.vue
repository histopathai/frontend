<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    @click.self="$emit('close')"
  >
    <div class="card w-full max-w-md shadow-lg rounded-xl bg-white">
      <div class="card-header px-6 py-4 border-b border-gray-200">
        <h3 class="text-xl font-semibold text-gray-900">
          {{ isBatch ? 'Seçili Görüntüleri Taşı' : 'Görüntüyü Taşı' }}
        </h3>
      </div>

      <div class="card-body p-6 space-y-4">
        <p class="text-sm text-gray-600">
          <span v-if="isBatch">
            Seçili <strong>{{ imageIds.length }}</strong> görüntüyü taşımak için hedef hastayı
            seçin.
          </span>
          <span v-else> Bu görüntüyü taşımak için hedef hastayı seçin. </span>
        </p>

        <div>
          <label class="form-label">Hedef Hasta (*)</label>
          <select v-model="targetPatientId" class="form-input" :disabled="patientLoading">
            <option value="" disabled>Hasta Seçin</option>
            <option v-for="p in availablePatients" :key="p.id" :value="p.id">
              {{ p.name }} (ID: {{ p.id.substring(0, 8) }}...)
            </option>
          </select>
          <p v-if="patientLoading" class="text-xs text-gray-400 mt-1">Hastalar yükleniyor...</p>
          <p v-else-if="availablePatients.length === 0" class="text-xs text-red-400 mt-1">
            Transfer edilebilecek başka hasta bulunamadı.
          </p>
        </div>
      </div>

      <div
        class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 rounded-b-xl"
      >
        <button type="button" @click="$emit('close')" class="btn btn-outline">İptal</button>
        <button
          type="button"
          @click="handleTransfer"
          :disabled="!targetPatientId || actionLoading"
          class="btn btn-primary"
        >
          {{ actionLoading ? 'Taşınıyor...' : 'Taşı' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { usePatientStore } from '@/stores/patient';
import { useImageStore } from '@/stores/image';
import { useToast } from 'vue-toastification';

const props = defineProps({
  workspaceId: { type: String, required: true },
  currentPatientId: { type: String, required: true },
  imageIds: { type: Array as () => string[], required: true, default: () => [] },
});

const emit = defineEmits(['close', 'transferred']);

const patientStore = usePatientStore();
const imageStore = useImageStore();
const toast = useToast();

const targetPatientId = ref('');
const patientLoading = computed(() => patientStore.loading);
const actionLoading = computed(() => imageStore.actionLoading);

const isBatch = computed(() => props.imageIds.length > 1);

const availablePatients = computed(() => {
  const allPatients = patientStore.getPatientsByWorkspaceId(props.workspaceId);
  return allPatients.filter((p) => p.id !== props.currentPatientId);
});

onMounted(async () => {
  if (availablePatients.value.length === 0) {
    await patientStore.fetchPatientsByWorkspace(props.workspaceId, { limit: 100 });
  }
});

async function handleTransfer() {
  if (!targetPatientId.value) return;

  let success = false;

  if (isBatch.value) {
    success = await imageStore.transferManyImages({
      ids: props.imageIds,
      target: targetPatientId.value,
    });
  } else {
    const imageId = props.imageIds[0];
    if (imageId) {
      success = await imageStore.transferImage(
        imageId,
        props.currentPatientId,
        targetPatientId.value
      );
    }
  }

  if (success) {
    emit('transferred');
    emit('close');
  }
}
</script>
