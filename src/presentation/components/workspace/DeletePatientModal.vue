<template>
  <Modal :is-open="isOpen" title="Hastayı Sil" @close="closeModal">
    <p class="text-sm text-gray-600">
      Emin misiniz? <strong>'{{ patientName }}'</strong> adlı hasta silinecek. Bu hastaya ait tüm
      görüntüler de kalıcı olarak silinir. Bu işlem geri alınamaz.
    </p>

    <template #actions>
      <button type="button" class="btn btn-danger" @click="confirmDelete">Evet, Sil</button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Modal from '@/presentation/components/common/Modal.vue';
import type { Patient } from '@/core/entities/Patient';
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
});

const emit = defineEmits(['close', 'confirm']);

const patientName = computed(() => props.patient?.name || '');

const confirmDelete = () => {
  emit('confirm');
};

const closeModal = () => {
  emit('close');
};
</script>
