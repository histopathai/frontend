<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    @click.self="$emit('close')"
  >
    <div class="card w-full max-w-2xl shadow-lg rounded-xl bg-white">
      <form @submit.prevent="handleSubmit">
        <div class="card-header px-6 py-4 border-b border-gray-200">
          <h3 class="text-xl font-semibold text-gray-900">Yeni Hasta Ekle</h3>
        </div>

        <div class="card-body p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label for="p-name" class="form-label block text-sm font-medium text-gray-700 mb-1"
              >Hasta Adı / ID (*)</label
            >
            <input
              id="p-name"
              type="text"
              v-model="form.name"
              class="form-input w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
              placeholder="örn: Patient_001 veya Ahmet Yılmaz"
            />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label for="p-age" class="form-label block text-sm font-medium text-gray-700 mb-1"
                >Yaş</label
              >
              <input
                id="p-age"
                type="number"
                v-model.number="form.age"
                class="form-input w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="örn: 45"
              />
            </div>
            <div>
              <label for="p-gender" class="form-label block text-sm font-medium text-gray-700 mb-1"
                >Cinsiyet</label
              >
              <select
                id="p-gender"
                v-model="form.gender"
                class="form-input w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">Seçiniz</option>
                <option value="Male">Erkek</option>
                <option value="Female">Kadın</option>
                <option value="Other">Diğer</option>
              </select>
            </div>
            <div>
              <label for="p-race" class="form-label block text-sm font-medium text-gray-700 mb-1"
                >Irk</label
              >
              <input
                id="p-race"
                type="text"
                v-model="form.race"
                class="form-input w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="örn: Türk"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label for="p-disease" class="form-label block text-sm font-medium text-gray-700 mb-1"
                >Teşhis (Disease)</label
              >
              <input
                id="p-disease"
                type="text"
                v-model="form.disease"
                class="form-input w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="örn: Karsinom"
              />
            </div>

            <div>
              <label for="p-subtype" class="form-label block text-sm font-medium text-gray-700 mb-1"
                >Alt Tip (Subtype)</label
              >

              <select
                v-if="subtypeOptions.length > 0"
                id="p-subtype"
                v-model="form.subtype"
                class="form-input w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">Seçiniz</option>
                <option v-for="opt in subtypeOptions" :key="opt" :value="opt">
                  {{ opt }}
                </option>
              </select>

              <input
                v-else
                id="p-subtype"
                type="text"
                v-model="form.subtype"
                :placeholder="loadingSubtypes ? 'Seçenekler yükleniyor...' : 'örn: İnvaziv Duktal'"
                class="form-input w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label for="p-grade" class="form-label block text-sm font-medium text-gray-700 mb-1"
                >Derece (Grade)</label
              >
              <input
                id="p-grade"
                type="number"
                v-model.number="form.grade"
                class="form-input w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="örn: 4"
              />
            </div>
          </div>

          <div>
            <label for="p-history" class="form-label block text-sm font-medium text-gray-700 mb-1"
              >Tıbbi Geçmiş / Notlar</label
            >
            <textarea
              id="p-history"
              v-model="form.history"
              class="form-input w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              rows="3"
              placeholder="Hasta hakkında ek bilgiler..."
            ></textarea>
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
            {{ loading ? 'Kaydediliyor...' : 'Oluştur' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted, ref } from 'vue';
import { useWorkspaceStore } from '@/stores/workspace';
import { repositories } from '@/services';
import type { CreateNewPatientRequest } from '@/core/repositories/IPatientRepository';
import type { Workspace } from '@/core/entities/Workspace';

const props = defineProps({
  workspaceId: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(['close']);
const store = useWorkspaceStore();
const loading = computed(() => store.loading);

const subtypeOptions = ref<string[]>([]);
const loadingSubtypes = ref(false);

const form = reactive({
  name: '',
  age: null as number | null,
  gender: '',
  race: '',
  disease: '',
  subtype: '',
  grade: null as number | null,
  history: '',
});

onMounted(async () => {
  await fetchSubtypeOptions();
});

async function fetchSubtypeOptions() {
  loadingSubtypes.value = true;
  try {
    let workspace: Workspace | null | undefined = store.workspaces.find(
      (w) => w.id === props.workspaceId
    );
    if (!workspace || !workspace.annotationTypeId) {
      workspace = await repositories.workspace.getById(props.workspaceId);
    }
    if (workspace && workspace.annotationTypeId) {
      const annotationType = await repositories.annotationType.getById(workspace.annotationTypeId);

      if (annotationType && annotationType.classList && annotationType.classList.length > 0) {
        subtypeOptions.value = annotationType.classList;
      } else {
        console.warn("UYARI: Anotasyon tipinin sınıf listesi boş! Mod 'Derecelendirme' olabilir.");
      }
    } else {
      console.warn(
        'UYARI: Bu Workspace bir Anotasyon Tipine bağlı değil (ID null). Eski kayıt olabilir.'
      );
    }
  } catch (error) {
    console.error('HATA: Alt tip seçenekleri yüklenirken hata oluştu:', error);
  } finally {
    loadingSubtypes.value = false;
  }
}

async function handleSubmit() {
  const payload: CreateNewPatientRequest = {
    workspace_id: props.workspaceId,
    name: form.name,
    age: form.age || undefined,
    gender: form.gender || undefined,
    race: form.race || undefined,
    disease: form.disease || undefined,
    subtype: form.subtype || undefined,
    grade: form.grade || undefined,
    history: form.history || undefined,
  };

  const success = await store.createPatient(payload);
  if (success) {
    emit('close');
  }
}
</script>
