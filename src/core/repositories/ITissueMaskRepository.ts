import type { TissueMask } from '../entities/TissueMask';
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
}

export interface ITissueMaskRepository {
  /** Returns null when the image has no tissue mask yet. */
  getByImage(imageId: string): Promise<TissueMask | null>;
  save(imageId: string, data: SaveTissueMaskRequest): Promise<TissueMask>;
  approve(imageId: string): Promise<TissueMask>;
  /** Returns null when the image has no tissue preview (not processed or not backfilled). */
  getPreview(imageId: string): Promise<Blob | null>;
}
