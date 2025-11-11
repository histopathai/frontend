<template>
  <Modal :is-open="isOpen" title="Yeni Çalışma Alanı Oluştur" @close="closeModal">
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div>
        <label for="ws-name" class="form-label">Çalışma Alanı Adı *</label>
        <input id="ws-name" type="text" v-model="form.name" class="form-input" required />
        <p v-if="errors.name" class="form-error">{{ errors.name }}</p>
      </div>
      <div>
        <label for="ws-organ" class="form-label">Organ Tipi *</label>
        <input id="ws-organ" type="text" v-model="form.organType" class="form-input" required />
      </div>
      <div>
        <label for="ws-org" class="form-label">Kurum *</label>
        <input id="ws-org" type="text" v-model="form.organization" class="form-input" required />
      </div>
      <div>
        <label for="ws-desc" class="form-label">Açıklama *</label>
        <textarea
          id="ws-desc"
          v-model="form.description"
          class="form-input"
          rows="3"
          required
        ></textarea>
      </div>
      <div>
        <label for="ws-license" class="form-label">Lisans *</label>
        <input id="ws-license" type="text" v-model="form.license" class="form-input" required />
      </div>
      <div>
        <label for="ws-year" class="form-label">Yıl</label>
        <input
          id="ws-year"
          type="number"
          v-model.number="form.releaseYear"
          class="form-input"
          placeholder="Örn: 2024"
        />
      </div>
    </form>

    <template #actions>
      <button type="button" class="btn btn-primary" @click="handleSubmit" :disabled="!isFormValid">
        Oluştur
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue';
import Modal from '@/presentation/components/common/Modal.vue';
import type { CreateNewWorkspaceRequest } from '@/core/repositories/IWorkspaceRepository';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['close', 'created']);

const getInitialForm = (): Omit<CreateNewWorkspaceRequest, 'annotationTypeId'> => ({
  name: '',
  organType: '',
  organization: '',
  description: '',
  license: '',
  releaseYear: undefined,
});

const form = reactive(getInitialForm());
const errors = reactive({ name: '' });

watch(
  () => props.isOpen,
  (newVal) => {
    if (newVal) {
      Object.assign(form, getInitialForm());
      errors.name = '';
    }
  }
);

const isFormValid = computed(() => {
  return form.name && form.organType && form.organization && form.description && form.license;
});

const validate = () => {
  errors.name = '';
  if (!form.name) {
    errors.name = 'Çalışma alanı adı zorunludur.';
    return false;
  }
  return isFormValid.value;
};

const handleSubmit = () => {
  if (!validate()) return;

  const payload: CreateNewWorkspaceRequest = { ...form };
  if (payload.releaseYear === undefined) {
    delete payload.releaseYear;
  }

  emit('created', payload);
};

const closeModal = () => {
  emit('close');
};
</script>

<style scoped>
.form-error {
  @apply mt-1 text-sm text-red-600;
}
</style>
