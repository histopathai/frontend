<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm"
    @click.self="$emit('close')"
  >
    <div
      class="bg-white w-full max-w-5xl h-[80vh] rounded-2xl shadow-2xl flex overflow-hidden flex-col md:flex-row"
    >
      <div class="w-full md:w-1/3 bg-gray-50 border-r border-gray-200 flex flex-col">
        <div class="p-4 border-b border-gray-200 bg-white">
          <h3 class="font-bold text-gray-800 text-lg">Veri Alanları</h3>
        </div>

        <div class="flex-1 overflow-y-auto p-3 space-y-2">
          <div
            v-for="(field, index) in fields"
            :key="index"
            @click="selectField(index)"
            :class="[
              'p-3 rounded-lg border cursor-pointer transition-all flex justify-between items-center group',
              selectedIndex === index
                ? 'bg-indigo-50 border-indigo-500 shadow-sm ring-1 ring-indigo-200'
                : 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-sm',
            ]"
          >
            <div class="flex items-center gap-3">
              <span
                class="p-2 rounded-md bg-white border border-gray-100 text-gray-500 text-xs font-mono font-bold uppercase w-10 text-center"
              >
                {{ getTypeLabelShort(field.inputType) }}
              </span>
              <div class="flex flex-col">
                <span class="font-medium text-gray-700 text-sm truncate max-w-[120px]">{{
                  field.name || 'İsimsiz Alan'
                }}</span>
                <span class="text-[10px] text-gray-400">{{
                  field.required ? 'Zorunlu' : 'Opsiyonel'
                }}</span>
              </div>
            </div>

            <button
              @click.stop="removeField(index)"
              class="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity"
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
            @click="addNewField"
            class="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all font-medium text-sm flex items-center justify-center gap-2"
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
            Yeni Alan Ekle
          </button>
        </div>
      </div>

      <div class="w-full md:w-2/3 bg-white flex flex-col h-full">
        <div class="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h4 class="font-semibold text-gray-700">Alan Ayarları</h4>
          <div class="flex gap-2">
            <button
              type="button"
              @click="$emit('close')"
              class="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              İptal
            </button>
            <button
              type="button"
              @click="handleSaveAll"
              :disabled="loading"
              class="px-6 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm transition-colors flex items-center gap-2"
            >
              <span
                v-if="loading"
                class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"
              ></span>
              {{ loading ? 'Kaydediliyor...' : 'Tümünü Kaydet' }}
            </button>
          </div>
        </div>

        <div v-if="selectedField" class="flex-1 overflow-y-auto p-8">
          <div class="max-w-xl mx-auto space-y-6">
            <div class="grid grid-cols-1 gap-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1"
                  >Alan Adı (Etiket)</label
                >
                <input
                  v-model="selectedField.name"
                  type="text"
                  class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  placeholder="Örn: Gleason Skoru"
                />
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Veri Tipi</label>
                  <select
                    v-model="selectedField.inputType"
                    class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  >
                    <option value="select">Tekli Seçim (Select)</option>
                    <option value="multi_select">Çoklu Seçim (Tags)</option>
                    <option value="number">Sayısal Değer (Skor)</option>
                    <option value="text">Serbest Metin</option>
                    <option value="boolean">Evet / Hayır</option>
                  </select>
                </div>

                <div class="flex items-end pb-2">
                  <label class="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      v-model="selectedField.required"
                      class="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 h-5 w-5"
                    />
                    <span class="text-sm text-gray-700 font-medium">Zorunlu Alan</span>
                  </label>
                </div>
              </div>
            </div>

            <hr class="border-gray-100" />

            <div
              v-if="['select', 'multi_select'].includes(selectedField.inputType)"
              class="space-y-4 animate-fade-in"
            >
              <label class="block text-sm font-medium text-gray-700">Seçenekler</label>
              <div class="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                <div
                  v-for="(opt, oIndex) in selectedField.options"
                  :key="oIndex"
                  class="flex gap-2"
                >
                  <input
                    v-model="selectedField.options[oIndex]"
                    placeholder="Seçenek adı (örn: Luminal A)"
                    class="flex-1 rounded-md border-gray-300 shadow-sm text-sm p-2 border"
                  />
                  <button
                    @click="removeOption(oIndex)"
                    class="text-gray-400 hover:text-red-500 px-2"
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
                  class="text-sm text-indigo-600 font-medium hover:text-indigo-800 flex items-center gap-1"
                >
                  <span class="text-lg">+</span> Seçenek Ekle
                </button>
              </div>
            </div>

            <div v-if="selectedField.inputType === 'number'" class="space-y-4 animate-fade-in">
              <label class="block text-sm font-medium text-gray-700">Değer Aralığı</label>
              <div class="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div>
                  <span class="text-xs text-gray-500">Minimum</span>
                  <input
                    v-model.number="selectedField.min"
                    type="number"
                    class="w-full mt-1 rounded-md border-gray-300 shadow-sm text-sm p-2 border"
                  />
                </div>
                <div>
                  <span class="text-xs text-gray-500">Maximum</span>
                  <input
                    v-model.number="selectedField.max"
                    type="number"
                    class="w-full mt-1 rounded-md border-gray-300 shadow-sm text-sm p-2 border"
                  />
                </div>
              </div>
              <p class="text-xs text-gray-500 italic">
                Örn: Gleason skoru için Min: 6, Max: 10 girebilirsiniz.
              </p>
            </div>
          </div>
        </div>

        <div v-else class="flex-1 flex flex-col items-center justify-center text-gray-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-16 w-16 mb-4 text-gray-200"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
          <p>Düzenlemek için soldan bir alan seçin veya yeni ekleyin.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAnnotationTypeStore } from '@/stores/annotation_type';
import { useToast } from 'vue-toastification';

const props = defineProps({
  workspaceId: { type: String, required: true },
});
const emit = defineEmits(['close', 'saved']);

const store = useAnnotationTypeStore();
const toast = useToast();
const loading = ref(false);

type InputType = 'text' | 'number' | 'select' | 'multi_select' | 'boolean';

interface FieldConfig {
  name: string;
  inputType: InputType;
  required: boolean;
  options: string[];
  min: number | null;
  max: number | null;
}

const fields = ref<FieldConfig[]>([
  {
    name: 'Tanı',
    inputType: 'select',
    required: true,
    options: ['Benign', 'Malign'],
    min: null,
    max: null,
  },
]);

const selectedIndex = ref<number>(0);

// Değişiklik 1: 'undefined' olabilir olarak işaretledik
const selectedField = ref<FieldConfig | undefined>(fields.value[0]);

function addNewField() {
  const newField: FieldConfig = {
    name: '',
    inputType: 'text',
    required: false,
    options: [],
    min: null,
    max: null,
  };
  fields.value.push(newField);
  selectField(fields.value.length - 1);
}

function removeField(index: number) {
  fields.value.splice(index, 1);
  if (fields.value.length === 0) {
    addNewField();
  } else if (selectedIndex.value >= index) {
    selectField(Math.max(0, index - 1));
  }
}

function selectField(index: number) {
  selectedIndex.value = index;
  // Değişiklik 2: Artık güvenle atama yapabiliriz
  selectedField.value = fields.value[index];
}

// Değişiklik 3: Seçenek eklerken kontrol ekledik
function addOption() {
  if (selectedField.value) {
    selectedField.value.options.push('');
  }
}

// Değişiklik 4: Seçenek silerken kontrol ekledik
function removeOption(idx: number) {
  if (selectedField.value) {
    selectedField.value.options.splice(idx, 1);
  }
}

function getTypeLabelShort(type: InputType) {
  const map: Record<string, string> = {
    text: 'ABC',
    number: '123',
    select: 'LIST',
    multi_select: 'TAGS',
    boolean: 'BOOL',
  };
  return map[type] || '???';
}

async function handleSaveAll() {
  loading.value = true;
  try {
    const validFields = fields.value.filter((f) => f.name.trim().length > 0);

    if (validFields.length === 0) {
      toast.warning('En az bir isimlendirilmiş alan girmelisiniz.');
      loading.value = false;
      return;
    }

    for (const field of validFields) {
      await store.createAnnotationType({
        workspace_id: props.workspaceId,
        name: field.name,
        input_type: field.inputType as any,
        required: field.required,
        description: `${field.inputType} field created via builder`,

        class_list: ['select', 'multi_select'].includes(field.inputType)
          ? field.options.filter((o) => o.trim())
          : undefined,

        score_min: field.inputType === 'number' ? (field.min ?? undefined) : undefined,
        score_max: field.inputType === 'number' ? (field.max ?? undefined) : undefined,
      });
    }

    toast.success('Veri yapısı başarıyla oluşturuldu.');
    emit('saved');
    emit('close');
  } catch (err) {
    console.error(err);
    toast.error('Kaydetme işlemi sırasında hata oluştu.');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.2s ease-in-out;
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
