<template>
  <Modal :is-open="isOpen" title="Görüntüyü Sil" @close="closeModal">
    <p class="text-sm text-gray-600">
      Emin misiniz? <strong>'{{ imageName }}'</strong> adlı görüntü silinecek. Bu işlem geri
      alınamaz.
    </p>

    <template #actions>
      <button type="button" class="btn btn-danger" @click="confirmDelete">Evet, Sil</button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Modal from '@/presentation/components/common/Modal.vue';
import type { Image } from '@/core/entities/Image';
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
});

const emit = defineEmits(['close', 'confirm']);

const imageName = computed(() => props.image?.name || '');

const confirmDelete = () => {
  emit('confirm');
};

const closeModal = () => {
  emit('close');
};
</script>
