<template>
  <div
    class="flex flex-col h-full bg-white border-r border-gray-200 shadow-[2px_0_8px_rgba(0,0,0,0.02)]"
  >
    <div class="p-4 border-b border-gray-200 bg-gray-50/50 space-y-3">
      <div>
        <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
          Çalışma Alanı
        </label>
        <div class="relative group">
          <select
            :value="selectedWorkspaceId"
            @change="onWorkspaceChange"
            class="appearance-none block w-full pl-3 pr-8 py-2 text-xs bg-white border border-gray-300 text-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-all cursor-pointer hover:border-indigo-300"
          >
            <option :value="undefined" disabled>Seçiniz...</option>
            <option v-for="ws in workspaces" :key="ws.id" :value="ws.id">
              {{ ws.name }}
            </option>
          </select>
          <div
            class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500"
          >
            <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </div>

      <div v-if="selectedWorkspaceId">
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              class="h-3.5 w-3.5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Listede ara..."
            class="block w-full pl-9 pr-8 py-2 text-xs border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
          <button
            v-if="searchQuery"
            @click="searchQuery = ''"
            class="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div v-if="searchQuery && hasMoreData && !isLoadingAll" class="mt-2">
          <button
            @click="loadAllData"
            class="w-full text-[10px] bg-indigo-50 text-indigo-700 py-1.5 rounded border border-indigo-100 hover:bg-indigo-100 transition flex items-center justify-center gap-1 group"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-3 w-3 group-hover:animate-bounce"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                clip-rule="evenodd"
              />
            </svg>
            Aradığınız kişi yüklenmemiş olabilir. <strong>Hepsini Yükle</strong>
          </button>
        </div>

        <div
          v-if="isLoadingAll"
          class="mt-2 text-[10px] text-indigo-600 flex items-center justify-center bg-indigo-50 py-1.5 rounded animate-pulse border border-indigo-100"
        >
          <span>Verisetinin tamamı taranıyor...</span>
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto custom-scrollbar">
      <div
        v-if="loading && patients.length === 0"
        class="flex flex-col items-center justify-center h-32 text-gray-400 text-sm"
      >
        <div
          class="animate-spin rounded-full h-6 w-6 border-2 border-indigo-500 border-t-transparent mb-2"
        ></div>
        Veriler yükleniyor...
      </div>

      <div
        v-else-if="!selectedWorkspaceId"
        class="flex flex-col items-center justify-center h-48 text-center px-6 text-gray-400"
      >
        <p class="text-xs font-medium text-gray-500">Veri Seti Seçilmedi</p>
      </div>

      <div v-else class="py-2">
        <div
          v-if="filteredPatients.length === 0"
          class="p-6 text-center text-gray-400 text-xs italic"
        >
          <span v-if="searchQuery">
            "{{ searchQuery }}" bulunamadı.
            <br />
          </span>
          <span v-else>Kayıtlı hasta bulunamadı.</span>
        </div>

        <div
          v-for="patient in filteredPatients"
          :key="patient.id"
          class="border-b border-gray-50 last:border-0"
        >
          <div
            @click="togglePatient(patient)"
            class="relative flex items-center justify-between px-4 py-3 cursor-pointer transition-all duration-200 hover:bg-gray-50 select-none group"
            :class="{ 'bg-indigo-50/60': isSelected(patient.id) }"
            :style="getPatientProgressStyle(patient)"
          >
            <div
              class="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600 rounded-r transition-transform duration-200"
              :class="isSelected(patient.id) ? 'scale-y-100' : 'scale-y-0'"
            ></div>

            <div class="flex items-center gap-3 overflow-hidden">
              <div
                class="p-1.5 rounded-md transition-colors"
                :class="
                  isSelected(patient.id)
                    ? 'bg-indigo-100 text-indigo-600'
                    : 'bg-gray-100 text-gray-500 group-hover:bg-white'
                "
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <div class="flex flex-col min-w-0">
                <span
                  class="text-xs font-medium text-gray-700 truncate"
                  :class="{ 'text-indigo-700': isSelected(patient.id) }"
                >
                  {{ patient.name }}
                </span>
                <span v-if="isSelected(patient.id)" class="text-[10px] text-gray-400">
                  {{ images.length }} Görüntü
                </span>
              </div>
            </div>

            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-3.5 w-3.5 text-gray-400 transition-transform duration-300"
              :class="{ 'rotate-90 text-indigo-500': isSelected(patient.id) }"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>

          <transition
            enter-active-class="transition-all duration-300 ease-out"
            leave-active-class="transition-all duration-200 ease-in"
            enter-from-class="opacity-0 max-h-0"
            enter-to-class="opacity-100 max-h-[500px]"
            leave-from-class="opacity-100 max-h-[500px]"
            leave-to-class="opacity-0 max-h-0"
          >
            <div v-if="isSelected(patient.id)" class="overflow-hidden bg-gray-50/50 shadow-inner">
              <ul class="py-2 pl-4 pr-2 space-y-1">
                <li v-if="images.length === 0" class="py-2 pl-9 text-xs text-gray-400 italic">
                  Görüntü bulunamadı
                </li>

                <li
                  v-for="image in images"
                  :key="image.id"
                  @click="$emit('image-selected', image)"
                  class="relative group flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all border"
                  :class="getImageClasses(image)"
                >
                  <div
                    class="h-9 w-9 flex-shrink-0 rounded bg-gray-200 overflow-hidden border border-gray-200 relative"
                  >
                    <img
                      :src="getThumbnailUrl(image)"
                      alt="thumbnail"
                      class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                    <div
                      v-if="!image.status.isProcessed()"
                      class="absolute inset-0 bg-black/10 flex items-center justify-center"
                    >
                      <div class="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"></div>
                    </div>
                  </div>

                  <div class="min-w-0 flex-1">
                    <p
                      class="text-[11px] font-medium truncate"
                      :class="image.id === selectedImageId ? 'text-indigo-700' : 'text-gray-700'"
                    >
                      {{ image.name }}
                    </p>
                    <span class="text-[9px] text-gray-400 block" v-if="image.width"
                      >{{ image.width }}x{{ image.height }}</span
                    >
                  </div>

                  <div
                    v-if="image.id !== selectedImageId && annotatedImageSet.has(image.id)"
                    class="absolute right-2 flex items-center justify-center w-4 h-4 bg-emerald-100 rounded-full shadow-sm"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-2.5 w-2.5 text-emerald-600"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </div>

                  <div
                    v-if="image.id === selectedImageId"
                    class="absolute right-2 w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-sm"
                  ></div>
                </li>
              </ul>
            </div>
          </transition>
        </div>
      </div>
    </div>

    <!-- Pagination Footer -->
    <div
      v-if="selectedWorkspaceId && !searchQuery"
      class="border-t border-gray-200 bg-gray-50 p-2 flex items-center justify-between shrink-0"
    >
      <button
        @click="$emit('page-change', currentPage - 1)"
        :disabled="currentPage <= 1 || loading"
        class="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4"
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

      <div class="text-[10px] font-medium text-gray-500">
        Sayfa {{ currentPage }} <span v-if="totalPages > 0">/ {{ totalPages }}</span>
      </div>

      <button
        @click="$emit('page-change', currentPage + 1)"
        :disabled="
          (totalPages > 0 && currentPage >= totalPages) || (totalPages === 0 && !hasMore) || loading
        "
        class="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4"
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
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { PropType } from 'vue';
import type { Workspace } from '@/core/entities/Workspace';
import type { Patient } from '@/core/entities/Patient';
import type { Image } from '@/core/entities/Image';

import { useAnnotationStore } from '@/stores/annotation';
import { useAuthStore } from '@/stores/auth';
import { useToast } from 'vue-toastification';
import { ApiClient } from '@/infrastructure/api/ApiClient';
import { usePatientStore } from '@/stores/patient';

const props = defineProps({
  workspaces: { type: Array as PropType<Workspace[]>, required: true },
  patients: { type: Array as PropType<Patient[]>, required: true },
  images: { type: Array as PropType<Image[]>, required: true },

  selectedWorkspaceId: String,
  selectedPatientId: String,
  selectedImageId: String,
  loading: Boolean,
  currentPage: { type: Number, default: 1 },
  totalPages: { type: Number, default: 1 },
  hasMore: { type: Boolean, default: false },
});

const emit = defineEmits([
  'workspace-selected',
  'patient-selected',
  'image-selected',
  'page-change',
]);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const annotationStore = useAnnotationStore();
const authStore = useAuthStore();
const patientStore = usePatientStore();
const toast = useToast();
const apiClient = new ApiClient(API_BASE_URL);

const searchQuery = ref('');
const isLoadingAll = ref(false);

const annotatedImageSet = ref(new Set<string>());

const filteredPatients = computed(() => {
  if (!searchQuery.value) return props.patients;
  const lowerQuery = searchQuery.value.toLocaleLowerCase('tr');
  return props.patients.filter((p) => p.name?.toLocaleLowerCase('tr').includes(lowerQuery));
});

// Restore stats when patients list changes (e.g. pagination)
// Restore stats when patients list changes (e.g. pagination) and fetch missing stats
watch(
  filteredPatients,
  async (newPatients) => {
    // 1. Restore existing stats
    const missingStatsPatients: Patient[] = [];
    newPatients.forEach((patient) => {
      const stats = patientStore.getPatientStats(patient.id);
      if (stats) {
        patient.updateAnnotationStats(stats.total, stats.annotated);
      } else {
        missingStatsPatients.push(patient);
      }
    });

    // 2. Fetch missing stats in background (chunked to avoid overloading)
    if (missingStatsPatients.length === 0) return;

    const chunkSize = 3;
    for (let i = 0; i < missingStatsPatients.length; i += chunkSize) {
      const chunk = missingStatsPatients.slice(i, i + chunkSize);
      // We don't await the entire process to block UI, but we await chunks to manage load
      await Promise.all(chunk.map((p) => fetchPatientStats(p)));
    }
  },
  { immediate: true }
);

async function fetchPatientStats(patient: Patient) {
  try {
    // Check if we already have stats in store (double check for race conditions)
    if (patientStore.getPatientStats(patient.id)) return;

    // 1. Fetch images for the patient
    const imagesResult = await apiClient.get<any>(`/api/v1/proxy/patients/${patient.id}/images`);
    let images: any[] = [];

    // Handle different response structures (similar to ImageRepository)
    if (imagesResult.data && Array.isArray(imagesResult.data.data)) {
      images = imagesResult.data.data;
    } else if (Array.isArray(imagesResult.data)) {
      images = imagesResult.data;
    }

    if (images.length === 0) {
      patient.updateAnnotationStats(0, 0);
      patientStore.updatePatientStats(patient.id, 0, 0);
      return;
    }

    // 2. Check annotations for each image
    // Optimization: If we just need count, we can parallelize this too
    let annotatedCount = 0;
    const imagePromises = images.map(async (img: any) => {
      try {
        const result = await apiClient.get<any>(
          `/api/v1/proxy/annotations/image/${img.id}?limit=1`
        );
        if (
          result &&
          result.data &&
          ((Array.isArray(result.data) && result.data.length > 0) ||
            (result.data.data && Array.isArray(result.data.data) && result.data.data.length > 0))
        ) {
          return true;
        }
      } catch (e) {
        /* ignore error */
      }
      return false;
    });

    const results = await Promise.all(imagePromises);
    annotatedCount = results.filter((r) => r).length;

    // 3. Update stats
    patient.updateAnnotationStats(images.length, annotatedCount);
    patientStore.updatePatientStats(patient.id, images.length, annotatedCount);
  } catch (error) {
    console.error(`Failed to fetch stats for patient ${patient.id}`, error);
  }
}

const hasMoreData = computed(() => patientStore.pagination.hasMore);

async function loadAllData() {
  if (!props.selectedWorkspaceId || isLoadingAll.value) return;

  isLoadingAll.value = true;
  toast.info('Tüm liste taranıyor, bu işlem biraz sürebilir...', { timeout: 3000 });

  try {
    while (patientStore.pagination.hasMore) {
      await patientStore.loadMorePatients(props.selectedWorkspaceId);
      await new Promise((r) => setTimeout(r, 20));
    }
    toast.success('Tüm kayıtlar yüklendi.');
  } catch (error) {
    console.error(error);
    toast.error('Veri yüklenirken hata oluştu.');
  } finally {
    isLoadingAll.value = false;
  }
}

watch(
  [() => props.images, () => authStore.token],
  async ([newImages, token]) => {
    if (!newImages || newImages.length === 0) {
      annotatedImageSet.value = new Set();
      return;
    }

    // ApiClient relies on authStore.token. If it's not ready, we wait.
    if (!token) return;

    const tempSet = new Set<string>();
    if (props.selectedImageId && annotationStore.annotations.length > 0) {
      tempSet.add(props.selectedImageId);
    }

    const promises = newImages.map(async (img) => {
      if (tempSet.has(img.id)) return img.id;
      try {
        const result = await apiClient.get<{ data: any[] }>(
          `/api/v1/proxy/annotations/image/${img.id}?limit=1`
        );
        if (result && result.data && Array.isArray(result.data) && result.data.length > 0) {
          return img.id;
        }
      } catch (e) {}
      return null;
    });

    const results = await Promise.all(promises);
    results.forEach((id) => {
      if (id) tempSet.add(id);
    });
    annotatedImageSet.value = tempSet;

    // Update the patient's stats dynamically
    if (props.selectedPatientId) {
      const patient = props.patients.find((p) => p.id === props.selectedPatientId);
      if (patient) {
        patient.updateAnnotationStats(props.images.length, tempSet.size);
        patientStore.updatePatientStats(patient.id, props.images.length, tempSet.size);
      }
    }
  },
  { immediate: true }
);

watch(
  () => annotationStore.annotations,
  (newAnnotations) => {
    if (!props.selectedImageId) return;
    const newSet = new Set(annotatedImageSet.value);
    if (newAnnotations.length > 0) newSet.add(props.selectedImageId);
    else newSet.delete(props.selectedImageId);
    annotatedImageSet.value = newSet;

    // Update stats on annotation change
    if (props.selectedPatientId) {
      const patient = props.patients.find((p) => p.id === props.selectedPatientId);
      if (patient) {
        patient.updateAnnotationStats(props.images.length, newSet.size);
        patientStore.updatePatientStats(patient.id, props.images.length, newSet.size);
      }
    }
  },
  { deep: true }
);

function isSelected(patientId: string) {
  return props.selectedPatientId === patientId;
}

function getPatientProgressStyle(patient: Patient) {
  if (!patient.imageCount || patient.imageCount === 0) return {};

  const percentage = Math.min(
    100,
    Math.max(0, (patient.annotatedImageCount / patient.imageCount) * 100)
  );

  if (percentage === 0) return {};

  return {
    background: `linear-gradient(to right, rgba(16, 185, 129, 0.15) ${percentage}%, transparent ${percentage}%)`,
  };
}

function getImageClasses(image: any) {
  if (image.id === props.selectedImageId)
    return 'bg-white border-indigo-500 shadow-md ring-1 ring-indigo-200 z-10';
  if (annotatedImageSet.value.has(String(image.id)))
    return 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100';
  return 'border-transparent hover:bg-white hover:border-gray-300 hover:shadow-sm text-gray-600';
}

function onWorkspaceChange(event: Event) {
  const ws = props.workspaces.find((w) => w.id === (event.target as HTMLSelectElement).value);
  if (ws) {
    emit('workspace-selected', ws);
    searchQuery.value = '';
  }
}

function togglePatient(patient: Patient) {
  emit('patient-selected', props.selectedPatientId === patient.id ? null : patient);
}

function getThumbnailUrl(image: any): string {
  if (!image || !image.status.isProcessed())
    return 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
  return `${API_BASE_URL}/api/v1/proxy/${image.id}/thumbnail.jpg`;
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
  border-radius: 20px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: #d1d5db;
}
</style>
