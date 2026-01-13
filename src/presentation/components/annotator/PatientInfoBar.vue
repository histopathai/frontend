<template>
  <div class="relative bg-white border-b border-gray-100 z-20">
    <div class="h-11 flex items-center justify-between px-4 shadow-sm">
      <div class="flex items-center gap-2">
        <!-- HASTA PANELİ BUTONU -->
        <button
          @click="togglePanel('patient')"
          :class="[
            activePanel === 'patient'
              ? 'text-blue-600 bg-blue-50 border-blue-100'
              : 'text-gray-500 bg-white border-gray-200 hover:bg-gray-50',
          ]"
          class="flex items-center gap-2 px-3 py-1 border rounded-full text-[10px] font-bold tracking-tight transition-all shadow-sm"
        >
          <i class="fas fa-user-md text-xs"></i>
          <span>HASTA</span>
          <span
            v-if="hasPatientChanges"
            class="ml-1 w-2 h-2 bg-amber-500 rounded-full animate-pulse"
            title="Kaydedilmemiş hasta bilgisi değişiklikleri var"
          ></span>
        </button>

        <!-- GLOBAL PANELİ BUTONU -->
        <button
          @click="togglePanel('global')"
          :class="[
            activePanel === 'global'
              ? 'text-indigo-600 bg-indigo-50 border-indigo-100'
              : 'text-gray-500 bg-white border-gray-200 hover:bg-gray-50',
          ]"
          class="flex items-center gap-2 px-3 py-1 border rounded-full text-[10px] font-bold tracking-tight transition-all shadow-sm"
        >
          <i class="fas fa-tags text-xs"></i>
          <span>GLOBAL</span>
          <span
            v-if="globalFilledCount > 0"
            class="ml-1 px-1.5 bg-indigo-500 text-white rounded-full text-[8px]"
          >
            {{ globalFilledCount }}
          </span>
          <span
            v-if="globalChangesCount > 0"
            class="ml-1 w-2 h-2 bg-amber-500 rounded-full animate-pulse"
            title="Kaydedilmemiş global değişiklikler var"
          ></span>
        </button>
      </div>

      <div class="flex items-center gap-2">
        <!-- ÇİZİM MODU BUTONU -->
        <button
          @click="$emit('toggle-draw')"
          :class="[
            isDrawingMode
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400',
          ]"
          class="flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold border shadow-sm transition-all"
        >
          <i class="fas fa-draw-polygon"></i>
          <span>{{ isDrawingMode ? 'ÇİZİM MODU' : 'POLİGON ÇİZ' }}</span>
        </button>

        <!-- KAYDET BUTONU -->
        <button
          @click="$emit('save')"
          :disabled="!hasAnyChanges || loading"
          class="flex items-center gap-2 bg-gray-900 hover:bg-black disabled:bg-gray-200 disabled:text-gray-400 text-white px-4 py-1 rounded-full text-[10px] font-bold shadow-md transition-all"
        >
          <i v-if="loading" class="fas fa-spinner fa-spin"></i>
          <i v-else class="fas fa-save"></i>
          <span>KAYDET ({{ totalChangesCount }})</span>
        </button>
      </div>
    </div>

    <!-- ===============================
         GLOBAL ETİKET PANELİ
         =============================== -->
    <transition name="panel">
      <div
        v-if="activePanel === 'global'"
        class="absolute top-12 left-24 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 p-3 z-30"
      >
        <div class="mb-2 pb-1.5 border-b border-gray-50 flex justify-between items-center">
          <span class="text-[9px] font-black text-gray-400 uppercase tracking-widest">
            Global Tanımlar
          </span>
          <span
            v-if="globalChangesCount > 0"
            class="text-[8px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"
          >
            {{ globalChangesCount }} değişiklik
          </span>
        </div>

        <div class="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-1">
          <div
            v-for="t in globalAnnotationTypes"
            :key="t.id"
            class="space-y-1.5 p-2 bg-gray-50/50 rounded-lg border border-transparent hover:border-indigo-100 transition-all"
          >
            <label class="text-[9px] font-bold text-indigo-500 uppercase tracking-tighter ml-1">
              {{ t.name }}
              <span v-if="t.required" class="text-red-500 ml-1">*</span>
            </label>

            <!-- SELECT için -->
            <select
              v-if="normalizeType(t) === 'SELECT'"
              :value="tempGlobalValues[t.name] || ''"
              @change="(e: Event) => handleGlobalChange(t, (e.target as HTMLSelectElement).value)"
              class="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold text-gray-700 outline-none focus:ring-1 focus:ring-indigo-200"
            >
              <option value="" disabled>Seçiniz...</option>
              <option v-for="opt in t.options" :key="opt" :value="opt">{{ opt }}</option>
            </select>

            <!-- MULTI_SELECT için -->
            <select
              v-else-if="normalizeType(t) === 'MULTI_SELECT'"
              :value="tempGlobalValues[t.name] || ''"
              @change="(e: Event) => handleGlobalChange(t, (e.target as HTMLSelectElement).value)"
              multiple
              class="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold text-gray-700 outline-none focus:ring-1 focus:ring-indigo-200"
            >
              <option v-for="opt in t.options" :key="opt" :value="opt">{{ opt }}</option>
            </select>

            <!-- NUMBER için -->
            <input
              v-else-if="normalizeType(t) === 'NUMBER'"
              type="number"
              :value="tempGlobalValues[t.name] || ''"
              @input="(e: Event) => handleGlobalChange(t, (e.target as HTMLInputElement).value)"
              :min="t.min"
              :max="t.max"
              :placeholder="getPlaceholder(t)"
              class="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold text-gray-700 outline-none focus:ring-1 focus:ring-indigo-200"
            />

            <!-- TEXT için -->
            <input
              v-else
              type="text"
              :value="tempGlobalValues[t.name] || ''"
              @input="(e: Event) => handleGlobalChange(t, (e.target as HTMLInputElement).value)"
              class="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold text-gray-700 outline-none focus:ring-1 focus:ring-indigo-200"
            />

            <!-- Mevcut Değer Göstergesi -->
            <div
              v-if="
                originalGlobalValues[t.name] &&
                originalGlobalValues[t.name] !== tempGlobalValues[t.name]
              "
              class="text-[8px] text-gray-400 mt-1 ml-1"
            >
              Önceki: <span class="font-semibold">{{ originalGlobalValues[t.name] }}</span>
            </div>
          </div>

          <div
            v-if="globalAnnotationTypes.length === 0"
            class="text-center py-6 text-gray-400 text-xs"
          >
            <i class="fas fa-info-circle mb-2"></i>
            <p>Bu workspace için global etiket tanımlanmamış</p>
          </div>
        </div>
      </div>
    </transition>

    <!-- ===============================
         HASTA BİLGİSİ PANELİ
         =============================== -->
    <transition name="panel">
      <div
        v-if="activePanel === 'patient'"
        class="absolute top-12 left-4 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 p-3 z-30"
      >
        <div class="mb-2 pb-1.5 border-b border-gray-50 flex justify-between items-center">
          <span class="text-[9px] font-black text-gray-400 uppercase tracking-widest">
            Hasta Bilgileri
          </span>
          <span
            v-if="hasPatientChanges"
            class="text-[8px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"
          >
            Değiştirildi
          </span>
        </div>

        <div class="space-y-3">
          <div class="grid grid-cols-2 gap-2">
            <div class="space-y-1">
              <label class="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">
                Yaş
              </label>
              <input
                type="number"
                :value="tempPatient.age"
                @input="
                  (e: Event) => updateTempPatient('age', (e.target as HTMLInputElement).value)
                "
                class="w-full bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5 text-xs font-bold text-gray-700 outline-none focus:ring-1 focus:ring-blue-100"
              />
            </div>
            <div class="space-y-1">
              <label class="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">
                Cinsiyet
              </label>
              <select
                :value="tempPatient.gender"
                @change="
                  (e: Event) => updateTempPatient('gender', (e.target as HTMLSelectElement).value)
                "
                class="w-full bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5 text-xs font-bold text-gray-700 outline-none focus:ring-1 focus:ring-blue-100"
              >
                <option value="">Seçiniz</option>
                <option value="Male">Erkek</option>
                <option value="Female">Kadın</option>
              </select>
            </div>
          </div>
          <div class="space-y-1">
            <label class="text-[9px] font-black text-gray-400 uppercase ml-1">Hastalık</label>
            <input
              type="text"
              :value="tempPatient.disease"
              @input="
                (e: Event) => updateTempPatient('disease', (e.target as HTMLInputElement).value)
              "
              class="w-full bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5 text-xs font-bold text-gray-700 outline-none focus:ring-1 focus:ring-blue-100"
            />
          </div>
          <div class="space-y-1">
            <label class="text-[9px] font-black text-gray-400 uppercase ml-1">Klinik Öykü</label>
            <textarea
              :value="tempPatient.history"
              @input="
                (e: Event) => updateTempPatient('history', (e.target as HTMLTextAreaElement).value)
              "
              rows="3"
              class="w-full bg-gray-50 border border-gray-100 rounded-lg p-2 text-xs text-gray-600 outline-none resize-none leading-tight focus:ring-1 focus:ring-blue-100"
            ></textarea>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch, onMounted } from 'vue';
import type { Patient } from '@/core/entities/Patient';
import type { AnnotationType } from '@/core/entities/AnnotationType';
import { useAnnotationStore } from '@/stores/annotation';

// ===========================
// Props & Emits
// ===========================

const props = defineProps<{
  patient: Patient | null;
  annotationTypes: AnnotationType[];
  globalAnnotationTypes: AnnotationType[];
  isDrawingMode: boolean;
  hasChanges: boolean;
  unsavedCount: number;
  loading: boolean;
}>();

const emit = defineEmits(['toggle-draw', 'save', 'add-global', 'update-patient']);

// ===========================
// Store
// ===========================

const annotationStore = useAnnotationStore();

// ===========================
// State
// ===========================

const activePanel = ref<string | null>(null);
const tempGlobalValues = reactive<Record<string, any>>({});
const tempPatient = reactive<{
  age?: number | null;
  gender?: string | null;
  disease?: string | null;
  history?: string | null;
  [key: string]: any;
}>({});

// Orijinal değerleri takip et (değişiklik kontrolü için)
const originalGlobalValues = reactive<Record<string, any>>({});
const originalPatient = reactive<Record<string, any>>({});

// ===========================
// Computed
// ===========================

const globalChangesCount = computed(() => {
  return Object.keys(tempGlobalValues).filter(
    (key) =>
      tempGlobalValues[key] !== originalGlobalValues[key] &&
      tempGlobalValues[key] !== '' &&
      tempGlobalValues[key] !== undefined
  ).length;
});

const globalFilledCount = computed(() => {
  return Object.values(tempGlobalValues).filter((v) => v !== undefined && v !== '').length;
});

const hasPatientChanges = computed(() => {
  return Object.keys(tempPatient).some((key) => tempPatient[key] !== originalPatient[key]);
});

const totalChangesCount = computed(() => {
  const annotationChanges = props.unsavedCount || 0;
  const patientChanges = hasPatientChanges.value ? 1 : 0;
  return annotationChanges + patientChanges;
});

const hasAnyChanges = computed(() => {
  return totalChangesCount.value > 0 || props.hasChanges;
});

// ===========================
// Helper Functions
// ===========================

function normalizeType(type: AnnotationType): string {
  const t = type.type.toString().toUpperCase();

  // Kısaltmaları normalize et
  if (t === 'SEL') return 'SELECT';
  if (t === 'NUM') return 'NUMBER';
  if (t === 'TXT') return 'TEXT';

  return t;
}

function getPlaceholder(type: AnnotationType): string {
  if (normalizeType(type) === 'NUMBER') {
    const min = type.min;
    const max = type.max;
    if (min !== undefined && max !== undefined) {
      return `${min} - ${max} arası`;
    } else if (min !== undefined) {
      return `Min: ${min}`;
    } else if (max !== undefined) {
      return `Max: ${max}`;
    }
  }
  return '';
}

// ===========================
// Event Handlers
// ===========================

function togglePanel(panel: string) {
  activePanel.value = activePanel.value === panel ? null : panel;
}

function handleGlobalChange(type: AnnotationType, newVal: any) {
  const tagName = type.name;
  const tagType = normalizeType(type);
  const tagColor = type.color || '#6366f1';

  if (!tagName || newVal === undefined || newVal === null) {
    console.warn('⚠️ [Global] Eksik veri:', { tagName, newVal });
    return;
  }

  // Boş değer ve zaten boş ise hiçbir şey yapma
  if (newVal === '' && tempGlobalValues[tagName] === '') {
    return;
  }

  tempGlobalValues[tagName] = newVal;

  console.log('📝 [Global] Geçici değer güncellendi:', {
    tagName,
    oldValue: originalGlobalValues[tagName],
    newValue: newVal,
  });

  // Parent'a emit et
  const payload = {
    tag_type: tagType,
    tag_name: tagName,
    tag_value: newVal.toString(),
    color: tagColor,
    global: true,
  };

  emit('add-global', payload);
}

function updateTempPatient(field: string, value: any) {
  let processedValue = value;

  if (field === 'age') {
    processedValue = value === '' ? undefined : parseInt(value, 10);
    if (value !== '' && isNaN(processedValue)) return;
  }

  tempPatient[field] = processedValue;

  console.log('📝 [Patient] Geçici değer güncellendi:', {
    field,
    oldValue: originalPatient[field],
    newValue: processedValue,
  });

  emit('update-patient', { field, value: processedValue });
}

// ===========================
// Watchers
// ===========================

/**
 * 🔄 Hasta değiştiğinde form alanlarını doldur
 */
watch(
  () => props.patient,
  (newPatient) => {
    if (newPatient) {
      console.log('👤 [PatientInfoBar] Hasta bilgisi yüklendi:', newPatient.id);

      // Orijinal değerleri kaydet
      originalPatient.age = newPatient.age;
      originalPatient.gender = newPatient.gender;
      originalPatient.disease = newPatient.disease;
      originalPatient.history = newPatient.history;

      // Temp değerleri doldur
      tempPatient.age = newPatient.age;
      tempPatient.gender = newPatient.gender;
      tempPatient.disease = newPatient.disease;
      tempPatient.history = newPatient.history;
    }
  },
  { immediate: true }
);

/**
 * 🔄 Annotation'lar değiştiğinde global değerleri doldur
 * BU EN ÖNEMLİ KISIM - Otomatik değer doldurma burada yapılıyor
 */
watch(
  () => annotationStore.allAnnotations,
  (newAnns) => {
    console.log('🔄 [PatientInfoBar] Annotations güncellendi, global değerler kontrol ediliyor...');

    newAnns.forEach((ann) => {
      const isGlobal = ann.tag?.global === true;
      const tagName = ann.tag?.tag_name;
      const tagValue = ann.tag?.value;

      if (isGlobal && tagName) {
        // Orijinal değeri kaydet (ilk yüklemede)
        if (originalGlobalValues[tagName] === undefined) {
          originalGlobalValues[tagName] = tagValue;
        }

        // Temp değeri doldur (eğer henüz doldurulmamışsa)
        if (tempGlobalValues[tagName] === undefined) {
          tempGlobalValues[tagName] = tagValue;
          console.log(
            `✅ [PatientInfoBar] Global alan otomatik dolduruldu: ${tagName} = ${tagValue}`
          );
        }
      }
    });
  },
  { immediate: true, deep: true }
);

/**
 * 🔄 Kaydetme işlemi tamamlandığında orijinal değerleri güncelle
 */
watch(
  () => props.unsavedCount,
  (newCount, oldCount) => {
    // Kayıt başarılı olduğunda (unsavedCount 0'a düştüğünde)
    if (oldCount > 0 && newCount === 0) {
      console.log('✅ [PatientInfoBar] Kayıt başarılı, orijinal değerler güncelleniyor...');

      // Global değerleri güncelle
      Object.keys(tempGlobalValues).forEach((key) => {
        originalGlobalValues[key] = tempGlobalValues[key];
      });

      // Hasta değerlerini güncelle
      Object.keys(tempPatient).forEach((key) => {
        originalPatient[key] = tempPatient[key];
      });

      console.log('🔄 [PatientInfoBar] Orijinal değerler senkronize edildi');
    }
  }
);

// ===========================
// Lifecycle
// ===========================

onMounted(() => {
  console.log('🎯 [PatientInfoBar] Component mounted');

  // İlk yüklemede mevcut global değerleri yükle
  const existingValues = annotationStore.loadExistingGlobalValues();

  Object.keys(existingValues).forEach((key) => {
    tempGlobalValues[key] = existingValues[key];
    originalGlobalValues[key] = existingValues[key];
  });

  console.log('📊 [PatientInfoBar] İlk global değerler yüklendi:', {
    count: Object.keys(existingValues).length,
    values: existingValues,
  });
});
</script>

<style scoped>
.panel-enter-active,
.panel-leave-active {
  transition: all 0.2s ease-out;
}
.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
.custom-scrollbar::-webkit-scrollbar {
  width: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}
</style>
