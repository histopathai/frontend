import { ref, computed } from 'vue';
import { useImageStore } from '@/stores/image';
import { useToast } from 'vue-toastification';
import { useI18n } from 'vue-i18n';

export type UploadMode = 'local' | 'microscope';

export function useImageUpload(patientId: string, emit: (event: 'close' | 'uploaded') => void) {
  const store = useImageStore();
  const toast = useToast();
  const { t } = useI18n();

  const mode = ref<UploadMode>('local');
  const selectedFile = ref<File | null>(null);
  const previewUrl = ref<string | null>(null);
  const loading = computed(() => store.uploading);
  const microscopeError = ref<string | null>(null);

  const MICROSCOPE_URL = import.meta.env.VITE_MICROSCOPE_API_URL;

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
    if (!file.type.startsWith('image/')) {
      toast.error(t('image.validation.file_type_invalid'));
      return;
    }
    selectedFile.value = file;
    previewUrl.value = URL.createObjectURL(file);
  }

  async function captureFromMicroscope() {
    if (!MICROSCOPE_URL) {
      microscopeError.value = 'Mikroskop IP ayarları yapılandırılmamış.';
      return;
    }

    microscopeError.value = null;
    try {
      const response = await fetch(`${MICROSCOPE_URL}/snapshot`, {
        method: 'GET',
      });

      if (!response.ok) throw new Error('Mikroskoptan görüntü alınamadı');

      const blob = await response.blob();
      const filename = `microscope_capture_${new Date().getTime()}.jpg`;
      const file = new File([blob], filename, { type: 'image/jpeg' });

      setFile(file);
      toast.success('Görüntü yakalandı');
    } catch (err: any) {
      console.error(err);
      microscopeError.value = 'Mikroskoba bağlanılamadı.';
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
    }
  }

  function clearSelection() {
    selectedFile.value = null;
    previewUrl.value = null;
    microscopeError.value = null;
  }

  return {
    mode,
    selectedFile,
    previewUrl,
    loading,
    microscopeError,
    uploadProgress: computed(() => store.uploadProgress),
    MICROSCOPE_URL,
    handleFileSelect,
    handleDrop,
    captureFromMicroscope,
    upload,
    clearSelection,
  };
}
