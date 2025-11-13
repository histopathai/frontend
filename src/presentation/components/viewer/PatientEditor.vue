<template>
  <div class="selected-info">
    <h3 class="selected-title">Hasta Bilgileri</h3>
    <div v-if="!patient" class="text-xs text-gray-500 italic p-2">Görüntü seçilmedi.</div>
    <form v-else @submit.prevent="handleSubmit" class="space-y-3 p-3">
      <div>
        <label for="p-edit-name" class="form-label-xs">Hasta Adı / Kodu *</label>
        <input
          id="p-edit-name"
          type="text"
          v-model="form.name"
          class="form-input form-input-sm"
          required
        />
        <p v-if="errors.name" class="form-error">{{ errors.name }}</p>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label for="p-edit-age" class="form-label-xs">Yaş</label>
          <input
            id="p-edit-age"
            type="number"
            v-model.number="form.age"
            class="form-input form-input-sm"
          />
        </div>
        <div>
          <label for="p-edit-gender" class="form-label-xs">Cinsiyet</label>
          <input
            id="p-edit-gender"
            type="text"
            v-model="form.gender"
            class="form-input form-input-sm"
          />
        </div>
      </div>
      <div>
        <label for="p-edit-disease" class="form-label-xs">Hastalık (Teşhis)</label>
        <input
          id="p-edit-disease"
          type="text"
          v-model="form.disease"
          class="form-input form-input-sm"
        />
      </div>
      <div>
        <label for="p-edit-history" class="form-label-xs">Geçmiş (Organ vb.)</label>
        <textarea
          id="p-edit-history"
          v-model="form.history"
          class="form-input form-input-sm"
          rows="2"
        ></textarea>
      </div>
      <div class="flex justify-end">
        <button type="submit" class="btn btn-primary btn-sm" :disabled="!isFormValid || !isChanged">
          Kaydet
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch, computed, type PropType } from 'vue';
import type { Patient, PatientProps } from '@/core/entities/Patient';
import { useToast } from 'vue-toastification';

// Bu, EditPatientModal'daki formla aynıdır
type PatientUpdateForm = Partial<
  Omit<PatientProps, 'id' | 'workspaceId' | 'creatorId' | 'createdAt' | 'updatedAt'>
>;

const props = defineProps({
  patient: {
    type: Object as PropType<PatientProps | null>,
    default: null,
  },
});

const emit = defineEmits(['update-patient']);
const toast = useToast();

const getInitialForm = (): PatientUpdateForm => ({
  name: props.patient?.name || '',
  age: props.patient?.age || undefined,
  gender: props.patient?.gender || undefined,
  disease: props.patient?.disease || undefined,
  history: props.patient?.history || undefined,
});

const form = reactive(getInitialForm());
const errors = reactive({ name: '' });

// Formun değişip değişmediğini kontrol et
const isChanged = computed(() => {
  if (!props.patient) return false;
  return (
    form.name !== (props.patient.name || '') ||
    form.age !== (props.patient.age || undefined) ||
    form.gender !== (props.patient.gender || undefined) ||
    form.disease !== (props.patient.disease || undefined) ||
    form.history !== (props.patient.history || undefined)
  );
});

// Formun geçerliliğini kontrol et
const isFormValid = computed(() => !!form.name);

// Prop (seçili hasta) değiştiğinde formu güncelle
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
    } else {
      Object.assign(form, getInitialForm());
    }
  },
  { deep: true }
);

const handleSubmit = () => {
  errors.name = '';
  if (!isFormValid.value) {
    errors.name = 'Hasta adı zorunludur.';
    return;
  }
  if (!isChanged.value) {
    toast.info('Değişiklik yapılmadı.');
    return;
  }

  const payload: PatientUpdateForm = { ...form };
  if (payload.age === undefined || payload.age === null) payload.age = null;
  if (!payload.gender) payload.gender = null;
  if (!payload.disease) payload.disease = null;
  if (!payload.history) payload.history = null;

  emit('update-patient', payload);
};
</script>

<style scoped>
/* Stilleri eski Sidebar.vue'den alıyoruz */
.selected-info {
  @apply border-t border-gray-200 bg-gray-50;
}
.selected-title {
  @apply font-semibold text-gray-700 mb-1 px-3 pt-3 text-sm;
}
.form-label-xs {
  @apply block text-xs font-medium text-gray-600 mb-1;
}
.form-error {
  @apply mt-1 text-sm text-red-600;
}
</style>
