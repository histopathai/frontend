import { ApiClient } from '@/infrastructure/api/ApiClient';
import { AuthRepository } from '@/infrastructure/repositories/AuthRepository';
import { WorkspaceRepository } from '@/infrastructure/repositories/WorkspaceRepository';
import { PatientRepository } from '@/infrastructure/repositories/PatientRepository';
import { ImageRepository } from '@/infrastructure/repositories/ImageRepository';
import { AnnotationRepository } from '@/infrastructure/repositories/AnnotationRepository';
import { AnnotationTypeRepository } from '@/infrastructure/repositories/AnnotationTypeRepository';
import { AnnotationReviewRepository } from './infrastructure/repositories/AnnotationReviewRepository';
import { AdminRepository } from './infrastructure/repositories/AdminRepository';
import { TissueMaskRepository } from './infrastructure/repositories/TissueMaskRepository';
import { BlindTestRepository } from './infrastructure/repositories/BlindTestRepository';
import { BlindTestGuestRepository } from './infrastructure/repositories/BlindTestGuestRepository';
import { RecheckRepository } from './infrastructure/repositories/RecheckRepository';
import type { IBlindTestGuestRepository } from './core/repositories/IBlindTestRepository';

const apiClient = new ApiClient(import.meta.env.VITE_API_BASE_URL);

export const repositories = {
  auth: new AuthRepository(apiClient),
  admin: new AdminRepository(apiClient),
  workspace: new WorkspaceRepository(apiClient),
  patient: new PatientRepository(apiClient),
  image: new ImageRepository(apiClient),
  annotation: new AnnotationRepository(apiClient),
  annotationType: new AnnotationTypeRepository(apiClient),
  annotationReview: new AnnotationReviewRepository(apiClient),
  tissueMask: new TissueMaskRepository(apiClient),
  blindTest: new BlindTestRepository(apiClient),
  recheck: new RecheckRepository(apiClient),
  /** The blind test of an invitation link, for people without an account. */
  blindTestGuest: (token: string): IBlindTestGuestRepository =>
    new BlindTestGuestRepository(import.meta.env.VITE_API_BASE_URL, token),
};
