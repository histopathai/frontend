// What the tab hands back to the user: a per-label summary of the patches on
// screen (the port of `patch_summary`) and the parameters as the Python that
// reproduces them in dev-ingestor.
import type { PatchCells, Placement, PatchSource, Thresholds } from './cells';

export interface SummaryRow {
  /** "tissue" for unlabelled patches. */
  label: string;
  patches: number;
  coverage: number;
  /** NaN for tissue patches. */
  purity: number;
  /** Share of patches that hold another label too (purity < 1); NaN for tissue patches. */
  mixed: number;
}

export function patchSummary(cells: PatchCells, kept: Uint32Array): SummaryRow[] {
  const labelled = cells.source === 'annotation';
  const acc = (labelled ? cells.labels : ['tissue']).map((label) => ({
    label,
    patches: 0,
    coverage: 0,
    purity: 0,
    mixed: 0,
  }));
  for (const i of kept) {
    const row = acc[labelled ? cells.label[i]! : 0]!;
    row.patches++;
    row.coverage += cells.coverage[i]!;
    if (labelled) {
      row.purity += cells.purity[i]!;
      if (cells.purity[i]! < 1) row.mixed++;
    }
  }
  return acc
    .filter((row) => row.patches > 0)
    .map((row) => ({
      label: row.label,
      patches: row.patches,
      coverage: row.coverage / row.patches,
      purity: labelled ? row.purity / row.patches : NaN,
      mixed: labelled ? row.mixed / row.patches : NaN,
    }));
}

export interface PatchParams extends Thresholds {
  patchSize: number;
  mpp: number;
  overlap: number;
  source: PatchSource;
  placement: Placement;
  merge: boolean;
}

const pyFloat = (v: number) => (Number.isInteger(v) ? v.toFixed(1) : String(v));
// A JSON string literal is a valid Python one, escapes included.
const pyString = (v: string) => JSON.stringify(v);

/**
 * The parameters as the call that reproduces these patches for a whole
 * workspace in dev-ingestor. Only the keys that the chosen source and placement
 * read are written — `workspace_patches` ignores the rest, but a reader should
 * not have to know that.
 */
export function pythonSnippet(
  params: PatchParams,
  labelSet: { owner: string; annotationType: string } | null
): string {
  const lines: [string, string][] = [
    ['patch_size', String(params.patchSize)],
    ['mpp', pyFloat(params.mpp)],
    ['overlap', pyFloat(params.overlap)],
    ['source', pyString(params.source)],
  ];
  if (params.source === 'annotation' && labelSet) {
    lines.push(
      ['owner', pyString(labelSet.owner)],
      ['annotation_type', pyString(labelSet.annotationType)]
    );
  }
  lines.push(['placement', pyString(params.placement)]);
  if (params.placement === 'center') lines.push(['merge', params.merge ? 'True' : 'False']);

  if (params.source === 'annotation' && params.placement === 'center') {
    lines.push(['min_inside', pyFloat(params.minInside)]);
  } else {
    lines.push(['min_coverage', pyFloat(params.minCoverage)]);
  }
  if (params.source === 'annotation') {
    lines.push(
      ['min_purity', pyFloat(params.minPurity)],
      ['min_tissue', pyFloat(params.minTissue)]
    );
  }

  return [
    'from histopathai.imaging import patches as pl',
    '',
    'params = dict(',
    ...lines.map(([key, value]) => `    ${key}=${value},`),
    ')',
    'table, report = pl.workspace_patches(ds, **params)',
    '',
  ].join('\n');
}
