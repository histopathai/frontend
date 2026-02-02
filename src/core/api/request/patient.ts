import type { ParentRefRequest } from './common';

export interface CreatePatientRequest {
  parent: ParentRefRequest;
  name: string;
  age?: number;
  gender?: string;
  race?: string;
  disease?: string;
  subtype?: string;
  grade?: string;
  history?: string;
}

export interface UpdatePatientRequest {
  creator_id?: string;
  name?: string;
  age?: number;
  gender?: string;
  race?: string;
  disease?: string;
  subtype?: string;
  grade?: string;
  history?: string;
}
