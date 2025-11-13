<template>
  <Modal :is-open="isOpen" :title="`'${patientName}' Hastasını Düzenle`" @close="closeModal">
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div>
        <label for="p-edit-name" class="form-label">Hasta Adı / Kodu *</label>
        <input id="p-edit-name" type="text" v-model="form.name" class="form-input" required />
        <p v-if="errors.name" class="form-error">{{ errors.name }}</p>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label for="p-edit-age" class="form-label">Yaş</label>
          <input id="p-edit-age" type="number" v-model.number="form.age" class="form-input" />
        </div>
        <div>
          <label for="p-edit-gender" class="form-label">Cinsiyet</label>
          <input id="p-edit-gender" type="text" v-model="form.gender" class="form-input" />
        </div>
      </div>
      <div>
        <label for="p-edit-disease" class="form-label">Hastalık</label>
        <input id="p-edit-disease" type="text" v-model="form.disease" class="form-input" />
      </div>
      <div>
        <label for="p-edit-history" class="form-label">Geçmiş</label>
        <textarea id="p-edit-history" v-model="form.history" class="form-input" rows="3"></textarea>
      </div>
    </form>

    <template #actions>
      <button type="button" class="btn btn-primary" @click="handleSubmit" :disabled="!form.name">
        Güncelle
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { reactive, watch, computed } from 'vue';
import Modal from '@/presentation/components/common/Modal.vue';
import type { Patient } from '@/core/entities/Patient';
import type { IPatientRepository } from '@/core/repositories/IPatientRepository';
import type { PropType } from 'vue';

type PatientUpdateForm = Partial<
  Omit<Patient, 'id' | 'workspaceId' | 'creatorId' | 'createdAt' | 'updatedAt' | 'toJSON'>
>;

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

const emit = defineEmits(['close', 'updated']);

const getInitialForm = (): PatientUpdateForm => ({
  name: props.patient?.name || '',
  age: props.patient?.age || undefined,
  gender: props.patient?.gender || undefined,
  disease: props.patient?.disease || undefined,
  history: props.patient?.history || undefined,
});

const form = reactive(getInitialForm());
const errors = reactive({ name: '' });

const patientName = computed(() => props.patient?.name || '');

watch(
  () => props.patient,
  (newPatient) => {
    if (newPatient) {
      Object.assign(form, {
        name: newPatient.name,
        age: newPatient.age || undefined,
        gender: newPatient.gender || undefined,
        disease: newPatient.disease || undefined,
        history: newPatient.history || undefined,
      });
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

  const payload: PatientUpdateForm = { ...form };
  if (payload.age === undefined || payload.age === null) payload.age = null;
  if (!payload.gender) payload.gender = null;
  if (!payload.disease) payload.disease = null;
  if (!payload.history) payload.history = null;

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
