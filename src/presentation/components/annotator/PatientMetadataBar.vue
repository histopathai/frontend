<template>
  <div
    class="bg-white border-b border-gray-200 px-4 h-16 shadow-[0_2px_4px_rgba(0,0,0,0.02)] z-30 relative flex items-center justify-between gap-2"
  >
    <!-- SOL BÖLÜM: Hasta Bilgileri -->
    <div class="flex items-center gap-2 min-w-0 flex-[1_1_0%] overflow-hidden">
      <div
        class="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center border border-indigo-100 flex-shrink-0 text-indigo-600 shadow-sm"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4"
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

      <div v-if="patient" class="flex flex-col min-w-0 max-w-[220px]">
        <div class="flex items-center gap-1">
          <h2
            class="text-[12px] font-bold text-gray-900 truncate leading-tight"
            :title="patient.name"
          >
            {{ patient.name || 'İsimsiz' }}
          </h2>
          <button
            @click="togglePopover('demographics')"
            class="p-0.5 text-gray-400 hover:text-indigo-600 transition-all flex-shrink-0"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-3 w-3"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"
              />
            </svg>
          </button>
        </div>
        <div class="flex items-center gap-1.5 text-[9px] text-gray-500 font-medium truncate">
          <span v-if="age || gender"
            >{{ age ? `${age}Y` : '' }} {{ gender ? (gender === 'Male' ? 'E' : 'K') : '' }}</span
          >
          <span v-if="image" :title="image.name" class="text-indigo-600 font-semibold truncate flex-1 select-none">
            {{ image.name }}
          </span>
        </div>
      </div>
      <div v-else class="text-[10px] text-gray-400 italic">Seçilmedi</div>
    </div>

    <!-- ORTA BÖLÜM: Görüntü Navigasyonu -->
    <div
      class="flex items-center bg-gray-50 rounded-full p-0.5 border border-gray-100 shadow-sm flex-shrink-0"
    >
      <button
        @click="$emit('prev')"
        class="w-6.5 h-6.5 flex items-center justify-center rounded-full hover:bg-white hover:text-indigo-600 text-gray-400 transition-all"
        title="Önceki"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-3.5 w-3.5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
            clip-rule="evenodd"
          />
        </svg>
      </button>

      <div class="px-2.5 flex flex-col items-center justify-center min-w-[60px]">
        <span class="text-[11px] font-black text-gray-700 font-mono leading-none tracking-tight">
          {{ formatIndex(currentIndex) }}<span class="text-gray-300 mx-0.5 font-normal">/</span
          >{{ totalCount }}
        </span>
        <span
          class="text-[7px] text-gray-400 font-black uppercase tracking-tighter opacity-80 mt-0.5"
          >IMAGE</span
        >
      </div>

      <button
        @click="$emit('next')"
        class="w-6.5 h-6.5 flex items-center justify-center rounded-full hover:bg-white hover:text-indigo-600 text-gray-400 transition-all"
        title="Sonraki"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-3.5 w-3.5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
            clip-rule="evenodd"
          />
        </svg>
      </button>
    </div>

    <!-- SAĞ BÖLÜM: Legend + Modlar + Kaydet -->
    <div class="flex items-center gap-2.5 flex-[1_1_0%] justify-end min-w-0">
      <!-- RENK AÇIKLAMALARI (LEGEND) -->
      <div class="hidden xl:flex items-center gap-3 mr-2">
        <div class="flex items-center gap-1.5">
          <div class="w-2 h-2 rounded-full bg-[#10b981] shadow-sm"></div>
          <span class="text-[10px] font-bold text-gray-500">Onaylandı</span>
        </div>
        <div class="flex items-center gap-1.5">
          <div class="w-2 h-2 rounded-full bg-[#3b82f6] shadow-sm"></div>
          <span class="text-[10px] font-bold text-gray-500">Düzenlendi</span>
        </div>
      </div>

      <div
        class="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200 flex-shrink-0"
      >
        <button
          @click="$emit('stopDrawing')"
          class="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md transition-all text-[9px] font-black uppercase tracking-tight"
          :class="
            !isDrawingMode
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          "
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
          GEZİN
        </button>
        <button
          @click="$emit('startDrawing')"
          class="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md transition-all text-[9px] font-black uppercase tracking-tight"
          :class="
            isDrawingMode
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          "
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
          ÇİZ
        </button>
      </div>

      <div class="w-px h-6 bg-gray-200 flex-shrink-0"></div>

      <button
        @click.stop="togglePopover('global_tags')"
        :disabled="dynamicFields.length === 0"
        class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all relative"
        :class="[
          dynamicFields.length === 0
            ? 'opacity-50 cursor-not-allowed border-gray-100 text-gray-400 bg-gray-50'
            : missingRequired
              ? 'animate-pulse text-red-600 border-red-400 bg-red-50'
              : 'border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-indigo-600',
        ]"
      >
        <span>Etiketler</span>
        <span v-if="hasFilledMetadata" class="absolute -top-1 -right-1 flex h-2 w-2">
          <span
            class="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"
          ></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
        </span>
      </button>

      <button
        @click="handleSaveAll"
        :disabled="annotationStore.pendingCount === 0 && annotationStore.dirtyCount === 0"
        class="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all shadow-sm flex-shrink-0"
        :class="[
          annotationStore.pendingCount === 0 && annotationStore.dirtyCount === 0
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-gray-900 text-white hover:bg-black active:scale-95 shadow-indigo-100',
        ]"
      >
        <span>Kaydet</span>
        <span
          v-if="annotationStore.pendingCount + annotationStore.dirtyCount > 0"
          class="bg-indigo-500 text-white text-[9px] px-1.5 rounded-full min-w-[16px]"
        >
          {{ annotationStore.pendingCount + annotationStore.dirtyCount }}
        </span>
      </button>
    </div>

    <!-- POPOVERS -->
    <div
      v-if="activePopover === 'demographics'"
      class="absolute top-14 left-4 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 p-4 z-50 animate-fade-in origin-top-left"
    >
      <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
        Hasta Bilgileri
      </h3>
      <div class="grid grid-cols-2 gap-3">
        <div class="space-y-1">
          <label class="text-[9px] font-bold text-gray-500">YAŞ</label>
          <input type="number" v-model.number="age" class="form-input-compact" />
        </div>
        <div class="space-y-1">
          <label class="text-[9px] font-bold text-gray-500">CİNSİYET</label>
          <select v-model="gender" class="form-select-compact">
            <option :value="undefined">Seçiniz</option>
            <option value="Male">Erkek</option>
            <option value="Female">Kadın</option>
          </select>
        </div>
        <div class="space-y-1 col-span-2">
          <label class="text-[9px] font-bold text-gray-500">IRK / KÖKEN</label>
          <input type="text" v-model="race" class="form-input-compact" />
        </div>
      </div>
      <div class="mt-4 flex justify-end">
        <button
          @click="activePopover = null"
          class="text-[10px] bg-gray-900 text-white px-3 py-1 rounded-lg hover:bg-black"
        >
          Tamam
        </button>
      </div>
    </div>

    <div
      v-if="activePopover === 'global_tags'"
      @click.stop
      class="absolute top-14 right-4 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 p-4 z-50 animate-fade-in origin-top-right"
    >
      <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
        Global Etiketler (Dataset)
      </h3>
      <div v-if="dynamicFields.length > 0" class="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
        <div v-for="field in dynamicFields" :key="field.id" class="space-y-1.5">
          <label class="text-[9px] font-bold text-gray-500 uppercase flex items-center gap-1">
            {{ field.name }}
            <span v-if="field.required" class="text-red-500">*</span>
          </label>
          
          <select 
            v-if="field.type === 'select'" 
            v-model="localMetadata[field.id]" 
            class="form-select-compact"
            @change="handleMetadataChange"
          >
            <option :value="undefined">Seçiniz</option>
            <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
          </select>
          
          <input 
            v-else-if="field.type === 'text'" 
            type="text" 
            v-model="localMetadata[field.id]" 
            class="form-input-compact"
            @input="handleMetadataChange"
          />
          
          <textarea
            v-else-if="field.type === 'textarea'"
            v-model="localMetadata[field.id]"
            class="form-input-compact h-20 resize-none"
            @input="handleMetadataChange"
          ></textarea>
        </div>
      </div>
      <div v-else class="py-6 text-center">
        <p class="text-xs text-gray-400 italic">Bu çalışma alanında tanımlı global etiket bulunmuyor.</p>
      </div>
      <div class="mt-4 flex justify-end">
        <button
          @click="activePopover = null"
          class="text-[10px] bg-gray-900 text-white px-4 py-1.5 rounded-lg hover:bg-black transition-colors"
        >
          Kapat
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, watchEffect, onBeforeUnmount } from 'vue';
import { useAnnotationStore } from '@/stores/annotation';
import { useWorkspaceStore } from '@/stores/workspace';
import type { Image } from '@/core/entities/Image';
import type { Patient } from '@/core/entities/Patient';
import { useToast } from 'vue-toastification';
import { useAnnotationTypeStore } from '@/stores/annotation_type';

const props = defineProps<{
  image: Image | null;
  patient: Patient | null;
  currentIndex: number;
  totalCount: number;
  isDrawingMode: boolean;
}>();

const emit = defineEmits(['prev', 'next', 'startDrawing', 'stopDrawing', 'refreshViewer']);

const annotationStore = useAnnotationStore();
const workspaceStore = useWorkspaceStore();
const annotationTypeStore = useAnnotationTypeStore();
const toast = useToast();

const activePopover = ref<string | null>(null);
const age = ref<number | undefined>(props.patient?.age ?? undefined);
const gender = ref<string | undefined>(props.patient?.gender ?? undefined);
const race = ref<string | undefined>(props.patient?.race ?? undefined);
const history = ref<string | undefined>(props.patient?.history ?? undefined);

const localMetadata = ref<Record<string, any>>({});
const initialMetadata = ref<Record<string, any>>({});

const imageAnnotations = computed(() => {
  if (!props.image) return [];
  // Use annotationStore.annotations directly for perfect Vue reactivity
  return annotationStore.annotations.filter(
    (ann: any) => ann.parentId === props.image?.id || ann.parent?.id === props.image?.id
  );
});

watch(
  [() => props.image, imageAnnotations],
  ([newImage, newAnns]) => {
    if (newImage) {
      const meta = (newImage as any).metadata || {};
      
      // Pull global annotations for this image with thorough property checking
      const globalAnns = (newAnns || []).filter((ann: any) => {
        return (
          ann.isGlobal === true ||
          ann.is_global === true ||
          ann.global === true ||
          (ann.props && (ann.props.isGlobal === true || ann.props.is_global === true))
        );
      });
      
      globalAnns.forEach((ann: any) => {
        const typeId =
          ann.annotationTypeId ||
          ann.annotation_type_id ||
          (ann.props && (ann.props.annotationTypeId || ann.props.annotation_type_id));
        
        if (typeId) {
          meta[typeId] = ann.value;
        }
      });
      
      localMetadata.value = { ...meta };
      initialMetadata.value = { ...meta };
    } else {
      localMetadata.value = {};
      initialMetadata.value = {};
    }
  },
  { immediate: true, deep: true }
);

function handleMetadataChange() {
  if (!props.image) return;
  // Store the pending metadata update in the annotation store
  annotationStore.setPendingMetadata(props.image.id, { ...localMetadata.value });
}

const isDrawingMode = computed(() => props.isDrawingMode);

const dynamicFields = computed(() => {
  const ws = workspaceStore.currentWorkspace;
  const config = ws?.metadata_config;
  let fields: any[] = [];
  if (Array.isArray(config)) {
    fields = [...config];
  } else if (config?.fields) {
    fields = [...config.fields];
  }

  // ALL annotation types for the current workspace where global is true, or the specific user-mentioned ID
  const wsAnnotationTypeIds = ws?.annotationTypeIds || [];
  const wsTypes = annotationTypeStore.annotationTypes.filter(
    (at: any) =>
      wsAnnotationTypeIds.includes(at.id) &&
      (at.global === true || at.is_global === true || at.id === 'z5CeGqSHP7hWLplqlIe1')
  );

  wsTypes.forEach((at: any) => {
    if (!fields.some((f) => f.id === at.id)) {
      fields.push({
        id: at.id,
        name: at.name,
        type: at.type === 'select' ? 'select' : (at.type === 'textarea' ? 'textarea' : 'text'),
        required: at.required || false,
        options: at.options || [],
      });
    }
  });

  return fields;
});

const missingRequired = computed(() => {
  return dynamicFields.value.some((f: any) => f.required && !localMetadata.value[f.id]);
});

const hasFilledMetadata = computed(() => {
  return Object.values(localMetadata.value).some((v) => v !== null && v !== undefined && v !== '');
});

function closePopovers() {
  activePopover.value = null;
}

onMounted(() => {
  window.addEventListener('click', closePopovers);
});

onBeforeUnmount(() => {
  window.removeEventListener('click', closePopovers);
});

function togglePopover(popover: string) {
  activePopover.value = activePopover.value === popover ? null : popover;
}

function formatIndex(index: number) {
  return index + 1;
}

async function handleSaveAll() {
  try {
    const dirtySuccess = await annotationStore.saveAllDirtyAnnotations();
    const pendingSuccess = await annotationStore.saveAllPendingAnnotations();
    
    let globalSaveSuccess = true;
    if (props.image && workspaceStore.currentWorkspace) {
      const ws = workspaceStore.currentWorkspace;
      
      for (const field of dynamicFields.value) {
        const currentVal = localMetadata.value[field.id];
        const initialVal = initialMetadata.value[field.id];
        
        if (currentVal !== initialVal) {
          const existingAnn = imageAnnotations.value.find(
            (ann: any) =>
              (ann.global === true || ann.is_global === true) &&
              ann.annotationTypeId === field.id
          );
          
          if (existingAnn) {
            const success = await annotationStore.updateAnnotation(existingAnn.id, {
              value: currentVal,
            });
            if (!success) globalSaveSuccess = false;
          } else {
            const newAnn = await annotationStore.createAnnotation(props.image.id, {
              annotation_type_id: field.id,
              is_global: true,
              name: field.name,
              tag_type: field.type || 'select',
              value: currentVal,
              ws_id: ws.id,
              color: '#4F46E5',
              polygon: [],
            } as any);
            if (!newAnn) globalSaveSuccess = false;
          }
        }
      }
    }

    if (dirtySuccess && pendingSuccess && globalSaveSuccess) {
      toast.success('Tüm değişiklikler başarıyla kaydedildi');
      emit('refreshViewer');
    } else {
      toast.warning('Bazı değişiklikler kaydedilemedi');
    }
  } catch (e) {
    toast.error('Kaydedilirken bir hata oluştu');
  }
}

// Global etiket popover logic ve diğer store etkileşimleri buraya eklenebilir.
// Basitlik adına sadece temel navigasyon ve legend odaklı düzenleme yapılmıştır.
</script>

<style scoped>
.form-input-compact,
.form-select-compact {
  @apply w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 outline-none transition-all;
}
</style>
