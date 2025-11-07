import { Patient } from '../entities/Patient';
import type { PaginatedResult, Pagination } from '../types/common';

export interface CreateNewPatientRequest {
  workspaceId: string;
  name: string;
  age?: number;
  gender?: string;
  race?: string;
  disease?: string;
  subtype?: string;
  grade?: number;
  history?: string;
}

export interface IPatientRepository {
  getById(id: string): Promise<Patient | null>;
  getByWorkspaceId(workspaceId: string, pagination: Pagination): Promise<PaginatedResult<Patient>>;
  create(data: CreateNewPatientRequest): Promise<Patient>;
  update(id: string, data: Partial<CreateNewPatientRequest>): Promise<void>;
  delete(id: string): Promise<void>;
  transfer(id: string, newWorkspaceId: string): Promise<void>;
}
