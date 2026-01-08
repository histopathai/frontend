<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm"
    @click.self="$emit('close')"
  >
    <div
      class="bg-white w-full max-w-7xl h-[85vh] rounded-2xl shadow-2xl flex overflow-hidden flex-row"
    >
      <div class="w-64 bg-gray-100 border-r border-gray-200 flex flex-col shrink-0">
        <div class="p-4 border-b border-gray-200 bg-gray-50">
          <button
            @click="startNewType"
            class="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                clip-rule="evenodd"
              />
            </svg>
            Yeni Tip Oluştur
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          <div v-if="loadingTypes" class="text-center py-4 text-gray-400 text-sm">
            Yükleniyor...
          </div>

          <div
            v-else-if="store.annotationTypes.length === 0"
            class="text-center py-8 text-gray-400 text-xs px-4"
          >
            Henüz kayıtlı bir annotasyon tipi bulunmuyor.
          </div>

          <div
            v-for="type in store.annotationTypes"
            :key="type.id"
            @click="selectTypeToEdit(type)"
            :class="[
              'p-3 rounded-lg cursor-pointer transition-all border flex items-center gap-3',
              currentTypeId === type.id
                ? 'bg-white border-indigo-500 shadow-md ring-1 ring-indigo-200'
                : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm',
            ]"
          >
            <div
              class="w-4 h-4 rounded-full shadow-sm border border-black/10 shrink-0"
              :style="{ backgroundColor: type.color || '#ccc' }"
            ></div>
            <div class="flex flex-col min-w-0">
              <span class="font-medium text-gray-800 text-sm truncate">{{ type.name }}</span>
              <span class="text-[10px] text-gray-500">{{ type.tags?.length || 0 }} Veri Alanı</span>
            </div>
          </div>
        </div>
      </div>

      <div class="w-80 bg-gray-50 border-r border-gray-200 flex flex-col shrink-0">
        <div class="p-5 border-b border-gray-200 bg-white">
          <h3 class="font-bold text-gray-800 text-lg mb-4">
            {{ isEditingMode ? 'Tipi Düzenle' : 'Yeni Tip Tanımı' }}
          </h3>

          <div class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Tip Adı</label>
              <input
                v-model="typeName"
                type="text"
                placeholder="Örn: Tümör Bölgesi"
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border transition-colors"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Renk</label>
              <div class="flex gap-2 items-center">
                <input
                  type="color"
                  v-model="typeColor"
                  class="h-9 w-16 rounded cursor-pointer border border-gray-300 p-1 bg-white"
                />
                <input
                  type="text"
                  v-model="typeColor"
                  class="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border uppercase font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="p-3 bg-gray-100 border-b border-gray-200 flex justify-between items-center">
          <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wide">
            Veri Alanları (Tags)
          </h4>
          <span class="text-[10px] bg-gray-200 text-gray-600 py-0.5 px-2 rounded-full font-bold">
            {{ tags.length }}
          </span>
        </div>

        <div class="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          <div
            v-for="(tag, index) in tags"
            :key="index"
            @click="selectTag(index)"
            :class="[
              'p-3 rounded-lg border cursor-pointer transition-all flex justify-between items-center group select-none',
              selectedTagIndex === index
                ? 'bg-white border-indigo-500 shadow-md ring-1 ring-indigo-200 z-10'
                : 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-sm',
            ]"
          >
            <div class="flex items-center gap-3 overflow-hidden">
              <span
                class="p-1.5 rounded text-[10px] font-mono font-bold uppercase w-12 text-center shrink-0 border bg-gray-50"
              >
                {{ getShortType(tag.type) }}
              </span>
              <div class="flex flex-col min-w-0">
                <span
                  class="font-medium text-gray-700 text-sm truncate"
                  :class="{ 'text-gray-400 italic': !tag.name }"
                >
                  {{ tag.name || '(İsimsiz Alan)' }}
                </span>
                <span v-if="tag.global" class="text-[10px] text-indigo-500 font-bold">
                  • Global
                </span>
              </div>
            </div>

            <button
              @click.stop="removeTag(index)"
              class="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>

          <button
            @click="addNewTag"
            class="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all font-medium text-sm flex items-center justify-center gap-2 mt-2"
          >
            <span class="text-lg leading-none font-bold">+</span> Yeni Veri Alanı
          </button>
        </div>
      </div>

      <div class="flex-1 bg-white flex flex-col h-full min-w-0">
        <div class="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h4 class="font-semibold text-gray-800">Alan Yapılandırması</h4>
            <p class="text-xs text-gray-500 mt-0.5" v-if="selectedTag">
              Seçili alanın özelliklerini aşağıdan düzenleyebilirsiniz.
            </p>
          </div>
          <div class="flex gap-3">
            <button
              type="button"
              @click="$emit('close')"
              class="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors shadow-sm"
            >
              Kapat
            </button>
            <button
              type="button"
              @click="handleSave"
              :disabled="loading"
              class="px-6 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <span
                v-if="loading"
                class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"
              ></span>
              {{
                loading
                  ? 'Kaydediliyor...'
                  : isEditingMode
                    ? 'Değişiklikleri Kaydet'
                    : 'Oluştur & Kaydet'
              }}
            </button>
          </div>
        </div>

        <div v-if="selectedTag" class="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white">
          <div class="max-w-2xl mx-auto space-y-8 animate-fade-in">
            <div class="grid grid-cols-1 gap-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >Alan Etiketi (Adı)</label
                >
                <input
                  v-model="selectedTag.name"
                  type="text"
                  ref="tagNameInput"
                  class="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border"
                  placeholder="Örn: Histolojik Alt Tip"
                />
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Veri Tipi</label>
                  <select
                    v-model="selectedTag.type"
                    class="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border bg-white"
                  >
                    <option value="TEXT">📝 Metin (Text)</option>
                    <option value="NUMBER">🔢 Sayı (Number)</option>
                    <option value="BOOLEAN">✅ Mantıksal (Evet/Hayır)</option>
                    <option value="SELECT">🔘 Tekli Seçim (Select)</option>
                    <option value="MULTI_SELECT">🏷️ Çoklu Seçim (Multi Select)</option>
                  </select>
                </div>

                <div
                  class="flex flex-col justify-center space-y-3 p-3 bg-gray-50 rounded-lg border border-gray-100"
                >
                  <label class="flex items-start space-x-3 cursor-pointer group select-none">
                    <input
                      type="checkbox"
                      v-model="selectedTag.global"
                      class="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mt-0.5 transition-colors"
                    />
                    <div class="flex flex-col">
                      <span
                        class="text-sm font-medium text-gray-700 group-hover:text-indigo-700 transition-colors"
                        >Görüntü Geneli (Global)</span
                      >
                      <span class="text-[10px] text-gray-400 leading-tight mt-0.5">
                        İşaretlenirse, bu değer tüm görüntü için geçerli sayılır.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <hr class="border-gray-100" />

            <div
              v-if="['SELECT', 'MULTI_SELECT'].includes(selectedTag.type)"
              class="space-y-4 animate-slide-in"
            >
              <div class="flex justify-between items-center">
                <label class="block text-sm font-medium text-gray-700">Liste Seçenekleri</label>
                <span class="text-xs text-gray-400"
                  >{{ selectedTag.options?.length || 0 }} Seçenek</span
                >
              </div>
              <div class="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3 shadow-inner">
                <div
                  v-for="(opt, idx) in selectedTag.options"
                  :key="idx"
                  class="flex gap-2 items-center group"
                >
                  <span class="text-xs font-mono text-gray-400 w-4 text-center"
                    >{{ idx + 1 }}.</span
                  >
                  <input
                    v-model="selectedTag.options![idx]"
                    placeholder="Seçenek adı..."
                    class="flex-1 rounded-md border-gray-300 shadow-sm text-sm p-2 border focus:ring-indigo-500 focus:border-indigo-500"
                    @keydown.enter.prevent="addOption"
                  />
                  <button
                    @click="removeOption(idx)"
                    class="text-gray-400 hover:text-red-500 p-1.5 opacity-50 group-hover:opacity-100"
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
                <button
                  @click="addOption"
                  class="w-full py-2 text-sm text-indigo-600 font-medium hover:text-indigo-800 hover:bg-indigo-50 rounded-lg border border-dashed border-indigo-200 transition-all"
                >
                  + Seçenek Ekle
                </button>
              </div>
            </div>

            <div v-if="selectedTag.type === 'NUMBER'" class="space-y-4 animate-slide-in">
              <label class="block text-sm font-medium text-gray-700">Değer Aralığı</label>
              <div class="grid grid-cols-2 gap-4 bg-gray-50 p-5 rounded-xl border border-gray-200">
                <div>
                  <span class="text-xs font-bold text-gray-500 uppercase block mb-1">Minimum</span>
                  <input
                    v-model.number="selectedTag.min"
                    type="number"
                    class="w-full rounded-md border-gray-300 p-2 border"
                  />
                </div>
                <div>
                  <span class="text-xs font-bold text-gray-500 uppercase block mb-1">Maximum</span>
                  <input
                    v-model.number="selectedTag.max"
                    type="number"
                    class="w-full rounded-md border-gray-300 p-2 border"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          v-else
          class="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50/30"
        >
          <p>Düzenlemek için ortadaki listeden bir alan seçin.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from 'vue';
import { useAnnotationTypeStore } from '@/stores/annotation_type';
import { useToast } from 'vue-toastification';
import type { TagDefinition, TagType } from '@/core/types/tags';
import type { AnnotationType } from '@/core/entities/AnnotationType';

const props = defineProps({
  workspaceId: { type: String, required: true },
});
const emit = defineEmits(['close', 'saved']);

const store = useAnnotationTypeStore();
const toast = useToast();
const loading = ref(false);
const loadingTypes = ref(false);
const tagNameInput = ref<HTMLInputElement | null>(null);

// State
const currentTypeId = ref<string | null>(null); // null ise yeni kayıt, doluysa edit
const typeName = ref('');
const typeColor = ref('#4F46E5');
const tags = ref<TagDefinition[]>([]);
const selectedTagIndex = ref<number>(-1);
const selectedTag = ref<TagDefinition | undefined>(undefined);

const isEditingMode = computed(() => !!currentTypeId.value);

onMounted(async () => {
  loadingTypes.value = true;
  try {
    await store.fetchAnnotationTypes({ limit: 100 }, { refresh: true });

    startNewType();
  } catch (error) {
    console.error(error);
    toast.error('Annotasyon tipleri yüklenirken hata oluştu.');
  } finally {
    loadingTypes.value = false;
  }
});

function startNewType() {
  currentTypeId.value = null;
  typeName.value = '';
  typeColor.value = '#4F46E5';
  tags.value = [];

  addNewTag();
}

function selectTypeToEdit(type: AnnotationType) {
  currentTypeId.value = type.id;
  typeName.value = type.name;
  typeColor.value = type.color || '#4F46E5';

  tags.value = type.tags ? JSON.parse(JSON.stringify(type.tags)) : [];

  if (tags.value.length > 0) {
    selectTag(0);
  } else {
    addNewTag();
  }
}

function addNewTag() {
  const newTag: TagDefinition = {
    name: '',
    type: 'TEXT',
    global: false,
    options: [],
    min: undefined,
    max: undefined,
    color: undefined,
  };
  tags.value.push(newTag);
  selectTag(tags.value.length - 1);
  nextTick(() => {
    if (tagNameInput.value) tagNameInput.value.focus();
  });
}

function selectTag(index: number) {
  selectedTagIndex.value = index;
  selectedTag.value = tags.value[index];
}

function removeTag(index: number) {
  tags.value.splice(index, 1);
  if (tags.value.length === 0) {
    selectedTagIndex.value = -1;
    selectedTag.value = undefined;
  } else {
    selectTag(Math.max(0, index - 1));
  }
}

function addOption() {
  if (selectedTag.value) {
    if (!selectedTag.value.options) selectedTag.value.options = [];
    selectedTag.value.options.push('');
  }
}
function removeOption(idx: number) {
  if (selectedTag.value?.options) selectedTag.value.options.splice(idx, 1);
}

function getShortType(type: TagType) {
  const map: Record<string, string> = {
    TEXT: 'TXT',
    NUMBER: 'NUM',
    BOOLEAN: 'BOOL',
    SELECT: 'SEL',
    MULTI_SELECT: 'TAGS',
  };
  return map[type] || type;
}

async function handleSave() {
  if (!typeName.value.trim()) {
    toast.warning('Lütfen annotasyon tipi için bir isim giriniz.');
    return;
  }

  const validTags = tags.value.filter((t) => t.name.trim().length > 0);
  if (validTags.length === 0) {
    toast.warning('En az bir adet isimlendirilmiş veri alanı eklemelisiniz.');
    return;
  }

  loading.value = true;
  try {
    const payload = {
      name: typeName.value,
      parent_id: props.workspaceId,
      color: typeColor.value,
      tags: validTags.map((t) => ({
        name: t.name,
        type: t.type,
        options: ['SELECT', 'MULTI_SELECT'].includes(t.type)
          ? t.options?.filter((o) => o.trim())
          : undefined,
        global: t.global,
        min: t.type === 'NUMBER' ? t.min : undefined,
        max: t.type === 'NUMBER' ? t.max : undefined,
        color: t.color,
      })),
    };

    if (isEditingMode.value && currentTypeId.value) {
      await store.updateAnnotationType(currentTypeId.value, payload);
      toast.success('Annotasyon tipi güncellendi.');
    } else {
      await store.createAnnotationType(payload);
      toast.success('Annotasyon tipi başarıyla oluşturuldu.');
      startNewType();
    }
  } catch (error) {
    console.error(error);
    if (!store.error) toast.error('İşlem sırasında bir hata oluştu.');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
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
.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}
.animate-slide-in {
  animation: slideIn 0.2s ease-out;
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
