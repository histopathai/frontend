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
          <div class="flex flex-col group min-w-[120px]">
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

            <div v-else-if="['SELECT', 'MULTI_SELECT'].includes(field.type)" class="relative">
              <div
                class="h-6 border border-gray-300 rounded px-2 flex items-center bg-white cursor-pointer hover:border-indigo-400 transition-colors w-full overflow-hidden"
                @click="(e) => toggleDropdown('patient', field.name, e)"
              >
                <span class="text-[10px] text-gray-700 truncate select-none">
                  {{ formatValue(getPatientValue(field.name), field.type) }}
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-3 w-3 ml-auto text-gray-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </div>
        </template>
        <div v-if="patientFields.length === 0" class="text-xs text-gray-400 italic">
          Alan tanımlanmamış.
        </div>
      </div>

      <div class="h-8 w-px bg-gray-200 shrink-0 ml-auto"></div>
      <div class="flex flex-col shrink-0 text-right">
        <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">Görüntü</span>
        <span class="text-sm text-gray-700 leading-tight truncate max-w-[150px]">{{
          imageStore.currentImage?.name || 'Görüntü Seçilmedi'
        }}</span>
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
          <span class="text-sm font-bold text-indigo-900 whitespace-nowrap leading-tight">{{
            selectedType?.name || 'Bilinmeyen Tip'
          }}</span>
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
          class="flex flex-col justify-center group min-w-[140px]"
        >
          <label
            class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5 whitespace-nowrap transition-colors group-hover:text-indigo-500"
          >
            {{ tag.name }} <span v-if="selectedType?.required" class="text-red-400">*</span>
          </label>
          <input
            v-if="tag.type === 'TEXT'"
            type="text"
            :value="getValue(tag.name)"
            @input="(e) => updateValue(tag, (e.target as HTMLInputElement).value)"
            class="h-8 w-full text-sm border-gray-300 rounded shadow-sm focus:border-indigo-500 bg-white"
            placeholder="..."
          />
          <input
            v-else-if="tag.type === 'NUMBER'"
            type="number"
            :min="tag.min"
            :max="tag.max"
            :value="getValue(tag.name)"
            @input="(e) => updateValue(tag, parseFloat((e.target as HTMLInputElement).value))"
            class="h-8 w-full text-sm border-gray-300 rounded shadow-sm focus:border-indigo-500 bg-white"
          />
          <button
            v-else-if="tag.type === 'BOOLEAN'"
            @click="updateValue(tag, !getValue(tag.name))"
            class="h-8 px-3 rounded text-xs font-semibold border transition-all flex items-center gap-2 justify-center"
            :class="
              getValue(tag.name)
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-gray-50 border-gray-200 text-gray-500'
            "
          >
            <span
              class="w-2 h-2 rounded-full"
              :class="getValue(tag.name) ? 'bg-indigo-500' : 'bg-gray-300'"
            ></span
            >{{ getValue(tag.name) ? 'EVET' : 'HAYIR' }}
          </button>
          <div v-else-if="['SELECT', 'MULTI_SELECT'].includes(tag.type)" class="relative">
            <div
              class="h-8 border border-gray-300 rounded px-3 flex items-center bg-white cursor-pointer hover:border-indigo-400 transition-colors w-full"
              @click="(e) => toggleDropdown('annotation', tag.name, e)"
            >
              <span class="text-sm text-gray-700 truncate select-none flex-1">{{
                formatValue(getValue(tag.name), tag.type)
              }}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4 ml-2 text-gray-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clip-rule="evenodd"
                />
              </svg>
            </div>
          </div>
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

    <Teleport to="body">
      <div
        v-if="dropdownState.isOpen"
        class="fixed z-[9999] bg-white border border-gray-200 shadow-xl rounded-lg p-1.5 min-w-[180px] animate-fade-in"
        :style="{ top: dropdownState.top, left: dropdownState.left }"
      >
        <div class="fixed inset-0 z-[-1]" @click="closeDropdown"></div>
        <div class="max-h-60 overflow-y-auto custom-scrollbar space-y-0.5">
          <template v-if="getActiveFieldType() === 'SELECT'">
            <div
              v-for="opt in getActiveOptions()"
              :key="opt"
              @click="handleSelect(opt)"
              class="px-3 py-2 hover:bg-indigo-50 rounded cursor-pointer text-sm text-gray-700 flex items-center justify-between group"
              :class="{ 'bg-indigo-50 font-medium text-indigo-700': isOptionSelected(opt) }"
            >
              {{ opt }}
              <svg
                v-if="isOptionSelected(opt)"
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4 text-indigo-600"
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
          </template>
          <template v-else>
            <label
              v-for="opt in getActiveOptions()"
              :key="opt"
              class="flex items-center px-3 py-2 hover:bg-indigo-50 rounded cursor-pointer group"
            >
              <input
                type="checkbox"
                :checked="isOptionSelected(opt)"
                @change="(e) => handleMultiSelect(opt, (e.target as HTMLInputElement).checked)"
                class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 mr-3"
              />
              <span class="text-sm text-gray-700 group-hover:text-indigo-700">{{ opt }}</span>
            </label>
          </template>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, ref, reactive } from 'vue';
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
const currentAnnotationType = computed(() => {
  const typeIds = workspaceStore.currentWorkspace?.annotationTypeIds;
  if (!typeIds || typeIds.length === 0) return null;

  const firstId = typeIds[0];
  if (!firstId) return null;

  return annotationTypeStore.getAnnotationTypeById(firstId);
});

const patientFields = computed<TagDefinition[]>(() => {
  if (!currentAnnotationType.value) return [];
  return currentAnnotationType.value.patientFields || [];
});

async function loadAnnotationConfig() {
  const typeIds = workspaceStore.currentWorkspace?.annotationTypeIds;
  if (typeIds && typeIds.length > 0) {
    const firstId = typeIds[0];
    if (firstId && !annotationTypeStore.getAnnotationTypeById(firstId)) {
      await annotationTypeStore.fetchAnnotationTypeById(firstId);
    }
  }
}

watch(
  () => workspaceStore.currentWorkspace?.annotationTypeIds,
  () => loadAnnotationConfig(),
  { immediate: true }
);

const dropdownState = reactive({
  isOpen: false,
  context: 'patient' as any,
  fieldName: '',
  top: '0px',
  left: '0px',
});

function toggleDropdown(context: 'patient' | 'annotation', fieldName: string, event: MouseEvent) {
  if (
    dropdownState.isOpen &&
    dropdownState.context === context &&
    dropdownState.fieldName === fieldName
  ) {
    closeDropdown();
    return;
  }
  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  dropdownState.top = `${rect.bottom + 4}px`;
  dropdownState.left = `${rect.left}px`;
  dropdownState.context = context;
  dropdownState.fieldName = fieldName;
  dropdownState.isOpen = true;
}
function closeDropdown() {
  dropdownState.isOpen = false;
  dropdownState.fieldName = '';
}
function getActiveDefinition() {
  if (dropdownState.context === 'patient')
    return patientFields.value.find((f) => f.name === dropdownState.fieldName);
  else return selectedType.value?.tags?.find((t) => t.name === dropdownState.fieldName);
}
function getActiveFieldType() {
  return getActiveDefinition()?.type;
}
function getActiveOptions() {
  return getActiveDefinition()?.options || [];
}
function isOptionSelected(option: string) {
  let val =
    dropdownState.context === 'patient'
      ? getPatientValue(dropdownState.fieldName)
      : getValue(dropdownState.fieldName);
  if (Array.isArray(val)) return val.includes(option);
  return val === option;
}
function formatValue(val: any, type: string) {
  if (type === 'MULTI_SELECT')
    return Array.isArray(val) && val.length > 0 ? val.join(', ') : 'Seçiniz...';
  return val ? val : 'Seçiniz...';
}
function handleSelect(option: string) {
  if (dropdownState.context === 'patient') updatePatientField(dropdownState.fieldName, option);
  else updateValue(getActiveDefinition()!, option);
  closeDropdown();
}
function handleMultiSelect(option: string, isChecked: boolean) {
  let currentVal =
    (dropdownState.context === 'patient'
      ? getPatientValue(dropdownState.fieldName)
      : getValue(dropdownState.fieldName)) || [];
  let newVal = [...currentVal];
  if (isChecked) {
    if (!newVal.includes(option)) newVal.push(option);
  } else {
    newVal = newVal.filter((v: any) => v !== option);
  }
  if (dropdownState.context === 'patient') updatePatientField(dropdownState.fieldName, newVal);
  else updateValue(getActiveDefinition()!, newVal);
}
function getPatientValue(fieldName: string) {
  const p = patientStore.currentPatient;
  if (!p) return null;
  if (fieldName in p) {
    return (p as any)[fieldName];
  }

  return p.metadata?.[fieldName] ?? null;
}
async function updatePatientField(fieldName: string, value: any) {
  if (patientStore.currentPatient)
    await patientStore.updatePatient(patientStore.currentPatient.id, { [fieldName]: value });
}
function getValue(tagName: string) {
  return selectedAnnotation.value?.data?.find((t) => t.tagName === tagName)?.value || null;
}
function updateValue(tagDef: TagDefinition, newValue: any) {
  if (!selectedAnnotation.value) return;
  const currentData = [...(selectedAnnotation.value.data || [])];
  const index = currentData.findIndex((t) => t.tagName === tagDef.name);
  const newTagValue = { tagName: tagDef.name, tagType: tagDef.type, value: newValue };
  if (index >= 0) currentData[index] = newTagValue;
  else currentData.push(newTagValue);
  annotationStore.updateAnnotation(selectedAnnotation.value.id, { data: currentData });
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
  animation: fadeIn 0.2s ease-out;
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
