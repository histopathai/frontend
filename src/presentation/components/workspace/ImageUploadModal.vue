<template>
  <Modal
    :is-open="isOpen"
    :title="`'${patientName}' için Görüntü Yükle`"
    @close="closeModal"
    :hide-actions="isUploading"
  >
    <MicroscopeCaptureModal
      :is-open="isMicroscopeCaptureModalOpen"
      @close="isMicroscopeCaptureModalOpen = false"
      @imageCaptured="handleCaptureSuccess"
    />

    <div
      v-if="isLivePreview || selectingLocalCamera"
      class="fixed inset-0 z-50 bg-black bg-opacity-90 flex flex-col items-center justify-center"
      @click.self="stopLocalCameraPreview(true)"
    >
      <div
        v-if="selectingLocalCamera && !isLivePreview"
        class="p-6 bg-white rounded-lg w-full max-w-md shadow-xl"
      >
        <h3 class="text-lg font-medium text-gray-900 mb-4">Kullanılacak Kamerayı Seçin</h3>
        <div v-if="localCameras.length > 0" class="space-y-2">
          <button
            v-for="camera in localCameras"
            :key="camera.deviceId"
            @click="startLocalCameraPreview(camera.deviceId)"
            class="w-full btn btn-outline"
          >
            {{ camera.label || `Kamera ${camera.deviceId.substring(0, 6)}` }}
          </button>
        </div>
        <p v-else class="text-gray-500 text-center">Kullanılabilir yerel kamera bulunamadı.</p>
        <button @click="cancelCameraSelection" type="button" class="mt-4 w-full btn btn-outline">
          Geri
        </button>
      </div>

      <video
        v-show="isLivePreview"
        ref="videoEl"
        class="w-full h-full object-contain"
        autoplay
        playsinline
      ></video>
      <div
        v-if="isLivePreview"
        class="absolute bottom-0 left-0 right-0 p-4 flex justify-center items-center gap-4 bg-black bg-opacity-50"
      >
        <button
          @click="stopLocalCameraPreview(true)"
          type="button"
          class="btn btn-outline text-white border-white hover:bg-white hover:text-black"
        >
          Geri
        </button>
        <button
          @click="captureFromLocalCamera"
          type="button"
          class="w-16 h-16 p-4 bg-white rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          aria-label="Fotoğraf Çek"
        ></button>
        <div class="w-24"></div>
      </div>
      <canvas ref="canvasEl" class="hidden"></canvas>
    </div>

    <form @submit.prevent="handleUpload">
      <div>
        <label class="form-label">Görüntü Dosyası *</label>
        <div class="mt-2 flex items-center gap-4">
          <div
            class="w-24 h-24 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden"
          >
            <img
              v-if="fileBlobUrl"
              :src="fileBlobUrl"
              class="w-full h-full object-cover rounded-md"
              alt="Önizleme"
            />
            <svg
              v-else
              class="w-12 h-12 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              ></path>
            </svg>
          </div>
          <div class="flex flex-col gap-2">
            <button
              @click="triggerFileInput"
              type="button"
              class="btn btn-outline btn-sm"
              :disabled="
                isUploading || isConnectingToMicroscope || selectingLocalCamera || isLivePreview
              "
            >
              Galeriden Seç
            </button>
            <button
              @click="promptMicroscopeCapture"
              type="button"
              class="btn btn-outline btn-sm"
              :disabled="
                isUploading || isConnectingToMicroscope || selectingLocalCamera || isLivePreview
              "
            >
              {{ isConnectingToMicroscope ? 'Bağlanıyor...' : 'Mikroskoptan Çek' }}
            </button>
            <button
              @click="promptLocalCameraSelection"
              type="button"
              class="btn btn-outline btn-sm"
              :disabled="
                isUploading || isConnectingToMicroscope || selectingLocalCamera || isLivePreview
              "
            >
              Kameradan Çek
            </button>
          </div>
        </div>
        <input
          id="file-upload"
          ref="fileInputEl"
          name="file-upload"
          type="file"
          @change="handleFileChange"
          class="hidden"
          :accept="acceptedFormats"
        />
      </div>

      <p v-if="fileError" class="form-error mt-4">{{ fileError }}</p>

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
import { ref, computed, watch, nextTick, onUnmounted } from 'vue';
import Modal from '@/presentation/components/common/Modal.vue';
import MicroscopeCaptureModal from './MicroscopeCaptureModal.vue'; // Yeni import
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

const acceptedFormats = '.tiff,.svs,.tif,.png,.jpg,.jpeg,.dng';

// Temel Form State
const selectedFile = ref<File | null>(null);
const fileBlobUrl = ref<string | null>(null);
const fileError = ref<string | null>(null);
const fileInputEl = ref<HTMLInputElement | null>(null);

// Yükleme State
const isUploading = ref(false);
const uploadProgress = ref(0);

// Mikroskop State
const isConnectingToMicroscope = ref(false);
const isMicroscopeCaptureModalOpen = ref(false);

// Yerel Kamera State
const isLivePreview = ref(false);
const selectingLocalCamera = ref(false);
const localCameras = ref<MediaDeviceInfo[]>([]);
const selectedCameraId = ref('');
const videoEl = ref<HTMLVideoElement | null>(null);
const canvasEl = ref<HTMLCanvasElement | null>(null);
const stream = ref<MediaStream | null>(null);

const patientName = computed(() => props.patient?.name || '');
const creatorId = computed(() => authStore.user?.userId || 'unknown');

// === Dosya State Yönetimi ===

/**
 * Seçilen veya yakalanan dosyayı ve blob URL'ini ayarlar.
 */
const updateFileState = (newFile: File, existingBlobUrl: string | null = null) => {
  if (!(newFile instanceof File || newFile instanceof Blob)) {
    console.error('updateFileState geçersiz bir dosya aldı:', newFile);
    fileError.value = 'Geçersiz dosya verisi.';
    return;
  }

  selectedFile.value = newFile;

  // Önceki blob'u (varsa) temizle
  if (fileBlobUrl.value) {
    URL.revokeObjectURL(fileBlobUrl.value);
  }

  // Yeni blob URL'ini ayarla
  fileBlobUrl.value = existingBlobUrl || URL.createObjectURL(newFile);
  fileError.value = ''; // Başarı durumunda hataları temizle
};

/**
 * Formu ve tüm state'leri sıfırlar.
 */
const resetForm = () => {
  if (fileBlobUrl.value) {
    URL.revokeObjectURL(fileBlobUrl.value);
    fileBlobUrl.value = null;
  }
  selectedFile.value = null;
  if (fileInputEl.value) fileInputEl.value.value = null;

  fileError.value = null;
  isUploading.value = false;
  uploadProgress.value = 0;
  isConnectingToMicroscope.value = false;
  isMicroscopeCaptureModalOpen.value = false;
};

// === Ana Yükleme Mantığı ===

const handleUpload = async () => {
  if (!selectedFile.value || !props.patient) {
    fileError.value = 'Lütfen bir dosya seçin veya çekin.';
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

    // 3. Başarılı
    toast.success(`'${file.name}' yüklendi! İşlenmek üzere sıraya alındı.`);

    const fakeImage = Image.create({
      id: `temp-${Date.now()}`,
      patient_id: props.patient.id,
      creator_id: creatorId.value,
      name: file.name,
      format: createImageReq.format,
      status: 'PROCESSING',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
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
    stopLocalCameraPreview(false); // Kamera açıksa kapat
    emit('close');
  }
};

// Modal kapandığında state'i sıfırla
watch(
  () => props.isOpen,
  (newVal) => {
    if (!newVal) {
      resetForm();
    }
  }
);

// === 1. Galeriden Seçim ===

const triggerFileInput = () => {
  fileInputEl.value?.click();
};

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    updateFileState(target.files[0], null);
  }
};

// === 2. Mikroskop Yakalama ===

const promptMicroscopeCapture = async () => {
  isConnectingToMicroscope.value = true;
  fileError.value = '';
  let connectionSuccessful = false;
  let connectionError = '';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort('timeout'), 5000);

  try {
    // Mikroskopa bağlanmayı sına (CORS hatası verebilir, 'no-cors' ile deniyoruz)
    await fetch('http://192.168.7.2:8080/', {
      method: 'HEAD',
      signal: controller.signal,
      mode: 'no-cors',
    });
    connectionSuccessful = true;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      connectionError = 'Mikroskopa bağlanılamadı (Timeout).';
    } else {
      // no-cors modu başarılı olsa bile 'opaque' bir yanıt döner ve fetch() 'fail' olur.
      // Bu yüzden, timeout dışındaki her durumu (CORS hatası dahil) 'bağlanabilir' sayıyoruz.
      // Gerçek hata yakalama modalı içinde yapılacak.
      connectionSuccessful = true;
    }
    console.warn('PiCam Connection Check Warning/Error:', err);
  } finally {
    clearTimeout(timeoutId);
    isConnectingToMicroscope.value = false;
  }

  if (connectionSuccessful) {
    isMicroscopeCaptureModalOpen.value = true;
  } else {
    fileError.value = connectionError;
    toast.error(fileError.value);
  }
};

/**
 * Mikroskop veya Kamera modalından gelen başarılı yakalamayı işler.
 */
const handleCaptureSuccess = ({
  file: capturedFile,
  blobUrl: capturedBlobUrl,
}: {
  file: File;
  blobUrl: string;
}) => {
  updateFileState(capturedFile, capturedBlobUrl);

  // Tüm aktif yakalama pencerelerini kapat
  isLivePreview.value = false;
  selectingLocalCamera.value = false;
  isMicroscopeCaptureModalOpen.value = false;
  stopLocalCameraPreview(false); // Varsa yerel kamera stream'ini durdur
};

// === 3. Yerel Kamera Yakalama ===

const promptLocalCameraSelection = async () => {
  fileError.value = '';
  selectingLocalCamera.value = true;
  isLivePreview.value = false;
  localCameras.value = [];

  try {
    // Önce izin al
    const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    // İzin alındıktan sonra cihazları listele
    const devices = await navigator.mediaDevices.enumerateDevices();
    localCameras.value = devices.filter((device) => device.kind === 'videoinput');
    // Geçici stream'i hemen kapat
    tempStream.getTracks().forEach((track) => track.stop());

    if (localCameras.value.length === 0) {
      fileError.value = 'Kullanılabilir yerel kamera bulunamadı.';
      toast.warn(fileError.value);
      selectingLocalCamera.value = false;
    }
  } catch (err) {
    console.error('Yerel kameralar listelenemedi:', err);
    fileError.value = 'Kamera erişim izni reddedildi veya bir hata oluştu.';
    toast.error(fileError.value);
    selectingLocalCamera.value = false;
  }
};

const startLocalCameraPreview = async (deviceId: string) => {
  selectedCameraId.value = deviceId;
  stopLocalCameraPreview(false); // Varsa eskisini durdur
  try {
    stream.value = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: deviceId } },
    });
    selectingLocalCamera.value = false;
    isLivePreview.value = true;
    await nextTick();
    if (videoEl.value) {
      videoEl.value.srcObject = stream.value;
    }
  } catch (err) {
    toast.error('Seçilen kamera başlatılamadı.');
    console.error('Kamera Başlatma Hatası:', err);
    isLivePreview.value = false;
    selectingLocalCamera.value = true;
  }
};

const stopLocalCameraPreview = (goBackToSelection = false) => {
  if (stream.value) {
    stream.value.getTracks().forEach((track) => track.stop());
    stream.value = null;
  }
  if (videoEl.value) {
    videoEl.value.srcObject = null;
  }
  isLivePreview.value = false;
  if (goBackToSelection) {
    selectingLocalCamera.value = true;
  } else {
    selectingLocalCamera.value = false;
  }
};

const captureFromLocalCamera = () => {
  const video = videoEl.value;
  const canvas = canvasEl.value;
  if (!video || !canvas || !isLivePreview.value) return;

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);

  canvas.toBlob((blob) => {
    if (!blob) {
      toast.error('Görüntü verisi oluşturulamadı.');
      return;
    }
    const fileName = `localcam-${Date.now()}.jpg`;
    const capturedFile = new File([blob], fileName, { type: 'image/jpeg' });
    const blobUrl = URL.createObjectURL(capturedFile);

    // Başarılı yakalamayı işle
    handleCaptureSuccess({ file: capturedFile, blobUrl: blobUrl });
  }, 'image/jpeg');
};

const cancelCameraSelection = () => {
  selectingLocalCamera.value = false;
  fileError.value = '';
};

onUnmounted(() => {
  stopLocalCameraPreview(false);
  resetForm(); // Component kaldırılırsa blob url'i temizle
});
</script>

<style scoped>
.form-error {
  @apply mt-1 text-sm text-red-600;
}
</style>
