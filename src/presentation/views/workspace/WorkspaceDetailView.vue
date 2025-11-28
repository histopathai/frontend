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
            class="size-6"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z"
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
