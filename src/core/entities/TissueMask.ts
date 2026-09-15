import type { TissueParams, TissuePolygon } from '@/core/tissue';

export type TissueMaskStatus = 'auto' | 'edited' | 'approved' | 'rejected';

/** Tissue mask of one image (tissue_masks/{imageId}); polygons are in level-0 pixels. */
export interface TissueMask {
  imageId: string;
  wsId: string;
  status: TissueMaskStatus;
  /** Increases with every write; sent back so stale writes are refused. */
  revision: number;
  algorithmVersion: string;
  params: TissueParams;
  polygons: TissuePolygon[];
  previewWidth: number;
  previewHeight: number;
  level0Width: number;
  level0Height: number;
  downsampleX: number;
  downsampleY: number;
  tissueAreaRatio: number;
  pointCount: number;
  editedBy: string | null;
  editedAt: Date | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  rejectedBy: string | null;
  rejectedAt: Date | null;
  rejectReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const toDate = (v: any): Date | null => (v ? new Date(v) : null);
const toPoints = (pts: any[] | null | undefined) =>
  (pts || []).map((p: any) => ({ x: Number(p.x ?? p.X), y: Number(p.y ?? p.Y) }));

export function tissueMaskFromApi(data: any): TissueMask {
  return {
    imageId: data.image_id,
    wsId: data.ws_id,
    status: data.status,
    revision: data.revision ?? 0,
    algorithmVersion: data.algorithm_version,
    params: { ...data.params },
    polygons: (data.polygons || []).map((p: any) => ({
      exterior: toPoints(p.exterior),
      holes: (p.holes || []).map((h: any) => toPoints(h)),
    })),
    previewWidth: data.preview_width,
    previewHeight: data.preview_height,
    level0Width: data.level0_width,
    level0Height: data.level0_height,
    downsampleX: data.downsample_x,
    downsampleY: data.downsample_y,
    tissueAreaRatio: data.tissue_area_ratio,
    pointCount: data.point_count ?? 0,
    editedBy: data.edited_by ?? null,
    editedAt: toDate(data.edited_at),
    approvedBy: data.approved_by ?? null,
    approvedAt: toDate(data.approved_at),
    rejectedBy: data.rejected_by ?? null,
    rejectedAt: toDate(data.rejected_at),
    rejectReason: data.reject_reason ?? null,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}
