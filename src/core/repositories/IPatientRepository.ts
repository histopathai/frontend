import { Patient } from '../entities/Patient';
import { PaginatedResult, Pagination } from '../types/common';

export interface CreatePatientRequest {
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
    list(workspaceId: string, pagination: Pagination): Promise<PaginatedResult<Patient>>;
    getById(id: string): Promise<Patient | null>;
    getByWorkspaceId(workspaceId: string, pagination: Pagination): Promise<PaginatedResult<Patient>>;
    create(data: CreatePatientRequest): Promise<Patient>;
    update(id: string, data: Partial<CreatePatientRequest>): Promise<void>;
    delete(id: string): Promise<void>;
    transfer(id: string, newWorkspaceId: string): Promise<void>;
}
