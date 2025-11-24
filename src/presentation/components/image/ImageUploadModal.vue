<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    @click.self="$emit('close')"
  >
    <div class="card w-full max-w-2xl shadow-xl rounded-xl bg-white overflow-hidden">
      <div class="card-header px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h3 class="text-xl font-semibold text-gray-900">
          {{ t('image.upload.title') }}
        </h3>
        <button @click="$emit('close')" class="text-gray-400 hover:text-gray-500">
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

      <div class="border-b border-gray-200">
        <nav class="flex -mb-px" aria-label="Tabs">
          <button
            @click="
              mode = 'local';
              clearSelection();
            "
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
            @click="
              mode = 'microscope';
              clearSelection();
            "
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

      <div class="card-body p-6">
        <div v-if="mode === 'local'" class="space-y-4">
          <div
            v-if="!selectedFile"
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
                    accept="image/*"
                    @change="handleFileSelect"
                  />
                </label>
                <p class="pl-1">veya sürükleyip bırakın</p>
              </div>
              <p class="text-xs text-gray-500">PNG, JPG, TIFF (Max 50MB)</p>
            </div>
          </div>
        </div>

        <div v-if="mode === 'microscope'" class="space-y-4">
          <div
            v-if="!selectedFile"
            class="relative bg-black rounded-lg aspect-video flex items-center justify-center overflow-hidden"
          >
            <img
              v-if="MICROSCOPE_URL"
              :src="`${MICROSCOPE_URL}/stream`"
              class="w-full h-full object-contain"
              alt="Microscope Stream"
              @error="microscopeError = 'Stream bağlantısı kurulamadı'"
            />
            <div v-else class="text-gray-400 flex flex-col items-center">
              <span class="text-3xl mb-2">🔬</span>
              <span>Mikroskop Bağlantısı Bekleniyor...</span>
            </div>

            <div
              v-if="microscopeError"
              class="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4"
            >
              <div class="text-center text-red-400">
                <p class="font-bold">Bağlantı Hatası</p>
                <p class="text-sm">{{ microscopeError }}</p>
                <button @click="microscopeError = null" class="mt-2 text-white underline text-sm">
                  Tekrar Dene
                </button>
              </div>
            </div>
          </div>

          <div v-if="!selectedFile" class="flex justify-center">
            <button @click="captureFromMicroscope" class="btn btn-primary flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
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

        <div v-if="selectedFile" class="mt-4">
          <div class="relative rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div class="flex items-start space-x-4">
              <div class="flex-shrink-0">
                <img
                  :src="previewUrl"
                  alt="Preview"
                  class="h-24 w-24 object-cover rounded-md border border-gray-300"
                />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900 truncate">
                  {{ selectedFile.name }}
                </p>
                <p class="text-sm text-gray-500">
                  {{ (selectedFile.size / 1024 / 1024).toFixed(2) }} MB
                </p>
                <button
                  @click="clearSelection"
                  class="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  Seçimi Kaldır
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

      <div class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
        <button type="button" @click="$emit('close')" class="btn btn-outline" :disabled="loading">
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
  handleFileSelect,
  handleDrop,
  captureFromMicroscope,
  upload,
  clearSelection,
} = useImageUpload(props.patientId, emit);
</script>
