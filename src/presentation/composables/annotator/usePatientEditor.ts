import { ref, watch, computed } from 'vue';
import { useWorkspaceStore } from '@/stores/workspace';
import type { Patient } from '@/core/entities/Patient';
import type { UpdatePatientRequest } from '@/core/repositories/IPatientRepository';

export function usePatientEditor(patient: Ref<Patient | null>) {
  const workspaceStore = useWorkspaceStore();
  const loading = computed(() => workspaceStore.loading);

  const age = ref<number | undefined>();
  const gender = ref<string | undefined>();
  const disease = ref<string | undefined>();
  const subtype = ref<string | undefined>();
  const grade = ref<number | undefined>();
  const history = ref<string | undefined>();

  watch(
    patient,
    (newPatient) => {
      if (newPatient) {
        age.value = newPatient.age ?? undefined;
        gender.value = newPatient.gender ?? undefined;
        disease.value = newPatient.disease ?? undefined;
        subtype.value = newPatient.subtype ?? undefined;
        grade.value = newPatient.grade ? parseInt(newPatient.grade) : undefined;
        history.value = newPatient.history ?? undefined;
      }
    },
    { immediate: true }
  );

  async function savePatientChanges() {
    if (!patient.value) return;

    const payload: UpdatePatientRequest = {
      age: age.value,
      gender: gender.value,
      disease: disease.value,
      subtype: subtype.value,
      grade: grade.value,
      history: history.value,
    };

    await workspaceStore.updatePatient(patient.value.id, payload);
  }

  return {
    loading,
    age,
    gender,
    disease,
    subtype,
    grade,
    history,

    savePatientChanges,
  };
}
