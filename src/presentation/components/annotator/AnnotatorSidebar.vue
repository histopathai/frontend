<template>
  <div
    class="flex flex-col h-full bg-white border-r border-gray-200 shadow-[2px_0_8px_rgba(0,0,0,0.02)]"
  >
    <div class="p-5 border-b border-gray-200 bg-gray-50/50">
      <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
        Çalışma Alanı
      </label>
      <div class="relative group">
        <select
          :value="selectedWorkspaceId"
          @change="onWorkspaceChange"
          class="block w-full pl-3 pr-10 py-2.5 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-all cursor-pointer hover:border-indigo-300"
        >
          <option :value="undefined" disabled>Bir Veri Seti Seçin...</option>
          <option v-for="ws in workspaces" :key="ws.id" :value="ws.id">
            {{ ws.name }}
          </option>
        </select>
      </div>

      <transition name="fade">
        <div v-if="currentWorkspace" class="mt-3">
          <div
            class="flex items-center gap-2 text-xs text-gray-500 bg-white p-2 rounded border border-gray-100"
          >
            <span class="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-medium">{{
              currentWorkspace.organType
            }}</span>
            <span class="truncate">{{ currentWorkspace.organization }}</span>
          </div>
        </div>
      </transition>
    </div>

    <div class="flex-1 overflow-y-auto custom-scrollbar" @scroll="handleScroll">
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
        class="flex flex-col items-center justify-center h-64 text-center px-6 text-gray-400"
      >
        <div class="bg-gray-50 p-4 rounded-full mb-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-8 w-8 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        </div>
        <p class="text-sm font-medium text-gray-500">Veri Seti Seçilmedi</p>
        <p class="text-xs mt-1">İşlem yapmak için yukarıdan seçim yapın.</p>
      </div>

      <div v-else class="py-2">
        <div v-if="patients.length === 0" class="p-6 text-center text-gray-400 text-sm italic">
          Kayıtlı hasta bulunamadı.
        </div>

        <div
          v-for="patient in patients"
          :key="patient.id"
          class="border-b border-gray-50 last:border-0"
        >
          <div
            @click="togglePatient(patient)"
            class="relative flex items-center justify-between px-4 py-3 cursor-pointer transition-all duration-200 hover:bg-gray-50 select-none group"
            :class="{ 'bg-indigo-50/60': isSelected(patient.id) }"
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
                    : 'bg-gray-100 text-gray-500 group-hover:bg-white group-hover:shadow-sm'
                "
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
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  />
                </svg>
              </div>

              <div class="flex flex-col min-w-0">
                <span
                  class="text-sm font-medium text-gray-700 truncate"
                  :class="{ 'text-indigo-700': isSelected(patient.id) }"
                >
                  {{ patient.name }}
                </span>
                <span v-if="isSelected(patient.id)" class="text-[10px] text-gray-500">
                  {{ images.length }} Görüntü
                </span>
              </div>
            </div>

            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4 text-gray-400 transition-transform duration-300"
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
                <li
                  v-if="images.length === 0"
                  class="py-3 pl-8 text-xs text-gray-400 italic flex items-center"
                >
                  <span class="w-1.5 h-1.5 bg-gray-300 rounded-full mr-2"></span>
                  Görüntü bulunamadı
                </li>

                <li
                  v-for="image in images"
                  :key="image.id"
                  @click="$emit('image-selected', image)"
                  class="relative group flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all border"
                  :class="[
                    image.id === selectedImageId
                      ? 'bg-white border-indigo-500 shadow-sm ring-1 ring-indigo-100 z-10'
                      : 'border-transparent hover:bg-white hover:border-gray-200 hover:shadow-sm text-gray-600',
                  ]"
                >
                  <div
                    class="h-10 w-10 flex-shrink-0 rounded bg-gray-200 overflow-hidden border border-gray-200 relative"
                  >
                    <img
                      :src="getThumbnailUrl(image)"
                      alt="thumbnail"
                      class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                    <div
                      v-if="!image.processedpath"
                      class="absolute inset-0 bg-black/10 flex items-center justify-center"
                    >
                      <div class="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                    </div>
                  </div>

                  <div class="min-w-0 flex-1">
                    <p
                      class="text-xs font-medium truncate transition-colors"
                      :class="image.id === selectedImageId ? 'text-indigo-700' : 'text-gray-700'"
                    >
                      {{ image.name }}
                    </p>
                    <div class="flex items-center mt-0.5 gap-2">
                      <span
                        v-if="image.width"
                        class="text-[10px] text-gray-400 bg-gray-100 px-1 rounded"
                      >
                        {{ image.width }}x{{ image.height }}
                      </span>
                      <span v-else class="text-[10px] text-yellow-600 flex items-center">
                        <svg
                          class="w-2 h-2 mr-1 animate-spin"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                        İşleniyor
                      </span>
                    </div>
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

        <div
          v-if="loading && patients.length > 0"
          class="py-3 text-center text-xs text-gray-400 flex items-center justify-center gap-2"
        >
          <div class="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
          Daha fazla yükleniyor...
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { PropType } from 'vue';
import type { Workspace } from '@/core/entities/Workspace';
import type { Patient } from '@/core/entities/Patient';
import type { Image } from '@/core/entities/Image';
import type { AnnotationType } from '@/core/entities/AnnotationType';

const props = defineProps({
  workspaces: { type: Array as PropType<Workspace[]>, required: true },
  patients: { type: Array as PropType<Patient[]>, required: true },
  images: { type: Array as PropType<Image[]>, required: true },
  annotationTypes: { type: Array as PropType<AnnotationType[]>, default: () => [] },

  selectedWorkspaceId: String,
  selectedPatientId: String,
  selectedImageId: String,
  selectedAnnotationTypeId: String,
  loading: Boolean,
});

const emit = defineEmits([
  'workspace-selected',
  'patient-selected',
  'image-selected',
  'type-selected',
  'load-more',
]);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const currentWorkspace = computed(() =>
  props.workspaces.find((w) => w.id === props.selectedWorkspaceId)
);

function isSelected(patientId: string) {
  return props.selectedPatientId === patientId;
}

function onWorkspaceChange(event: Event) {
  const select = event.target as HTMLSelectElement;
  const workspaceId = select.value;
  const workspace = props.workspaces.find((w) => w.id === workspaceId);
  if (workspace) {
    emit('workspace-selected', workspace);
  }
}

function togglePatient(patient: Patient) {
  if (props.selectedPatientId === patient.id) {
    emit('patient-selected', null);
  } else {
    emit('patient-selected', patient);
  }
}

function getThumbnailUrl(image: any): string {
  if (!image || !image.processedpath) {
    return 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
  }

  return `${API_BASE_URL}/api/v1/proxy/${image.processedpath}/thumbnail.jpg`;
}

function handleScroll(event: Event) {
  const element = event.target as HTMLElement;

  if (props.loading) return;

  const bottomThreshold = 50;
  if (element.scrollTop + element.clientHeight >= element.scrollHeight - bottomThreshold) {
    emit('load-more');
  }
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
