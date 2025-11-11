<template>
  <Modal
    :is-open="isOpen"
    :title="`'${patientName}' için Görüntü Yükle`"
    @close="closeModal"
    :hide-actions="isUploading"
  >
    <form @submit.prevent="handleUpload">
      <div>
        <label for="file-upload" class="form-label">Dosya Seç (TIFF, SVS, vb.)</label>
        <input
          id="file-upload"
          type="file"
          @change="handleFileChange"
          class="form-input"
          accept=".tiff,.svs,.tif"
          :disabled="isUploading"
        />
        <p v-if="fileError" class="form-error">{{ fileError }}</p>
      </div>

      <div v-if="isUploading" class="mt-4">
        <p class="text-sm font-medium text-gray-700">Yükleniyor... {{ uploadProgress }}%</p>
        <div class="w-full bg-gray-200 rounded-full h-2.5 mt-2">
          <div
            class="bg-blue-600 h-2.5 rounded-full"
            :style="{ width: uploadProgress + '%' }"
          ></div>
        </div>
      </div>
    </form>

    <template #actions>
      <button
        type="button"
        class="btn btn-primary"
        @click="handleUpload"
        :disabled="!selectedFile || isUploading"
      >
        Yükle
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import Modal from '@/presentation/components/common/Modal.vue';
import { useWorkspaceStore } from '@/stores/workspace';
import { useAuthStore } from '@/stores/auth';
import { useToast } from 'vue-toastification';
import type { Patient } from '@/core/entities/Patient';
import type { PropType } from 'vue';
import type {
  CreateNewImageRequest,
  UploadImageParams,
} from '@/core/repositories/IImageRepository';
import { Image } from '@/core/entities/Image'; // "Fake image" için

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  patient: {
    type: Object as PropType<Patient | null>,
    default: null,
  },
});

const emit = defineEmits(['close', 'uploaded']);

const workspaceStore = useWorkspaceStore();
const authStore = useAuthStore();
const toast = useToast();

const selectedFile = ref<File | null>(null);
const fileError = ref<string | null>(null);
const isUploading = ref(false);
const uploadProgress = ref(0);

const patientName = computed(() => props.patient?.name || '');
const creatorId = computed(() => authStore.user?.userId || 'unknown');

watch(
  () => props.isOpen,
  (newVal) => {
    if (newVal) {
      selectedFile.value = null;
      fileError.value = null;
      isUploading.value = false;
      uploadProgress.value = 0;
    }
  }
);

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    selectedFile.value = target.files[0];
    fileError.value = null;
  } else {
    selectedFile.value = null;
  }
};

const handleUpload = async () => {
  if (!selectedFile.value || !props.patient) {
    fileError.value = 'Lütfen bir dosya seçin.';
    return;
  }
  if (isUploading.value) return;

  isUploading.value = true;
  uploadProgress.value = 0;
  fileError.value = null;

  const file = selectedFile.value;

  try {
    // 1. Backend'den imzalı URL al
    const createImageReq: CreateNewImageRequest = {
      patientId: props.patient.id,
      contentType: file.type,
      name: file.name,
      format: file.name.split('.').pop()?.toUpperCase() || 'UNKNOWN',
      size: file.size,
      // width/height burada bilinmiyor, backend'de işlenecek
    };

    const payload = await workspaceStore.getUploadPayload(createImageReq);

    // 2. Dosyayı GCS'ye yükle
    const uploadParams: UploadImageParams = {
      payload,
      file,
      onUploadProgress: (percentage) => {
        uploadProgress.value = percentage;
      },
    };

    await workspaceStore.uploadImage(uploadParams);

    // 3. Başarılı. Backend GCS event'ini alıp DB'ye yazacak.
    // Biz FE'de "iyimser" bir güncelleme yapıyoruz.
    toast.success(`'${file.name}' yüklendi! İşlenmek üzere sıraya alındı.`);

    // Backend'den `confirmUpload` sonrası dönen gerçek Image objesi yerine
    // geçici bir local obje oluşturup listeye ekliyoruz.
    const fakeImage = Image.create({
      id: `temp-${Date.now()}`,
      patientId: props.patient.id,
      creatorId: creatorId.value,
      name: file.name,
      format: createImageReq.format,
      status: 'PROCESSING', // 'PROCESSING' olarak başlat
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Diğer alanlar null/undefined
    });

    emit('uploaded', props.patient, fakeImage);
    closeModal();
  } catch (err: any) {
    console.error('Upload error:', err);
    fileError.value = err.response?.data?.message || err.message || 'Yükleme başarısız oldu.';
    toast.error(fileError.value);
  } finally {
    isUploading.value = false;
  }
};

const closeModal = () => {
  if (!isUploading.value) {
    emit('close');
  }
};
</script>

<style scoped>
.form-error {
  @apply mt-1 text-sm text-red-600;
}
</style>
