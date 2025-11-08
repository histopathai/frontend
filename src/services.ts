import { ApiClient } from '@/infrastructure/api/ApiClient';
import { AuthRepository } from '@/infrastructure/repositories/AuthRepository';
import { WorkspaceRepository } from '@/infrastructure/repositories/WorkspaceRepository';
import { PatientRepository } from '@/infrastructure/repositories/PatientRepository';
import { ImageRepository } from '@/infrastructure/repositories/ImageRepository';
import { AnnotationRepository } from '@/infrastructure/repositories/AnnotationRepository';
import { AnnotationTypeRepository } from '@/infrastructure/repositories/AnnotationTypeRepository';

const apiClient = new ApiClient(import.meta.env.VITE_API_BASE_URL);

export const repositories = {
  auth: new AuthRepository(apiClient),
  workspace: new WorkspaceRepository(apiClient),
  patient: new PatientRepository(apiClient),
  image: new ImageRepository(apiClient),
  annotation: new AnnotationRepository(apiClient),
  annotationType: new AnnotationTypeRepository(apiClient),
};
