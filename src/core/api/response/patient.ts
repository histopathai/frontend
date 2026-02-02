import type { ParentRefResponse } from './common';

export interface PatientResponse {
  id: string;
  entity_type: string;
  name: string;
  creator_id: string;
  parent: ParentRefResponse;
  age?: number;
  gender?: string;
  race?: string;
  disease?: string;
  subtype?: string;
  grade?: string;
  history?: string;
  created_at: string;
  updated_at: string;
}
