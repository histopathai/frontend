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
          <span
            v-if="hasPatientChanges"
            class="ml-1 w-2 h-2 bg-amber-500 rounded-full animate-pulse"
          ></span>
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
            v-if="globalFilledCount > 0"
            class="ml-1 px-1.5 bg-indigo-500 text-white rounded-full text-[8px]"
          >
            {{ globalFilledCount }}
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
          <i class="fas fa-draw-polygon"></i>
          <span>{{ isDrawingMode ? 'ÇİZİM MODU' : 'POLİGON ÇİZ' }}</span>
        </button>

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

            <select
              v-if="normalizeType(t) === 'SELECT'"
              :value="tempGlobalValues[t.name] || ''"
              @change="(e: Event) => handleGlobalChange(t, (e.target as HTMLSelectElement).value)"
              class="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold text-gray-700 outline-none focus:ring-1 focus:ring-indigo-200"
            >
              <option value="" disabled>Seçiniz...</option>
              <option v-for="opt in t.options" :key="opt" :value="opt">{{ opt }}</option>
            </select>

            <select
              v-else-if="normalizeType(t) === 'MULTI_SELECT'"
              :value="tempGlobalValues[t.name] || ''"
              @change="(e: Event) => handleGlobalChange(t, (e.target as HTMLSelectElement).value)"
              multiple
              class="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold text-gray-700 outline-none focus:ring-1 focus:ring-indigo-200"
            >
              <option v-for="opt in t.options" :key="opt" :value="opt">{{ opt }}</option>
            </select>

            <input
              v-else-if="normalizeType(t) === 'NUMBER'"
              type="number"
              :value="tempGlobalValues[t.name] || ''"
              @input="(e: Event) => handleGlobalChange(t, (e.target as HTMLInputElement).value)"
              :min="t.min"
              :max="t.max"
              class="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold text-gray-700 outline-none focus:ring-1 focus:ring-indigo-200"
            />

            <input
              v-else
              type="text"
              :value="tempGlobalValues[t.name] || ''"
              @input="(e: Event) => handleGlobalChange(t, (e.target as HTMLInputElement).value)"
              class="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold text-gray-700 outline-none focus:ring-1 focus:ring-indigo-200"
            />
          </div>

          <div
            v-if="globalAnnotationTypes.length === 0"
            class="text-center py-6 text-gray-400 text-xs"
          >
            <i class="fas fa-exclamation-triangle mb-2 text-amber-400"></i>
            <p>Global etiket tanımı bulunamadı.</p>
          </div>
        </div>
      </div>
    </transition>

    <transition name="panel">
      <div
        v-if="activePanel === 'patient'"
        class="absolute top-12 left-4 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 p-4 z-30"
      >
        <div class="mb-3 pb-2 border-b border-gray-50 flex justify-between items-center">
          <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            Hasta Kartı
          </span>
          <span v-if="loading" class="text-xs text-blue-500">
            <i class="fas fa-sync fa-spin"></i>
          </span>
        </div>

        <div v-if="patient" class="space-y-3">
          <div class="bg-blue-50/50 p-2 rounded border border-blue-100 mb-2">
            <div class="text-[9px] text-blue-400 font-bold uppercase">HASTA ADI</div>
            <div class="text-xs font-bold text-blue-900">{{ tempPatient.name || 'İsimsiz' }}</div>
          </div>

          <div class="flex gap-3">
            <div class="flex-1 space-y-1">
              <label class="text-[9px] font-bold text-gray-500 uppercase">Yaş</label>
              <input
                type="number"
                :value="tempPatient.age"
                @input="
                  (e: Event) =>
                    handlePatientFieldChange('age', (e.target as HTMLInputElement).value)
                "
                class="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold text-gray-700 outline-none focus:ring-1 focus:ring-blue-200 transition-all"
                placeholder="-"
              />
            </div>
            <div class="flex-1 space-y-1">
              <label class="text-[9px] font-bold text-gray-500 uppercase">Cinsiyet</label>
              <select
                :value="tempPatient.gender || ''"
                @change="
                  (e: Event) =>
                    handlePatientFieldChange('gender', (e.target as HTMLSelectElement).value)
                "
                class="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold text-gray-700 outline-none focus:ring-1 focus:ring-blue-200 transition-all"
              >
                <option value="" disabled>Seçiniz</option>
                <option value="Male">Erkek</option>
                <option value="Female">Kadın</option>
                <option value="Other">Diğer</option>
              </select>
            </div>
          </div>

          <div class="space-y-1">
            <label class="text-[9px] font-bold text-gray-500 uppercase">Irk / Etnik Köken</label>
            <input
              type="text"
              :value="tempPatient.race || ''"
              @input="
                (e: Event) => handlePatientFieldChange('race', (e.target as HTMLInputElement).value)
              "
              class="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold text-gray-700 outline-none focus:ring-1 focus:ring-blue-200 transition-all"
              placeholder="Belirtilmemiş"
            />
          </div>

          <div class="space-y-1">
            <label class="text-[9px] font-bold text-gray-500 uppercase">Anamnez / Hikaye</label>
            <textarea
              :value="tempPatient.history || ''"
              @input="
                (e: Event) =>
                  handlePatientFieldChange('history', (e.target as HTMLInputElement).value)
              "
              rows="4"
              class="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 text-xs font-medium text-gray-700 outline-none focus:ring-1 focus:ring-blue-200 transition-all resize-none"
              placeholder="Hasta geçmişi ve notlar..."
            ></textarea>
          </div>
        </div>

        <div v-else class="text-center py-4 text-gray-400 text-xs">
          <i class="fas fa-user-slash mb-2 text-lg"></i>
          <p>Seçili hasta verisi yüklenemedi.</p>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue';
import type { Patient } from '@/core/entities/Patient';
import type { AnnotationType } from '@/core/entities/AnnotationType';
import { useAnnotationStore } from '@/stores/annotation';

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
const annotationStore = useAnnotationStore();

const activePanel = ref<string | null>(null);
const tempGlobalValues = reactive<Record<string, any>>({});

// Hasta verileri için reactive obje
const tempPatient = reactive({
  name: '',
  age: null as number | null,
  gender: '',
  race: '',
  history: '',
});

// Değişiklik kontrolü için orijinal değerleri sakla
const originalPatient = reactive({
  name: '',
  age: null as number | null,
  gender: '',
  race: '',
  history: '',
});

const originalGlobalValues = reactive<Record<string, any>>({});

// Computed
const globalChangesCount = computed(
  () =>
    Object.keys(tempGlobalValues).filter((k) => tempGlobalValues[k] !== originalGlobalValues[k])
      .length
);
const globalFilledCount = computed(
  () => Object.values(tempGlobalValues).filter((v) => v !== undefined && v !== '').length
);
const hasPatientChanges = computed(() => {
  return (
    tempPatient.age !== originalPatient.age ||
    tempPatient.gender !== originalPatient.gender ||
    tempPatient.race !== originalPatient.race ||
    tempPatient.history !== originalPatient.history
  );
});

const totalChangesCount = computed(
  () => (props.unsavedCount || 0) + (hasPatientChanges.value ? 1 : 0)
);
const hasAnyChanges = computed(() => totalChangesCount.value > 0 || props.hasChanges);

// Helpers
function normalizeType(t: AnnotationType) {
  if (!t.type) return 'TEXT';
  const type = t.type.toString().toUpperCase();
  if (type === 'SEL') return 'SELECT';
  if (type === 'NUM') return 'NUMBER';
  if (type === 'MULTI_SELECT') return 'MULTI_SELECT';
  return 'TEXT';
}

function togglePanel(panel: string) {
  activePanel.value = activePanel.value === panel ? null : panel;
}

function handleGlobalChange(t: AnnotationType, val: any) {
  if (!t.name) return;
  tempGlobalValues[t.name] = val;

  emit('add-global', {
    tag_type: normalizeType(t),
    tag_name: t.name,
    tag_value: val.toString(),
    color: t.color,
    global: true,
  });
}

function handlePatientFieldChange(field: keyof typeof tempPatient, val: any) {
  // @ts-ignore
  tempPatient[field] = val;

  // Sayısal alan kontrolü
  let processedValue = val;
  if (field === 'age') {
    processedValue = val ? parseInt(val) : null;
  }

  emit('update-patient', { field, value: processedValue });
}

// Watchers

// 1. Global Annotation Değişimlerini İzle
watch(
  [() => annotationStore.dbAnnotations, () => props.globalAnnotationTypes],
  ([newAnnotations, newTypes]) => {
    if (!newAnnotations || !newTypes) return;

    Object.keys(tempGlobalValues).forEach((k) => delete tempGlobalValues[k]);
    Object.keys(originalGlobalValues).forEach((k) => delete originalGlobalValues[k]);

    newAnnotations.forEach((ann) => {
      const g = ann.tag?.global;
      const isGlobal = String(g) === 'true' || g === true;

      if (isGlobal && ann.tag?.tag_name) {
        const dbTagName = ann.tag.tag_name;
        const dbTagValue = ann.tag.value;

        const matchedType = newTypes.find((t) => t.name?.toLowerCase() === dbTagName.toLowerCase());

        if (matchedType && matchedType.name) {
          const formKey = matchedType.name;
          tempGlobalValues[formKey] = dbTagValue;
          originalGlobalValues[formKey] = dbTagValue;
        } else {
          tempGlobalValues[dbTagName] = dbTagValue;
          originalGlobalValues[dbTagName] = dbTagValue;
        }
      }
    });
  },
  { deep: true, immediate: true }
);

// 2. Hasta Bilgisi Değişimini İzle (DÜZELTİLEN KISIM)
watch(
  () => props.patient,
  (p) => {
    if (p) {
      console.log('👤 [PatientInfoBar] Hasta yüklendi:', p);

      // Class instance olduğu için Object.assign(tempPatient, p) ÇALIŞMAZ.
      // Getter'ları manuel olarak okuyup atamalıyız:
      const newData = {
        name: p.name || '',
        age: p.age,
        gender: p.gender || '',
        race: p.race || '',
        history: p.history || '',
      };

      Object.assign(tempPatient, newData);
      Object.assign(originalPatient, newData);
    }
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
