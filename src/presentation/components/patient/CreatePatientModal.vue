<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    @click.self="$emit('close')"
  >
    <div class="card w-full max-w-md shadow-lg rounded-xl bg-white">
      <form @submit.prevent="handleSubmit">
        <div class="card-header px-6 py-4 border-b border-gray-200">
          <h3 class="text-xl font-semibold text-gray-900">
            {{ t('patient.form.create_title') }}
          </h3>
        </div>

        <div class="card-body p-6 space-y-4">
          <div>
            <label for="p-name" class="form-label">{{ t('patient.form.name') }} (*)</label>
            <input
              id="p-name"
              type="text"
              v-model="form.name"
              class="form-input"
              required
              :placeholder="t('patient.form.name_placeholder')"
              autofocus
            />
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

const { form, loading, handleSubmit } = usePatientForm({ workspaceId: props.workspaceId }, emit);
</script>
