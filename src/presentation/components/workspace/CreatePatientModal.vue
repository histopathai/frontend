<template>
  <Modal :is-open="isOpen" :title="`'${workspaceName}' için Yeni Hasta`" @close="closeModal">
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div>
        <label for="p-name" class="form-label">Hasta Adı / Kodu *</label>
        <input id="p-name" type="text" v-model="form.name" class="form-input" required />
        <p v-if="errors.name" class="form-error">{{ errors.name }}</p>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label for="p-age" class="form-label">Yaş</label>
          <input id="p-age" type="number" v-model.number="form.age" class="form-input" />
        </div>
        <div>
          <label for="p-gender" class="form-label">Cinsiyet</label>
          <input id="p-gender" type="text" v-model="form.gender" class="form-input" />
        </div>
      </div>
      <div>
        <label for="p-disease" class="form-label">Hastalık</label>
        <input id="p-disease" type="text" v-model="form.disease" class="form-input" />
      </div>
      <div>
        <label for="p-history" class="form-label">Geçmiş</label>
        <textarea id="p-history" v-model="form.history" class="form-input" rows="3"></textarea>
      </div>
    </form>

    <template #actions>
      <button type="button" class="btn btn-primary" @click="handleSubmit" :disabled="!form.name">
        Oluştur
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { reactive, watch, computed } from 'vue';
import Modal from '@/presentation/components/common/Modal.vue';
import type { Workspace } from '@/core/entities/Workspace';
import type { CreateNewPatientRequest } from '@/core/repositories/IPatientRepository';
import type { PropType } from 'vue';

type PatientForm = Omit<CreateNewPatientRequest, 'workspaceId'>;

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

const emit = defineEmits(['close', 'created']);

const getInitialForm = (): PatientForm => ({
  name: '',
  age: undefined,
  gender: undefined,
  disease: undefined,
  history: undefined,
});

const form = reactive(getInitialForm());
const errors = reactive({ name: '' });

const workspaceName = computed(() => props.workspace?.name || '');

watch(
  () => props.isOpen,
  (newVal) => {
    if (newVal) {
      Object.assign(form, getInitialForm());
      errors.name = '';
    }
  }
);

const handleSubmit = () => {
  errors.name = '';
  if (!form.name) {
    errors.name = 'Hasta adı/kodu zorunludur.';
    return;
  }

  const payload: PatientForm = { ...form };
  if (payload.age === undefined || payload.age === null) delete payload.age;
  if (!payload.gender) delete payload.gender;
  if (!payload.disease) delete payload.disease;
  if (!payload.history) delete payload.history;

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
