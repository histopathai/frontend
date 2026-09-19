import { Annotation } from '../entities/Annotation';
import type { PaginatedResult, QueryOptions } from '../types/common';
import { Point } from '../value-objects/Point';

export interface ParentRef {
  id: string;
  type: string;
}
export interface CreateNewAnnotationRequest {
  parent: ParentRef;
  ws_id: string;
  name: string;
  tag_type: string;
  value: any;
  is_global?: boolean;
  color?: string;
  polygon?: Point[];
}

export interface PointRequest {
  x: number;
  y: number;
}

export interface UpdateAnnotationRequest {
  creator_id: string;
  value?: any;
  color?: string;
  is_global?: boolean;
  polygon?: PointRequest[];
}

/** One annotator's labels of one annotation type in a workspace, as main-service reports them. */
export interface WorkspaceLabelSet {
  creatorId: string;
  annotationTypeId: string;
  /** "manual", "model", "imported" */
  resources: string[];
  /** The annotations' own name when all of the type agree on it, otherwise "". */
  name: string;
  polygonCount: number;
  imageIds: string[];
}

export interface IAnnotationRepository {
  /**
   * Who labelled what in the workspace. Null when the server does not know the
   * endpoint yet (a main-service one release behind): the caller then works
   * from the image on screen.
   */
  labelSetsByWorkspace(workspaceId: string): Promise<WorkspaceLabelSet[] | null>;
  listByImage(imageId: string, options?: QueryOptions): Promise<PaginatedResult<Annotation>>;
  listByParent(parentId: string, options?: QueryOptions): Promise<PaginatedResult<Annotation>>;
  listByWorkspace(
    workspaceId: string,
    options?: QueryOptions
  ): Promise<PaginatedResult<Annotation>>;
  create(data: CreateNewAnnotationRequest): Promise<Annotation>;
  getById(id: string): Promise<Annotation>;
  update(id: string, data: UpdateAnnotationRequest): Promise<void>;
  delete(id: string): Promise<void>;
  count(): Promise<number>;
  softDeleteMany(ids: string[]): Promise<void>;
}
