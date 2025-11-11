<template>
  <Modal :is-open="isOpen" title="Çalışma Alanını Sil" @close="closeModal">
    <p class="text-sm text-gray-600">
      Emin misiniz? <strong>'{{ workspaceName }}'</strong> adlı çalışma alanı silinecek. Bu çalışma
      alanına ait tüm hastalar ve görüntüler de kalıcı olarak silinir. Bu işlem geri alınamaz.
    </p>

    <template #actions>
      <button type="button" class="btn btn-danger" @click="confirmDelete">Evet, Sil</button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Modal from '@/presentation/components/common/Modal.vue';
import type { Workspace } from '@/core/entities/Workspace';
import type { PropType } from 'vue';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  workspace: {
    type: Object as PropType<Workspace | null>,
    default: null,
  },
});

const emit = defineEmits(['close', 'confirm']);

const workspaceName = computed(() => props.workspace?.name || '');

const confirmDelete = () => {
  emit('confirm');
};

const closeModal = () => {
  emit('close');
};
</script>
