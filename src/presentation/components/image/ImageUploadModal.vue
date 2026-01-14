<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    @click.self="handleClose"
  >
    <div
      class="card w-full shadow-xl rounded-xl bg-white overflow-hidden transition-all duration-300 flex flex-col"
      :class="
        mode === 'microscope' && !selectedFile ? 'max-w-7xl h-[90vh]' : 'max-w-2xl max-h-[90vh]'
      "
    >
      <div
        class="card-header px-6 py-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0"
      >
        <h3 class="text-xl font-semibold text-gray-900">
          {{ t('image.upload.title') }}
        </h3>
        <button @click="handleClose" class="text-gray-400 hover:text-gray-500">
          <span class="sr-only">Kapat</span>
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div class="border-b border-gray-200 flex-shrink-0">
        <nav class="flex -mb-px" aria-label="Tabs">
          <button
            @click="switchMode('local')"
            :class="[
              mode === 'local'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              'w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm',
            ]"
          >
            Dosya Yükle
          </button>
          <button
            @click="switchMode('microscope')"
            :class="[
              mode === 'microscope'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              'w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm',
            ]"
          >
            Mikroskop
          </button>
        </nav>
      </div>

      <div class="card-body p-6 flex-1 min-h-0 overflow-hidden flex flex-col">
        <div v-if="mode === 'local' && !selectedFile" class="overflow-y-auto h-full">
          <div
            class="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:bg-gray-50 transition-colors"
            @dragover.prevent
            @drop.prevent="handleDrop"
          >
            <div class="space-y-1 text-center">
              <svg
                class="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <div class="flex text-sm text-gray-600 justify-center">
                <label
                  for="file-upload"
                  class="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                >
                  <span>Bir dosya seçin</span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    class="sr-only"
                    accept=".jpeg,.png,.tiff,.svs,.jpg,.tif,.bmp,.ndpi,.scn,.bif,.vms,.vmu,.dng"
                    @change="handleFileSelect"
                  />
                </label>
                <p class="pl-1">veya sürükleyip bırakın</p>
              </div>
              <p class="text-xs text-gray-500">{{ t('image.upload.file_types') }}</p>
            </div>
          </div>
        </div>

        <div v-if="mode === 'microscope' && !selectedFile" class="flex flex-col h-full w-full">
          <div v-if="cameras.length > 0" class="flex items-center gap-2 mb-4 flex-shrink-0">
            <label class="text-sm font-medium text-gray-700 whitespace-nowrap">Kaynak:</label>
            <select v-model="selectedDeviceId" class="form-input py-1.5 text-sm flex-1">
              <option v-for="camera in cameras" :key="camera.deviceId" :value="camera.deviceId">
                {{ camera.label || `Kamera ${camera.deviceId.substring(0, 5)}...` }}
              </option>
            </select>
          </div>

          <div
            class="flex-1 min-h-0 grid gap-4"
            :class="isPiCam ? 'grid-cols-1 lg:grid-cols-4' : 'grid-cols-1'"
          >
            <div
              class="flex flex-col h-full overflow-hidden"
              :class="isPiCam ? 'lg:col-span-3' : 'w-full'"
            >
              <div
                class="relative bg-black rounded-lg w-full h-full flex items-center justify-center overflow-hidden border border-gray-300"
              >
                <video
                  v-if="mediaStream"
                  ref="videoRef"
                  autoplay
                  playsinline
                  muted
                  class="w-full h-full object-contain"
                ></video>

                <div v-else class="text-gray-400 flex flex-col items-center">
                  <span v-if="!microscopeError" class="text-3xl mb-2 animate-pulse">📷</span>
                  <span v-if="!microscopeError">Kamera Başlatılıyor...</span>
                </div>

                <div
                  v-if="microscopeError"
                  class="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-10"
                >
                  <div class="text-center text-red-400">
                    <p class="font-bold">Bağlantı Hatası</p>
                    <p class="text-sm mb-2">{{ microscopeError }}</p>
                    <button
                      @click="initCameraSystem"
                      class="text-white underline text-sm hover:text-gray-200"
                    >
                      Tekrar Dene
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="isPiCam" class="lg:col-span-1 h-full flex flex-col min-h-0">
              <div
                class="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4 h-full overflow-y-auto"
              >
                <div
                  class="flex items-center justify-between border-b border-gray-200 pb-2 flex-shrink-0"
                >
                  <h4 class="text-sm font-semibold text-gray-700">Ayarlar</h4>
                  <button
                    @click="resetCameraSettings"
                    class="text-xs text-indigo-600 hover:text-indigo-800"
                  >
                    Sıfırla
                  </button>
                </div>
                <div class="space-y-4">
                  <div class="space-y-1">
                    <div class="flex items-center justify-between">
                      <label class="text-xs font-medium text-gray-700">Pozlama</label>
                      <span class="text-xs text-gray-500">{{
                        exposureTime ? `${exposureTime} μs` : 'Oto'
                      }}</span>
                    </div>
                    <input
                      type="range"
                      v-model.number="exposureTime"
                      min="0"
                      max="100000"
                      step="1000"
                      class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>
                  <div class="space-y-1">
                    <div class="flex items-center justify-between">
                      <label class="text-xs font-medium text-gray-700">Gain (ISO)</label>
                      <span class="text-xs text-gray-500">{{
                        gain ? `${gain.toFixed(1)}x` : 'Oto'
                      }}</span>
                    </div>
                    <input
                      type="range"
                      v-model.number="gain"
                      min="0"
                      max="16"
                      step="0.1"
                      class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex justify-center flex-shrink-0 mt-4">
            <button
              @click="captureFromMicroscope"
              class="btn btn-primary flex items-center gap-2 px-6 py-2 shadow-lg hover:scale-105 transition-transform"
              :disabled="!mediaStream && !isPiCam"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z"
                  clip-rule="evenodd"
                />
              </svg>
              Görüntü Yakala
            </button>
          </div>
        </div>

        <div v-if="selectedFile" class="mt-4 overflow-y-auto">
          <div class="relative rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div class="flex items-start space-x-4">
              <div class="flex-shrink-0">
                <img
                  v-if="previewUrl"
                  :src="previewUrl"
                  alt="Preview"
                  class="h-24 w-24 object-cover rounded-md border border-gray-300"
                />
                <div
                  v-else
                  class="h-24 w-24 flex items-center justify-center bg-gray-200 rounded-md border border-gray-300 text-gray-500"
                >
                  <span class="text-xs font-bold uppercase">{{
                    selectedFile.name.split('.').pop()
                  }}</span>
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900 truncate">{{ selectedFile.name }}</p>
                <p class="text-sm text-gray-500">
                  {{ (selectedFile.size / 1024 / 1024).toFixed(2) }} MB
                </p>
                <button
                  @click="clearSelection"
                  class="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  Seçimi Kaldır (Kameraya Dön)
                </button>
              </div>
            </div>
            <div v-if="loading" class="mt-4 w-full bg-gray-200 rounded-full h-2.5">
              <div
                class="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                :style="{ width: uploadProgress + '%' }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div
        class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0"
      >
        <button type="button" @click="handleClose" class="btn btn-outline" :disabled="loading">
          {{ t('image.actions.cancel') }}
        </button>
        <button
          type="button"
          @click="upload"
          :disabled="!selectedFile || loading"
          class="btn btn-primary"
        >
          <span v-if="loading">{{ t('image.upload.uploading') }}</span>
          <span v-else>{{ t('image.actions.upload') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useImageUpload } from '@/presentation/composables/image/useImageUpload';

const props = defineProps({
  patientId: { type: String, required: true },
});

const emit = defineEmits(['close', 'uploaded']);
const { t } = useI18n();

const {
  mode,
  selectedFile,
  previewUrl,
  loading,
  uploadProgress,
  microscopeError,
  MICROSCOPE_URL,
  mediaStream,
  cameras,
  selectedDeviceId,
  exposureTime,
  gain,
  handleFileSelect,
  handleDrop,
  captureFromMicroscope,
  upload,
  clearSelection,
  stopWebcam,
  initCameraSystem,
  resetCameraSettings,
} = useImageUpload(props.patientId, emit);

const videoRef = ref<HTMLVideoElement | null>(null);

const isPiCam = computed(() => {
  const currentCamera = cameras.value.find((c) => c.deviceId === selectedDeviceId.value);
  return currentCamera?.label.toLowerCase().includes('picam') || false;
});

watch(
  mediaStream,
  (newStream) => {
    if (videoRef.value && newStream) {
      videoRef.value.srcObject = newStream;
    }
  },
  { flush: 'post' }
);

function switchMode(newMode: 'local' | 'microscope') {
  mode.value = newMode;
  clearSelection();
}

function handleClose() {
  stopWebcam();
  emit('close');
}

onUnmounted(() => {
  stopWebcam();
});
</script>
