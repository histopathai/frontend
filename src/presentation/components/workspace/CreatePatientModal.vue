<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    @click.self="$emit('close')"
  >
    <div class="card w-full max-w-2xl shadow-lg rounded-xl bg-white">
      <form @submit.prevent="handleSubmit">
        <div class="card-header px-6 py-4 border-b border-gray-200">
          <h3 class="text-xl font-semibold text-gray-900">
            {{ t('patient.form.create_title') }}
          </h3>
        </div>

        <div class="card-body p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label for="p-name" class="form-label">{{ t('patient.form.name') }} (*)</label>
            <input
              id="p-name"
              type="text"
              v-model="form.name"
              class="form-input"
              required
              :placeholder="t('patient.form.name_placeholder')"
            />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label for="p-age" class="form-label">{{ t('patient.form.age') }}</label>
              <input
                id="p-age"
                type="number"
                v-model.number="form.age"
                class="form-input"
                :placeholder="t('patient.form.age_placeholder')"
              />
            </div>
            <div>
              <label for="p-gender" class="form-label">{{ t('patient.form.gender') }}</label>
              <select id="p-gender" v-model="form.gender" class="form-input">
                <option value="">{{ t('patient.form.gender_placeholder') }}</option>
                <option value="Male">{{ t('patient.genders.male') }}</option>
                <option value="Female">{{ t('patient.genders.female') }}</option>
                <option value="Other">{{ t('patient.genders.other') }}</option>
              </select>
            </div>
            <div>
              <label for="p-race" class="form-label">{{ t('patient.form.race') }}</label>
              <input
                id="p-race"
                type="text"
                v-model="form.race"
                class="form-input"
                :placeholder="t('patient.form.race_placeholder')"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label for="p-disease" class="form-label">{{ t('patient.form.disease') }}</label>
              <input
                id="p-disease"
                type="text"
                v-model="form.disease"
                class="form-input"
                :placeholder="t('patient.form.disease_placeholder')"
              />
            </div>

            <div>
              <label for="p-subtype" class="form-label">{{ t('patient.form.subtype') }}</label>
              <select
                v-if="subtypeOptions.length > 0"
                id="p-subtype"
                v-model="form.subtype"
                class="form-input"
              >
                <option value="">{{ t('patient.form.subtype_placeholder') }}</option>
                <option v-for="opt in subtypeOptions" :key="opt" :value="opt">
                  {{ opt }}
                </option>
              </select>
              <input
                v-else
                id="p-subtype"
                type="text"
                v-model="form.subtype"
                :placeholder="loadingSubtypes ? '...' : t('patient.form.subtype_placeholder')"
                class="form-input"
              />
            </div>

            <div>
              <label for="p-grade" class="form-label">{{ t('patient.form.grade') }}</label>
              <input
                id="p-grade"
                type="number"
                v-model.number="form.grade"
                class="form-input"
                :placeholder="t('patient.form.grade_placeholder')"
              />
            </div>
          </div>

          <div>
            <label for="p-history" class="form-label">{{ t('patient.form.history') }}</label>
            <textarea
              id="p-history"
              v-model="form.history"
              class="form-input"
              rows="3"
              :placeholder="t('patient.form.history_placeholder')"
            ></textarea>
          </div>
        </div>

        <div
          class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 rounded-b-xl"
        >
          <button type="button" @click="$emit('close')" class="btn btn-outline">
            {{ t('patient.actions.cancel') }}
          </button>
          <button type="submit" :disabled="loading" class="btn btn-primary">
            {{ loading ? t('patient.list.loading') : t('patient.actions.create') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { usePatientForm } from '@/presentation/composables/patient/usePatientForm';

const props = defineProps({
  workspaceId: { type: String, required: true },
});

const emit = defineEmits(['close', 'saved']);
const { t } = useI18n();

const { form, loading, subtypeOptions, loadingSubtypes, handleSubmit } = usePatientForm(
  { workspaceId: props.workspaceId },
  emit
);
</script>
