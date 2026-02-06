<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm"
    @click.self="$emit('close')"
  >
    <div
      class="bg-white w-full max-w-6xl h-[85vh] rounded-2xl shadow-2xl flex overflow-hidden flex-row"
    >
      <div class="w-80 bg-gray-100 border-r border-gray-200 flex flex-col shrink-0">
        <div class="flex border-b border-gray-200 bg-white">
          <button
            @click="activeTab = 'workspace'"
            class="flex-1 py-3 text-xs font-bold uppercase tracking-wide transition-colors border-b-2"
            :class="
              activeTab === 'workspace'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            "
          >
            Bu Veri Seti
          </button>
          <button
            @click="loadLibrary"
            class="flex-1 py-3 text-xs font-bold uppercase tracking-wide transition-colors border-b-2"
            :class="
              activeTab === 'library'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            "
          >
            Kütüphane (Tümü)
          </button>
        </div>

        <div class="p-4 border-b border-gray-200 bg-gray-50 space-y-3">
          <div class="relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Tip ara..."
              class="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4 text-gray-400 absolute left-3 top-2.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          <button
            @click="startNewType"
            class="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 uppercase tracking-wide"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                clip-rule="evenodd"
              />
            </svg>
            Sıfırdan Yeni Oluştur
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          <div v-if="loadingTypes" class="text-center py-4 text-gray-400 text-sm">
            Yükleniyor...
          </div>

          <div
            v-else-if="filteredList.length === 0"
            class="text-center py-8 text-gray-400 text-xs px-4"
          >
            {{
              activeTab === 'workspace'
                ? 'Bu veri setinde henüz etiket yok.'
                : 'Kayıtlı tip bulunamadı.'
            }}
          </div>

          <div
            v-for="type in filteredList"
            :key="type.id"
            @click="handleItemClick(type)"
            :class="[
              'p-3 rounded-lg cursor-pointer transition-all border flex items-center gap-3 relative group',
              currentTypeId === type.id && !isImportMode
                ? 'bg-white border-indigo-500 shadow-md ring-1 ring-indigo-200'
                : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm',
            ]"
          >
            <div
              class="w-4 h-4 rounded-full shadow-sm border border-black/10 shrink-0"
              :style="{ backgroundColor: type.color || '#ccc' }"
            ></div>
            <div class="flex flex-col min-w-0 flex-1">
              <span class="font-medium text-gray-800 text-sm truncate">{{ type.name }}</span>
              <div class="flex items-center gap-1 mt-0.5">
                <span class="text-[10px] text-gray-500 bg-gray-200 px-1.5 rounded">{{
                  getShortType(type.type)
                }}</span>
                <span
                  v-if="activeTab === 'library' && isAlreadyInWorkspace(type.id)"
                  class="text-[10px] text-green-600 bg-green-100 px-1.5 rounded font-medium"
                  >EKLİ</span
                >
              </div>
            </div>

            <div
              v-if="activeTab === 'library' && !isAlreadyInWorkspace(type.id)"
              class="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l3-3m-3 3L9 8"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div class="flex-1 bg-white flex flex-col h-full min-w-0">
        <div class="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h3 class="font-bold text-gray-800 text-lg flex items-center gap-2">
              <span
                v-if="isImportMode"
                class="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs uppercase"
                >İçe Aktar</span
              >
              {{ getHeaderTitle }}
            </h3>
            <p class="text-xs text-gray-500 mt-0.5">
              {{ getHeaderSubtitle }}
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
              v-if="isImportMode"
              type="button"
              @click="handleLinkExisting"
              :disabled="loading"
              class="px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-lg transition-colors shadow-sm flex items-center gap-2"
            >
              <span
                v-if="loading"
                class="animate-spin h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full"
              ></span>
              Mevcut Tipi Ekle
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
              {{ getSaveButtonText }}
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div class="max-w-3xl mx-auto space-y-8 animate-fade-in">
            <div
              v-if="isImportMode"
              class="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3 items-start"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 text-blue-500 mt-0.5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clip-rule="evenodd"
                />
              </svg>
              <div>
                <h4 class="text-sm font-bold text-blue-800">İçe Aktarma Seçenekleri</h4>
                <p class="text-xs text-blue-600 mt-1">
                  <strong>Mevcut Tipi Ekle:</strong> Bu tipi değiştirmeden olduğu gibi kullanır
                  (Önerilen).<br />
                  <strong>Kopyasını Oluştur:</strong> Bu tipin yeni ve bağımsız bir kopyasını
                  oluşturur.
                </p>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="col-span-1 md:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >Tip Adı <span class="text-red-500">*</span></label
                >
                <input
                  v-model="form.name"
                  type="text"
                  placeholder="Örn: Ki67 Index, Tümör Bölgesi"
                  class="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >Veri Tipi <span class="text-red-500">*</span></label
                >
                <select
                  v-model="form.type"
                  class="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border bg-white"
                >
                  <option :value="TagType.Text">📝 Metin (Text)</option>
                  <option :value="TagType.Number">🔢 Sayı (Number)</option>
                  <option :value="TagType.Boolean">✅ Mantıksal (Evet/Hayır)</option>
                  <option :value="TagType.Select">🔘 Tekli Seçim (Select)</option>
                  <option :value="TagType.MultiSelect">🏷️ Çoklu Seçim (Multi Select)</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Renk</label>
                <div class="flex gap-2 items-center">
                  <input
                    type="color"
                    v-model="form.color"
                    class="h-[46px] w-16 rounded cursor-pointer border border-gray-300 p-1 bg-white"
                  />
                  <input
                    type="text"
                    v-model="form.color"
                    class="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border uppercase font-mono"
                  />
                </div>
              </div>
            </div>

            <div class="flex gap-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <label class="flex items-center space-x-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  v-model="form.global"
                  class="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div class="flex flex-col">
                  <span class="text-sm font-medium text-gray-800">Görüntü Geneli (Global)</span>
                  <span class="text-xs text-gray-500">Tüm görüntü için geçerli tek bir değer.</span>
                </div>
              </label>

              <div class="w-px bg-gray-300"></div>

              <label class="flex items-center space-x-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  v-model="form.required"
                  class="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div class="flex flex-col">
                  <span class="text-sm font-medium text-gray-800">Zorunlu Alan</span>
                  <span class="text-xs text-gray-500">Bu alan doldurulmadan kayıt yapılamaz.</span>
                </div>
              </label>
            </div>

            <hr class="border-gray-100" />

            <div
              v-if="[TagType.Select, TagType.MultiSelect].includes(form.type)"
              class="space-y-4 animate-slide-in"
            >
              <div class="flex justify-between items-center">
                <label class="block text-sm font-medium text-gray-700">Liste Seçenekleri</label>
                <span class="text-xs text-gray-400">{{ form.options.length }} Seçenek</span>
              </div>
              <div class="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3 shadow-inner">
                <div
                  v-for="(opt, idx) in form.options"
                  :key="idx"
                  class="flex gap-2 items-center group"
                >
                  <span class="text-xs font-mono text-gray-400 w-6 text-center"
                    >{{ idx + 1 }}.</span
                  >
                  <input
                    v-model="form.options[idx]"
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

            <div v-if="form.type === TagType.Number" class="space-y-4 animate-slide-in">
              <label class="block text-sm font-medium text-gray-700">Değer Aralığı</label>
              <div class="grid grid-cols-2 gap-4 bg-gray-50 p-5 rounded-xl border border-gray-200">
                <div>
                  <span class="text-xs font-bold text-gray-500 uppercase block mb-1">Minimum</span>
                  <input
                    v-model.number="form.min"
                    type="number"
                    class="w-full rounded-md border-gray-300 p-2 border"
                  />
                </div>
                <div>
                  <span class="text-xs font-bold text-gray-500 uppercase block mb-1">Maximum</span>
                  <input
                    v-model.number="form.max"
                    type="number"
                    class="w-full rounded-md border-gray-300 p-2 border"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch, shallowRef } from 'vue';
import { useAnnotationTypeStore } from '@/stores/annotation_type';
import { useWorkspaceStore } from '@/stores/workspace';
import { useToast } from 'vue-toastification';
import type { AnnotationType } from '@/core/entities/AnnotationType';
import { TagType } from '@/core/value-objects';

const props = defineProps({
  workspaceId: { type: String, required: true },
});
const emit = defineEmits(['close', 'saved']);

const store = useAnnotationTypeStore();
const workspaceStore = useWorkspaceStore();
const toast = useToast();

const loading = ref(false);
const loadingTypes = ref(false);
const activeTab = ref<'workspace' | 'library'>('workspace');
const searchQuery = ref('');

const libraryTypes = shallowRef<AnnotationType[]>([]);

const currentTypeId = ref<string | null>(null);

const isEditingMode = computed(() => !!currentTypeId.value && activeTab.value === 'workspace');
const isImportMode = computed(() => !!currentTypeId.value && activeTab.value === 'library');

interface FormState {
  name: string;
  type: TagType;
  color: string;
  global: boolean;
  required: boolean;
  options: string[];
  min: number | undefined;
  max: number | undefined;
}

const form = reactive<FormState>({
  name: '',
  type: TagType.Text,
  color: '#4F46E5',
  global: false,
  required: false,
  options: [],
  min: undefined,
  max: undefined,
});

const getHeaderTitle = computed(() => {
  if (isImportMode.value) return 'Şablondan Oluştur';
  if (isEditingMode.value) return 'Tipi Düzenle';
  return 'Yeni Tip Tanımı';
});

const getHeaderSubtitle = computed(() => {
  if (isImportMode.value)
    return 'Seçilen tipin özellikleri kopyalandı. Düzenleyip kaydedebilirsiniz.';
  return 'Annotasyon tipinin adını ve toplayacağı veri formatını belirleyin.';
});

const getSaveButtonText = computed(() => {
  if (loading.value) return 'İşleniyor...';
  if (isImportMode.value) return 'Kopyasını Oluştur';
  if (isEditingMode.value) return 'Değişiklikleri Kaydet';
  return 'Oluştur & Kaydet';
});

const workspaceTypes = computed(() => {
  const workspaceTypeIds = workspaceStore.currentWorkspace?.annotationTypeIds || [];
  return store.annotationTypes.filter((type) => workspaceTypeIds.includes(type.id));
});

const filteredList = computed(() => {
  const source = activeTab.value === 'workspace' ? workspaceTypes.value : libraryTypes.value;
  if (!searchQuery.value.trim()) return source;

  return source.filter((t) => t.name.toLowerCase().includes(searchQuery.value.toLowerCase()));
});

onMounted(async () => {
  await fetchWorkspaceTypes();
  startNewType();
});

watch(activeTab, async (newTab) => {
  startNewType();
  if (newTab === 'library' && libraryTypes.value.length === 0) {
    await loadLibrary();
  }
});

async function fetchWorkspaceTypes() {
  loadingTypes.value = true;
  try {
    // Ensure workspace is loaded to get annotationTypeIds
    if (
      !workspaceStore.currentWorkspace ||
      workspaceStore.currentWorkspace.id !== props.workspaceId
    ) {
      await workspaceStore.fetchWorkspaceById(props.workspaceId);
    }

    // Fetch all annotation types (no parent_id filter)
    // The workspaceTypes computed property will filter them by workspace's annotationTypeIds
    await store.fetchAnnotationTypes({ limit: 100 }, { refresh: true });
  } catch (error) {
    console.error(error);
  } finally {
    loadingTypes.value = false;
  }
}

async function loadLibrary() {
  loadingTypes.value = true;
  activeTab.value = 'library';
  try {
    await store.fetchAnnotationTypes({ limit: 100 }, { refresh: true });

    libraryTypes.value = [...store.annotationTypes];
  } catch (error) {
    toast.error('Kütüphane yüklenemedi.');
  } finally {
    loadingTypes.value = false;
  }
}

function startNewType() {
  currentTypeId.value = null;
  form.name = '';
  form.type = TagType.Text;
  form.color = '#4F46E5';
  form.global = false;
  form.required = false;
  form.options = [];
  form.min = undefined;
  form.max = undefined;
}

function handleItemClick(type: AnnotationType) {
  if (activeTab.value === 'library' && isAlreadyInWorkspace(type.id)) {
    return;
  }

  currentTypeId.value = type.id;
  form.name = type.name;
  form.type = type.type;
  form.color = type.color || '#4F46E5';
  form.global = type.global;
  form.required = type.required;
  form.options = type.options ? [...type.options] : [];
  form.min = type.min;
  form.max = type.max;
}

function isAlreadyInWorkspace(typeId: string): boolean {
  const currentIds = workspaceStore.currentWorkspace?.annotationTypeIds || [];
  return currentIds.includes(typeId);
}

function addOption() {
  form.options.push('');
}

function removeOption(idx: number) {
  form.options.splice(idx, 1);
}

function getShortType(type: string) {
  const map: Record<string, string> = {
    [TagType.Text]: 'TXT',
    [TagType.Number]: 'NUM',
    [TagType.Boolean]: 'BOOL',
    [TagType.Select]: 'SEL',
    [TagType.MultiSelect]: 'TAGS',
  };
  return map[type] || type;
}

async function addTypeToWorkspace(typeId: string) {
  const currentAnnotationIds = workspaceStore.currentWorkspace?.annotationTypeIds || [];

  if (currentAnnotationIds.includes(typeId)) {
    return;
  }

  const updatedIds = [...currentAnnotationIds, typeId];
  await workspaceStore.updateWorkspace(props.workspaceId, {
    annotation_types: updatedIds,
  });
}

async function handleLinkExisting() {
  if (!currentTypeId.value) return;

  loading.value = true;
  try {
    await addTypeToWorkspace(currentTypeId.value);
    toast.success('Tip başarıyla veri setine eklendi.');

    if (activeTab.value === 'library') {
      activeTab.value = 'workspace';
    }
    await fetchWorkspaceTypes();
    startNewType();
    emit('saved');
  } catch (error) {
    console.error(error);
    toast.error('Bağlama sırasında hata oluştu.');
  } finally {
    loading.value = false;
  }
}

async function handleSave() {
  if (!form.name.trim()) {
    toast.warning('İsim gerekli.');
    return;
  }

  if ([TagType.Select, TagType.MultiSelect].includes(form.type)) {
    form.options = form.options.filter((o) => o.trim() !== '');
    if (form.options.length === 0) {
      toast.warning('En az bir seçenek eklemelisiniz.');
      return;
    }
  }

  loading.value = true;
  try {
    let createdOrUpdatedType: AnnotationType | null = null;

    if (isEditingMode.value && currentTypeId.value) {
      // Update payload - exclude immutable fields (is_global, tag_type)
      const updatePayload = {
        name: form.name,
        color: form.color,
        options: [TagType.Select, TagType.MultiSelect].includes(form.type)
          ? form.options
          : undefined,
        is_required: form.required,
        min: form.type === TagType.Number ? form.min : undefined,
        max: form.type === TagType.Number ? form.max : undefined,
      };

      await store.updateAnnotationType(currentTypeId.value, updatePayload);
      toast.success('Güncellendi.');
    } else {
      // Create payload - include all fields
      const createPayload = {
        name: form.name,
        color: form.color,
        tag_type: form.type,
        options: [TagType.Select, TagType.MultiSelect].includes(form.type)
          ? form.options
          : undefined,
        is_global: form.global,
        is_required: form.required,
        min: form.type === TagType.Number ? form.min : undefined,
        max: form.type === TagType.Number ? form.max : undefined,
      };

      createdOrUpdatedType = await store.createAnnotationType(createPayload);

      if (createdOrUpdatedType && createdOrUpdatedType.id) {
        await addTypeToWorkspace(createdOrUpdatedType.id);
        toast.success(
          isImportMode.value ? 'Kopya oluşturuldu ve eklendi.' : 'Başarıyla oluşturuldu.'
        );
      }
    }

    if (activeTab.value === 'library') {
      activeTab.value = 'workspace';
    }
    await fetchWorkspaceTypes();
    startNewType();
    emit('saved');
  } catch (error) {
    console.error(error);
    if (!store.error) toast.error('Hata oluştu.');
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
.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
