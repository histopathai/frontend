<template>
  <div
    class="bg-white border-b border-gray-200 px-4 h-16 shadow-[0_2px_4px_rgba(0,0,0,0.02)] z-30 relative flex items-center justify-between gap-4"
  >
    <div class="flex items-center gap-3 min-w-0 flex-1">
      <div
        class="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100 flex-shrink-0 text-indigo-600 shadow-sm"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
            clip-rule="evenodd"
          />
        </svg>
      </div>

      <div v-if="patient" class="flex flex-col min-w-0 relative group/info">
        <div class="flex items-center gap-2">
          <h2 class="text-sm font-bold text-gray-900 truncate leading-none" :title="patient.name">
            {{ patient.name || 'İsimsiz Hasta' }}
          </h2>
          <button
            @click="togglePopover('demographics')"
            class="opacity-0 group-hover/info:opacity-100 p-0.5 text-gray-400 hover:text-indigo-600 transition-all"
            title="Bilgileri Düzenle"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-3.5 w-3.5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"
              />
            </svg>
          </button>
        </div>

        <div class="flex items-center gap-2 text-[11px] text-gray-500 mt-1">
          <span v-if="age || gender" class="flex items-center gap-1.5">
            <span class="font-medium text-gray-700">{{ age ? `${age} Yaş` : '' }}</span>
            <span v-if="age && gender" class="w-0.5 h-2.5 bg-gray-300"></span>
            <span class="font-medium text-gray-700">{{
              gender === 'Male' ? 'Erkek' : gender === 'Female' ? 'Kadın' : gender
            }}</span>
          </span>
          <span v-else class="text-gray-400 italic">Demografi yok</span>

          <span v-if="race" class="flex items-center gap-1 ml-1 pl-2 border-l border-gray-200">
            <span>{{ race }}</span>
          </span>
        </div>
      </div>

      <div v-else class="text-sm text-gray-400 italic">Hasta seçilmedi</div>

      <div
        v-if="activePopover === 'demographics'"
        class="absolute top-14 left-0 mt-1 w-80 bg-white rounded-xl shadow-xl border border-gray-100 p-5 z-50 animate-fade-in origin-top-left"
      >
        <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
          Hasta Bilgileri
        </h3>
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1">
            <label class="text-[10px] font-bold text-gray-500">YAŞ</label>
            <input type="number" v-model.number="age" class="form-input-modern" />
          </div>
          <div class="space-y-1">
            <label class="text-[10px] font-bold text-gray-500">CİNSİYET</label>
            <select v-model="gender" class="form-select-modern">
              <option :value="undefined">Seçiniz</option>
              <option value="Male">Erkek</option>
              <option value="Female">Kadın</option>
            </select>
          </div>
          <div class="space-y-1 col-span-2">
            <label class="text-[10px] font-bold text-gray-500">IRK / KÖKEN</label>
            <input type="text" v-model="race" class="form-input-modern" />
          </div>
          <div class="space-y-1 col-span-2">
            <label class="text-[10px] font-bold text-gray-500">ÖYKÜ</label>
            <textarea v-model="history" class="form-input-modern resize-none" rows="3"></textarea>
          </div>
        </div>
        <div class="mt-4 flex justify-end">
          <button
            @click="activePopover = null"
            class="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-black transition"
          >
            Tamam
          </button>
        </div>
      </div>
    </div>

    <div
      class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center bg-gray-50 rounded-full p-1 border border-gray-200 shadow-sm"
    >
      <button
        @click="$emit('prev')"
        class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white hover:text-indigo-600 text-gray-500 transition-all border border-transparent hover:border-gray-200 hover:shadow-sm"
        title="Önceki"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
            clip-rule="evenodd"
          />
        </svg>
      </button>

      <div class="px-5 flex flex-col items-center justify-center min-w-[90px]">
        <span class="text-sm font-bold text-gray-800 font-mono tracking-tight">
          {{ formatIndex(currentIndex) }} <span class="text-gray-400 mx-0.5">/</span>
          {{ totalCount }}
        </span>
        <span class="text-[9px] text-gray-400 font-bold uppercase tracking-widest scale-90"
          >Görüntü</span
        >
      </div>

      <button
        @click="$emit('next')"
        class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white hover:text-indigo-600 text-gray-500 transition-all border border-transparent hover:border-gray-200 hover:shadow-sm"
        title="Sonraki"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
            clip-rule="evenodd"
          />
        </svg>
      </button>
    </div>

    <div class="flex items-center gap-3 flex-1 justify-end">
      <div class="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200">
        <button
          @click="$emit('stopDrawing')"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all text-xs font-bold"
          :class="
            !isDrawingMode
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          "
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-3.5 w-3.5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M6.672 1.911a1 1 0 10-1.932.518l.259.966a1 1 0 001.932-.518l-.26-.966zM2.429 4.74a1 1 0 10-.517 1.932l.966.259a1 1 0 00.517-1.932l-.966-.26zm8.814-.569a1 1 0 00-1.415-1.414l-.707.707a1 1 0 101.415 1.415l.707-.708zm-7.071 7.072l.707-.707A1 1 0 003.465 9.12l-.708.707a1 1 0 001.415 1.415zm3.2-5.171a1 1 0 00-1.3 1.3l4 10a1 1 0 001.823.075l1.38-2.759 3.018 3.02a1 1 0 001.414-1.415l-3.019-3.02 2.76-1.379a1 1 0 00-.076-1.822l-10-4z"
              clip-rule="evenodd"
            />
          </svg>
          Gezin
        </button>
        <button
          @click="$emit('startDrawing')"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all text-xs font-bold"
          :class="
            isDrawingMode
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          "
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-3.5 w-3.5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"
            />
          </svg>
          Çiz
        </button>
      </div>

      <div class="w-px h-8 bg-gray-200 mx-1"></div>

      <div class="relative">
        <button
          @click="togglePopover('global_tags')"
          class="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-indigo-300 hover:text-indigo-600 transition-all relative text-xs font-bold"
          title="Global Etiketler"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
          <span>Etiketler</span>

          <span v-if="hasFilledMetadata" class="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span
              class="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"
            ></span>
            <span
              class="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500 border border-white"
            ></span>
          </span>
        </button>

        <div
          v-if="activePopover === 'global_tags'"
          class="absolute top-12 right-0 mt-1 w-80 bg-white rounded-xl shadow-xl border border-gray-100 p-4 z-50 animate-fade-in origin-top-right custom-scrollbar max-h-[500px] overflow-y-auto"
        >
          <div class="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
            <h3 class="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Global Etiketler
            </h3>
          </div>
          <div
            v-if="dynamicFields.length === 0"
            class="text-xs text-gray-400 italic text-center py-4"
          >
            Tanımlı etiket yok.
          </div>
          <div v-else class="space-y-4">
            <div
              v-for="field in dynamicFields"
              :key="field.id"
              class="flex flex-col gap-1 p-3 rounded-lg border border-gray-50 bg-gray-50/50 hover:bg-white hover:border-gray-200 transition-colors"
            >
              <div class="flex items-center justify-between">
                <label class="text-[10px] font-bold text-gray-700 uppercase">{{
                  field.name
                }}</label>
                <span
                  v-if="field.required"
                  class="text-[9px] text-red-500 font-medium bg-red-50 px-1 rounded"
                  >ZORUNLU</span
                >
              </div>

              <input
                v-if="checkType(field.type, 'text')"
                type="text"
                v-model="localMetadata[field.name]"
                class="form-input-modern"
                placeholder="Metin giriniz..."
              />

              <div v-else-if="checkType(field.type, 'number')">
                <input
                  type="number"
                  v-model.number="localMetadata[field.name]"
                  :min="field.min"
                  :max="field.max"
                  class="form-input-modern"
                  placeholder="Sayısal değer..."
                />
                <p
                  v-if="field.min !== undefined || field.max !== undefined"
                  class="text-[9px] text-gray-400 mt-0.5"
                >
                  Aralık: {{ field.min ?? '-∞' }} - {{ field.max ?? '+∞' }}
                </p>
              </div>

              <div v-else-if="checkType(field.type, ['select', 'multi_select', 'multiselect'])">
                <select
                  v-model="localMetadata[field.name]"
                  class="form-select-modern"
                  :multiple="checkType(field.type, ['multi_select', 'multiselect'])"
                  :size="checkType(field.type, ['multi_select', 'multiselect']) ? 4 : 1"
                >
                  <option :value="undefined" disabled>Seçiniz</option>
                  <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
                </select>
                <p
                  v-if="checkType(field.type, ['multi_select', 'multiselect'])"
                  class="text-[9px] text-gray-400 mt-1 italic"
                >
                  Çoklu seçim için CTRL tuşunu basılı tutun.
                </p>
              </div>

              <div v-else-if="checkType(field.type, 'boolean')" class="flex gap-2 pt-1">
                <button
                  @click="localMetadata[field.name] = true"
                  class="flex-1 py-1.5 rounded-md text-xs font-semibold border transition-all"
                  :class="
                    localMetadata[field.name] === true
                      ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  "
                >
                  EVET
                </button>
                <button
                  @click="localMetadata[field.name] = false"
                  class="flex-1 py-1.5 rounded-md text-xs font-semibold border transition-all"
                  :class="
                    localMetadata[field.name] === false
                      ? 'bg-rose-500 text-white border-rose-600 shadow-sm'
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  "
                >
                  HAYIR
                </button>
              </div>

              <input
                v-else
                type="text"
                v-model="localMetadata[field.name]"
                class="form-input-modern"
                disabled
                :placeholder="'Desteklenmeyen tip: ' + field.type"
              />
            </div>
          </div>
          <div class="mt-4 flex justify-end">
            <button
              @click="activePopover = null"
              class="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-black transition"
            >
              Tamam
            </button>
          </div>
        </div>
      </div>

      <button
        @click="handleSaveAll"
        :disabled="isLoading || unsavedCount === 0"
        class="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm shadow-sm border border-transparent transition-all transform active:scale-95"
        :class="
          unsavedCount > 0
            ? 'bg-gray-900 text-white hover:bg-black shadow-md'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
        "
      >
        <span>Kaydet</span>
        <span
          v-if="unsavedCount > 0"
          class="bg-indigo-500 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[1.2rem] text-center font-mono"
        >
          {{ unsavedCount }}
        </span>
      </button>
    </div>

    <div
      v-if="activePopover"
      class="fixed inset-0 z-40 bg-black/5"
      @click="activePopover = null"
    ></div>
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
import { TagType } from '@/core/value-objects/TagType'; // TagType Importu

const props = defineProps({
  patient: { type: Object as PropType<any>, default: null },
  image: { type: Object as PropType<any>, default: null },
  isDrawingMode: { type: Boolean, default: false },
  currentIndex: { type: Number, default: 0 },
  totalCount: { type: Number, default: 0 },
});

const emit = defineEmits(['startDrawing', 'stopDrawing', 'prev', 'next']);

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

function formatIndex(idx: number) {
  if (idx < 0) return 0;
  return idx + 1;
}

// Tip Kontrol Helper'ı (LocalAnnotationModal ile aynı mantık)
function checkType(actualType: string, targetType: string | string[]): boolean {
  if (!actualType) return false;
  const normalizedActual = actualType.toString().toLowerCase();

  if (Array.isArray(targetType)) {
    return targetType.some(
      (t) => normalizedActual === t.toLowerCase() || normalizedActual.includes(t.toLowerCase())
    );
  }
  return (
    normalizedActual === targetType.toLowerCase() ||
    normalizedActual.includes(targetType.toLowerCase())
  );
}

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

const imageAnnotations = computed(() =>
  props.image?.id ? annotationStore.getAnnotationsByImageId(props.image.id) : []
);

watch(
  imageAnnotations,
  (annotations) => {
    annotations.forEach((ann) => {
      const type = annotationTypeStore.getAnnotationTypeById(ann.annotationTypeId);
      if (type && type.global) {
        localMetadata[type.name] = ann.value;
        initialMetadata.value[type.name] = ann.value;
      }
    });
  },
  { immediate: true, deep: true }
);

const hasDemographicsChanges = computed(() => {
  if (!props.patient) return false;
  return (
    age.value !== (props.patient.age ?? undefined) ||
    gender.value !== (props.patient.gender ?? undefined) ||
    race.value !== (props.patient.race ?? undefined) ||
    history.value !== (props.patient.history ?? undefined)
  );
});

const unsavedCount = computed(() => {
  const changedGlobals = Object.entries(localMetadata).filter(([key, val]) => {
    const initial = initialMetadata.value[key];
    // Basit eşitlik kontrolü yerine deep check gerekebilir ama şimdilik primitive değerler için yeterli
    return val !== initial && val !== '' && val !== undefined && val !== null;
  }).length;
  const pendingLocals = annotationStore.pendingCount;
  const demographicChange = hasDemographicsChanges.value ? 1 : 0;
  return changedGlobals + pendingLocals + demographicChange;
});

const activeAnnotationTypes = computed(() => {
  if (!workspaceStore.currentWorkspace) return [];
  const ids = workspaceStore.currentWorkspace.annotationTypeIds || [];
  return ids
    .map((id) => annotationTypeStore.getAnnotationTypeById(id))
    .filter((t): t is any => !!t);
});

const dynamicFields = computed(() =>
  activeAnnotationTypes.value
    .filter((t) => t.global)
    .map((t) => ({
      id: t.id, // ID eklendi
      name: t.name,
      type: t.type,
      options: t.options || [],
      required: t.required || false,
      global: true,
      min: t.min, // Min/Max eklendi
      max: t.max,
    }))
);

watch(
  () => props.image,
  async (newImage) => {
    if (newImage && newImage.parent && newImage.parent.id) {
      let targetWorkspaceId = (newImage as any).wsId;

      // Fallback only if parent type is explicitly workspace
      if (!targetWorkspaceId && newImage.parent.type === 'workspace') {
        targetWorkspaceId = newImage.parent.id;
      }

      if (targetWorkspaceId) {
        if (
          !workspaceStore.currentWorkspace ||
          workspaceStore.currentWorkspace.id !== targetWorkspaceId
        ) {
          try {
            await workspaceStore.fetchWorkspaceById(targetWorkspaceId, { showToast: false });
          } catch (e) {
            console.error('Workspace fetch failed:', e);
          }
        }
      }
    }
  },
  { immediate: true }
);

const hasFilledMetadata = computed(() =>
  dynamicFields.value.some((f) => {
    const val = localMetadata[f.name];
    return val !== null && val !== undefined && val !== '';
  })
);

function togglePopover(name: string) {
  activePopover.value = activePopover.value === name ? null : name;
}

async function handleSaveAll() {
  if (!props.patient || isLoading.value || unsavedCount.value === 0) return;
  let errorOccurred = false;

  try {
    // 1. Demografi Güncelleme
    if (hasDemographicsChanges.value) {
      try {
        const payload: any = {
          creator_id: props.patient.creatorId,
          age: typeof age.value === 'number' ? age.value : undefined,
          gender: gender.value || undefined,
          race: race.value || undefined,
          history: history.value || undefined,
        };
        await patientStore.updatePatient(props.patient.id, payload);
      } catch (e) {
        errorOccurred = true;
      }
    }

    // 2. Global Etiketler Güncelleme
    const changedGlobalEntries = Object.entries(localMetadata).filter(([key, val]) => {
      const initial = initialMetadata.value[key];
      return val !== initial && val !== '' && val !== undefined && val !== null;
    });

    const globalPromises = changedGlobalEntries.map(async ([tagName, value]) => {
      if (!props.image?.id) return true;
      const typeDef = activeAnnotationTypes.value.find((t) => t.name === tagName && t.global);
      if (!typeDef) return true;

      const existingAnn = imageAnnotations.value.find((a) => a.annotationTypeId === typeDef.id);

      const tagData = {
        tag_type: typeDef.type,
        name: tagName,
        value: value,
        color: typeDef.color || '#4f46e5',
        is_global: true,
        // Backend için create request'e uygun ek alanlar
        annotationTypeId: typeDef.id,
        imageId: props.image.id,
        geometry: [], // Global olduğu için boş geometry
        tags: [],
        text: `${tagName}: ${value}`,
      };

      if (existingAnn) {
        // Update
        return await annotationStore.updateAnnotation(existingAnn.id, {
          ...tagData,
          // update request body yapısına göre düzenlenmeli
          value: value,
        } as any);
      } else {
        // Create
        try {
          // Use wsId or fallback to parent ID if workspace type
          const safeWsId =
            (props.image as any).wsId ||
            (props.image.parent?.type === 'workspace' ? props.image.parent.id : undefined);
          if (!safeWsId) {
            console.error('Cannot create global annotation: Missing Workspace ID');
            return false;
          }

          await annotationStore.createAnnotation(props.image.id, {
            ...tagData,
            ws_id: safeWsId,
          } as any);
          return true;
        } catch (e) {
          console.error('Global annotation creation failed', e);
          return false;
        }
      }
    });

    const globalResults = await Promise.all(globalPromises);
    if (globalResults.some((res) => res === false)) errorOccurred = true;

    // 3. Local (Pending) Annotations Save
    if (annotationStore.pendingCount > 0) {
      const success = await annotationStore.saveAllPendingAnnotations();
      if (!success) errorOccurred = true;
    }

    if (errorOccurred) {
      toast.error('Bazı veriler kaydedilemedi.');
    } else {
      toast.success('Tüm değişiklikler kaydedildi');
      // Başarılı kayıttan sonra referans değerleri güncelle
      Object.assign(initialMetadata.value, JSON.parse(JSON.stringify(localMetadata)));
      activePopover.value = null;
    }
  } catch (e) {
    toast.error('Beklenmeyen bir hata oluştu');
    console.error(e);
  }
}
</script>

<style scoped>
.form-input-modern {
  @apply w-full border border-gray-200 bg-white rounded-lg px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-100 focus:bg-white focus:border-indigo-300 transition-all font-medium text-gray-700 shadow-sm;
}
.form-select-modern {
  @apply w-full border border-gray-200 bg-white rounded-lg px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-100 focus:bg-white focus:border-indigo-300 transition-all font-medium text-gray-700 shadow-sm cursor-pointer;
}
/* Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #e5e7eb;
  border-radius: 10px;
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(4px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
.animate-fade-in {
  animation: fadeIn 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>
