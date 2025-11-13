<template>
  <Modal :is-open="isOpen" title="Çalışma Alanını Düzenle" @close="closeModal">
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div>
        <label for="ws-edit-name" class="form-label">Çalışma Alanı Adı *</label>
        <input id="ws-edit-name" type="text" v-model="form.name" class="form-input" required />
        <p v-if="errors.name" class="form-error">{{ errors.name }}</p>
      </div>
      <div>
        <label for="ws-edit-organ" class="form-label">Organ Tipi *</label>
        <input
          id="ws-edit-organ"
          type="text"
          v-model="form.organType"
          class="form-input"
          required
        />
      </div>
      <div>
        <label for="ws-edit-org" class="form-label">Kurum *</label>
        <input
          id="ws-edit-org"
          type="text"
          v-model="form.organization"
          class="form-input"
          required
        />
      </div>
      <div>
        <label for="ws-edit-desc" class="form-label">Açıklama *</label>
        <textarea
          id="ws-edit-desc"
          v-model="form.description"
          class="form-input"
          rows="3"
          required
        ></textarea>
      </div>
      <div>
        <label for="ws-edit-license" class="form-label">Lisans *</label>
        <input
          id="ws-edit-license"
          type="text"
          v-model="form.license"
          class="form-input"
          required
        />
      </div>
      <div>
        <label for="ws-edit-year" class="form-label">Yıl</label>
        <input
          id="ws-edit-year"
          type="number"
          v-model.number="form.releaseYear"
          class="form-input"
          placeholder="Örn: 2024"
        />
      </div>
    </form>

    <template #actions>
      <button type="button" class="btn btn-primary" @click="handleSubmit" :disabled="!isFormValid">
        Güncelle
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { reactive, watch, computed } from 'vue';
import Modal from '@/presentation/components/common/Modal.vue';
import type { Workspace } from '@/core/entities/Workspace';
import type { UpdateWorkspaceRequest } from '@/core/repositories/IWorkspaceRepository';
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

const emit = defineEmits(['close', 'updated']);
const getInitialForm = (): UpdateWorkspaceRequest => ({
  name: props.workspace?.name || '',
  organType: props.workspace?.organType || '',
  organization: props.workspace?.organization || '',
  description: props.workspace?.description || '',
  license: props.workspace?.license || '',
  releaseYear: props.workspace?.releaseYear || undefined,
});

const form = reactive(getInitialForm());
const errors = reactive({ name: '' });

watch(
  () => props.workspace,
  (newWorkspace) => {
    if (newWorkspace) {
      Object.assign(form, {
        name: newWorkspace.name,
        organType: newWorkspace.organType,
        organization: newWorkspace.organization,
        description: newWorkspace.description,
        license: newWorkspace.license,
        releaseYear: newWorkspace.releaseYear || undefined,
      });
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

  const payload: UpdateWorkspaceRequest = { ...form };
  if (payload.releaseYear === undefined || payload.releaseYear === null) {
    payload.releaseYear = null;
  }

  emit('updated', payload);
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
