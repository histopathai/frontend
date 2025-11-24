<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    @click.self="$emit('close')"
  >
    <div class="card w-full max-w-2xl shadow-lg rounded-xl bg-white">
      <form @submit.prevent="handleSubmit">
        <div class="card-header px-6 py-4 border-b border-gray-200">
          <h3 class="text-xl font-semibold text-gray-900">Hasta Düzenle</h3>
        </div>

        <div class="card-body p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label class="form-label">Hasta Adı / ID (*)</label>
            <input type="text" v-model="form.name" class="form-input" required />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="form-label">Yaş</label>
              <input type="number" v-model.number="form.age" class="form-input" />
            </div>
            <div>
              <label class="form-label">Cinsiyet</label>
              <select v-model="form.gender" class="form-input">
                <option value="">Seçiniz</option>
                <option value="Male">Erkek</option>
                <option value="Female">Kadın</option>
                <option value="Other">Diğer</option>
              </select>
            </div>
            <div>
              <label class="form-label">Irk</label>
              <input type="text" v-model="form.race" class="form-input" />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="form-label">Teşhis</label>
              <select v-model="form.disease" class="form-input">
                <option value="">Seçiniz</option>
                <option value="Karsinom">Karsinom</option>
                <option value="Normal">Normal</option>
              </select>
            </div>

            <div>
              <label class="form-label">Alt Tip</label>

              <select v-if="subtypeOptions.length > 0" v-model="form.subtype" class="form-input">
                <option value="">Seçiniz</option>
                <option v-for="opt in subtypeOptions" :key="opt" :value="opt">
                  {{ opt }}
                </option>
              </select>

              <input
                v-else
                type="text"
                v-model="form.subtype"
                class="form-input"
                :placeholder="loadingSubtypes ? 'Yükleniyor...' : ''"
              />
            </div>

            <div>
              <label class="form-label">Grade</label>
              <input type="number" v-model.number="form.grade" class="form-input" />
            </div>
          </div>

          <div>
            <label class="form-label">Tıbbi Geçmiş</label>
            <textarea v-model="form.history" class="form-input" rows="3"></textarea>
          </div>
        </div>

        <div
          class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 rounded-b-xl"
        >
          <button type="button" @click="$emit('close')" class="btn btn-outline">İptal</button>
          <button type="submit" :disabled="loading" class="btn btn-primary">
            {{ loading ? 'Kaydediliyor...' : 'Güncelle' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, onMounted, ref, type PropType } from 'vue';
import { useWorkspaceStore } from '@/stores/workspace';
import { repositories } from '@/services';
import type { Patient } from '@/core/entities/Patient';
import type { Workspace } from '@/core/entities/Workspace';

const props = defineProps({
  workspaceId: { type: String, required: true },
  patient: { type: Object as PropType<Patient>, required: true },
});

const emit = defineEmits(['close', 'updated']);
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
  form.name = props.patient.name;
  form.age = props.patient.age;
  form.gender = props.patient.gender || '';
  form.race = props.patient.race || '';
  form.disease = props.patient.disease || '';
  form.subtype = props.patient.subtype || '';
  form.grade =
    typeof props.patient.grade === 'string' ? parseInt(props.patient.grade) : props.patient.grade;
  form.history = props.patient.history || '';

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
      }
    }
  } catch (error) {
    console.error('HATA: Alt tip seçenekleri yüklenirken hata oluştu:', error);
  } finally {
    loadingSubtypes.value = false;
  }
}

async function handleSubmit() {
  const payload = {
    workspaceId: props.workspaceId,
    name: form.name,
    age: form.age || undefined,
    gender: form.gender || undefined,
    race: form.race || undefined,
    disease: form.disease || undefined,
    subtype: form.subtype || undefined,
    grade: form.grade || undefined,
    history: form.history || undefined,
  };

  const success = await store.updatePatient(props.patient.id, payload);
  if (success) {
    emit('updated');
    emit('close');
  }
}
</script>
