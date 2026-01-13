<template>
  <div
    class="bg-white/90 backdrop-blur-md border-b border-gray-200 px-4 h-14 shadow-sm z-30 relative flex items-center justify-between transition-all duration-300"
  >
    <div v-if="patient" class="flex items-center gap-2 flex-1 px-4">
      <div class="relative group">
        <button
          @click="togglePopover('demographics')"
          class="flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-xs font-medium"
          :class="
            activePopover === 'demographics'
              ? 'bg-indigo-50 border-indigo-200 text-indigo-700 ring-2 ring-indigo-100'
              : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
          "
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            class="w-3.5 h-3.5 opacity-70"
          >
            <path
              d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z"
            />
          </svg>
          <span v-if="age || gender">
            {{ age ? `${age} Yaş` : '' }}{{ age && gender ? ', ' : '' }}
            {{ gender === 'Male' ? 'Erkek' : gender === 'Female' ? 'Kadın' : gender }}
          </span>
          <span v-else class="italic opacity-50">Demografi Ekle</span>
        </button>

        <div
          v-if="activePopover === 'demographics'"
          class="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 p-4 z-50 animate-fade-in origin-top-left"
        >
          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-[11px] font-medium text-gray-600">Yaş</label>
              <input type="number" v-model.number="age" class="form-input-sm" placeholder="-" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[11px] font-medium text-gray-600">Cinsiyet</label>
              <select v-model="gender" class="form-select-sm">
                <option value="" disabled>-</option>
                <option value="Male">Erkek</option>
                <option value="Female">Kadın</option>
                <option value="Other">Diğer</option>
              </select>
            </div>
          </div>
          <div class="flex flex-col gap-1 mt-3">
            <label class="text-[11px] font-medium text-gray-600">Irk / Etnik Köken</label>
            <input type="text" v-model="race" class="form-input-sm" placeholder="Opsiyonel..." />
          </div>
          <div class="pt-2 border-t border-gray-50 flex justify-end mt-2">
            <button
              @click="activePopover = null"
              class="text-xs text-indigo-600 font-semibold hover:text-indigo-800"
            >
              Tamam
            </button>
          </div>
        </div>
      </div>

      <div class="relative group">
        <button
          @click="togglePopover('global_tags')"
          class="flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-xs font-medium"
          :class="
            activePopover === 'global_tags'
              ? 'bg-indigo-50 border-indigo-200 text-indigo-700 ring-2 ring-indigo-100'
              : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
          "
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            class="w-3.5 h-3.5 opacity-70"
          >
            <path
              fill-rule="evenodd"
              d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm.75-10.25v2.5h2.5a.75.75 0 0 1 0 1.5h-2.5v2.5a.75.75 0 0 1-1.5 0v-2.5h-2.5a.75.75 0 0 1 0-1.5h2.5v-2.5a.75.75 0 0 1 1.5 0Z"
              clip-rule="evenodd"
            />
          </svg>

          <span v-if="hasFilledMetadata">
            {{ getFirstFilledMetadataSummary() }}
          </span>
          <span v-else class="italic opacity-50">Global Etiketler</span>
        </button>

        <div
          v-if="activePopover === 'global_tags'"
          class="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 p-4 z-50 animate-fade-in origin-top-left max-h-[400px] overflow-y-auto custom-scrollbar"
        >
          <div class="flex flex-col gap-3">
            <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Görüntü Global Etiketleri
            </h3>

            <div
              v-if="dynamicFields.length === 0"
              class="text-xs text-gray-500 py-3 text-center bg-gray-50 rounded"
            >
              <span v-if="typeIds.length === 0"
                >Bu çalışma alanına ait global etiket tanımlanmamış.</span
              >
              <span v-else>Etiketler yükleniyor...</span>
            </div>

            <div
              v-else
              v-for="field in dynamicFields"
              :key="field.name"
              class="flex flex-col gap-1"
            >
              <label class="text-[11px] font-medium text-gray-600">
                {{ field.name }}
                <span v-if="field.required" class="text-red-400">*</span>
              </label>

              <input
                v-if="field.type === 'TEXT'"
                type="text"
                v-model="localMetadata[field.name]"
                class="form-input-sm"
              />
              <input
                v-else-if="field.type === 'NUMBER'"
                type="number"
                v-model.number="localMetadata[field.name]"
                class="form-input-sm"
              />
              <select
                v-else-if="['SELECT', 'MULTI_SELECT'].includes(field.type)"
                v-model="localMetadata[field.name]"
                class="form-select-sm"
              >
                <option :value="undefined">Seçiniz</option>
                <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
              </select>
              <div v-else-if="field.type === 'BOOLEAN'" class="flex items-center gap-2 mt-1">
                <button
                  @click="localMetadata[field.name] = !localMetadata[field.name]"
                  class="px-2 py-1 rounded text-xs border transition-colors flex items-center gap-1.5"
                  :class="
                    localMetadata[field.name]
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                      : 'bg-gray-50 border-gray-200 text-gray-500'
                  "
                >
                  {{ localMetadata[field.name] ? 'EVET' : 'HAYIR' }}
                </button>
              </div>
            </div>

            <div class="pt-2 border-t border-gray-50 flex justify-end">
              <button
                @click="activePopover = null"
                class="text-xs text-indigo-600 font-semibold hover:text-indigo-800"
              >
                Tamam
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="patient" class="flex items-center gap-2 flex-shrink-0">
      <button
        @click="isHistoryModalOpen = true"
        class="h-9 w-9 rounded-full flex items-center justify-center transition-all hover:bg-gray-100"
        :class="history ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400'"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="w-5 h-5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
          />
        </svg>
      </button>
      <div class="w-px h-6 bg-gray-200 mx-1"></div>
      <button
        @click="handleSaveAll"
        :disabled="isLoading"
        class="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg font-semibold text-xs shadow-md hover:bg-black transition-all"
      >
        <span v-if="isLoading">Kaydediliyor...</span>
        <span v-else>Kaydet</span>
      </button>
    </div>
    <div class="absolute top-4 right-4 z-20 flex flex-col gap-3 w-64">
      <div class="bg-white/90 backdrop-blur rounded-lg shadow-lg p-1.5 flex gap-2 justify-center">
        <button
          @click="startDrawing"
          class="p-2 rounded hover:bg-indigo-50 text-gray-700 hover:text-indigo-600 transition-colors group relative"
          title="Çizim Yap (Poligon)"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="size-6"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42"
            />
          </svg>
        </button>

        <button
          @click="stopDrawing"
          class="p-2 rounded hover:bg-indigo-50 text-gray-700 hover:text-indigo-600 transition-colors"
          title="Seç / Düzenle"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="w-6 h-6"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672ZM12 2.25V4.5m5.834.166-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243-1.59-1.59"
            />
          </svg>
        </button>
      </div>
    </div>

    <div v-if="activePopover" class="fixed inset-0 z-40" @click="activePopover = null"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, type PropType, toRef, computed, reactive, watch } from 'vue';
import type { Patient } from '@/core/entities/Patient';
import type { Image } from '@/core/entities/Image';
import type { AnnotationType } from '@/core/entities/AnnotationType';
import type { TagDefinition } from '@/core/types/tags';
import { usePatientEditor } from '@/presentation/composables/annotator/usePatientEditor';
import { useAnnotationStore } from '@/stores/annotation';
import { useAnnotationTypeStore } from '@/stores/annotation_type';
import { useWorkspaceStore } from '@/stores/workspace';
import { usePatientStore } from '@/stores/patient';
import { useToast } from 'vue-toastification';

const props = defineProps({
  patient: { type: Object as PropType<Patient | null>, default: null },
  image: { type: Object as PropType<Image | null>, default: null },
});

const annotationStore = useAnnotationStore();
const annotationTypeStore = useAnnotationTypeStore();
const workspaceStore = useWorkspaceStore();
const patientStore = usePatientStore();
const toast = useToast();

const activePopover = ref<string | null>(null);

const { loading: patientLoading, age, gender, history } = usePatientEditor(toRef(props, 'patient'));
const race = ref('');
const localMetadata = reactive<Record<string, any>>({});

watch(
  () => props.patient,
  (newPatient) => {
    Object.keys(localMetadata).forEach((k) => delete localMetadata[k]);
    if (newPatient) {
      race.value = newPatient.race || newPatient.metadata?.race || '';
      if (newPatient.metadata) Object.assign(localMetadata, newPatient.metadata);
    }
  },
  { immediate: true, deep: true }
);

const typeIds = computed<string[]>(() => {
  const ws = workspaceStore.currentWorkspace;
  if (!ws) return [];
  const ids = ws.annotationTypeIds || [];
  return ids;
});

const activeAnnotationTypes = computed<AnnotationType[]>(() => {
  if (typeIds.value.length === 0) return [];

  return typeIds.value
    .map((id: string) => annotationTypeStore.getAnnotationTypeById(id))
    .filter((type): type is AnnotationType => !!type);
});

watch(
  typeIds,
  async (ids: string[]) => {
    if (ids.length > 0) {
      await Promise.all(
        ids.map(async (id: string) => {
          if (id && !annotationTypeStore.getAnnotationTypeById(id)) {
            try {
              await annotationTypeStore.fetchAnnotationTypeById(id);
            } catch (e) {
              console.error('Anotasyon tipi yüklenemedi:', id, e);
            }
          }
        })
      );
    }
  },
  { immediate: true, deep: true }
);

const dynamicFields = computed<TagDefinition[]>(() => {
  const allFields: TagDefinition[] = [];
  const seenNames = new Set<string>();

  activeAnnotationTypes.value.forEach((type) => {
    if (type.global) {
      if (!seenNames.has(type.name)) {
        seenNames.add(type.name);
        allFields.push({
          name: type.name,
          type: type.type,
          options: type.options || [],
          required: type.required || false,
        });
      }
    }
  });

  return allFields;
});

const hasFilledMetadata = computed(() => {
  return dynamicFields.value.some((f) => {
    const val = localMetadata[f.name];
    return val !== undefined && val !== null && val !== '';
  });
});

function getFirstFilledMetadataSummary() {
  const filledField = dynamicFields.value.find((f) => {
    const val = localMetadata[f.name];
    return val !== undefined && val !== null && val !== '';
  });

  console.log('Filled field for summary:', filledField);

  if (!filledField) return '';
  const val = localMetadata[filledField.name];
  if (filledField.type === 'BOOLEAN') return `${filledField.name}: ${val ? 'Evet' : 'Hayır'}`;
  return `${filledField.name}: ${val}`;
}

const isHistoryModalOpen = ref(false);
const localSaving = ref(false);
const isLoading = computed(
  () => patientLoading.value || localSaving.value || annotationStore.actionLoading
);

function togglePopover(name: string) {
  activePopover.value = activePopover.value === name ? null : name;
}

async function handleSaveAll() {
  if (!props.patient || isLoading.value) return;

  localSaving.value = true;
  try {
    const patientPayload = {
      age: age.value,
      gender: gender.value,
      history: history.value,
      race: race.value,
    };

    await patientStore.updatePatient(props.patient.id, patientPayload);

    const metadataPromises = Object.entries(localMetadata).map(async ([tagName, value]) => {
      if (value === undefined || value === null || value === '') return;

      const typeDef = activeAnnotationTypes.value.find((t) => t.name === tagName);
      if (!typeDef) return;
      const annotationPayload = {
        tag: {
          tag_type: typeDef.type,
          tag_name: tagName,
          value: value,
          color: typeDef.color || '#000000',
          global: true,
        },
        polygon: undefined,
      };

      if (props.image?.id) {
        return annotationStore.createAnnotation(props.image.id, annotationPayload);
      }
    });

    await Promise.all(metadataPromises);

    if (annotationStore.hasUnsavedChanges) {
      await annotationStore.saveAllPendingAnnotations();
    }

    activePopover.value = null;
    toast.success('Tüm veriler başarıyla kaydedildi.');
  } catch (error) {
    console.error('Kaydetme hatası:', error);
    toast.error('Kaydetme sırasında bir hata oluştu.');
  } finally {
    localSaving.value = false;
  }
}

function getInitials(name: string) {
  if (!name) return '';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #e5e7eb;
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: #d1d5db;
}
.form-input-sm {
  @apply w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all;
}
.form-select-sm {
  @apply w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-gray-700 bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all cursor-pointer;
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fade-in {
  animation: fadeIn 0.15s ease-out forwards;
}
</style>
