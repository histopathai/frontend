<template>
  <div class="p-4 bg-white border-b border-gray-200">
    <div v-if="patient" class="flex flex-wrap items-center gap-x-6 gap-y-4">
      <div class="flex-1 min-w-[200px]">
        <label class="form-label">Hasta Adı:</label>
        <span class="text-lg font-semibold ml-2">{{ patient.name }}</span>
      </div>

      <div class="w-24">
        <label for="age" class="form-label">Yaş</label>
        <input id="age" type="number" class="form-input form-input-sm" v-model.number="age" />
      </div>

      <div class="w-32">
        <label for="gender" class="form-label">Cinsiyet</label>
        <input id="gender" type="text" class="form-input form-input-sm" v-model="gender" />
      </div>

      <div class="w-48">
        <label for="disease" class="form-label">Teşhis</label>
        <input id="disease" type="text" class="form-input form-input-sm" v-model="disease" />
      </div>

      <div class="w-48">
        <label for="subtype" class="form-label">Alt Tip</label>
        <input id="subtype" type="text" class="form-input form-input-sm" v-model="subtype" />
      </div>

      <div class="w-24">
        <label for="grade" class="form-label">Grade</label>
        <input id="grade" type="number" class="form-input form-input-sm" v-model.number="grade" />
      </div>

      <div class="ml-auto">
        <button @click="savePatientChanges" :disabled="loading" class="btn btn-primary btn-sm">
          {{ loading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet' }}
        </button>
      </div>
    </div>
    <div v-else class="text-gray-500">Metadata için bir hasta seçin.</div>
  </div>
</template>

<script setup lang="ts">
import { type PropType, toRef } from 'vue';
import type { Patient } from '@/core/entities/Patient';
import { usePatientEditor } from '@/presentation/composables/annotator/usePatientEditor';

const props = defineProps({
  patient: {
    type: Object as PropType<Patient | null>,
    default: null,
  },
});

const {
  loading,
  age,
  gender,
  disease,
  subtype,
  grade,

  savePatientChanges,
} = usePatientEditor(toRef(props, 'patient'));
</script>
