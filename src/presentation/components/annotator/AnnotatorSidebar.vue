<template>
  <div class="w-full h-full bg-white border-r border-gray-200 overflow-y-auto">
    <div class="p-4">
      <h3 class="text-lg font-semibold text-gray-900">Datasets</h3>
    </div>

    <div v-if="loading" class="p-4 text-gray-500">Yükleniyor...</div>
    <ul v-else class="space-y-1 p-2">
      <li v-for="ws in workspaces" :key="ws.id">
        <div
          @click="$emit('workspace-selected', ws)"
          :class="[
            'group flex items-center justify-between p-2 rounded-md cursor-pointer',
            ws.id === selectedWorkspaceId
              ? 'bg-indigo-100 text-indigo-700'
              : 'text-gray-700 hover:bg-gray-100',
          ]"
        >
          <span class="font-medium">{{ ws.name }}</span>
          <span>{{ ws.id === selectedWorkspaceId ? '▼' : '►' }}</span>
        </div>

        <ul v-if="ws.id === selectedWorkspaceId" class="pl-4 mt-1 space-y-1">
          <li v-for="patient in patients" :key="patient.id">
            <div
              @click="$emit('patient-selected', patient)"
              :class="[
                'group flex items-center justify-between p-2 rounded-md cursor-pointer',
                patient.id === selectedPatientId ? 'bg-gray-200' : 'hover:bg-gray-100',
              ]"
            >
              <span>{{ patient.name }}</span>
              <span>{{ patient.id === selectedPatientId ? '▼' : '►' }}</span>
            </div>

            <ul v-if="patient.id === selectedPatientId" class="pl-4 mt-1 space-y-2 py-2">
              <li
                v-for="image in images"
                :key="image.id"
                @click="$emit('image-selected', image)"
                :class="[
                  'flex items-center space-x-3 p-2 rounded-md cursor-pointer',
                  image.id === selectedImageId
                    ? 'bg-indigo-50 border-indigo-300 border'
                    : 'hover:bg-gray-100',
                ]"
              >
                <img
                  :src="getThumbnailUrl(image)"
                  alt="thumbnail"
                  class="w-12 h-12 object-cover rounded-md bg-gray-200"
                />
                <span class="text-sm">{{ image.name }}</span>
              </li>
            </ul>
          </li>
        </ul>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from 'vue';
import type { Workspace } from '@/core/entities/Workspace';
import type { Patient } from '@/core/entities/Patient';
import type { Image } from '@/core/entities/Image';

defineProps({
  workspaces: {
    type: Array as PropType<Workspace[]>,
    required: true,
  },
  patients: {
    type: Array as PropType<Patient[]>,
    required: true,
  },
  images: {
    type: Array as PropType<Image[]>,
    required: true,
  },
  selectedWorkspaceId: String,
  selectedPatientId: String,
  selectedImageId: String,
  loading: Boolean,
});

defineEmits(['workspace-selected', 'patient-selected', 'image-selected']);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function getThumbnailUrl(image: Image): string {
  if (!image.processedpath) {
    return 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
  }
  const basePath = image.processedpath.substring(0, image.processedpath.lastIndexOf('/'));
  return `${API_BASE_URL}/api/v1/proxy/${basePath}/thumbnail.jpeg`;
}
</script>
