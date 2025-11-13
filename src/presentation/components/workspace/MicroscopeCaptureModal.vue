<template>
  <TransitionRoot as="template" :show="isOpen">
    <Dialog as="div" class="relative z-50" @close="cancelCapture">
      <TransitionChild
        as="template"
        enter="duration-300 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-200 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" />
      </TransitionChild>

      <div class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center">
          <TransitionChild
            as="template"
            enter="duration-300 ease-out"
            enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enter-to="opacity-100 translate-y-0 sm:scale-100"
            leave="duration-200 ease-in"
            leave-from="opacity-100 translate-y-0 sm:scale-100"
            leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <DialogPanel
              class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md"
            >
              <div class="p-6 text-center">
                <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900">
                  Mikroskop Görüntüsü
                </DialogTitle>
                <div class="mt-4">
                  <div v-if="isCapturing" class="space-y-2">
                    <p>Görüntü çekiliyor...</p>
                    <svg
                      class="animate-spin h-8 w-8 text-indigo-600 mx-auto"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        class="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        stroke-width="4"
                      ></circle>
                      <path
                        class="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <p class="text-sm text-gray-500">(Bu işlem 30 saniyeye kadar sürebilir)</p>
                  </div>
                  <div v-if="captureError" class="text-red-500">
                    <p>Hata: {{ captureError }}</p>
                  </div>
                </div>
              </div>
              <div class="bg-gray-50 px-4 py-3 sm:px-6">
                <button
                  type="button"
                  class="btn btn-outline w-full"
                  @click="cancelCapture"
                  :disabled="isCapturing"
                >
                  {{ isCapturing ? 'İptal Ediliyor...' : captureError ? 'Kapat' : 'İptal' }}
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue';
import { useToast } from 'vue-toastification';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
});
const emit = defineEmits(['close', 'imageCaptured']);
const toast = useToast();

const isCapturing = ref(false);
const captureError = ref('');
let abortController: AbortController | null = null;

watch(
  () => props.isOpen,
  (newVal) => {
    if (newVal) {
      startCapture();
    } else {
      if (abortController) {
        abortController.abort();
      }
    }
  }
);

const startCapture = async () => {
  isCapturing.value = true;
  captureError.value = '';
  abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    if (abortController) abortController.abort('timeout');
  }, 30000);

  try {
    const response = await fetch('http://192.168.7.2:8080/capture', {
      signal: abortController.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Sunucu hatası: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
    const fileName = `picam-${Date.now()}.dng`;
    const capturedFile = new File([blob], fileName, { type: 'image/x-dng' });
    const blobUrl = URL.createObjectURL(capturedFile);

    emit('imageCaptured', { file: capturedFile, blobUrl: blobUrl });
    toast.success('Mikroskop görüntüsü başarıyla alındı.');
    closeModal();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      if (err.message === 'timeout') {
        captureError.value = 'Mikroskop yanıt vermedi (30sn Timeout).';
      } else {
        captureError.value = 'Çekim iptal edildi.';
      }
    } else {
      captureError.value = 'Görüntü alınamadı. Bağlantıyı kontrol edin.';
    }
    console.error('PiCam Capture Error:', err);
  } finally {
    isCapturing.value = false;
    abortController = null;
  }
};

const cancelCapture = () => {
  if (abortController) {
    abortController.abort();
  }
  closeModal();
};

const closeModal = () => {
  emit('close');
};

onUnmounted(() => {
  if (abortController) {
    abortController.abort();
  }
});
</script>
