<template>
  <div class="sidebar">
    <div class="sidebar-header">
      <h2 class="header-title">Görüntü Kataloğu</h2>
    </div>

    <div class="search-container">
      <div class="relative">
        <input
          :value="searchQuery"
          @input="$emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
          type="text"
          placeholder="Katalogda Ara..."
          class="form-input pl-10 pr-4 py-2"
        />
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            ></path>
          </svg>
        </div>
      </div>
    </div>

    <div class="dataset-tree">
      <div class="tree-content">
        <div v-if="loading && filteredWorkspaces.length === 0" class="loading-state">
          <div class="spinner"></div>
          <p class="loading-text">Katalog yükleniyor...</p>
        </div>
        <div v-else-if="error" class="error-state">
          <p>{{ error }}</p>
          <button @click="$emit('reload-workspaces')" class="btn btn-primary btn-sm mt-2">
            Tekrar Dene
          </button>
        </div>
        <div v-else-if="filteredWorkspaces.length === 0" class="empty-state-sidebar">
          <p>Görüntü bulunamadı.</p>
        </div>

        <div v-else>
          <div v-for="ws in filteredWorkspaces" :key="ws.id" class="dataset-group">
            <div @click="toggleWorkspace(ws.id)" class="dataset-header group">
              <div class="dataset-header-content">
                <svg
                  :class="['chevron-icon', { rotated: expandedWorkspaces.includes(ws.id) }]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  ></path>
                </svg>
                <span class="dataset-name">{{ ws.name }}</span>
              </div>
              <span class="image-count">{{ patientsFor(ws.id).length }}</span>
            </div>

            <div v-if="expandedWorkspaces.includes(ws.id)" class="images-list">
              <div v-for="patient in patientsFor(ws.id)" :key="patient.id" class="ml-2">
                <div @click="togglePatient(patient.id)" class="dataset-header group !bg-gray-50">
                  <div class="dataset-header-content">
                    <svg
                      :class="['chevron-icon', { rotated: expandedPatients.includes(patient.id) }]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 5l7 7-7 7"
                      ></path>
                    </svg>
                    <span class="dataset-name !font-normal">{{ patient.name }}</span>
                  </div>
                  <span class="image-count">{{ imagesFor(patient.id).length }}</span>
                </div>

                <div v-if="expandedPatients.includes(patient.id)" class="images-list">
                  <div
                    v-for="image in imagesFor(patient.id)"
                    :key="image.id"
                    @click="onImageSelect(image, patient)"
                    :class="['image-item', { selected: selectedImage?.id === image.id }]"
                  >
                    <div class="thumbnail">
                      <img
                        :src="getThumbnailUrl(image)"
                        :alt="image.name"
                        class="thumbnail-img"
                        @error="handleImageError"
                        loading="lazy"
                      />
                    </div>
                    <div class="image-info">
                      <p class="image-name">{{ image.name }}</p>
                      <p class="image-id">
                        {{ image.format }}
                        <span
                          v-if="(image.status as any).value === 'PROCESSING'"
                          class="text-blue-500"
                          >(İşleniyor...)</span
                        >
                        <span v-if="(image.status as any).value === 'FAILED'" class="text-red-500"
                          >(Hata)</span
                        >
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <PatientMetadataEditor
      :patient="selectedPatient"
      @update-patient="$emit('update-patient', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, type PropType } from 'vue';
import type { WorkspaceProps } from '@/core/entities/Workspace';
import type { Patient, PatientProps } from '@/core/entities/Patient';
import type { Image, ImageProps } from '@/core/entities/Image';
import { useToast } from 'vue-toastification';
import PatientMetadataEditor from './PatientEditor.vue';

const props = defineProps({
  workspaces: {
    type: Array as PropType<WorkspaceProps[]>,
    default: () => [],
  },
  patientsByWorkspace: {
    type: Map as PropType<Map<string, PatientProps[]>>,
    default: () => new Map(),
  },
  imagesByPatient: {
    type: Map as PropType<Map<string, ImageProps[]>>,
    default: () => new Map(),
  },
  selectedImage: {
    type: Object as PropType<ImageProps | null>,
    default: null,
  },
  selectedPatient: {
    type: Object as PropType<PatientProps | null>,
    default: null,
  },
  searchQuery: {
    type: String,
    default: '',
  },
  loading: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String as PropType<string | null>,
    default: null,
  },
});

const emit = defineEmits([
  'select-image',
  'reload-workspaces',
  'load-patients',
  'load-images',
  'update:searchQuery',
  'update-patient',
]);

const toast = useToast();

const expandedWorkspaces = ref<string[]>([]);
const expandedPatients = ref<string[]>([]);

const patientsFor = (workspaceId: string): PatientProps[] => {
  return props.patientsByWorkspace.get(workspaceId) || [];
};

const imagesFor = (patientId: string): ImageProps[] => {
  return props.imagesByPatient.get(patientId) || [];
};

// Arama mantığı
const filteredWorkspaces = computed(() => {
  if (!props.searchQuery.trim()) {
    return props.workspaces;
  }
  const query = props.searchQuery.toLowerCase();

  return props.workspaces.filter((ws) => {
    if (ws.name.toLowerCase().includes(query)) return true;

    const patients = patientsFor(ws.id);
    for (const p of patients) {
      if (p.name.toLowerCase().includes(query)) return true;

      const images = imagesFor(p.id);
      for (const img of images) {
        if (img.name.toLowerCase().includes(query)) return true;
      }
    }
    return false;
  });
});

const toggleWorkspace = (workspaceId: string) => {
  const index = expandedWorkspaces.value.indexOf(workspaceId);
  if (index > -1) {
    expandedWorkspaces.value.splice(index, 1);
  } else {
    expandedWorkspaces.value.push(workspaceId);
    if (!props.patientsByWorkspace.has(workspaceId)) {
      emit('load-patients', workspaceId);
    }
  }
};

const togglePatient = (patientId: string) => {
  const index = expandedPatients.value.indexOf(patientId);
  if (index > -1) {
    expandedPatients.value.splice(index, 1);
  } else {
    expandedPatients.value.push(patientId);
    if (!props.imagesByPatient.has(patientId)) {
      emit('load-images', patientId);
    }
  }
};

const onImageSelect = (image: ImageProps, patient: PatientProps) => {
  if (image.status.toString() !== 'PROCESSED') {
    toast.warning(`'${image.name}' henüz görüntülenemez (Durum: ${image.status.toString()}).`);
    return;
  }
  emit('select-image', image, patient);
};

// Thumbnail URL (ImageCard.vue'den)
const getThumbnailUrl = (image: ImageProps) => {
  if (image.status.toString() !== 'PROCESSED' || !image.processedpath) {
    return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2U1ZTVlNSI+PHBhdGggZD0iTTE5LjUgNmgtMTVjLTEuMSAwLTIgLjktMiAydjEyYzAgMS4xLjkgMiAyIDJoMTVjMS4xIDAgMi0uOSAyLTJWOGMwLTEuMS0uOS0yLTItMnpNNiAyMGgtM3YtM2gzek0xOCAyMGgtM3YtM2gzek0xOCAxNGgtM3YtM2gzek0xMiAxNGgtM3YtM2gzek02IDE0SDN2LTNoM3ptMTItN2gtM3YtM2gzek0xMiA3SDlWNGgzem0tNiAwaC0zVjRoMy4wMXYzem0xMS45OSA5LjAxbC00LjAxLTQuMDEtNC4wMSA0LjAxLTMuMDItMy4wMS02Ljk4IDYuOTloMjB2LTQuMDN6Ii8+PC9zdmc+';
  }
  return `/api/v1/proxy/${image.processedpath}/thumbnail.jpeg`;
};

const handleImageError = (event: Event) => {
  (event.target as HTMLImageElement).src =
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2Y4NzE3MSI+PHBhdGggZD0iTTIxIDE1Ljc5bC00LjQ4LTEuNzktMS43MSAzLjc0Yy0uMi40NS0uNTEuOC0uODguOUMxMi42MyAxOS43NCAxMS4zMyAyMCAxMCAyMCA5IDEwLjkgOCA4Ljg4IDhjLS4wMy0xLjA5LjE5LTIuMTQuNTMtMy4xIDMuNC0xLjM4IDYuNzEtMy4zMiA5LjY4LTUuNzkuMy0uMjQuNy0uMjguOTQtLjA4bDIuMTEgMS4xNGMuNDcuMjUgMS4wMS4wMyAxLjI3LS40M2wxLjA5LTIuMjRjLjE0LS4yOS4wOC0uNjQtLjE0LS44NGwtMS4zOS0xLjI4Yy0uMjktLjI2LS43LS4yOC0xLjAxLS4wNUwxNC4yLjYyYy0uMzguMjktLjU5LjcyLS41IDEuMTYuNDEgMi4xMi4yIDQuMzItLjQ4IDYuMzgtMS4xMyAzLjM5LTMuMzUgNi4xNy02LjM5IDcuODZDMi43MyAxOS40NS4yMiAyMy4xOC4wMSAyNy4wNWMtLjAyLjMxLjIyLjU5LjUzLjU5aC4wOWMyLjIxLjA0IDQuMzktLjU5IDYuMzEtMS44MiAyLjAxLTEuMjggMy43Ni0yLjk3IDUuMTktNC45NWwxLjAyIDEuMWMuMjEuMjIuNTEuMzMuODQuMzNoLjA3Yy4zNS0uMDQuNjYtLjI4LjgyLS42M2wzLjAzLTYuMDdjLjE5LS4zNy4xNi0uODMtLjA3LTEuMTRsLTEuMzgtMS45MmMtLjE3LS4yNC0uNDYtLjM4LS43NC0uMzhoLS4wMXptLTMuNzQgMS45MWwzLjYxIDEuNDMtMS44MiAzLjY5LTMuNDctMS4zNyAyLjY4LTMuNzV6Ii8+PC9zdmc+';
};
</script>

<style scoped>
.sidebar {
  @apply w-80 bg-white border-r border-gray-200 flex flex-col flex-shrink-0;
}
.sidebar-header {
  @apply p-4 border-b border-gray-200;
}
.header-title {
  @apply text-lg font-semibold text-gray-800;
}
.search-container {
  @apply p-3 border-b border-gray-200;
}
.dataset-tree {
  @apply flex-1 overflow-y-auto;
}
.tree-content {
  @apply p-3;
}
.loading-state,
.empty-state-sidebar {
  @apply text-center py-8 text-gray-500 text-sm;
}
.spinner {
  @apply animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-b-transparent mx-auto mb-2;
}
.error-state {
  @apply text-center py-8 text-red-600 text-sm;
}
.dataset-group {
  @apply mb-1;
}
.dataset-header {
  @apply flex items-center justify-between p-2 bg-gray-100 rounded cursor-pointer transition-colors duration-150 hover:bg-gray-200;
}
.dataset-header-content {
  @apply flex items-center gap-2;
}
.chevron-icon {
  @apply h-4 w-4 text-gray-500 transition-transform duration-200 ease-in-out;
}
.chevron-icon.rotated {
  @apply rotate-90;
}
.dataset-name {
  @apply font-medium text-sm text-gray-700;
}
.image-count {
  @apply text-xs text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded-full;
}
.images-list {
  @apply mt-1 pl-4 border-l border-gray-200 ml-2;
}
.image-item {
  @apply flex items-center p-1.5 rounded cursor-pointer border border-transparent mb-1 transition-colors duration-150 hover:bg-gray-50;
}
.image-item.selected {
  @apply bg-indigo-50 border-indigo-200;
}
.thumbnail {
  @apply flex-shrink-0 w-10 h-10 bg-gray-200 rounded overflow-hidden;
}
.thumbnail-img {
  @apply w-full h-full object-cover;
}
.image-info {
  @apply ml-2 flex-1 min-w-0;
}
.image-name {
  @apply text-sm font-medium text-gray-800 truncate;
}
.image-id {
  @apply text-xs text-gray-500 truncate;
}
</style>
