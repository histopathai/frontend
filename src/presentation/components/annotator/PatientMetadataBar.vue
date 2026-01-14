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
          class="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-100 p-4 z-50 animate-fade-in origin-top-left"
        >
          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-[11px] font-medium text-gray-600">Yaş</label>
              <input type="number" v-model.number="age" class="form-input-sm" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[11px] font-medium text-gray-600">Cinsiyet</label>
              <select v-model="gender" class="form-select-sm">
                <option value="Male">Erkek</option>
                <option value="Female">Kadın</option>
              </select>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[11px] font-medium text-gray-600">Irk</label>
              <input type="text" v-model="race" class="form-input-sm" placeholder="Örn: Asyalı" />
            </div>
            <div class="flex flex-col gap-1 col-span-2">
              <label class="text-[11px] font-medium text-gray-600">Hasta Öyküsü</label>
              <textarea
                v-model="history"
                class="form-input-sm resize-none"
                rows="3"
                placeholder="Hasta hikayesi..."
              ></textarea>
            </div>
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
          <span>{{
            hasFilledMetadata ? getFirstFilledMetadataSummary() : 'Global Etiketler'
          }}</span>
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
            <div class="pt-2 border-t border-gray-50 flex justify-end mt-2">
              <button
                @click="activePopover = null"
                class="w-full py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg"
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
          Seç
        </button>
      </div>
    </div>

    <div v-if="patient" class="flex items-center gap-2 flex-shrink-0">
      <button
        @click="handleSaveAll"
        :disabled="isLoading || unsavedCount === 0"
        class="flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-xs shadow-md transition-all"
        :class="
          unsavedCount > 0
            ? 'bg-gray-900 text-white hover:bg-black'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        "
      >
        <span>Kaydet</span>
        <span
          v-if="unsavedCount > 0"
          class="bg-indigo-500 text-white px-1.5 py-0.5 rounded text-[10px]"
        >
          {{ unsavedCount }}
        </span>
      </button>
    </div>

    <div v-if="activePopover" class="fixed inset-0 z-40" @click="activePopover = null"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, type PropType, toRef, computed, reactive, watch } from 'vue';
import { useAnnotationStore } from '@/stores/annotation';
import { useAnnotationTypeStore } from '@/stores/annotation_type';
import { useWorkspaceStore } from '@/stores/workspace';
import { usePatientStore } from '@/stores/patient';
import { usePatientEditor } from '@/presentation/composables/annotator/usePatientEditor';
import { useToast } from 'vue-toastification';

const props = defineProps({
  patient: { type: Object as PropType<any>, default: null },
  image: { type: Object as PropType<any>, default: null },
  isDrawingMode: { type: Boolean, default: false },
});

const emit = defineEmits(['startDrawing', 'stopDrawing']);
const annotationStore = useAnnotationStore();
const annotationTypeStore = useAnnotationTypeStore();
const workspaceStore = useWorkspaceStore();
const patientStore = usePatientStore();
const toast = useToast();

const activePopover = ref<string | null>(null);
const localMetadata = reactive<Record<string, any>>({});
const initialMetadata = ref<Record<string, any>>({});

const {
  loading: patientLoading,
  age,
  gender,
  race,
  history,
} = usePatientEditor(toRef(props, 'patient'));

const isLoading = computed(() => patientLoading.value || annotationStore.actionLoading);

// 1. Hasta Metadatasını Yükle
watch(
  () => props.patient,
  (newPatient) => {
    Object.keys(localMetadata).forEach((k) => delete localMetadata[k]);
    Object.keys(initialMetadata.value).forEach((k) => delete initialMetadata.value[k]);

    if (newPatient && newPatient.metadata) {
      Object.assign(localMetadata, newPatient.metadata);
      Object.assign(initialMetadata.value, newPatient.metadata);
    }
  },
  { immediate: true, deep: true }
);

// 2. Aktif Görselin Global Anotasyonlarını Getir
const imageAnnotations = computed(() => {
  if (!props.image?.id) return [];
  return annotationStore.getAnnotationsByImageId(props.image.id);
});

watch(
  imageAnnotations,
  (annotations) => {
    const globalAnns = annotations.filter((a) => a.tag?.global);
    globalAnns.forEach((ann) => {
      if (ann.tag && ann.tag.tag_name) {
        localMetadata[ann.tag.tag_name] = ann.tag.value;
        initialMetadata.value[ann.tag.tag_name] = ann.tag.value;
      }
    });
  },
  { immediate: true, deep: true }
);

// Demografik değişiklikleri kontrol et
const hasDemographicsChanges = computed(() => {
  if (!props.patient) return false;
  return (
    age.value !== (props.patient.age ?? undefined) ||
    gender.value !== (props.patient.gender ?? undefined) ||
    race.value !== (props.patient.race ?? undefined) ||
    history.value !== (props.patient.history ?? undefined)
  );
});

// Bekleyen değişiklikleri say
const unsavedCount = computed(() => {
  // Global etiketlerde değişiklik var mı?
  const changedGlobals = Object.entries(localMetadata).filter(([key, val]) => {
    const initial = initialMetadata.value[key];
    return val !== initial && val !== '' && val !== undefined && val !== null;
  }).length;

  // Pending lokal anotasyonlar
  const pendingLocals = annotationStore.pendingCount;

  // Demografik değişiklikler
  const demographicChange = hasDemographicsChanges.value ? 1 : 0;

  return changedGlobals + pendingLocals + demographicChange;
});

const activeAnnotationTypes = computed(() => {
  const ids = workspaceStore.currentWorkspace?.annotationTypeIds || [];
  return ids
    .map((id) => annotationTypeStore.getAnnotationTypeById(id))
    .filter((t): t is any => !!t);
});

const dynamicFields = computed(() =>
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

const hasFilledMetadata = computed(() => dynamicFields.value.some((f) => localMetadata[f.name]));

const getFirstFilledMetadataSummary = () => {
  const f = dynamicFields.value.find((f) => localMetadata[f.name]);
  return f ? `${f.name}: ${localMetadata[f.name]}` : '';
};

function togglePopover(name: string) {
  activePopover.value = activePopover.value === name ? null : name;
}

async function handleSaveAll() {
  if (!props.patient || isLoading.value || unsavedCount.value === 0) return;

  let errorOccurred = false;

  try {
    // 1. Temel hasta bilgilerini güncelle (Yaş, Cinsiyet, Irk, Öykü)
    if (hasDemographicsChanges.value) {
      try {
        await patientStore.updatePatient(props.patient.id, {
          age: age.value,
          gender: gender.value,
          race: race.value,
          history: history.value,
        });
      } catch (e) {
        console.error('Patient update failed', e);
        errorOccurred = true;
      }
    }

    // 2. Global Etiketleri Anotasyon Olarak Kaydet veya Güncelle
    const changedGlobalEntries = Object.entries(localMetadata).filter(([key, val]) => {
      const initial = initialMetadata.value[key];
      return val !== initial && val !== '' && val !== undefined && val !== null;
    });

    const globalPromises = changedGlobalEntries.map(async ([tagName, value]) => {
      if (!props.image?.id) return true;

      const typeDef = activeAnnotationTypes.value.find((t) => t.name === tagName && t.global);
      if (!typeDef) return true;

      const existingAnn = imageAnnotations.value.find(
        (a) => a.tag?.global && a.tag.tag_name === tagName
      );

      // Value conversion based on type if needed, or send raw
      // String() wrapper kaldırıldı, ham değer gönderiliyor (Backend 500 hatası önlemi için)
      const tagData = {
        tag_type: typeDef.type,
        tag_name: tagName,
        value: value,
        color: typeDef.color || '#4f46e5',
        global: true,
      };

      if (existingAnn) {
        // updateAnnotation returns boolean (true=success, false=fail)
        return await annotationStore.updateAnnotation(existingAnn.id, {
          tag: tagData,
        });
      } else {
        // createAnnotation throws on error, returns object on success
        try {
          await annotationStore.createAnnotation(props.image.id, {
            tag: tagData,
            polygon: undefined,
          });
          return true;
        } catch (e) {
          return false;
        }
      }
    });

    const globalResults = await Promise.all(globalPromises);
    if (globalResults.some((res) => res === false)) {
      errorOccurred = true;
    }

    // Eğer hata yoksa metadata başlangıç değerlerini güncelle
    if (!errorOccurred) {
      Object.assign(initialMetadata.value, localMetadata);
    }

    // 3. Lokal (Çizimli) Bekleyen Anotasyonları Kaydet
    if (annotationStore.pendingCount > 0) {
      const success = await annotationStore.saveAllPendingAnnotations();
      if (!success) errorOccurred = true;
    }

    if (errorOccurred) {
      toast.error('Bazı değişiklikler kaydedilemedi. Lütfen tekrar deneyin.');
    } else {
      toast.success('Tüm değişiklikler başarıyla kaydedildi');
      activePopover.value = null;
    }
  } catch (e) {
    toast.error('Beklenmedik bir hata oluştu');
    console.error(e);
  }
}
</script>

<style scoped>
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
