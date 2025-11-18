<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    @click.self="$emit('close')"
  >
    <div class="card w-full max-w-2xl shadow-lg rounded-xl">
      <form @submit.prevent="saveWorkspace">
        <div class="card-header">
          <h3 class="text-xl font-semibold">Yeni Veri Seti Oluştur</h3>
        </div>

        <div class="card-body p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="ws-name" class="form-label">Veri Seti Adı (*)</label>
              <input
                id="ws-name"
                type="text"
                v-model="name"
                class="form-input"
                required
                placeholder="örn: Prostat Kanseri Veri Seti"
              />
            </div>
            <div>
              <label for="ws-org" class="form-label">Oluşturan Kurum (*)</label>
              <input
                id="ws-org"
                type="text"
                v-model="organization"
                class="form-input"
                required
                placeholder="örn: Bursa Uludağ Üniversitesi Tıp Fakültesi"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="ws-organ" class="form-label">Organ Tipi (*)</label>
              <select id="ws-organ" v-model="organType" class="form-input" required>
                <option value="" disabled>Bir organ seçiniz</option>
                <option v-for="organ in organOptions" :key="organ.value" :value="organ.value">
                  {{ organ.label }}
                </option>
              </select>
            </div>
            <div>
              <label for="ws-year" class="form-label">Yıl</label>
              <input
                id="ws-year"
                type="number"
                v-model.number="releaseYear"
                class="form-input"
                placeholder="örn: 2024"
              />
            </div>
          </div>

          <div>
            <label for="ws-desc" class="form-label">Açıklama (*)</label>
            <textarea
              id="ws-desc"
              v-model="description"
              class="form-input"
              rows="3"
              required
            ></textarea>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="ws-license" class="form-label">Kaynak Tipi / Lisans (*)</label>
              <select id="ws-license" v-model="license" class="form-input" required>
                <option value="Özel">Kurum İçi (Özel)</option>
                <option value="CC-BY">Halka Açık (CC-BY)</option>
              </select>
            </div>

            <div v-if="isPublicDataset">
              <label for="ws-url" class="form-label">Veri Seti URL'i (*)</label>
              <input
                id="ws-url"
                type="url"
                v-model="resourceURL"
                class="form-input"
                placeholder="https://example.com/dataset"
                :required="isPublicDataset"
              />
            </div>
          </div>
        </div>

        <div class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button type="button" @click="$emit('close')" class="btn btn-outline">İptal</button>
          <button type="submit" :disabled="loading" class="btn btn-primary">
            {{ loading ? 'Oluşturuluyor...' : 'Oluştur' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useWorkspaceForm } from '@/presentation/composables/app/useDatasetBuilderForm';

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
  saveWorkspace,
} = useWorkspaceForm(emit);

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
