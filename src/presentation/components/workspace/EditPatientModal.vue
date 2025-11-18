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
              <input type="text" v-model="form.disease" class="form-input" />
            </div>
            <div>
              <label class="form-label">Alt Tip</label>
              <input type="text" v-model="form.subtype" class="form-input" />
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
import { reactive, computed, onMounted, type PropType } from 'vue';
import { useWorkspaceStore } from '@/stores/workspace';
import type { Patient } from '@/core/entities/Patient';

const props = defineProps({
  patient: { type: Object as PropType<Patient>, required: true },
});

const emit = defineEmits(['close', 'updated']);
const store = useWorkspaceStore();
const loading = computed(() => store.loading);

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

onMounted(() => {
  form.name = props.patient.name;
  form.age = props.patient.age;
  form.gender = props.patient.gender || '';
  form.race = props.patient.race || '';
  form.disease = props.patient.disease || '';
  form.subtype = props.patient.subtype || '';
  form.grade =
    typeof props.patient.grade === 'string' ? parseInt(props.patient.grade) : props.patient.grade; // Grade tip dönüşümü
  form.history = props.patient.history || '';
});

async function handleSubmit() {
  const payload = {
    workspaceId: props.patient.workspaceId,
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
