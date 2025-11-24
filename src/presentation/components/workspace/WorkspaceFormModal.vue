<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    @click.self="$emit('close')"
  >
    <div class="card w-full max-w-2xl shadow-lg rounded-xl bg-white">
      <form @submit.prevent="saveWorkspace">
        <div class="card-header px-6 py-4 border-b border-gray-200">
          <h3 class="text-xl font-semibold text-gray-900">
            {{ isEditMode ? t('workspace.form.edit_title') : t('workspace.form.create_title') }}
          </h3>
        </div>

        <div class="card-body p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="ws-name" class="form-label block text-sm font-medium text-gray-700 mb-1">
                {{ t('workspace.form.name') }} (*)
              </label>
              <input
                id="ws-name"
                type="text"
                v-model="name"
                class="form-input w-full"
                required
                :placeholder="t('workspace.form.name_placeholder')"
              />
            </div>
            <div>
              <label for="ws-org" class="form-label block text-sm font-medium text-gray-700 mb-1">
                {{ t('workspace.form.organization') }} (*)
              </label>
              <input
                id="ws-org"
                type="text"
                v-model="organization"
                class="form-input w-full"
                required
                :placeholder="t('workspace.form.organization_placeholder')"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="ws-organ" class="form-label block text-sm font-medium text-gray-700 mb-1">
                {{ t('workspace.form.organ_type') }} (*)
              </label>
              <select id="ws-organ" v-model="organType" class="form-input w-full" required>
                <option value="" disabled>
                  {{ t('workspace.form.organ_type_placeholder') }}
                </option>
                <option v-for="organ in organOptions" :key="organ.value" :value="organ.value">
                  {{ organ.label }}
                </option>
              </select>
            </div>
            <div>
              <label for="ws-year" class="form-label block text-sm font-medium text-gray-700 mb-1">
                {{ t('workspace.form.release_year') }}
              </label>
              <input
                id="ws-year"
                type="number"
                v-model.number="releaseYear"
                class="form-input w-full"
                :placeholder="t('workspace.form.release_year_placeholder')"
              />
            </div>
          </div>

          <div>
            <label for="ws-desc" class="form-label block text-sm font-medium text-gray-700 mb-1">
              {{ t('workspace.form.description') }} (*)
            </label>
            <textarea
              id="ws-desc"
              v-model="description"
              class="form-input w-full"
              rows="3"
              required
              :placeholder="t('workspace.form.description_placeholder')"
            ></textarea>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                for="ws-license"
                class="form-label block text-sm font-medium text-gray-700 mb-1"
              >
                {{ t('workspace.form.license') }} (*)
              </label>
              <select id="ws-license" v-model="license" class="form-input w-full" required>
                <option value="Özel">Kurum İçi (Özel)</option>
                <option value="CC-BY-4.0">Halka Açık (CC-BY-4.0)</option>
                <option value="CC-BY-NC-4.0">Halka Açık (CC-BY-NC-4.0)</option>
              </select>
            </div>

            <div v-if="isPublicDataset">
              <label for="ws-url" class="form-label block text-sm font-medium text-gray-700 mb-1">
                {{ t('workspace.form.resource_url') }} (*)
              </label>
              <input
                id="ws-url"
                type="url"
                v-model="resourceURL"
                class="form-input w-full"
                placeholder="https://example.com/dataset"
                :required="isPublicDataset"
              />
            </div>
          </div>
        </div>

        <div
          class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 rounded-b-xl"
        >
          <button
            type="button"
            @click="$emit('close')"
            class="btn btn-outline bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            {{ t('workspace.actions.cancel') }}
          </button>
          <button type="submit" :disabled="loading" class="btn btn-primary">
            {{
              loading
                ? t('workspace.messages.loading')
                : isEditMode
                  ? t('workspace.actions.save')
                  : t('workspace.actions.create')
            }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toRef, type PropType } from 'vue';
import { useI18n } from 'vue-i18n';
import type { Workspace } from '@/core/entities/Workspace';
import { useWorkspaceForm } from '@/presentation/composables/workspace/useWorkspaceForm';

const props = defineProps({
  workspaceToEdit: {
    type: Object as PropType<Workspace | null>,
    default: null,
  },
});

const emit = defineEmits(['close']);
const { t } = useI18n();

const {
  name,
  organType,
  organization,
  description,
  license,
  resourceURL,
  releaseYear,
  loading,
  isPublicDataset,
  isEditMode,
  saveWorkspace,
} = useWorkspaceForm(emit, toRef(props, 'workspaceToEdit'));

// Bu liste global bir config veya i18n dosyasından da gelebilir
const organOptions = [
  { value: 'brain', label: 'Brain' },
  { value: 'breast', label: 'Breast' },
  { value: 'lung', label: 'Lung' },
  { value: 'liver', label: 'Liver' },
  { value: 'kidney', label: 'Kidney' },
  { value: 'heart', label: 'Heart' },
  { value: 'stomach', label: 'Stomach' },
  { value: 'prostate', label: 'Prostat' },
  { value: 'skin', label: 'Skin' },
  { value: 'unknown', label: 'Other / Unknown' },
].sort((a, b) => a.label.localeCompare(b.label));
</script>
