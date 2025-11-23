<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    @click.self="$emit('close')"
  >
    <div class="card w-full max-w-2xl shadow-lg rounded-xl bg-white">
      <form @submit.prevent="handleSubmit">
        <div class="card-header px-6 py-4 border-b border-gray-200">
          <h3 class="text-xl font-semibold text-gray-900">
            {{
              isEditMode
                ? t('annotation_type.form.edit_title')
                : t('annotation_type.form.create_title')
            }}
          </h3>
          <p class="text-sm text-gray-500 mt-1">
            {{ t('annotation_type.detail.info') }}
          </p>
        </div>

        <div class="card-body p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div v-if="initialLoading" class="text-center py-10">
            <div
              class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"
            ></div>
            <p class="text-gray-500 mt-2">{{ t('annotation_type.list.loading') }}</p>
          </div>

          <div v-else class="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
            <div class="space-y-4">
              <div>
                <label class="form-label text-sm font-medium text-gray-700">
                  {{ t('annotation_type.form.name') }}
                </label>
                <input
                  type="text"
                  v-model="name"
                  class="form-input bg-white"
                  :placeholder="t('annotation_type.form.name_placeholder')"
                  required
                />
              </div>

              <div>
                <label class="form-label text-sm font-medium text-gray-700 mb-1">
                  Mod Seçimi (*)
                </label>
                <div class="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    @click="mode = 'classification'"
                    :class="[
                      'btn btn-sm border transition-all',
                      mode === 'classification'
                        ? 'bg-whiteQH border-indigo-500 text-indigo-700 ring-1 ring-indigo-500 shadow-sm font-medium'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-white',
                    ]"
                  >
                    {{ t('annotation_type.features.classification') }}
                  </button>
                  <button
                    type="button"
                    @click="mode = 'score'"
                    :class="[
                      'btn btn-sm border transition-all',
                      mode === 'score'
                        ? 'bg-white border-indigo-500 text-indigo-700 ring-1 ring-indigo-500 shadow-sm font-medium'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-white',
                    ]"
                  >
                    {{ t('annotation_type.features.scoring') }}
                  </button>
                  <button
                    type="button"
                    @click="mode = 'both'"
                    :class="[
                      'btn btn-sm border transition-all',
                      mode === 'both'
                        ? 'bg-white border-indigo-500 text-indigo-700 ring-1 ring-indigo-500 shadow-sm font-medium'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-white',
                    ]"
                  >
                    Her İkisi
                  </button>
                </div>
              </div>

              <div
                v-if="mode === 'classification' || mode === 'both'"
                class="animate-fade-in p-4 bg-whiteQH rounded-md border border-gray-200 shadow-sm"
              >
                <label class="form-label text-xs font-bold text-gray-700 mb-2 flex justify-between">
                  <span>{{ t('annotation_type.form.class_list') }} (*)</span>
                  <span class="text-gray-400 font-normal">
                    {{ addedClasses.length }} sınıf eklendi
                  </span>
                </label>

                <div class="flex gap-2 mb-3">
                  <input
                    type="text"
                    v-model="newClassInput"
                    @keydown.enter.prevent="addNewClass"
                    class="form-input flex-1 text-sm"
                    :placeholder="t('annotation_type.form.class_list_placeholder')"
                  />
                  <button
                    type="button"
                    @click="addNewClass"
                    class="btn btn-sm bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                    :disabled="!newClassInput.trim()"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      class="w-4 h-4 mr-1"
                    >
                      <path
                        d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z"
                      />
                    </svg>
                    {{ t('annotation_type.form.add_class') }}
                  </button>
                </div>

                <div
                  class="flex flex-wrap gap-2 min-h-[40px] p-2 bg-gray-50 roundedQH border border-gray-100"
                >
                  <div
                    v-if="addedClasses.length === 0"
                    class="w-full text-center text-gray-400 text-xs italic py-2"
                  >
                    Sınıf listesi boş.
                  </div>

                  <span
                    v-for="(tag, index) in addedClasses"
                    :key="index"
                    class="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium bg-white text-indigo-700 border border-indigo-200 shadow-sm transition-all hover:border-indigo-300"
                  >
                    {{ tag }}
                    <button
                      type="button"
                      @click="removeClass(index)"
                      class="ml-1.5 h-4 w-4 rounded-full inline-flex items-center justify-center text-indigo-400 hover:bg-red-100 hover:text-red-600 focus:outline-none transition-colors"
                      :title="t('annotation_type.form.remove_class')"
                    >
                      <svg
                        class="h-3 w-3"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
                        />
                      </svg>
                    </button>
                  </span>
                </div>
              </div>

              <div
                v-if="mode === 'score' || mode === 'both'"
                class="animate-fade-in p-4 bg-white rounded-md border border-gray-200 shadow-sm"
              >
                <label class="form-label text-xs font-bold text-gray-700 mb-2">
                  {{ t('annotation_type.detail.score_config') }} (*)
                </label>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="form-label text-xs text-gray-500">
                      {{ t('annotation_type.form.score_min') }}
                    </label>
                    <input type="number" v-model.number="scoreMin" class="form-input" />
                  </div>
                  <div>
                    <label class="form-label text-xs text-gray-500">
                      {{ t('annotation_type.form.score_max') }}
                    </label>
                    <input type="number" v-model.number="scoreMax" class="form-input" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          class="card-footer px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 rounded-b-xl"
        >
          <button type="button" @click="$emit('close')" class="btn btn-outline">
            {{ t('annotation_type.actions.cancel') }}
          </button>
          <button type="submit" :disabled="actionLoading || initialLoading" class="btn btn-primary">
            {{
              actionLoading
                ? t('annotation_type.list.loading')
                : isEditMode
                  ? t('annotation_type.actions.save')
                  : t('annotation_type.actions.create')
            }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'vue-toastification';
import { useAnnotationTypeStore } from '@/stores/annotation_type';
import { useWorkspaceStore } from '@/stores/workspace';
import type { CreateNewAnnotationTypeRequest } from '@/core/repositories/IAnnotationType';

const props = defineProps({
  workspaceId: { type: String, required: true },
  workspaceName: { type: String, default: '' },
  currentAnnotationTypeId: { type: String, default: undefined },
});

const emit = defineEmits(['close', 'saved']);

const { t } = useI18n();
const toast = useToast();
const store = useAnnotationTypeStore();
const workspaceStore = useWorkspaceStore();

const initialLoading = ref(false);
const actionLoading = computed(() => store.actionLoading);

// Form State
const name = ref(`${props.workspaceName} - Anotasyon Tipi`);
const mode = ref<'classification' | 'score' | 'both'>('classification');
const addedClasses = ref<string[]>([]);
const newClassInput = ref('');
const scoreMin = ref(0);
const scoreMax = ref(5);

const isEditMode = computed(() => !!props.currentAnnotationTypeId);

function addNewClass() {
  const val = newClassInput.value.trim();
  if (!val) return;

  if (addedClasses.value.some((c) => c.toLowerCase() === val.toLowerCase())) {
    toast.warning(t('annotation_type.validation.class_duplicate'));
    return;
  }

  addedClasses.value.push(val);
  newClassInput.value = '';
}

function removeClass(index: number) {
  addedClasses.value.splice(index, 1);
}

onMounted(async () => {
  if (isEditMode.value && props.currentAnnotationTypeId) {
    initialLoading.value = true;
    try {
      const existingType = await store.fetchAnnotationTypeById(props.currentAnnotationTypeId);

      if (existingType) {
        name.value = existingType.name;

        if (existingType.classificationEnabled && existingType.scoreEnabled) {
          mode.value = 'both';
        } else if (existingType.scoreEnabled) {
          mode.value = 'score';
        } else {
          mode.value = 'classification';
        }

        if (existingType.classList) {
          addedClasses.value = [...existingType.classList];
        }

        const range = existingType.scoreRange();
        if (range) {
          scoreMin.value = range.min;
          scoreMax.value = range.max;
        }
      }
    } finally {
      initialLoading.value = false;
    }
  }
});

async function handleSubmit() {
  const isClassification = mode.value === 'classification' || mode.value === 'both';
  const isScore = mode.value === 'score' || mode.value === 'both';

  if (isClassification && addedClasses.value.length === 0) {
    toast.error(t('annotation_type.validation.class_list_required'));
    return;
  }

  const payload: CreateNewAnnotationTypeRequest = {
    creator_id: '', // Backend handles this
    name: name.value,
    description: `Workspace: ${props.workspaceName}`,
    score_enabled: isScore,
    classification_enabled: isClassification,
    score_name: isScore ? 'Skor' : undefined,
    score_min: isScore ? scoreMin.value : undefined,
    score_max: isScore ? scoreMax.value : undefined,
    class_list: isClassification ? addedClasses.value : undefined,
  };

  let success = false;

  if (isEditMode.value && props.currentAnnotationTypeId) {
    success = await store.updateAnnotationType(props.currentAnnotationTypeId, payload);
  } else {
    const newType = await store.createAnnotationType(payload);
    if (newType) {
      // Yeni oluşturulan tipi workspace'e bağla
      await workspaceStore.updateWorkspace(props.workspaceId, {
        annotation_type_id: newType.id,
      });
      success = true;
    }
  }

  if (success) {
    emit('saved');
  }
}
</script>
