<template>
  <div
    class="flex flex-col h-full bg-white border-r border-gray-200 shadow-[2px_0_8px_rgba(0,0,0,0.02)]"
  >
    <div class="p-4 border-b border-gray-200 bg-gray-50/50">
      <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
        Çalışma Alanı
      </label>
      <div class="relative group">
        <select
          :value="selectedWorkspaceId"
          @change="onWorkspaceChange"
          class="block w-full pl-3 pr-10 py-2.5 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-all cursor-pointer hover:border-indigo-300"
        >
          <option :value="undefined" disabled>Bir Veri Seti Seçin...</option>
          <option v-for="ws in workspaces" :key="ws.id" :value="ws.id">
            {{ ws.name }}
          </option>
        </select>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto custom-scrollbar" @scroll="handleScroll">
      <div
        v-if="loading && patients.length === 0"
        class="flex flex-col items-center justify-center h-32 text-gray-400 text-sm"
      >
        <div
          class="animate-spin rounded-full h-6 w-6 border-2 border-indigo-500 border-t-transparent mb-2"
        ></div>
        Veriler yükleniyor...
      </div>

      <div
        v-else-if="!selectedWorkspaceId"
        class="flex flex-col items-center justify-center h-64 text-center px-6 text-gray-400"
      >
        <div class="bg-gray-50 p-4 rounded-full mb-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-8 w-8 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        </div>
        <p class="text-sm font-medium text-gray-500">Veri Seti Seçilmedi</p>
        <p class="text-xs mt-1">İşlem yapmak için yukarıdan seçim yapın.</p>
      </div>

      <div v-else class="py-2">
        <div v-if="patients.length === 0" class="p-6 text-center text-gray-400 text-sm italic">
          Kayıtlı hasta bulunamadı.
        </div>

        <div
          v-for="patient in sortedPatients"
          :key="patient.id"
          class="border-b border-gray-50 last:border-0"
        >
          <div
            @click="togglePatient(patient)"
            class="relative flex items-center justify-between px-4 py-3 cursor-pointer transition-all duration-200 hover:bg-gray-50 select-none group"
            :class="{ 'bg-indigo-50/60': isSelected(patient.id) }"
          >
            <div
              class="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600 rounded-r transition-transform duration-200"
              :class="isSelected(patient.id) ? 'scale-y-100' : 'scale-y-0'"
            ></div>

            <div class="flex items-center gap-3 overflow-hidden">
              <div
                class="p-1.5 rounded-md transition-colors"
                :class="
                  isSelected(patient.id)
                    ? 'bg-indigo-100 text-indigo-600'
                    : 'bg-gray-100 text-gray-500 group-hover:bg-white group-hover:shadow-sm'
                "
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  />
                </svg>
              </div>

              <div class="flex flex-col min-w-0">
                <span
                  class="text-sm font-medium text-gray-700 truncate"
                  :class="{ 'text-indigo-700': isSelected(patient.id) }"
                >
                  {{ patient.name }}
                </span>
                <span v-if="isSelected(patient.id)" class="text-[10px] text-gray-500">
                  {{ images.length }} Görüntü
                </span>
              </div>
            </div>

            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4 text-gray-400 transition-transform duration-300"
              :class="{ 'rotate-90 text-indigo-500': isSelected(patient.id) }"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>

          <transition
            enter-active-class="transition-all duration-300 ease-out"
            leave-active-class="transition-all duration-200 ease-in"
            enter-from-class="opacity-0 max-h-0"
            enter-to-class="opacity-100 max-h-[500px]"
            leave-from-class="opacity-100 max-h-[500px]"
            leave-to-class="opacity-0 max-h-0"
          >
            <div v-if="isSelected(patient.id)" class="overflow-hidden bg-gray-50/50 shadow-inner">
              <ul class="py-2 pl-4 pr-2 space-y-1">
                <li
                  v-if="images.length === 0"
                  class="py-3 pl-8 text-xs text-gray-400 italic flex items-center"
                >
                  <span class="w-1.5 h-1.5 bg-gray-300 rounded-full mr-2"></span>
                  Görüntü bulunamadı
                </li>

                <li
                  v-for="image in sortedImages"
                  :key="image.id"
                  @click="$emit('image-selected', image)"
                  class="relative group flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all border"
                  :class="getImageClasses(image)"
                >
                  <div
                    class="h-10 w-10 flex-shrink-0 rounded bg-gray-200 overflow-hidden border border-gray-200 relative"
                  >
                    <img
                      :src="getThumbnailUrl(image)"
                      alt="thumbnail"
                      class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                    <div
                      v-if="!image.processedpath"
                      class="absolute inset-0 bg-black/10 flex items-center justify-center"
                    >
                      <div class="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                    </div>
                  </div>

                  <div class="min-w-0 flex-1">
                    <p
                      class="text-xs font-medium truncate transition-colors"
                      :class="image.id === selectedImageId ? 'text-indigo-700' : 'text-gray-700'"
                    >
                      {{ image.name }}
                    </p>
                    <div class="flex items-center mt-0.5 gap-2">
                      <span
                        v-if="image.width"
                        class="text-[10px] text-gray-400 bg-gray-100 px-1 rounded"
                      >
                        {{ image.width }}x{{ image.height }}
                      </span>
                      <span v-else class="text-[10px] text-yellow-600 flex items-center">
                        <svg
                          class="w-2 h-2 mr-1 animate-spin"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                        İşleniyor
                      </span>
                    </div>
                  </div>

                  <div
                    v-if="image.id !== selectedImageId && annotatedImageSet.has(image.id)"
                    class="absolute right-2 flex items-center justify-center w-5 h-5 bg-emerald-100 rounded-full shadow-sm"
                    title="Anotasyon içeriyor"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-3 w-3 text-emerald-600"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </div>

                  <div
                    v-if="image.id === selectedImageId"
                    class="absolute right-2 w-2 h-2 rounded-full bg-indigo-500 shadow-sm ring-2 ring-indigo-100"
                  ></div>
                </li>
              </ul>
            </div>
          </transition>
        </div>

        <div
          v-if="loading && patients.length > 0"
          class="py-3 text-center text-xs text-gray-400 flex items-center justify-center gap-2"
        >
          <div class="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
          Daha fazla yükleniyor...
        </div>
      </div>
    </div>

    <div
      v-if="selectedImageId && globalAnnotationTypes.length > 0"
      class="border-t border-gray-200 bg-gray-50/80 p-3"
    >
      <div class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">
        Global Etiketler
      </div>
      <AnnotationTagForm
        :annotation-types="globalAnnotationTypes"
        v-model="globalFormValues"
        @save="handleGlobalSave"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { PropType } from 'vue';
import type { Workspace } from '@/core/entities/Workspace';
import type { Patient } from '@/core/entities/Patient';
import type { Image } from '@/core/entities/Image';
import type { AnnotationType } from '@/core/entities/AnnotationType';
import AnnotationTagForm from './AnnotationTagForm.vue';
import { useAnnotationStore } from '@/stores/annotation';
import { useAuthStore } from '@/stores/auth'; // Auth Store Eklendi
import { useToast } from 'vue-toastification';

// Props
const props = defineProps({
  workspaces: { type: Array as PropType<Workspace[]>, required: true },
  patients: { type: Array as PropType<Patient[]>, required: true },
  images: { type: Array as PropType<Image[]>, required: true },
  annotationTypes: { type: Array as PropType<AnnotationType[]>, default: () => [] },

  selectedWorkspaceId: String,
  selectedPatientId: String,
  selectedImageId: String,
  loading: Boolean,
});

const emit = defineEmits(['workspace-selected', 'patient-selected', 'image-selected', 'load-more']);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const annotationStore = useAnnotationStore();
const authStore = useAuthStore(); // Auth Store instance
const toast = useToast();

const globalFormValues = ref<Record<string, any>>({});
// Reaktif bir Set yerine ref(Set) kullanarak value değişiminde reaktiviteyi tetikliyoruz
const annotatedImageSet = ref(new Set<string>());

// --- SIRALAMA İŞLEMLERİ (Numeric ve Alfabetik) ---

// 1. Hastaları Sırala
const sortedPatients = computed(() => {
  return [...props.patients].sort((a, b) => {
    const nameA = a.name || '';
    const nameB = b.name || '';
    return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
  });
});

// 2. Görüntüleri Sırala
const sortedImages = computed(() => {
  return [...props.images].sort((a, b) => {
    const nameA = a.name || '';
    const nameB = b.name || '';
    return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
  });
});

const globalAnnotationTypes = computed(() => {
  return props.annotationTypes.filter((t) => t.global === true);
});

// --- YEŞİL ARKA PLAN VE ANOTASYON KONTROL MANTIĞI ---

// 1. Görüntüler değiştiğinde (Hasta klasörü açıldığında) backend'e sor
watch(
  () => props.images,
  async (newImages) => {
    if (!newImages || newImages.length === 0) {
      annotatedImageSet.value = new Set();
      return;
    }

    // Token'ı güvenli şekilde Store'dan alıyoruz
    const token = authStore.token || localStorage.getItem('token');
    if (!token) {
      // Token yoksa sessizce çık, set'i temizle
      annotatedImageSet.value = new Set();
      return;
    }

    // Geçici bir Set oluştur, API sonuçlarını buraya doldur
    const tempSet = new Set<string>();

    // Eğer hali hazırda seçili bir resim varsa ve Store'da onun anotasyonları yüklüyse,
    // API cevabını beklemeden onu "var" olarak işaretle. Bu kullanıcı deneyimini hızlandırır.
    if (
      props.selectedImageId &&
      annotationStore.annotations &&
      annotationStore.annotations.length > 0
    ) {
      // Sadece seçili resmin anotasyonları store'da olur
      tempSet.add(props.selectedImageId);
    }

    const promises = newImages.map(async (img) => {
      // Zaten store'dan bildiğimiz resim için tekrar istek atma
      if (tempSet.has(img.id)) return img.id;

      try {
        // Limit 1 yeterli, sadece var mı yok mu bakıyoruz
        const url = `${API_BASE_URL}/api/v1/proxy/annotations/image/${img.id}?limit=1`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.data && Array.isArray(result.data) && result.data.length > 0) {
            return img.id;
          }
        }
      } catch (e) {
        // Hata durumunda yoksay
      }
      return null;
    });

    // İstekleri bekle
    const results = await Promise.all(promises);

    // Sonuçları sete ekle
    results.forEach((id) => {
      if (id) tempSet.add(id);
    });

    // Ana referansı güncelle (Vue reaktivitesini tetikler)
    annotatedImageSet.value = tempSet;
  },
  { immediate: true } // Component mount edildiğinde de çalışır
);

// 2. Kullanıcı çizim yaparken/silerken anlık güncelleme (Store Watcher)
watch(
  () => annotationStore.annotations,
  (newAnnotations) => {
    // Sadece şu an seçili bir resim varsa işlem yap
    if (!props.selectedImageId) return;

    // Mevcut seti kopyala (Reaktivite için yeni referans oluşturacağız)
    const newSet = new Set(annotatedImageSet.value);

    if (newAnnotations.length > 0) {
      // Seçili resme anotasyon eklendiyse sete ekle
      newSet.add(props.selectedImageId);
    } else {
      // Seçili resmin tüm anotasyonları silindiyse setten çıkar
      newSet.delete(props.selectedImageId);
    }

    // Referansı güncelle
    annotatedImageSet.value = newSet;

    updateGlobalFormValues(newAnnotations);
  },
  { deep: true }
);

// --- YARDIMCI FONKSİYONLAR ---

function updateGlobalFormValues(annotations: any[]) {
  const currentGlobals: Record<string, any> = {};
  const normalize = (s: any) =>
    String(s || '')
      .trim()
      .toLowerCase();

  annotations.forEach((ann) => {
    if (!ann.tag) return;

    const annTagName = normalize(ann.tag.tag_name);
    const isMarkedGlobal = ann.tag.global === true;

    const matchingType = props.annotationTypes.find((t) => {
      const typeName = normalize(t.name);
      return typeName === annTagName;
    });

    if (matchingType && (isMarkedGlobal || matchingType.global)) {
      currentGlobals[matchingType.id] = ann.tag.value;
    }
  });

  globalFormValues.value = currentGlobals;
}

function isSelected(patientId: string) {
  return props.selectedPatientId === patientId;
}

function getImageClasses(image: any) {
  // 1. Seçili Resim (Mavi çerçeve, beyaz arka plan)
  if (image.id === props.selectedImageId) {
    return 'bg-white border-indigo-500 shadow-md ring-1 ring-indigo-200 z-10';
  }

  // 2. Anotasyonu Olan Resim (Yeşil Arka Plan)
  // Anotasyon setinde ID var mı kontrolü
  if (annotatedImageSet.value.has(String(image.id))) {
    return 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-300 shadow-sm';
  }

  // 3. Standart Resim
  return 'border-transparent hover:bg-white hover:border-gray-300 hover:shadow-sm text-gray-600 bg-transparent';
}

function onWorkspaceChange(event: Event) {
  const select = event.target as HTMLSelectElement;
  const workspaceId = select.value;
  const workspace = props.workspaces.find((w) => w.id === workspaceId);
  if (workspace) {
    emit('workspace-selected', workspace);
  }
}

function togglePatient(patient: Patient) {
  if (props.selectedPatientId === patient.id) {
    emit('patient-selected', null);
  } else {
    emit('patient-selected', patient);
  }
}

function getThumbnailUrl(image: any): string {
  if (!image || !image.processedpath) {
    return 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
  }
  return `${API_BASE_URL}/api/v1/proxy/${image.processedpath}/thumbnail.jpg`;
}

function handleScroll(event: Event) {
  const element = event.target as HTMLElement;
  if (props.loading) return;
  const bottomThreshold = 50;
  if (element.scrollTop + element.clientHeight >= element.scrollHeight - bottomThreshold) {
    emit('load-more');
  }
}

async function handleGlobalSave(results: Array<{ type: any; value: any }>) {
  if (!props.selectedImageId || results.length === 0) return;

  try {
    const existingAnnotations = annotationStore.annotations;
    const normalize = (s: any) =>
      String(s || '')
        .trim()
        .toLowerCase();

    for (const res of results) {
      const targetName = normalize(res.type.name);

      const existingAnn = existingAnnotations.find((a) => {
        const aName = normalize(a.tag?.tag_name);
        return aName === targetName;
      });

      const tagData = {
        tag_type: res.type.type,
        tag_name: res.type.name,
        value: res.value,
        color: res.type.color || '#333',
        global: true,
      };

      if (existingAnn) {
        await annotationStore.updateAnnotation(String(existingAnn.id), { tag: tagData });
      } else {
        await annotationStore.createAnnotation(props.selectedImageId, {
          polygon: [],
          tag: tagData,
        });
      }
    }
    toast.success('Global etiketler kaydedildi.');
  } catch (error) {
    console.error('Global save error:', error);
    toast.error('Kayıt başarısız.');
  }
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #e5e7eb;
  border-radius: 20px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: #d1d5db;
}
</style>
