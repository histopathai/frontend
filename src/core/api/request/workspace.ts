import { OrganTypeUtils } from '@/core/value-objects';

export interface CreateWorkspaceRequest {
  name: string;
  organ_type: string;
  organization: string;
  description: string;
  license: string;
  resource_url?: string;
  release_year?: number;
  annotation_types?: string[];
}

export interface UpdateWorkspaceRequest {
  creator_id?: string;
  name?: string;
  organ_type?: string;
  organization?: string;
  description?: string;
  license?: string;
  resource_url?: string;
  release_year?: number;
  annotation_types?: string[];
}
