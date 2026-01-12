import { Patient } from '../entities/Patient';
import type { PaginatedResult, Pagination } from '../types/common';
import type { BatchTransfer } from './common';

export interface ParentRef {
  id: string;
  type: string;
}

export interface CreateNewPatientRequest {
  parent: ParentRef;
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
  count(): Promise<number>;
  batchDelete(ids: string[]): Promise<void>;
  batchTransfer(data: BatchTransfer): Promise<void>;
  cascadeDelete(id: string): Promise<void>;
}

export type UpdatePatientRequest = Partial<CreateNewPatientRequest>;
