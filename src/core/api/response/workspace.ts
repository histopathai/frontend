import type { ParentRefResponse } from './common';

export interface WorkspaceResponse {
  id: string;
  entity_type: string;
  name: string;
  creator_id: string;
  parent: ParentRefResponse;
  organ_type: string;
  organization: string;
  description: string;
  license: string;
  resource_url: string;
  release_year: number;
  annotation_types: string[];
  created_at: string;
  updated_at: string;
}
