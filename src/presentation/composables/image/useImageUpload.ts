import { ref, computed, watch } from 'vue';
import { useImageStore } from '@/stores/image';
import { useToast } from 'vue-toastification';
import { useI18n } from 'vue-i18n';

export type UploadMode = 'local' | 'microscope';

const ALLOWED_EXTENSIONS = [
  'jpeg',
  'png',
  'tiff',
  'svs',
  'jpg',
  'tif',
  'bmp',
  'ndpi',
  'scn',
  'bif',
  'vms',
  'vmu',
  'dng',
];

const PREVIEWABLE_EXTENSIONS = ['jpeg', 'jpg', 'png', 'bmp', 'webp'];

export function useImageUpload(patientId: string, emit: (event: 'close' | 'uploaded') => void) {
  const store = useImageStore();
  const toast = useToast();
  const { t } = useI18n();

  const mode = ref<UploadMode>('local');
  const selectedFile = ref<File | null>(null);
  const previewUrl = ref<string | null>(null);
  const loading = computed(() => store.uploading);
  const microscopeError = ref<string | null>(null);

  const mediaStream = ref<MediaStream | null>(null);

  // Kamera listesi ve seçili kamera ID'si
  const cameras = ref<MediaDeviceInfo[]>([]);
  const selectedDeviceId = ref<string>('');

  // Kamera Kontrol Parametreleri
  const exposureTime = ref<number>(0); // 0 = Otomatik, >0 = Mikrosaniye cinsinden
  const gain = ref<number>(0); // 0 = Otomatik, >0 = Gain çarpanı

  const MICROSCOPE_URL = import.meta.env.VITE_MICROSCOPE_API_URL;

  // Mod değiştiğinde
  watch(mode, async (newMode) => {
    if (newMode === 'microscope') {
      await initCameraSystem();
    } else {
      stopWebcam();
    }
  });

  // Seçili kamera değiştiğinde akışı yeniden başlat
  watch(selectedDeviceId, (newId) => {
    if (mode.value === 'microscope' && newId) {
      startWebcam();
    }
  });

  function stopWebcam() {
    if (mediaStream.value) {
      mediaStream.value.getTracks().forEach((track) => track.stop());
      mediaStream.value = null;
    }
  }

  // Kamera sistemini başlatma ve cihazları listeleme
  async function initCameraSystem() {
    microscopeError.value = null;
    try {
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      tempStream.getTracks().forEach((track) => track.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      cameras.value = devices.filter((d) => d.kind === 'videoinput');

      const firstCamera = cameras.value[0];
      if (firstCamera && !selectedDeviceId.value) {
        selectedDeviceId.value = firstCamera.deviceId;
      } else if (cameras.value.length === 0) {
        microscopeError.value = 'Sistemde bağlı kamera bulunamadı.';
      }

      if (selectedDeviceId.value) {
        await startWebcam();
      }
    } catch (err: any) {
      console.error('Kamera başlatma hatası:', err);
      microscopeError.value = 'Kameraya erişilemedi. İzinleri kontrol edin.';
    }
  }

  async function startWebcam() {
    stopWebcam();
    microscopeError.value = null;

    if (!selectedDeviceId.value) return;

    try {
      mediaStream.value = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: selectedDeviceId.value },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
    } catch (err: any) {
      console.error('Akış başlatma hatası:', err);
      microscopeError.value = 'Seçilen kamera başlatılamadı.';
    }
  }

  function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      const file = target.files[0];
      setFile(file);
    }
  }

  function handleDrop(event: DragEvent) {
    if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
      const file = event.dataTransfer.files[0];
      setFile(file);
    }
  }

  function setFile(file: File) {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
      toast.error(t('image.validation.file_type_invalid'));
      return;
    }

    selectedFile.value = file;

    if (PREVIEWABLE_EXTENSIONS.includes(extension)) {
      previewUrl.value = URL.createObjectURL(file);
    } else {
      previewUrl.value = null;
    }
  }

  function resetCameraSettings() {
    exposureTime.value = 0;
    gain.value = 0;
  }

  // --- GÜNCELLENEN FONKSİYON: Parametrelerle ---
  async function captureFromMicroscope() {
    microscopeError.value = null;

    // 1. Seçili kamerayı bul
    const currentCamera = cameras.value.find((c) => c.deviceId === selectedDeviceId.value);
    const isPiCam = currentCamera?.label.toLowerCase().includes('picam');

    toast.info('Görüntü yakalanıyor...');

    try {
      let file: File;

      if (isPiCam) {
        // --- SENARYO A: PiCam (HTTP İsteği) ---

        // URL parametrelerini oluştur
        const params = new URLSearchParams();
        if (exposureTime.value > 0) {
          params.append('exposure', exposureTime.value.toString());
        }
        if (gain.value > 0) {
          params.append('gain', gain.value.toString());
        }

        const url = `https://192.168.7.2/capture${params.toString() ? '?' + params.toString() : ''}`;
        console.log('PiCam capture URL:', url);

        // 30 saniye timeout için AbortController
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        try {
          const response = await fetch(url, {
            method: 'GET',
            signal: controller.signal,
          });

          if (!response.ok) throw new Error(`Mikroskop hatası: ${response.statusText}`);

          const blob = await response.blob();
          const filename = `microscope_capture_${new Date().getTime()}.dng`;
          file = new File([blob], filename, { type: blob.type || 'image/x-adobe-dng' });
        } finally {
          clearTimeout(timeoutId);
        }
      } else {
        // --- SENARYO B: Normal Kamera (Yerel Yakalama) ---
        if (!mediaStream.value) {
          throw new Error('Kamera akışı bulunamadı.');
        }

        const videoTrack = mediaStream.value.getVideoTracks()[0];
        // ImageCapture API'sini kullan
        // @ts-ignore
        const imageCapture = new ImageCapture(videoTrack);

        const blob = await imageCapture.takePhoto();
        const filename = `webcam_capture_${new Date().getTime()}.jpg`;
        file = new File([blob], filename, { type: 'image/jpeg' });
      }

      // Sonuç dosyayı ayarla
      setFile(file);
      toast.success(isPiCam ? 'Görüntü cihazdan alındı.' : 'Görüntü yakalandı.');
    } catch (err: any) {
      console.error(err);
      if (err.name === 'AbortError') {
        microscopeError.value = 'Bağlantı zaman aşımına uğradı (30sn).';
      } else {
        microscopeError.value = `Hata: ${err.message}`;
      }
      toast.error('Görüntü yakalanamadı.');
    }
  }

  async function upload() {
    if (!selectedFile.value) {
      toast.warning(t('image.validation.file_required'));
      return;
    }

    const result = await store.uploadImage(patientId, selectedFile.value);

    if (result) {
      emit('uploaded');
      emit('close');
      stopWebcam();
    }
  }

  function clearSelection() {
    selectedFile.value = null;
    previewUrl.value = null;
    microscopeError.value = null;
    if (mode.value === 'microscope') {
      startWebcam();
    }
  }

  return {
    mode,
    selectedFile,
    previewUrl,
    loading,
    microscopeError,
    uploadProgress: computed(() => store.uploadProgress),
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
  };
}
