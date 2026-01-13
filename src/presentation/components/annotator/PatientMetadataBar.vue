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
          <span v-else class="italic opacity-50">Demografi</span>
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
          <span v-if="hasFilledMetadata">{{ getFirstFilledMetadataSummary() }}</span>
          <span v-else class="italic opacity-50">Global Etiketler</span>
        </button>

        <div
          v-if="activePopover === 'global_tags'"
          class="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 p-4 z-50 animate-fade-in origin-top-left max-h-[400px] overflow-y-auto custom-scrollbar"
        >
          <div class="flex flex-col gap-3">
            <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Global Etiketler
            </h3>
            <div
              v-if="dynamicFields.length === 0"
              class="text-xs text-gray-500 py-3 text-center bg-gray-50 rounded"
            >
              <span>Tanımlı global etiket yok.</span>
            </div>
            <div
              v-else
              v-for="field in dynamicFields"
              :key="field.name"
              class="flex flex-col gap-1"
            >
              <label class="text-[11px] font-medium text-gray-600">{{ field.name }}</label>
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

      <div class="w-px h-6 bg-gray-200 mx-2"></div>

      <div class="flex items-center bg-gray-100 p-1 rounded-full border border-gray-200 gap-1">
        <button
          @click="$emit('startDrawing')"
          class="flex items-center gap-1.5 px-3 py-1 rounded-full transition-all text-[11px] font-bold"
          :class="
            isDrawingMode
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          "
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2.5"
            stroke="currentColor"
            class="w-3.5 h-3.5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42"
            />
          </svg>
          Çizim
        </button>
        <button
          @click="$emit('stopDrawing')"
          class="flex items-center gap-1.5 px-3 py-1 rounded-full transition-all text-[11px] font-bold"
          :class="
            !isDrawingMode
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          "
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2.5"
            stroke="currentColor"
            class="w-3.5 h-3.5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672ZM12 2.25V4.5m5.834.166-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243-1.59-1.59"
            />
          </svg>
          Seç
        </button>
      </div>
    </div>

    <div v-if="patient" class="flex items-center gap-2 flex-shrink-0">
      <button
        @click="handleSaveAll"
        :disabled="isLoading"
        class="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg font-semibold text-xs shadow-md hover:bg-black transition-all"
      >
        <span v-if="isLoading">...</span>
        <span v-else>Kaydet</span>
      </button>
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
  isDrawingMode: { type: Boolean, default: false },
});

const emit = defineEmits(['startDrawing', 'stopDrawing']);

const annotationStore = useAnnotationStore();
const annotationTypeStore = useAnnotationTypeStore();
const workspaceStore = useWorkspaceStore();
const patientStore = usePatientStore();
const toast = useToast();

const activePopover = ref<string | null>(null);
const race = ref('');
const localMetadata = reactive<Record<string, any>>({});

const { loading: patientLoading, age, gender, history } = usePatientEditor(toRef(props, 'patient'));

const isLoading = computed(() => patientLoading.value || annotationStore.actionLoading);

watch(
  () => props.patient,
  (newPatient) => {
    Object.keys(localMetadata).forEach((k) => delete localMetadata[k]);
    if (newPatient) {
      race.value = newPatient.race || '';
      if (newPatient.metadata) Object.assign(localMetadata, newPatient.metadata);
    }
  },
  { immediate: true, deep: true }
);

const activeAnnotationTypes = computed(() => {
  const ids = workspaceStore.currentWorkspace?.annotationTypeIds || [];
  return ids
    .map((id) => annotationTypeStore.getAnnotationTypeById(id))
    .filter((t): t is AnnotationType => !!t);
});

const dynamicFields = computed<TagDefinition[]>(() =>
  activeAnnotationTypes.value
    .filter((t) => t.global)
    .map((t) => ({
      name: t.name,
      type: t.type,
      options: t.options || [],
      required: t.required || false,
      global: true,
    }))
);

const hasFilledMetadata = computed(() =>
  dynamicFields.value.some(
    (f) => localMetadata[f.name] !== undefined && localMetadata[f.name] !== ''
  )
);

const getFirstFilledMetadataSummary = () => {
  const f = dynamicFields.value.find(
    (f) => localMetadata[f.name] !== undefined && localMetadata[f.name] !== ''
  );
  return f ? `${f.name}: ${localMetadata[f.name]}` : '';
};

function togglePopover(name: string) {
  activePopover.value = activePopover.value === name ? null : name;
}

async function handleSaveAll() {
  if (!props.patient || isLoading.value) return;

  try {
    await patientStore.updatePatient(props.patient.id, {
      age: age.value,
      gender: gender.value,
      history: history.value,
      race: race.value,
    });

    const globalPromises = Object.entries(localMetadata).map(async ([tagName, value]) => {
      if (value === undefined || value === null || value === '') return;

      const typeDef = activeAnnotationTypes.value.find(
        (t) => t.name === tagName && t.global === true
      );

      if (typeDef && props.image?.id) {
        const annotationPayload = {
          tag: {
            tag_type: typeDef.type,
            tag_name: tagName,
            value: value,
            color: typeDef.color || '#4f46e5',
            global: true,
          },
          polygon: undefined,
        };

        return annotationStore.createAnnotation(props.image.id, annotationPayload);
      }
    });

    await Promise.all(globalPromises);
    if (annotationStore.hasUnsavedChanges) {
      await annotationStore.saveAllPendingAnnotations();
    }

    activePopover.value = null;
    toast.success('Tüm bilgiler ve etiketler başarıyla kaydedildi.');
  } catch (error) {
    console.error('Kaydetme hatası:', error);
    toast.error('Veriler kaydedilirken bir hata oluştu.');
  }
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #e5e7eb;
  border-radius: 4px;
}
.form-input-sm {
  @apply w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-100;
}
.form-select-sm {
  @apply w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs bg-white focus:ring-2 focus:ring-indigo-100 outline-none;
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
