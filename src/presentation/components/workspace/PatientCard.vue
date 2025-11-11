<template>
  <div class="p-2 sm:p-3 border rounded-md bg-white shadow-sm">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">
      <div>
        <h4
          class="font-semibold text-gray-800 text-sm sm:text-base cursor-pointer hover:text-indigo-600"
          @click="togglePatientExpansion"
          title="Görüntüleri göster/gizle"
        >
          Hasta: {{ patient.name }}
          <span
            v-if="hasProcessingImages && !isExpanded"
            class="ml-2 text-xs font-medium text-blue-600"
            >(İşleniyor...)</span
          >
        </h4>
        <p class="text-xs sm:text-sm text-gray-600">
          {{ patient.age ? `${patient.age} Yaş` : 'Yaş: -' }}
          {{ patient.gender ? ` | ${patient.gender}` : '| Cinsiyet: -' }}
        </p>
      </div>
      <div class="flex gap-1 sm:gap-1.5 flex-shrink-0">
        <button @click.stop="$emit('upload-image', patient)" class="btn btn-outline btn-xs">
          Görüntü Yükle
        </button>
        <button @click.stop="$emit('delete-patient', patient)" class="btn btn-ghost-danger btn-xs">
          Sil
        </button>
      </div>
    </div>

    <div v-if="isExpanded" class="pt-2 border-t">
      <div v-if="images.length === 0" class="text-gray-500 text-xs italic ml-1">
        Bu hastaya ait görüntü yok.
      </div>
      <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
        <ImageCard
          v-for="image in images"
          :key="image.id"
          :image="image"
          @delete-image="$emit('delete-image', image)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, defineProps, defineEmits, computed, watchEffect, onUnmounted } from 'vue';
import type { PropType } from 'vue';
import type { Patient } from '@/core/entities/Patient';
import type { Image } from '@/core/entities/Image'; // Image entity'sini import et
import { useWorkspaceStore } from '@/stores/workspace';
import ImageCard from './ImageCard.vue';

const props = defineProps({
  patient: { type: Object as PropType<Patient>, required: true },
  getImagesForPatient: {
    type: Function as PropType<(patientId: string) => ComputedRef<Image[]>>,
    required: true,
  },
});

const emit = defineEmits(['load-images', 'upload-image', 'delete-patient', 'delete-image']);

const store = useWorkspaceStore();
const isExpanded = ref(false);
const poller = ref<NodeJS.Timeout | null>(null);

// Data
const images = computed(() => props.getImagesForPatient(props.patient.id).value || []);
const hasProcessingImages = computed(() =>
  images.value.some((img: Image) => img.status.toString() === 'PROCESSING')
);

// Actions
const togglePatientExpansion = () => {
  isExpanded.value = !isExpanded.value;
  if (isExpanded.value) {
    // Görüntüleri yüklemeyi tetikle (store'daki fetchImages sadece yoksa çeker)
    emit('load-images');
  }
};

// --- POLLING LOGIC ---
watchEffect(() => {
  // Sadece: (expanded İSE) VE (işlenen görüntü VARSA) VE (poller çalışmıyorsa)
  if (isExpanded.value && hasProcessingImages.value && !poller.value) {
    // Polling'i başlat
    poller.value = setInterval(async () => {
      try {
        const updatedImages = await store.refreshPatientImages(props.patient.id);
        const stillProcessing = updatedImages.some(
          (img: Image) => img.status.toString() === 'PROCESSING'
        );

        if (!stillProcessing) {
          // İşlenecek görüntü kalmadıysa poller'ı durdur
          if (poller.value) clearInterval(poller.value);
          poller.value = null;
        }
      } catch (err) {
        // Hata olursa poller'ı durdur
        if (poller.value) clearInterval(poller.value);
        poller.value = null;
      }
    }, 10000); // 10 saniyede bir kontrol et
  }
  // Sadece: ((expanded DEĞİLSE) VEYA (işlenen görüntü YOKSA)) VE (poller çalışıyorsa)
  else if ((!isExpanded.value || !hasProcessingImages.value) && poller.value) {
    // Polling'i durdur
    clearInterval(poller.value);
    poller.value = null;
  }
});

// Component kaldırıldığında (örn. workspace silindiğinde) poller'ı temizle
onUnmounted(() => {
  if (poller.value) {
    clearInterval(poller.value);
    poller.value = null;
  }
});
</script>
