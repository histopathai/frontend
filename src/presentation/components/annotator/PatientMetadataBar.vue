<template>
  <div
    class="bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 py-3 shadow-sm z-30 relative transition-all duration-300"
  >
    <div
      v-if="patient"
      class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
    >
      <div class="flex items-center gap-4 min-w-[200px] flex-shrink-0">
        <div
          class="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-lg font-bold shadow-lg shadow-indigo-200"
        >
          {{ getInitials(patient.name) }}
        </div>
        <div>
          <h2 class="text-lg font-bold text-gray-900 leading-tight">{{ patient.name }}</h2>
          <div class="flex items-center gap-2 mt-0.5">
            <span
              v-if="image"
              class="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 truncate max-w-[200px]"
              :title="image.name"
            >
              {{ image.name }}
            </span>
            <span
              v-else
              class="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded"
            >
              ID: {{ patient.id.substring(0, 8) }}
            </span>

            <span class="text-xs text-gray-500 font-medium border-l border-gray-300 pl-2">
              {{ formatDate(patient.createdAt) }}
            </span>
          </div>
        </div>
      </div>

      <div class="flex-1 w-full lg:mx-8">
        <div class="flex flex-wrap gap-2 items-center">
          <div class="group-box">
            <div class="input-wrapper w-20">
              <label class="floating-label">Yaş</label>
              <input type="number" v-model.number="age" class="modern-input" placeholder="-" />
            </div>
            <div class="w-px h-8 bg-gray-200 mx-1"></div>
            <div class="input-wrapper w-28">
              <label class="floating-label">Cinsiyet</label>
              <select v-model="gender" class="modern-input cursor-pointer">
                <option value="" disabled>-</option>
                <option value="Male">Erkek</option>
                <option value="Female">Kadın</option>
                <option value="Other">Diğer</option>
              </select>
            </div>
          </div>

          <div class="hidden lg:block text-gray-300 text-xl font-light">/</div>

          <div class="group-box flex-1 min-w-[300px]">
            <div class="input-wrapper flex-1">
              <label class="floating-label">Teşhis</label>
              <select v-model="disease" class="modern-input cursor-pointer">
                <option value="" disabled>Seçiniz</option>
                <option value="Karsinom">Karsinom</option>
                <option value="Normal">Normal</option>
              </select>
            </div>
            <div class="w-px h-8 bg-gray-200 mx-1"></div>

            <div class="input-wrapper flex-1">
              <label class="floating-label">Alt Tip</label>

              <select
                v-if="subtypeOptions.length > 0"
                v-model="subtype"
                class="modern-input cursor-pointer"
              >
                <option value="">Seçiniz</option>
                <option v-for="opt in subtypeOptions" :key="opt" :value="opt">
                  {{ opt }}
                </option>
              </select>
              <input
                v-else
                type="text"
                v-model="subtype"
                class="modern-input"
                placeholder="Alt tip..."
              />
            </div>

            <div class="w-px h-8 bg-gray-200 mx-1"></div>
            <div class="input-wrapper w-20">
              <label class="floating-label">Grade</label>
              <input type="number" v-model.number="grade" class="modern-input" placeholder="-" />
            </div>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-3 flex-shrink-0 ml-auto lg:ml-0">
        <button
          @click="isHistoryModalOpen = true"
          class="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors relative group"
          title="Geçmişi Düzenle"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="w-6 h-6"
            :class="{ 'text-indigo-600 fill-indigo-50': history && history.length > 0 }"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
            />
          </svg>
        </button>

        <button
          @click="handleSaveAll"
          :disabled="isLoading"
          class="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium text-sm shadow-md hover:bg-indigo-700 hover:shadow-lg focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
        >
          <svg
            v-if="isLoading"
            class="animate-spin h-4 w-4 text-white"
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
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
            class="w-4 h-4"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>

          <span v-if="isLoading">Kaydediliyor...</span>
          <span v-else>
            Kaydet
            <span
              v-if="annotationStore.unsavedAnnotations.length > 0"
              class="ml-1 bg-white/20 px-1.5 py-0.5 rounded text-xs"
            >
              +{{ annotationStore.unsavedAnnotations.length }}
            </span>
          </span>
        </button>
      </div>
    </div>

    <div
      v-else
      class="flex items-center justify-center h-[76px] text-gray-400 bg-gray-50/50 rounded-lg border border-dashed border-gray-200"
    >
      <span class="flex items-center gap-2 text-sm">
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
            d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
          />
        </svg>
        Düzenlemek için sol menüden bir hasta seçin.
      </span>
    </div>

    <Teleport to="body">
      <div
        v-if="isHistoryModalOpen"
        class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        @click.self="isHistoryModalOpen = false"
      >
        <div
          class="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in mx-4"
        >
          <div
            class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50"
          >
            <h3 class="font-bold text-gray-800 text-lg">Hasta Geçmişi / Notlar</h3>
            <button
              @click="isHistoryModalOpen = false"
              class="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke="currentColor"
                class="w-5 h-5"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="p-6">
            <textarea
              v-model="history"
              rows="8"
              class="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm leading-relaxed p-3 resize-none bg-gray-50 focus:bg-white transition-colors"
              placeholder="Hasta öyküsü ve klinik notlar buraya girilebilir..."
            ></textarea>
          </div>
          <div class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
            <button @click="isHistoryModalOpen = false" class="btn btn-outline btn-sm">
              İptal
            </button>
            <button @click="isHistoryModalOpen = false" class="btn btn-primary btn-sm">
              Tamam (Kaydetmek için Ana Kaydet'e basın)
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, type PropType, toRef, computed } from 'vue';
import type { Patient } from '@/core/entities/Patient';
import type { Image } from '@/core/entities/Image';
import type { Workspace } from '@/core/entities/Workspace';
import type { AnnotationType } from '@/core/entities/AnnotationType';

import { usePatientEditor } from '@/presentation/composables/annotator/usePatientEditor';
import { useAnnotationStore } from '@/stores/annotation';
import { useAnnotationTypeStore } from '@/stores/annotation_type';
import { useWorkspaceStore } from '@/stores/workspace';

const props = defineProps({
  patient: {
    type: Object as PropType<Patient | null>,
    default: null,
  },
  image: {
    type: Object as PropType<Image | null>,
    default: null,
  },
});

const annotationStore = useAnnotationStore();
const annotationTypeStore = useAnnotationTypeStore();
const workspaceStore = useWorkspaceStore();

const {
  loading: patientLoading,
  age,
  gender,
  disease,
  subtype,
  grade,
  history,
  savePatientChanges,
} = usePatientEditor(toRef(props, 'patient'));

const subtypeOptions = ref<string[]>([]);
const isHistoryModalOpen = ref(false);
const localSaving = ref(false);

const isLoading = computed(
  () => patientLoading.value || localSaving.value || annotationStore.actionLoading
);

async function handleSaveAll() {
  if (isLoading.value) return;

  localSaving.value = true;
  try {
    await savePatientChanges();
    if (annotationStore.hasUnsavedChanges) {
      await annotationStore.saveAllPendingAnnotations();
    }
  } catch (error) {
    console.error('Kaydetme sırasında hata:', error);
  } finally {
    localSaving.value = false;
  }
}

async function fetchConfig() {
  subtypeOptions.value = [];

  if (!props.patient || !props.patient.workspaceId) {
    return;
  }

  const wsId = props.patient.workspaceId;
  try {
    let workspace: Workspace | null | undefined = workspaceStore.getWorkspaceById(wsId);

    if (!workspace || !workspace.annotationTypeId) {
      const freshWorkspace = await workspaceStore.fetchWorkspaceById(wsId);

      if (freshWorkspace) {
        workspace = freshWorkspace;
      }
    }
    if (workspace) {
      if (workspace.annotationTypeId) {
        let annotationType: AnnotationType | null | undefined =
          annotationTypeStore.getAnnotationTypeById(workspace.annotationTypeId);
        if (!annotationType) {
          annotationType = await annotationTypeStore.fetchAnnotationTypeById(
            workspace.annotationTypeId
          );
        }

        if (annotationType) {
          if (annotationType.classList && annotationType.classList.length > 0) {
            subtypeOptions.value = [...annotationType.classList];
          } else {
            console.warn('⚠️ UYARI: AnnotationType bulundu ama sınıf listesi boş!');
          }
        } else {
          console.error('❌ HATA: AnnotationType verisi alınamadı (null döndü).');
        }
      } else {
        console.warn('⚠️ UYARI: Bu workspace için bir AnnotationType atanmamış.');
      }
    } else {
      console.error('❌ HATA: Workspace verisi hiçbir şekilde alınamadı.');
    }
  } catch (error) {
    console.error('🔥 KRİTİK HATA:', error);
  } finally {
    console.groupEnd();
  }
}

watch(
  () => props.patient,
  () => {
    fetchConfig();
  },
  { immediate: true }
);

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('tr-TR', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
</script>

<style scoped>
/* Gruplama Kutusu */
.group-box {
  @apply flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 transition-all focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-300 focus-within:bg-white;
}

/* Input Wrapper */
.input-wrapper {
  @apply flex flex-col justify-center relative h-10;
}

/* Kayan/Sabit Etiket */
.floating-label {
  @apply text-[9px] uppercase tracking-wider font-bold text-gray-400 mb-[-2px] ml-1 select-none;
}

/* Modern Input */
.modern-input {
  @apply w-full bg-transparent border-none p-0 px-1 text-sm font-semibold text-gray-700 placeholder-gray-300 focus:ring-0 focus:outline-none leading-none h-5;
}

/* Select özel ayar */
select.modern-input {
  @apply py-0;
}

/* Modal Fade Animation */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
.animate-fade-in {
  animation: fadeIn 0.2s ease-out forwards;
}
</style>
