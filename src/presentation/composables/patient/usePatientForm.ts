import { ref, reactive, computed, watch, onMounted } from 'vue';
import { usePatientStore } from '@/stores/patient';
import { useAnnotationTypeStore } from '@/stores/annotation_type';
import { repositories } from '@/services';
import type { Patient } from '@/core/entities/Patient';
import type { CreateNewPatientRequest } from '@/core/repositories/IPatientRepository';
import type { AnnotationType } from '@/core/entities/AnnotationType'; // Eklendi

export function usePatientForm(
  props: {
    workspaceId: string;
    patientToEdit?: Patient | null;
  },
  emit: (event: 'close' | 'saved') => void
) {
  const patientStore = usePatientStore();
  const annotationTypeStore = useAnnotationTypeStore();

  const loading = computed(() => patientStore.isActionLoading);
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

  const isEditMode = computed(() => !!props.patientToEdit);

  // Edit modundaysa formu doldur
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

  // Subtype seçeneklerini getir (Anotasyon tipine bağlı olarak)
  async function fetchSubtypeOptions() {
    loadingSubtypes.value = true;
    try {
      const workspace = await repositories.workspace.getById(props.workspaceId);

      if (workspace && workspace.annotationTypeId) {
        // Tip Düzeltmesi: Değişkenin null veya undefined olabileceğini belirttik
        let annotationType: AnnotationType | null | undefined =
          annotationTypeStore.getAnnotationTypeById(workspace.annotationTypeId);

        if (!annotationType) {
          annotationType = await annotationTypeStore.fetchAnnotationTypeById(
            workspace.annotationTypeId
          );
        }

        if (annotationType && annotationType.classList) {
          subtypeOptions.value = annotationType.classList;
        }
      }
    } catch (error) {
      console.error('Subtype seçenekleri yüklenemedi:', error);
    } finally {
      loadingSubtypes.value = false;
    }
  }

  onMounted(() => {
    fetchSubtypeOptions();
  });

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
    subtypeOptions,
    loadingSubtypes,
    isEditMode,
    handleSubmit,
  };
}
