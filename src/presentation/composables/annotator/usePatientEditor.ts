import { ref, watch, computed, type Ref } from 'vue';
import { usePatientStore } from '@/stores/patient';
import type { Patient } from '@/core/entities/Patient';
import type { UpdatePatientRequest } from '@/core/repositories/IPatientRepository';

export function usePatientEditor(patient: Ref<Patient | null>) {
  const patientStore = usePatientStore();
  const loading = computed(() => patientStore.isActionLoading);

  const age = ref<number | undefined>();
  const gender = ref<string | undefined>();
  const race = ref<string | undefined>();
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
        race.value = newPatient.race ?? undefined;
        disease.value = newPatient.disease ?? undefined;
        subtype.value = newPatient.subtype ?? undefined;
        grade.value = newPatient.grade ?? undefined;
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
      race: race.value,
      disease: disease.value,
      subtype: subtype.value,
      grade: grade.value,
      history: history.value,
    };

    await patientStore.updatePatient(patient.value.id, payload);
  }

  return {
    loading,
    age,
    gender,
    race,
    disease,
    subtype,
    grade,
    history,

    savePatientChanges,
  };
}
