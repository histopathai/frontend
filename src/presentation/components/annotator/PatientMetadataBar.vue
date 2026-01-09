<template>
  <div
    class="w-full h-14 bg-white border-b border-gray-200 flex items-center px-4 shadow-sm z-30 relative shrink-0 transition-all duration-300"
    :class="{ 'bg-indigo-50/50': selectedAnnotation }"
  >
    <div
      v-if="!selectedAnnotation"
      class="flex items-center gap-4 w-full text-gray-600 animate-fade-in"
    >
      <div class="flex items-center gap-3 shrink-0">
        <div class="p-1.5 bg-gray-100 rounded-full">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 text-gray-500"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
        <div class="flex flex-col">
          <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">Hasta</span>
          <span class="text-sm font-semibold text-gray-900 leading-tight">
            {{ patientStore.currentPatient?.name || 'Yükleniyor...' }}
          </span>
        </div>
      </div>

      <div class="h-8 w-px bg-gray-200 shrink-0"></div>

      <div class="flex items-center gap-4 overflow-x-auto custom-scrollbar flex-1 px-2">
        <template v-for="field in patientFields" :key="field.name">
          <div class="flex flex-col group min-w-[100px]">
            <label
              class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5 whitespace-nowrap group-hover:text-indigo-500 transition-colors"
            >
              {{ field.name }}
            </label>

            <input
              v-if="field.type === 'TEXT'"
              type="text"
              :value="getPatientValue(field.name)"
              @change="(e) => updatePatientField(field.name, (e.target as HTMLInputElement).value)"
              class="h-6 text-xs border-gray-300 rounded shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white"
              placeholder="..."
            />

            <div v-else-if="field.type === 'NUMBER'" class="relative">
              <input
                type="number"
                :min="field.min"
                :max="field.max"
                :value="getPatientValue(field.name)"
                @change="
                  (e) =>
                    updatePatientField(field.name, parseFloat((e.target as HTMLInputElement).value))
                "
                class="h-6 w-full text-xs border-gray-300 rounded shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white"
              />
            </div>

            <select
              v-else-if="field.type === 'SELECT'"
              :value="getPatientValue(field.name) || ''"
              @change="(e) => updatePatientField(field.name, (e.target as HTMLSelectElement).value)"
              class="h-6 text-xs border-gray-300 rounded shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white py-0 cursor-pointer"
            >
              <option value="" disabled>Seçiniz</option>
              <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
            </select>

            <button
              v-else-if="field.type === 'BOOLEAN'"
              @click="updatePatientField(field.name, !getPatientValue(field.name))"
              class="h-6 px-2 rounded text-[10px] font-semibold border transition-all flex items-center gap-1.5 justify-center"
              :class="
                getPatientValue(field.name)
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  : 'bg-gray-50 border-gray-200 text-gray-500'
              "
            >
              <span
                class="w-1.5 h-1.5 rounded-full"
                :class="getPatientValue(field.name) ? 'bg-indigo-500' : 'bg-gray-300'"
              ></span>
              {{ getPatientValue(field.name) ? 'EVET' : 'HAYIR' }}
            </button>

            <div v-else-if="field.type === 'MULTI_SELECT'" class="relative group/multi">
              <div
                class="h-6 border border-gray-300 rounded px-2 flex items-center bg-white cursor-pointer hover:border-indigo-400 transition-colors w-full overflow-hidden"
              >
                <span class="text-[10px] text-gray-700 truncate">
                  {{
                    (getPatientValue(field.name) || []).length > 0
                      ? (getPatientValue(field.name) || []).join(', ')
                      : 'Seçiniz...'
                  }}
                </span>
              </div>
              <div
                class="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 shadow-xl rounded-lg p-1.5 hidden group-hover/multi:block z-50"
              >
                <div class="max-h-48 overflow-y-auto custom-scrollbar space-y-0.5">
                  <label
                    v-for="opt in field.options"
                    :key="opt"
                    class="flex items-center p-1.5 hover:bg-indigo-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      :checked="(getPatientValue(field.name) || []).includes(opt)"
                      @change="
                        (e) =>
                          handlePatientMultiSelect(
                            field.name,
                            opt,
                            (e.target as HTMLInputElement).checked
                          )
                      "
                      class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-3 w-3 mr-2"
                    />
                    <span class="text-xs text-gray-700">{{ opt }}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </template>

        <div v-if="patientFields.length === 0" class="text-xs text-gray-400 italic">
          Bu çalışma alanı için hasta veri alanı tanımlanmamış.
        </div>
      </div>

      <div class="h-8 w-px bg-gray-200 shrink-0 ml-auto"></div>

      <div class="flex flex-col shrink-0 text-right">
        <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">Görüntü</span>
        <span class="text-sm text-gray-700 leading-tight truncate max-w-[150px]">
          {{ imageStore.currentImage?.name || 'Görüntü Seçilmedi' }}
        </span>
      </div>
    </div>

    <div
      v-else
      class="flex items-center gap-6 w-full overflow-x-auto custom-scrollbar pb-1 animate-slide-in"
    >
      <div class="shrink-0 flex items-center gap-3 border-r border-indigo-100 pr-6 mr-2">
        <div class="flex flex-col items-end">
          <span class="text-[10px] font-bold text-indigo-400 uppercase tracking-wider"
            >Seçili Alan</span
          >
          <span class="text-sm font-bold text-indigo-900 whitespace-nowrap leading-tight">
            {{ selectedType?.name || 'Bilinmeyen Tip' }}
          </span>
        </div>
        <div
          class="w-3 h-8 rounded-full shadow-sm"
          :style="{ backgroundColor: selectedType?.color || '#ccc' }"
        ></div>
      </div>

      <div class="flex items-center gap-5">
        <div
          v-for="tag in selectedType?.tags || []"
          :key="tag.name"
          class="flex flex-col justify-center group"
        >
          <label
            class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5 whitespace-nowrap transition-colors group-hover:text-indigo-500"
          >
            {{ tag.name }} <span class="text-red-400">*</span>
          </label>

          <input
            v-if="tag.type === 'TEXT'"
            type="text"
            :value="getValue(tag.name)"
            @input="(e) => updateValue(tag, (e.target as HTMLInputElement).value)"
            class="h-8 w-40 text-sm border-gray-300 rounded shadow-sm focus:border-indigo-500 bg-white"
            placeholder="..."
          />
          <select
            v-if="tag.type === 'SELECT'"
            :value="getValue(tag.name)"
            @change="(e) => updateValue(tag, (e.target as HTMLSelectElement).value)"
            class="h-8 text-sm border-gray-300 rounded shadow-sm focus:border-indigo-500 bg-white min-w-[140px]"
          >
            <option value="" disabled>Seçiniz...</option>
            <option v-for="opt in tag.options" :key="opt" :value="opt">{{ opt }}</option>
          </select>
        </div>
      </div>

      <div class="ml-auto pl-4 border-l border-indigo-100">
        <button
          @click="annotationStore.selectAnnotation(null)"
          class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          title="Seçimi Kaldır"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, onMounted } from 'vue';
import { usePatientStore } from '@/stores/patient';
import { useImageStore } from '@/stores/image';
import { useAnnotationStore } from '@/stores/annotation';
import { useAnnotationTypeStore } from '@/stores/annotation_type';
import { useWorkspaceStore } from '@/stores/workspace';
import type { TagDefinition, TagValue } from '@/core/types/tags';

const patientStore = usePatientStore();
const imageStore = useImageStore();
const annotationStore = useAnnotationStore();
const annotationTypeStore = useAnnotationTypeStore();
const workspaceStore = useWorkspaceStore();

const selectedAnnotation = computed(() => annotationStore.currentAnnotation);
const selectedType = computed(() => {
  if (!selectedAnnotation.value) return null;
  return annotationTypeStore.getAnnotationTypeById(selectedAnnotation.value.typeId || '');
});

// --- DİNAMİK HASTA ALANLARI YÖNETİMİ ---

// Workspace'in bağlı olduğu AnnotationType'ı bul
const currentAnnotationType = computed(() => {
  const typeId = workspaceStore.currentWorkspace?.annotationTypeId;
  if (!typeId) return null;
  return annotationTypeStore.getAnnotationTypeById(typeId);
});

// AnnotationType içinden hasta için tanımlanmış alanları çekiyoruz
// NOT: 'patientFields' ismi AnnotationType modelinizde tanımladığınız isimle aynı olmalı
const patientFields = computed<TagDefinition[]>(() => {
  if (!currentAnnotationType.value) return [];
  // Eğer modelde bu alanın adı 'patientTags', 'metadataRequirements' vs ise burayı güncelleyin.
  // Varsayım: kullanıcı tarafından formda oluşturulan alanlar buraya kaydediliyor.
  return (currentAnnotationType.value as any).patientFields || [];
});

async function loadAnnotationConfig() {
  const typeId = workspaceStore.currentWorkspace?.annotationTypeId;
  if (typeId && !annotationTypeStore.getAnnotationTypeById(typeId)) {
    await annotationTypeStore.fetchAnnotationTypeById(typeId);
  }
}

watch(
  () => workspaceStore.currentWorkspace?.annotationTypeId,
  () => {
    loadAnnotationConfig();
  },
  { immediate: true }
);

// Hasta verisini okuma
function getPatientValue(fieldName: string): any {
  if (!patientStore.currentPatient) return null;
  // Veritabanında bu dinamik alanlar 'metadata' json kolonunda mı tutuluyor
  // yoksa düz kolonlar mı (disease, subtype gibi)?
  // Eğer düz kolonsa:
  const val = (patientStore.currentPatient as any)[fieldName];
  // Eğer metadata içindeyse: const val = patientStore.currentPatient.metadata?.[fieldName];

  return val;
}

// Hasta verisini güncelleme
async function updatePatientField(fieldName: string, value: any) {
  if (!patientStore.currentPatient) return;

  const payload = {
    [fieldName]: value,
  };

  await patientStore.updatePatient(patientStore.currentPatient.id, payload);
}

// Hasta Multi-Select Yönetimi
function handlePatientMultiSelect(fieldName: string, option: string, isChecked: boolean) {
  const currentVal: string[] = getPatientValue(fieldName) || [];
  let newVal = [...currentVal];

  if (isChecked) {
    if (!newVal.includes(option)) newVal.push(option);
  } else {
    newVal = newVal.filter((v) => v !== option);
  }

  updatePatientField(fieldName, newVal);
}

// --- ANOTASYON TAG YÖNETİMİ (MEVCUT) ---
function getValue(tagName: string): any {
  if (!selectedAnnotation.value || !selectedAnnotation.value.data) return null;
  const tag = selectedAnnotation.value.data.find((t) => t.tagName === tagName);
  return tag ? tag.value : null;
}

function updateValue(tagDef: TagDefinition, newValue: any) {
  if (!selectedAnnotation.value) return;
  const currentData = [...(selectedAnnotation.value.data || [])];
  const index = currentData.findIndex((t) => t.tagName === tagDef.name);

  const newTagValue: TagValue = {
    tagName: tagDef.name,
    tagType: tagDef.type,
    value: newValue,
  };

  if (index >= 0) {
    currentData[index] = newTagValue;
  } else {
    currentData.push(newTagValue);
  }
  annotationStore.updateAnnotation(selectedAnnotation.value.id, {
    data: currentData,
  });
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  height: 4px;
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #e5e7eb;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: #d1d5db;
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}
.animate-slide-in {
  animation: slideIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
