<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
    @click.self="$emit('close')"
  >
    <div class="card w-full max-w-lg shadow-2xl rounded-xl bg-white flex flex-col max-h-[90vh]">
      <form @submit.prevent="handleSubmit" class="flex flex-col flex-1 min-h-0">
        <div class="card-header px-6 py-4 border-b border-gray-200 shrink-0">
          <h3 class="text-xl font-bold text-gray-900">
            {{ t('patient.form.create_title') }}
          </h3>
        </div>

        <div class="card-body p-6 space-y-5 overflow-y-auto custom-scrollbar">
          <div>
            <label for="p-name" class="block text-sm font-medium text-gray-700 mb-1">
              {{ t('patient.form.name') }} <span class="text-red-500">*</span>
            </label>
            <input
              id="p-name"
              type="text"
              v-model="form.name"
              class="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border"
              required
              :placeholder="t('patient.form.name_placeholder')"
              autofocus
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="p-age" class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('patient.form.age') }}
              </label>
              <input
                id="p-age"
                type="number"
                v-model="form.age"
                min="0"
                max="150"
                class="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border"
                :placeholder="t('patient.form.age_placeholder')"
              />
            </div>

            <div>
              <label for="p-gender" class="block text-sm font-medium text-gray-700 mb-1">
                {{ t('patient.form.gender') }}
              </label>
              <select
                id="p-gender"
                v-model="form.gender"
                class="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border bg-white"
              >
                <option value="" disabled>{{ t('patient.form.gender_placeholder') }}</option>
                <option value="Male">{{ t('patient.genders.male') }}</option>
                <option value="Female">{{ t('patient.genders.female') }}</option>
                <option value="Other">{{ t('patient.genders.other') }}</option>
              </select>
            </div>
          </div>

          <div>
            <label for="p-race" class="block text-sm font-medium text-gray-700 mb-1">
              {{ t('patient.form.race') }}
            </label>
            <input
              id="p-race"
              type="text"
              v-model="form.race"
              class="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border"
              :placeholder="t('patient.form.race_placeholder')"
            />
          </div>

          <div>
            <label for="p-history" class="block text-sm font-medium text-gray-700 mb-1">
              {{ t('patient.form.history') }}
            </label>
            <textarea
              id="p-history"
              v-model="form.history"
              rows="3"
              class="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border"
              :placeholder="t('patient.form.history_placeholder')"
            ></textarea>
          </div>
        </div>

        <div
          class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 rounded-b-xl shrink-0"
        >
          <button
            type="button"
            @click="$emit('close')"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {{ t('patient.actions.cancel') }}
          </button>
          <button
            type="submit"
            :disabled="loading"
            class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center gap-2"
          >
            <span
              v-if="loading"
              class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"
            ></span>
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

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #e5e7eb;
  border-radius: 20px;
}
</style>
