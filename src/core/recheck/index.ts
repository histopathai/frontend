/**
 * Ek Kontrol: images an admin sent back to the expert who labelled them, with
 * the reason. A request only points at an image (main-service
 * recheck_requests/{image_id}); the tab is a filtered view of data already
 * uploaded.
 */
export type RecheckReasonCode =
  | 'subtype'
  | 'polygon'
  | 'polygon_missing'
  | 'global_label_missing'
  | 'other'
  /** Set on every image of a workspace sent as a whole; the note says why. */
  | 'dataset';

export type RecheckStatus = 'open' | 'done';

export interface RecheckReason {
  code: RecheckReasonCode;
  note: string;
  requestedBy: string;
  requestedAt: string;
}

export interface RecheckRequest {
  imageId: string;
  imageName: string;
  patientId: string;
  patientName: string;
  wsId: string;
  status: RecheckStatus;
  reasons: RecheckReason[];
  createdAt: string;
  updatedAt: string;
  completedBy: string | null;
  completedAt: string | null;
}

/**
 * The reasons an admin picks for one image, with the sentence each is shown
 * as; "other" is written by the admin. "dataset" is set by sending a whole
 * workspace, not picked here.
 */
export const RECHECK_REASONS: { code: Exclude<RecheckReasonCode, 'dataset'>; label: string }[] = [
  { code: 'subtype', label: 'Alt tip yeniden incelenmeli' },
  { code: 'polygon', label: 'Poligon yeniden incelenmeli' },
  { code: 'polygon_missing', label: 'Poligon eksik' },
  { code: 'global_label_missing', label: 'Global etiket eksik' },
  { code: 'other', label: 'Diğer' },
];

export const RECHECK_NOTE_MAX = 500;

export const DATASET_REASON_LABEL = 'Veri seti uzman incelemesine gönderildi';

/** "Alt tip yeniden incelenmeli" — or, for "other", the note itself. */
export function reasonSentence(reason: Pick<RecheckReason, 'code' | 'note'>): string {
  if (reason.code === 'other') return reason.note;
  if (reason.code === 'dataset') return DATASET_REASON_LABEL;
  return RECHECK_REASONS.find((r) => r.code === reason.code)?.label ?? reason.code;
}

export function recheckFromApi(d: any): RecheckRequest {
  return {
    imageId: d.image_id,
    imageName: d.image_name ?? '',
    patientId: d.patient_id ?? '',
    patientName: d.patient_name ?? '',
    wsId: d.ws_id ?? '',
    status: d.status === 'done' ? 'done' : 'open',
    reasons: (d.reasons ?? []).map((r: any) => ({
      code: r.code,
      note: r.note ?? '',
      requestedBy: r.requested_by ?? '',
      requestedAt: r.requested_at ?? '',
    })),
    createdAt: d.created_at ?? '',
    updatedAt: d.updated_at ?? '',
    completedBy: d.completed_by || null,
    completedAt: d.completed_at ?? null,
  };
}

export interface RecheckGroup {
  wsId: string;
  requests: RecheckRequest[];
  open: number;
  /** Notes of the workspace's "dataset" reasons, shown once over the group. */
  datasetNotes: string[];
}

/** The reasons listed under an image: the "dataset" one is shown over its group. */
export function ownReasons(request: RecheckRequest): RecheckReason[] {
  return request.reasons.filter((r) => r.code !== 'dataset');
}

/** "24.jpg" before "140.jpg": numbers in names compare as numbers. */
const byName = new Intl.Collator('tr', { numeric: true }).compare;

/**
 * Requests by workspace, in the order of `workspaceOrder` (workspaces not in
 * it last); images by name inside. With `hideDone`, done requests are left out
 * except `keepId` (the one open in the viewer stays until the user moves on).
 */
export function groupRechecks(
  requests: RecheckRequest[],
  workspaceOrder: string[],
  hideDone: boolean,
  keepId?: string
): RecheckGroup[] {
  const groups = new Map<string, RecheckRequest[]>();
  for (const r of requests) {
    if (hideDone && r.status === 'done' && r.imageId !== keepId) continue;
    if (!groups.has(r.wsId)) groups.set(r.wsId, []);
    groups.get(r.wsId)!.push(r);
  }
  const rank = (wsId: string) => {
    const i = workspaceOrder.indexOf(wsId);
    return i < 0 ? Number.MAX_SAFE_INTEGER : i;
  };
  return [...groups.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([wsId, list]) => ({
      wsId,
      requests: [...list].sort((a, b) => byName(a.imageName, b.imageName)),
      open: list.filter((r) => r.status === 'open').length,
      datasetNotes: [
        ...new Set(list.flatMap((r) => r.reasons.filter((x) => x.code === 'dataset').map((x) => x.note))),
      ],
    }));
}
