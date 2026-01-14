<template>
  <div class="space-y-6">
    <nav class="flex" aria-label="Breadcrumb">
      <ol class="flex items-center space-x-4">
        <li>
          <RouterLink
            :to="{ name: 'WorkspaceList' }"
            class="text-gray-500 hover:text-gray-700 flex items-center"
          >
            {{ t('workspace.list.title') }}
          </RouterLink>
        </li>
        <li><span class="text-gray-400">/</span></li>
        <li>
          <RouterLink
            v-if="workspace"
            :to="{ name: 'WorkspaceDetail', params: { workspaceId } }"
            class="text-gray-500 hover:text-gray-700"
          >
            {{ workspace.name }}
          </RouterLink>
          <span v-else class="text-gray-400">...</span>
        </li>
        <li><span class="text-gray-400">/</span></li>
        <li>
          <span class="text-gray-900 font-medium" v-if="patient">{{ patient.name }}</span>
          <span class="text-gray-400" v-else-if="pageLoading">Yükleniyor...</span>
          <span class="text-red-500" v-else>Bulunamadı</span>
        </li>
      </ol>
    </nav>

    <div
      class="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-wrap justify-between items-center gap-4"
    >
      <div class="flex items-center gap-4">
        <div class="bg-indigo-100 text-indigo-600 p-3 rounded-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-8 w-8"
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

        <div>
          <div v-if="pageLoading" class="animate-pulse">
            <div class="h-8 bg-gray-200 rounded w-48 mb-2"></div>
            <div class="h-4 bg-gray-200 rounded w-32"></div>
          </div>

          <div v-else-if="patient">
            <h1 class="text-2xl font-bold text-gray-900">
              {{ patient.name }}
            </h1>
            <div class="flex items-center gap-3 text-sm text-gray-500 mt-1">
              <span
                class="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono text-gray-600"
                title="Hasta ID"
              >
                ID: {{ patientId }}
              </span>
              <span v-if="patient.age"> {{ patient.age }} Yaş </span>
              <span v-if="patient.gender"> • {{ patient.gender }} </span>
              <span
                v-if="patient.disease"
                class="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium border border-blue-100"
              >
                {{ patient.disease }}
              </span>
            </div>
          </div>

          <div v-else>
            <h1 class="text-2xl font-bold text-red-600">Hasta Bulunamadı</h1>
            <p class="text-sm text-gray-500">
              Bu ID'ye sahip hasta silinmiş veya taşınmış olabilir.
            </p>
          </div>
        </div>
      </div>

      <div v-if="patient">
        <button
          @click="isImageUploadModalOpen = true"
          class="btn btn-primary flex items-center gap-2 shadow-sm"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
          {{ t('patient.actions.upload_image') }}
        </button>
      </div>
    </div>

    <PatientImageGrid
      v-if="patient"
      ref="gridRef"
      :patient-id="patientId"
      @transfer="openTransferImageModal"
      @batch-transfer="openBatchTransferImageModal"
    />

    <ImageUploadModal
      v-if="isImageUploadModalOpen && patient"
      :patient-id="patient.id"
      @close="isImageUploadModalOpen = false"
      @uploaded="handleImageUploaded"
    />

    <TransferImageModal
      v-if="isTransferModalOpen && patient"
      :workspace-id="workspaceId"
      :current-patient-id="patientId"
      :image-ids="transferImageIds"
      @close="closeTransferModal"
      @transferred="handleTransferSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { repositories } from '@/services';
import type { Workspace } from '@/core/entities/Workspace';
import type { Patient } from '@/core/entities/Patient';
import { useToast } from 'vue-toastification';
import PatientImageGrid from '@/presentation/components/image/PatientImageGrid.vue';
import ImageUploadModal from '@/presentation/components/image/ImageUploadModal.vue';
import TransferImageModal from '@/presentation/components/image/TransferImageModal.vue';

const props = defineProps({
  workspaceId: { type: String, required: true },
  patientId: { type: String, required: true },
});

const { t } = useI18n();
const toast = useToast();
const workspace = ref<Workspace | null>(null);
const patient = ref<Patient | null>(null);
const pageLoading = ref(true);
const isImageUploadModalOpen = ref(false);
const isTransferModalOpen = ref(false);
const transferImageIds = ref<string[]>([]);
const gridRef = ref<InstanceType<typeof PatientImageGrid> | null>(null);

onMounted(async () => {
  pageLoading.value = true;
  try {
    const [wsResult, ptResult] = await Promise.all([
      repositories.workspace.getById(props.workspaceId),
      repositories.patient.getById(props.patientId),
    ]);

    workspace.value = wsResult;
    patient.value = ptResult;

    if (!ptResult) {
      toast.error('Hasta bilgileri bulunamadı.');
    }
  } catch (e) {
    console.error('Veri yükleme hatası', e);
    toast.error('Veriler yüklenirken bir hata oluştu.');
  } finally {
    pageLoading.value = false;
  }
});

function handleImageUploaded() {
  gridRef.value?.loadImages(true);
}

function openTransferImageModal(image: any) {
  transferImageIds.value = [image.id];
  isTransferModalOpen.value = true;
}

function openBatchTransferImageModal(ids: string[]) {
  transferImageIds.value = ids;
  isTransferModalOpen.value = true;
}

function closeTransferModal() {
  isTransferModalOpen.value = false;
  transferImageIds.value = [];
}

function handleTransferSuccess() {
  gridRef.value?.loadImages(true);
  toast.success('Görüntüler başarıyla transfer edildi.');
}
</script>
