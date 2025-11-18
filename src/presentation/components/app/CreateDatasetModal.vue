<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    @click.self="$emit('close')"
  >
    <div class="card w-full max-w-2xl shadow-lg rounded-xl bg-white">
      <form @submit.prevent="saveWorkspace">
        <div class="card-header px-6 py-4 border-b border-gray-200">
          <h3 class="text-xl font-semibold text-gray-900">
            {{ isEditMode ? 'Veri Setini Düzenle' : 'Yeni Veri Seti Oluştur' }}
          </h3>
        </div>

        <div class="card-body p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="ws-name" class="form-label block text-sm font-medium text-gray-700 mb-1"
                >Veri Seti Adı (*)</label
              >
              <input
                id="ws-name"
                type="text"
                v-model="name"
                class="form-input w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
                placeholder="örn: Prostat Kanseri Veri Seti"
              />
            </div>
            <div>
              <label for="ws-org" class="form-label block text-sm font-medium text-gray-700 mb-1"
                >Oluşturan Kurum (*)</label
              >
              <input
                id="ws-org"
                type="text"
                v-model="organization"
                class="form-input w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
                placeholder="örn: Tıp Fakültesi"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="ws-organ" class="form-label block text-sm font-medium text-gray-700 mb-1"
                >Organ Tipi (*)</label
              >
              <select
                id="ws-organ"
                v-model="organType"
                class="form-input w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              >
                <option value="" disabled>Bir organ seçiniz</option>
                <option v-for="organ in organOptions" :key="organ.value" :value="organ.value">
                  {{ organ.label }}
                </option>
              </select>
            </div>
            <div>
              <label for="ws-year" class="form-label block text-sm font-medium text-gray-700 mb-1"
                >Yıl</label
              >
              <input
                id="ws-year"
                type="number"
                v-model.number="releaseYear"
                class="form-input w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="örn: 2025"
              />
            </div>
          </div>

          <div>
            <label for="ws-desc" class="form-label block text-sm font-medium text-gray-700 mb-1"
              >Açıklama (*)</label
            >
            <textarea
              id="ws-desc"
              v-model="description"
              class="form-input w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              rows="3"
              required
            ></textarea>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                for="ws-license"
                class="form-label block text-sm font-medium text-gray-700 mb-1"
                >Kaynak Tipi / Lisans (*)</label
              >
              <select
                id="ws-license"
                v-model="license"
                class="form-input w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              >
                <option value="Özel">Kurum İçi (Özel)</option>
                <option value="CC-BY-4.0">Halka Açık (CC-BY-4.0)</option>
                <option value="CC-BY-NC-4.0">Halka Açık (CC-BY-NC-4.0)</option>
              </select>
            </div>

            <div v-if="isPublicDataset">
              <label for="ws-url" class="form-label block text-sm font-medium text-gray-700 mb-1"
                >Veri Seti URL'i (*)</label
              >
              <input
                id="ws-url"
                type="url"
                v-model="resourceURL"
                class="form-input w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="https://example.com/dataset"
                :required="isPublicDataset"
              />
            </div>
          </div>
        </div>

        <div
          class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 rounded-b-xl"
        >
          <button
            type="button"
            @click="$emit('close')"
            class="btn btn-outline bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-md text-sm font-medium"
          >
            İptal
          </button>
          <button
            type="submit"
            :disabled="loading"
            class="btn btn-primary bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
          >
            {{ loading ? 'Kaydediliyor...' : isEditMode ? 'Güncelle' : 'Oluştur' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toRef, type PropType } from 'vue';
import type { Workspace } from '@/core/entities/Workspace';
import { useWorkspaceForm } from '@/presentation/composables/app/useDatasetBuilderForm';

const props = defineProps({
  workspaceToEdit: {
    type: Object as PropType<Workspace | null>,
    default: null,
  },
});

const emit = defineEmits(['close']);

const {
  name,
  organType,
  organization,
  description,
  license,
  resourceURL,
  releaseYear,
  loading,
  isPublicDataset,
  isEditMode,
  saveWorkspace,
} = useWorkspaceForm(emit, toRef(props, 'workspaceToEdit'));

const organOptions = [
  { value: 'brain', label: 'Beyin' },
  { value: 'breast', label: 'Meme' },
  { value: 'lung', label: 'Akciğer' },
  { value: 'liver', label: 'Karaciğer' },
  { value: 'kidney', label: 'Böbrek' },
  { value: 'heart', label: 'Kalp' },
  { value: 'stomach', label: 'Mide' },
  { value: 'small_intestine', label: 'İnce Bağırsak' },
  { value: 'large_intestine', label: 'Kalın Bağırsak' },
  { value: 'pancreas', label: 'Pankreas' },
  { value: 'spleen', label: 'Dalak' },
  { value: 'bladder', label: 'Mesane' },
  { value: 'prostate', label: 'Prostat' },
  { value: 'testis', label: 'Testis' },
  { value: 'ovary', label: 'Yumurtalık (Over)' },
  { value: 'uterus', label: 'Rahim (Uterus)' },
  { value: 'skin', label: 'Deri (Cilt)' },
  { value: 'bone', label: 'Kemik' },
  { value: 'bone_marrow', label: 'Kemik İliği' },
  { value: 'thyroid', label: 'Tiroid' },
  { value: 'lymph_node', label: 'Lenf Düğümü' },
  { value: 'esophagus', label: 'Yemek Borusu' },
  { value: 'gallbladder', label: 'Safra Kesesi' },
  { value: 'salivary_gland', label: 'Tükürük Bezi' },
  { value: 'adrenal_gland', label: 'Böbrek Üstü Bezi' },
  { value: 'placenta', label: 'Plasenta' },
  { value: 'eye', label: 'Göz' },
  { value: 'tongue', label: 'Dil' },
  { value: 'unknown', label: 'Bilinmiyor / Diğer' },
].sort((a, b) => a.label.localeCompare(b.label, 'tr'));
</script>
