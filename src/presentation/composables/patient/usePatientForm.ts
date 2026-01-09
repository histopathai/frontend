import { reactive, computed, watch } from 'vue';
import { usePatientStore } from '@/stores/patient';
import type { Patient } from '@/core/entities/Patient';
import type { CreateNewPatientRequest } from '@/core/repositories/IPatientRepository';

export function usePatientForm(
  props: {
    workspaceId: string;
    patientToEdit?: Patient | null;
  },
  emit: (event: 'close' | 'saved') => void
) {
  const patientStore = usePatientStore();

  const loading = computed(() => patientStore.isActionLoading);
  const isEditMode = computed(() => !!props.patientToEdit);

  // Form verisi
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

  // Düzenleme modundaysa mevcut verileri doldur
  watch(
    () => props.patientToEdit,
    (newVal) => {
      if (newVal) {
        form.name = newVal.name;
        form.age = newVal.age;
        form.gender = newVal.gender || '';
        form.race = newVal.race || '';
        form.disease = newVal.disease || '';
        form.subtype = newVal.subtype || '';
        form.grade = newVal.grade ? Number(newVal.grade) : null;
        form.history = newVal.history || '';
      }
    },
    { immediate: true }
  );

  // NOT: Artık AnnotationType üzerinden 'scoreEnabled' vb. kontrol etmiyoruz
  // çünkü yapı dinamik 'tags' yapısına geçti.
  // Gerekirse ileride 'tags' içinden 'Grade' alanı var mı diye kontrol edilebilir
  // ama basit hasta yaratma formu için buna gerek yok.

  async function handleSubmit() {
    // Backend'e gidecek veri
    const payload: CreateNewPatientRequest = {
      workspace_id: props.workspaceId,
      name: form.name,
      // Formda değer varsa gönder, yoksa undefined (Backend nullable kabul etmeli)
      age: form.age || undefined,
      gender: form.gender || undefined,
      race: form.race || undefined,
      disease: form.disease || undefined,
      subtype: form.subtype || undefined,
      grade: form.grade || undefined,
      history: form.history || undefined,
    };

    console.log('Submitting patient form with payload:', payload);

    let success = false;

    if (isEditMode.value && props.patientToEdit) {
      success = await patientStore.updatePatient(props.patientToEdit.id, payload);
    } else {
      const result = await patientStore.createPatient(payload);
      success = !!result;
    }

    if (success) {
      emit('saved');
      emit('close');
    }
  }

  return {
    form,
    loading,
    isEditMode,
    handleSubmit,
  };
}
