import type { TissueMask, TissueMaskStatus } from '../entities/TissueMask';
import type { TissueParams, TissuePolygon } from '@/core/tissue';

export interface SaveTissueMaskRequest {
  algorithm_version: string;
  params: TissueParams;
  polygons: TissuePolygon[];
  preview_width: number;
  preview_height: number;
  level0_width: number;
  level0_height: number;
  downsample_x: number;
  downsample_y: number;
  tissue_area_ratio: number;
  /** Revision the changes are based on (0 when there was no mask). */
  expected_revision?: number;
}

/** Review state of one mask, without its polygons. */
export interface TissueMaskSummary {
  imageId: string;
  status: TissueMaskStatus;
}

/** Mask progress of one workspace, counted over the images that need a mask. */
export interface TissueMaskWorkspaceStats {
  workspaceId: string;
  totalImages: number;
  done: number;
  remaining: number;
}

export interface ITissueMaskRepository {
  /** Returns null when the image has no tissue mask yet. */
  getByImage(imageId: string): Promise<TissueMask | null>;
  save(imageId: string, data: SaveTissueMaskRequest): Promise<TissueMask>;
  approve(imageId: string, expectedRevision?: number): Promise<TissueMask>;
  reject(imageId: string, reason: string | null, expectedRevision?: number): Promise<TissueMask>;
  /** Every mask of the workspace; walks all pages. */
  listByWorkspace(workspaceId: string): Promise<TissueMaskSummary[]>;
  /** Workspaces without an image that needs a mask are left out. */
  getWorkspaceStats(): Promise<TissueMaskWorkspaceStats[]>;
  /** Returns null when the image has no tissue preview (not processed or not backfilled). */
  getPreview(imageId: string): Promise<Blob | null>;
}
