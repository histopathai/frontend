import { Patient } from '../entities/Patient';
import type { PaginatedResult, QueryOptions } from '../types/common';
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
  grade?: string;
  history?: string;
}

export interface IPatientRepository {
  getById(id: string): Promise<Patient | null>;
  list(options?: QueryOptions): Promise<PaginatedResult<Patient>>;
  list(options?: QueryOptions): Promise<PaginatedResult<Patient>>;
  listByWorkspace(workspaceId: string, options?: QueryOptions): Promise<PaginatedResult<Patient>>;
  listByParent(parentId: string, options?: QueryOptions): Promise<PaginatedResult<Patient>>;
  create(data: CreateNewPatientRequest): Promise<Patient>;
  update(id: string, data: Partial<CreateNewPatientRequest>): Promise<void>;
  delete(id: string): Promise<void>;
  transfer(id: string, newWorkspaceId: string): Promise<void>;
  count(): Promise<number>;
  count(): Promise<number>;
  softDeleteMany(ids: string[]): Promise<void>;
  transferMany(data: BatchTransfer): Promise<void>;
}

export type UpdatePatientRequest = Partial<CreateNewPatientRequest>;
