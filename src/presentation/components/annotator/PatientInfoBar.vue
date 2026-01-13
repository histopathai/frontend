<template>
  <div class="relative bg-white border-b border-gray-100 z-20">
    <div class="h-11 flex items-center justify-between px-4 shadow-sm">
      <div class="flex items-center gap-2">
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
        </button>

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
            v-if="globalAnnsCount > 0"
            class="ml-1 px-1.5 bg-indigo-500 text-white rounded-full text-[8px]"
          >
            {{ globalAnnsCount }}
          </span>
        </button>
      </div>

      <div class="flex items-center gap-2">
        <button
          @click="$emit('toggle-draw')"
          :class="[
            isDrawingMode
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400',
          ]"
          class="flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold border shadow-sm transition-all"
        >
          <i class="fas fa-draw-polygon"></i> <span>{{ isDrawingMode ? 'BİTİR' : 'POLİGON' }}</span>
        </button>

        <button
          @click="$emit('save')"
          :disabled="!hasChanges || loading"
          class="flex items-center gap-2 bg-gray-900 hover:bg-black disabled:bg-gray-200 text-white px-4 py-1 rounded-full text-[10px] font-bold shadow-md transition-all"
        >
          <i v-if="loading" class="fas fa-spinner fa-spin"></i>
          <i v-else class="fas fa-save"></i>
          <span>KAYDET ({{ unsavedCount }})</span>
        </button>
      </div>
    </div>

    <transition name="panel">
      <div
        v-if="activePanel === 'global'"
        class="absolute top-12 left-24 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 p-3 z-30"
      >
        <div
          class="mb-2 pb-1.5 border-b border-gray-50 flex justify-between items-center font-sans"
        >
          <span class="text-[9px] font-black text-gray-400 uppercase tracking-widest"
            >Global Tanımlar</span
          >
        </div>

        <div class="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-1">
          <div
            v-for="t in globalTypes"
            :key="t.id"
            class="space-y-1.5 p-2 bg-gray-50/50 rounded-lg border border-transparent hover:border-indigo-100 transition-all"
          >
            <label class="text-[9px] font-bold text-indigo-500 uppercase tracking-tighter ml-1">
              {{ t.name || t.tag_name }}
            </label>

            <!-- SELECT için -->
            <select
              v-if="normalizeType(t) === 'SELECT' || normalizeType(t) === 'MULTI_SELECT'"
              :value="activeGlobalValues[t.name || t.tag_name] || ''"
              @change="(e: Event) => handleManualUpdate(t, (e.target as HTMLSelectElement).value)"
              class="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold text-gray-700 outline-none focus:ring-1 focus:ring-indigo-200"
            >
              <option value="" disabled>Seçiniz...</option>
              <option v-for="opt in extractOptions(t)" :key="opt" :value="opt">{{ opt }}</option>
            </select>

            <!-- INPUT için -->
            <input
              v-else
              :type="normalizeType(t) === 'NUMBER' ? 'number' : 'text'"
              :value="activeGlobalValues[t.name || t.tag_name] || ''"
              @change="(e: Event) => handleManualUpdate(t, (e.target as HTMLInputElement).value)"
              class="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold text-gray-700 outline-none focus:ring-1 focus:ring-indigo-200"
            />
          </div>
        </div>
      </div>
    </transition>

    <transition name="panel">
      <div
        v-if="activePanel === 'patient'"
        class="absolute top-12 left-4 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 p-3 z-30"
      >
        <div class="space-y-3">
          <div class="grid grid-cols-2 gap-2">
            <div class="space-y-1">
              <label class="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1"
                >Yaş</label
              >
              <input
                type="number"
                :value="patient?.age"
                @change="
                  (e: Event) => updatePatientField('age', (e.target as HTMLInputElement).value)
                "
                class="w-full bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5 text-xs font-bold text-gray-700 outline-none focus:ring-1 focus:ring-blue-100"
              />
            </div>
            <div class="space-y-1">
              <label class="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1"
                >Cinsiyet</label
              >
              <select
                :value="patient?.gender"
                @change="
                  (e: Event) => updatePatientField('gender', (e.target as HTMLSelectElement).value)
                "
                class="w-full bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5 text-xs font-bold text-gray-700 outline-none focus:ring-1 focus:ring-blue-100"
              >
                <option value="Male">Erkek</option>
                <option value="Female">Kadın</option>
              </select>
            </div>
          </div>
          <div class="space-y-1">
            <label class="text-[9px] font-black text-gray-400 uppercase ml-1">Klinik Öykü</label>
            <textarea
              :value="patient?.history"
              @change="
                (e: Event) => updatePatientField('history', (e.target as HTMLTextAreaElement).value)
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
import { ref, computed, reactive, watch } from 'vue';
import type { Patient } from '@/core/entities/Patient';
import { usePatientStore } from '@/stores/patient';
import { useAnnotationStore } from '@/stores/annotation';

const props = defineProps<{
  patient: Patient | null;
  annotationTypes: any[];
  isDrawingMode: boolean;
  hasChanges: boolean;
  unsavedCount: number;
  loading: boolean;
}>();

const emit = defineEmits(['toggle-draw', 'save', 'add-global']);
const patientStore = usePatientStore();
const annotationStore = useAnnotationStore();

const activePanel = ref<string | null>(null);
const activeGlobalValues = reactive<Record<string, any>>({});

// Sadece global olan tipleri filtrele
const globalTypes = computed(() => {
  const filtered = props.annotationTypes.filter((t) => t.global === true || t.isGlobal === true);
  console.log('🔍 [PatientInfoBar] globalTypes computed:', {
    total: props.annotationTypes.length,
    filtered: filtered.length,
    types: filtered.map((t) => ({ name: t.name, global: t.global })),
  });
  return filtered;
});

const globalAnnsCount = computed(() => {
  return Object.values(activeGlobalValues).filter((v) => v !== undefined && v !== '').length;
});

function normalizeType(type: any): string {
  let t = type?.tag_type || type?.type || 'TEXT';
  t = t.toString().toUpperCase();
  // İsimden tip tahmini (Gleason/Alt tip durumları için)
  if (
    (type?.name?.toLowerCase().includes('skor') || type?.name?.toLowerCase().includes('tip')) &&
    extractOptions(type).length > 0
  ) {
    return 'SELECT';
  }
  return t;
}

const extractOptions = (type: any) => {
  const source = type.options || type.values || type.data?.values || type.metadata?.options || [];
  return Array.isArray(source) ? source : [];
};

function getMinValue(type: any): number | undefined {
  return type.min;
}

function getMaxValue(type: any): number | undefined {
  return type.max;
}

function getStepValue(type: any): number | undefined {
  return type.step ?? 1;
}

function getPlaceholder(type: any): string {
  if (normalizeType(type) === 'NUMBER') {
    const min = getMinValue(type);
    const max = getMaxValue(type);
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

function handleNumberInput(type: any, event: Event) {
  const input = event.target as HTMLInputElement;
  const tagName = type?.name || type?.tag_name;

  if (normalizeType(type) !== 'NUMBER') return;

  const inputValue = input.value;
  if (!inputValue) {
    input.style.borderColor = '#e5e7eb';
    input.style.backgroundColor = '#ffffff';
    return;
  }

  const numValue = parseFloat(inputValue);
  const min = getMinValue(type);
  const max = getMaxValue(type);

  // Geçersiz sayı kontrolü
  if (isNaN(numValue)) {
    input.style.borderColor = '#ef4444';
    input.style.backgroundColor = '#fef2f2';
    return;
  }

  // Min/Max aşıldı mı kontrol et
  let isInvalid = false;
  let errorMsg = '';

  if (min !== undefined && numValue < min) {
    isInvalid = true;
    errorMsg = `⚠️ "${tagName}" için minimum değer: ${min}`;
  } else if (max !== undefined && numValue > max) {
    isInvalid = true;
    errorMsg = `⚠️ "${tagName}" için maksimum değer: ${max}`;
  }

  if (isInvalid) {
    input.style.borderColor = '#ef4444';
    input.style.backgroundColor = '#fef2f2';
    input.style.color = '#991b1b';

    // Tooltip benzeri uyarı (input'un title attribute'u)
    input.title = errorMsg;
    console.warn(errorMsg, `Girilen: ${numValue}`);
  } else {
    input.style.borderColor = '#10b981'; // Yeşil = geçerli
    input.style.backgroundColor = '#f0fdf4';
    input.style.color = '#065f46';
    input.title = '✓ Geçerli değer';
  }
}

function validateAndClamp(type: any, event: Event) {
  const input = event.target as HTMLInputElement;
  const tagName = type?.name || type?.tag_name;

  if (normalizeType(type) !== 'NUMBER') return;

  let numValue = parseFloat(input.value);

  if (isNaN(numValue) || input.value === '') {
    // Boş bırakılmışsa style'ı sıfırla
    input.style.borderColor = '';
    input.style.backgroundColor = '';
    input.style.color = '';
    input.title = '';
    return;
  }

  const min = getMinValue(type);
  const max = getMaxValue(type);
  let clamped = false;
  let clampReason = '';

  // Min/Max değerlerine otomatik klampla
  if (min !== undefined && numValue < min) {
    numValue = min;
    clamped = true;
    clampReason = `Minimum değer ${min} olmalı`;
  }

  if (max !== undefined && numValue > max) {
    numValue = max;
    clamped = true;
    clampReason = `Maksimum değer ${max} olmalı`;
  }

  if (clamped) {
    input.value = numValue.toString();

    // Toast benzeri bildirim
    const rangeText =
      min !== undefined && max !== undefined
        ? `${min}-${max} arası`
        : min !== undefined
          ? `minimum ${min}`
          : `maksimum ${max}`;

    // Kullanıcıya alert göster
    setTimeout(() => {
      alert(
        `⚠️ "${tagName}" ${clampReason}\n\nDeğer otomatik olarak ${numValue} yapıldı.\nGeçerli aralık: ${rangeText}`
      );
    }, 100);

    console.warn(`⚠️ "${tagName}" değeri ${rangeText} olmalı. Otomatik düzeltildi: ${numValue}`);
  }

  // Style'ı sıfırla
  input.style.borderColor = '';
  input.style.backgroundColor = '';
  input.style.color = '';
  input.title = '';
}

function togglePanel(panel: string) {
  activePanel.value = activePanel.value === panel ? null : panel;
}

function getInputComponent(type: any) {
  const t = normalizeType(type);
  return t === 'SELECT' || t === 'MULTI_SELECT' ? 'select' : 'input';
}

function handleManualUpdate(type: any, newVal: any) {
  const tagName = type?.name || type?.tag_name;
  const tagType = normalizeType(type);
  const tagColor = type?.color || '#ff0000';

  // Boş veya geçersiz değerleri kontrol et
  if (!tagName || newVal === undefined || newVal === null || newVal === '') {
    console.error('❌ HATA: Eksik veri!', { tagName, tagType, newVal });
    return;
  }

  // Aynı değer tekrar gönderilmesin
  if (activeGlobalValues[tagName] === newVal) {
    console.log('⏭️ [Global] Değer değişmedi, atlıyor:', tagName);
    return;
  }

  // Local state'i güncelle
  activeGlobalValues[tagName] = newVal;

  // ✅ DÜZELTME: value olarak newVal gönderiliyor (tagName DEĞİL!)
  const payload = {
    tag_type: tagType, // Backend'in beklediği format
    tag_name: tagName, // Tag'in adı (örn: "Histolojik Alt Tip")
    tag_value: newVal.toString(), // ✅ Seçilen değer (örn: "Ductal")
    color: tagColor,
    global: true,
    is_global: true,
  };

  emit('add-global', payload);

  console.log('✅ [Global] Gönderilen payload:', payload);
}

async function updatePatientField(field: string, value: any) {
  if (!props.patient?.id) return;

  let processedValue = value;
  if (field === 'age') {
    processedValue = parseInt(value, 10);
    if (isNaN(processedValue)) return;
  }

  try {
    // Sayısal değeri backend'in beklediği formatta gönder
    await patientStore.updatePatient(props.patient.id, { [field]: processedValue });
    console.log(`✅ [Patient] ${field} güncellendi:`, processedValue);
  } catch (error) {
    console.error('❌ [Patient] Güncelleme başarısız:', error);
  }
}

// Store'daki mevcut verileri yakala
watch(
  () => annotationStore.allAnnotations,
  (newAnns) => {
    console.log('🔍 [PatientInfoBar Watch] Anotasyonlar güncellendi:', newAnns.length);

    // Her anotasyonu kontrol et
    newAnns.forEach((ann, index) => {
      console.log(`  [${index}] Tag:`, ann.tag);

      const isGlobal = ann.tag?.global === true;
      const tagName = ann.tag?.tag_name;
      const tagValue = ann.tag?.value;

      if (isGlobal && tagName) {
        console.log(`    ✅ Global alan bulundu: ${tagName} = ${tagValue}`);

        // Sadece değer değiştiyse güncelle (gereksiz render'ları önle)
        if (activeGlobalValues[tagName] !== tagValue) {
          activeGlobalValues[tagName] = tagValue;
          console.log(`    🔄 activeGlobalValues güncellendi: ${tagName} = ${tagValue}`);
        }
      } else {
        console.log(`    ⏭️ Global değil veya tag name yok`);
      }
    });

    console.log('📊 [PatientInfoBar] activeGlobalValues:', { ...activeGlobalValues });
  },
  { immediate: true, deep: true }
);
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
