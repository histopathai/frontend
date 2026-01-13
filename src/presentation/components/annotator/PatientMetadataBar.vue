<template>
  <div
    class="bg-white/90 backdrop-blur-md border-b border-gray-200 px-4 h-14 shadow-sm z-30 relative flex items-center justify-between transition-all duration-300"
  >
    <div v-if="patient" class="flex items-center gap-3 min-w-[200px] border-r border-gray-100 pr-4">
      <div
        class="h-8 w-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-md shadow-indigo-200"
      >
        {{ getInitials(patient.name) }}
      </div>
      <div class="flex flex-col leading-none justify-center">
        <h2 class="text-sm font-bold text-gray-800 mb-1">{{ patient.name }}</h2>
        <span class="text-[10px] text-gray-500 font-medium truncate max-w-[150px]">
          {{ image?.name || 'Görüntü Yok' }}
        </span>
      </div>
    </div>

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
            {{ age ? `${age} Yaş` : '' }}{{ age && gender ? ', ' : ''
            }}{{ gender === 'Male' ? 'Erkek' : gender === 'Female' ? 'Kadın' : gender }}
          </span>
          <span v-else class="italic opacity-50">Demografi Ekle</span>
        </button>

        <div
          v-if="activePopover === 'demographics'"
          class="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-gray-100 p-4 z-50 animate-fade-in origin-top-left"
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
          @click="togglePopover('clinical')"
          class="flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-xs font-medium"
          :class="
            activePopover === 'clinical'
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
              d="M5.502 2.766a.75.75 0 0 1 .715-.516h3.566a.75.75 0 0 1 .715.516l.497 1.739h-5.99l.497-1.74ZM3.456 5.25h9.088a2.25 2.25 0 0 1 2.162 2.87l-1.396 4.883a2.25 2.25 0 0 1-2.161 1.632H4.85a2.25 2.25 0 0 1-2.16-1.632l-1.397-4.883A2.25 2.25 0 0 1 3.456 5.25ZM2 8.572a.75.75 0 0 1 .75-.752h10.5a.75.75 0 0 1 0 1.504H2.75a.75.75 0 0 1-.75-.752Z"
              clip-rule="evenodd"
            />
          </svg>

          <span v-if="hasFilledMetadata">
            {{ getFirstFilledMetadataSummary() }}
          </span>
          <span v-else class="italic opacity-50">Klinik Bilgiler</span>
        </button>

        <div
          v-if="activePopover === 'clinical'"
          class="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-gray-100 p-4 z-50 animate-fade-in origin-top-left max-h-[400px] overflow-y-auto custom-scrollbar"
        >
          <div class="flex flex-col gap-3">
            <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Klinik Tanı & Bulgular
            </h3>

            <div
              v-if="activeAnnotationTypes.length > 0"
              class="flex flex-wrap gap-2 mb-1 pb-3 border-b border-gray-50"
            >
              <div
                v-for="type in activeAnnotationTypes"
                :key="type.id"
                class="flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] font-bold shadow-sm select-none"
                :style="{
                  backgroundColor: type.color ? `${type.color}10` : '#f9fafb',
                  borderColor: type.color ? `${type.color}40` : '#e5e7eb',
                  color: type.color || '#374151',
                }"
              >
                <span
                  class="w-1.5 h-1.5 rounded-full"
                  :style="{ backgroundColor: type.color || '#9ca3af' }"
                ></span>
                {{ type.name }}
              </div>
            </div>
            <div
              v-if="activeAnnotationTypes.length === 0"
              class="text-xs text-gray-500 py-3 text-center bg-gray-50 rounded"
            >
              <div v-if="typeIds.length === 0" class="text-red-500 font-medium">
                Bu çalışma alanına ait tanımlı bir anotasyon tipi bulunamadı.
              </div>
              <div v-else class="flex flex-col items-center gap-2">
                <svg
                  class="animate-spin h-4 w-4 text-indigo-500"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  ></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>Veriler yükleniyor...</span>
              </div>
            </div>

            <div
              v-else-if="dynamicFields.length === 0"
              class="text-xs text-orange-500 py-2 bg-orange-50 px-2 rounded"
            >
              ⚠ Tanımlı anotasyon tiplerinde ek hasta veri alanı bulunamadı.
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
                :placeholder="field.name + '...'"
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
                <option :value="undefined" disabled>Seçiniz</option>
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
                  <span
                    class="w-1.5 h-1.5 rounded-full"
                    :class="localMetadata[field.name] ? 'bg-indigo-500' : 'bg-gray-400'"
                  ></span>
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
        class="h-9 w-9 rounded-full flex items-center justify-center transition-all relative hover:bg-gray-100"
        :class="history ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' : 'text-gray-400'"
        title="Hasta Geçmişi / Notlar"
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
        <span
          v-if="history"
          class="absolute top-2 right-2.5 w-1.5 h-1.5 bg-indigo-500 rounded-full border border-white"
        ></span>
      </button>
      <div class="w-px h-6 bg-gray-200 mx-1"></div>
      <button
        @click="handleSaveAll"
        :disabled="isLoading"
        class="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg font-semibold text-xs shadow-md hover:bg-black transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span v-if="isLoading">Kaydediliyor...</span>
        <span v-else>Kaydet</span>
        <span
          v-if="!isLoading && annotationStore.unsavedAnnotations.length > 0"
          class="bg-gray-700 text-gray-100 px-1.5 py-0.5 rounded text-[10px] min-w-[18px] text-center"
        >
          {{ annotationStore.unsavedAnnotations.length }}
        </span>
      </button>
    </div>

    <div
      v-if="activePopover"
      class="fixed inset-0 z-40 bg-transparent"
      @click="activePopover = null"
    ></div>

    <Teleport to="body">
      <div
        v-if="isHistoryModalOpen"
        class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
        @click.self="isHistoryModalOpen = false"
      >
        <div
          class="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in mx-4 border border-gray-100"
        >
          <div
            class="px-5 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/80"
          >
            <h3 class="font-bold text-gray-800 text-sm">Hasta Geçmişi / Notlar</h3>
            <button
              @click="isHistoryModalOpen = false"
              class="text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                class="w-5 h-5"
              >
                <path
                  d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"
                />
              </svg>
            </button>
          </div>
          <div class="p-5">
            <textarea
              v-model="history"
              rows="6"
              class="w-full form-input-sm min-h-[150px] resize-none"
              placeholder="Klinik notlar..."
            ></textarea>
          </div>
          <div class="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
            <button
              @click="isHistoryModalOpen = false"
              class="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    </Teleport>
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

// Hasta değişince metadata'yı sıfırla ve yeniden doldur
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

// 1. ADIM: Aktif Workspace'den ID'leri Al
const typeIds = computed<string[]>(() => {
  const ws = workspaceStore.currentWorkspace;

  // LOGLAMA: Workspace ve ID durumunu kontrol et
  console.log('PatientMetadataBar - Workspace:', ws);

  if (!ws) return [];

  // Workspace.ts düzeltildiği için artık veriler 'annotationTypeIds' içindedir.
  // Ekstra kontrollere gerek yok.
  const ids = ws.annotationTypeIds || [];

  console.log('PatientMetadataBar - Bulunan Anotasyon IDleri:', ids);

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

// 4. ADIM: Alanları Oluştur (GÜNCELLENMİŞ VERSİYON)
// 4. ADIM: Alanları Oluştur (GÜNCELLENMİŞ VERSİYON)
// 4. ADIM: Alanları Oluştur (GÜNCELLENMİŞ)
const dynamicFields = computed<TagDefinition[]>(() => {
  const allFields: TagDefinition[] = [];
  const seenNames = new Set<string>();

  activeAnnotationTypes.value.forEach((type) => {
    // ÖNEMLİ: Anotasyon tipinin içinde 'patientFields' aramak yerine,
    // tipin KENDİSİNİ bir alan olarak ekliyoruz.

    // Eğer "Görüntü Geneli" (Global) olarak işaretlenmemişse buraya dahil etmeyebiliriz.
    // Tüm tiplerin gelmesini istiyorsanız aşağıdaki if kontrolünü kaldırabilirsiniz.
    if (type.global) {
      // Aynı isimli alanları tekrar eklememek için kontrol
      if (!seenNames.has(type.name)) {
        seenNames.add(type.name);

        // Tipin kendisini form tanımına dönüştür
        allFields.push({
          name: type.name, // Örn: "Histolojik Alt Tip"
          type: type.type, // Örn: "SELECT"
          options: type.options || [], // Örn: ["Ductal", "Lobular"]
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
