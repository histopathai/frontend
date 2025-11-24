<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    @click.self="$emit('close')"
  >
    <div class="card w-full max-w-2xl shadow-lg rounded-xl bg-white">
      <form @submit.prevent="handleSubmit">
        <div class="card-header px-6 py-4 border-b border-gray-200">
          <h3 class="text-xl font-semibold text-gray-900">
            {{ t('patient.form.edit_title') }}
          </h3>
        </div>

        <div class="card-body p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label class="form-label">{{ t('patient.form.name') }} (*)</label>
            <input type="text" v-model="form.name" class="form-input" required />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="form-label">{{ t('patient.form.age') }}</label>
              <input type="number" v-model.number="form.age" class="form-input" />
            </div>
            <div>
              <label class="form-label">{{ t('patient.form.gender') }}</label>
              <select v-model="form.gender" class="form-input">
                <option value="">{{ t('patient.form.gender_placeholder') }}</option>
                <option value="Male">{{ t('patient.genders.male') }}</option>
                <option value="Female">{{ t('patient.genders.female') }}</option>
                <option value="Other">{{ t('patient.genders.other') }}</option>
              </select>
            </div>
            <div>
              <label class="form-label">{{ t('patient.form.race') }}</label>
              <input type="text" v-model="form.race" class="form-input" />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <template v-if="isClassificationEnabled">
              <div>
                <label class="form-label">{{ t('patient.form.disease') }}</label>
                <select v-model="form.disease" class="form-input">
                  <option value="" disabled>{{ t('patient.form.disease_placeholder') }}</option>
                  <option value="Karsinom">Karsinom</option>
                  <option value="Normal">Normal</option>
                </select>
              </div>

              <div>
                <label class="form-label">{{ t('patient.form.subtype') }}</label>
                <select v-if="subtypeOptions.length > 0" v-model="form.subtype" class="form-input">
                  <option value="">{{ t('patient.form.subtype_placeholder') }}</option>
                  <option v-for="opt in subtypeOptions" :key="opt" :value="opt">
                    {{ opt }}
                  </option>
                </select>
                <input
                  v-else
                  type="text"
                  v-model="form.subtype"
                  class="form-input"
                  :placeholder="loadingSubtypes ? '...' : ''"
                />
              </div>
            </template>

            <template v-if="isScoreEnabled">
              <div>
                <label class="form-label">{{ t('patient.form.grade') }}</label>
                <input type="number" v-model.number="form.grade" class="form-input" />
              </div>
            </template>
          </div>

          <div>
            <label class="form-label">{{ t('patient.form.history') }}</label>
            <textarea v-model="form.history" class="form-input" rows="3"></textarea>
          </div>
        </div>

        <div
          class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 rounded-b-xl"
        >
          <button type="button" @click="$emit('close')" class="btn btn-outline">
            {{ t('patient.actions.cancel') }}
          </button>
          <button type="submit" :disabled="loading" class="btn btn-primary">
            {{ loading ? t('patient.messages.update_success') : t('patient.actions.save') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import { useI18n } from 'vue-i18n';
import { usePatientForm } from '@/presentation/composables/patient/usePatientForm';
import type { Patient } from '@/core/entities/Patient';

const props = defineProps({
  workspaceId: { type: String, required: true },
  patient: { type: Object as PropType<Patient>, required: true },
});

const emit = defineEmits(['close', 'updated']);
const { t } = useI18n();

const {
  form,
  loading,
  subtypeOptions,
  loadingSubtypes,
  isScoreEnabled,
  isClassificationEnabled,
  handleSubmit,
} = usePatientForm(
  {
    workspaceId: props.workspaceId,
    patientToEdit: props.patient,
  },
  (event) => {
    if (event === 'saved') emit('updated');
    if (event === 'close') emit('close');
  }
);
</script>
