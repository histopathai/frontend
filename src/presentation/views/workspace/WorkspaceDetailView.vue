<template>
  <div class="space-y-6">
    <nav class="flex" aria-label="Breadcrumb">
      <ol class="flex items-center space-x-4">
        <li>
          <RouterLink
            :to="{ name: 'WorkspaceList' }"
            class="text-gray-500 hover:text-gray-700 flex items-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              class="w-5 h-5 mr-1"
            >
              <path
                fill-rule="evenodd"
                d="M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7Z"
                clip-rule="evenodd"
              />
            </svg>
            {{ t('workspace.list.title') }}
          </RouterLink>
        </li>
        <li>
          <svg class="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              clip-rule="evenodd"
            />
          </svg>
        </li>
        <li>
          <span class="text-gray-900 font-medium" v-if="workspace">{{ workspace.name }}</span>
          <span class="text-gray-400" v-else>...</span>
        </li>
      </ol>
    </nav>

    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">{{ t('patient.list.title') }}</h1>
        <p class="text-sm text-gray-500 mt-1" v-if="workspace">
          {{ workspace.organization }} <span class="mx-2">•</span>
          <span
            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
          >
            {{ workspace.organType }}
          </span>
        </p>
      </div>
      <div class="flex gap-3">
        <button
          class="btn btn-outline bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50"
          @click="isAnnotationSettingsModalOpen = true"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="w-5 h-5 mr-2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281Z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
            />
          </svg>
          Etiketleme Ayarları
        </button>

        <button class="btn btn-primary" @click="handleCreatePatientClick">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="w-5 h-5 mr-2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {{ t('patient.actions.create') }}
        </button>
      </div>
    </div>

    <PatientList ref="patientListRef" :workspace-id="workspaceId" />

    <AnnotationSettingsModal
      v-if="isAnnotationSettingsModalOpen"
      :workspace-id="workspaceId"
      :workspace-name="workspace?.name"
      :current-annotation-type-id="workspace?.annotationTypeId || undefined"
      @close="isAnnotationSettingsModalOpen = false"
      @saved="reloadWorkspace"
    />

    <CreatePatientModal
      v-if="isCreatePatientModalOpen"
      :workspace-id="workspaceId"
      @close="isCreatePatientModalOpen = false"
      @saved="onPatientSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { repositories } from '@/services';
import { useI18n } from 'vue-i18n';
import { useToast } from 'vue-toastification';
import type { Workspace } from '@/core/entities/Workspace';

import PatientList from '@/presentation/components/patient/PatientList.vue';
import AnnotationSettingsModal from '@/presentation/components/workspace/AnnotationSettingsModal.vue';
import CreatePatientModal from '@/presentation/components/patient/CreatePatientModal.vue';

const props = defineProps({
  workspaceId: { type: String, required: true },
});

const { t } = useI18n();
const toast = useToast();
const workspace = ref<Workspace | null>(null);
const isAnnotationSettingsModalOpen = ref(false);
const isCreatePatientModalOpen = ref(false);

const patientListRef = ref<InstanceType<typeof PatientList> | null>(null);

async function loadWorkspace() {
  try {
    workspace.value = await repositories.workspace.getById(props.workspaceId);
  } catch (e) {
    console.error('Workspace yüklenirken hata:', e);
  }
}

function reloadWorkspace() {
  isAnnotationSettingsModalOpen.value = false;
  loadWorkspace();
}

async function handleCreatePatientClick() {
  if (!workspace.value) return;
  if (!workspace.value.annotationTypeId) {
    toast.warning('Hasta eklemeden önce anotasyon ayarlarını yapmalısınız.');
    isAnnotationSettingsModalOpen.value = true;
  } else {
    isCreatePatientModalOpen.value = true;
  }
}

function onPatientSaved() {
  isCreatePatientModalOpen.value = false;
  if (patientListRef.value) {
    patientListRef.value.loadPatients();
  }
}

onMounted(() => {
  loadWorkspace();
});
</script>
