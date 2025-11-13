<template>
  <div class="card">
    <div
      class="card-header flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2"
    >
      <div>
        <h2 class="text-lg sm:text-xl font-semibold">
          {{ workspace.name }}
        </h2>
        <div class="flex items-center gap-3 text-xs sm:text-sm text-gray-600 mt-1">
          <span><strong>Organ:</strong> {{ workspace.organType || 'Bilinmiyor' }}</span>
          <span class="text-gray-300">|</span>
          <span><strong>Kurum:</strong> {{ workspace.organization || 'Bilinmiyor' }}</span>
        </div>
      </div>
      <div class="flex gap-1 w-full sm:w-auto justify-end">
        <button @click.stop="$emit('create-patient', workspace)" class="btn btn-primary btn-sm">
          Yeni Hasta Ekle
        </button>
        <button
          @click.stop="$emit('delete-workspace', workspace)"
          class="btn btn-ghost-danger btn-sm"
        >
          Sil
        </button>
      </div>
    </div>

    <button
      @click="toggleExpansion"
      class="w-full bg-gray-50 hover:bg-gray-100 p-2 text-xs font-medium text-gray-500 border-b border-t border-gray-200"
    >
      {{ isExpanded ? 'Hastaları Gizle' : 'Hastaları Göster' }} ({{ patients.length }})
    </button>

    <div v-if="isExpanded" class="card-body">
      <div v-if="patients.length === 0" class="text-gray-500 text-sm italic">
        Bu çalışma alanında henüz hasta yok.
      </div>

      <div v-else class="space-y-3">
        <PatientCard
          v-for="patient in patients"
          :key="patient.id"
          :patient="patient"
          :get-images-for-patient="getImagesForPatient"
          @upload-image="$emit('upload-image', $event)"
          @delete-patient="$emit('delete-patient', $event)"
          @delete-image="$emit('delete-image', $event)"
          @load-images="$emit('load-images', patient.id)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, defineProps, defineEmits, ComputedRef } from 'vue';
import type { PropType } from 'vue';
import type { Workspace } from '@/core/entities/Workspace';
import type { Patient } from '@/core/entities/Patient';
import type { Image } from '@/core/entities/Image';
import PatientCard from './PatientCard.vue';

defineProps({
  workspace: { type: Object as PropType<Workspace>, required: true },
  patients: { type: Array as PropType<Patient[]>, required: true },
  getImagesForPatient: {
    type: Function as PropType<(patientId: string) => ComputedRef<Image[]>>,
    required: true,
  },
});

const emit = defineEmits([
  'load-patients',
  'load-images',
  'create-patient',
  'edit-workspace',
  'delete-workspace',
  'delete-patient',
  'upload-image',
  'delete-image',
  'move-patient',
  'move-image',
  'view-image',
]);

const isExpanded = ref(false);

const toggleExpansion = () => {
  isExpanded.value = !isExpanded.value;
  // Sadece genişletildiğinde ve hastalar henüz yüklenmemişse yükle
  if (isExpanded.value && props.patients.length === 0) {
    emit('load-patients');
  }
};
</script>
