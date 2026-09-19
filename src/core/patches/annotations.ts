// Annotation polygons as label sets — the port of `annotation_polygons`,
// `annotation_groups`, `label_sets` and `_label_regions`.
//
// A label means something only together with the question that was answered
// (the annotation type) and who answered it (the owner). Patches are made from
// one (owner, annotation type) at a time, never from the mixture.
import { subtractRegions, unionRegions, validRegion, type BuildReport } from './boolean';
import { boundsIntersect, regionArea, regionBounds, type Bounds, type Region } from './geometry';

/** What the grid needs of an annotation; the view maps the entity onto this. */
export interface AnnotationInput {
  id: string;
  name: string;
  value: unknown;
  annotationTypeId: string;
  creatorId: string;
  resource: string;
  isGlobal: boolean;
  polygon: { x: number; y: number }[];
}

export interface LabelPolygon {
  annotationId: string;
  label: string;
  annotationTypeId: string;
  annotationType: string;
  ownerId: string;
  owner: string;
  resource: string;
  region: Region;
  area: number;
  bounds: Bounds;
}

export interface LabelSet {
  /** `${ownerId}\u0000${annotationTypeId}` — stable across renames. */
  key: string;
  owner: string;
  annotationType: string;
  resource: string;
  polygons: LabelPolygon[];
  /** Polygon count per label, labels sorted. */
  labelCounts: { label: string; count: number }[];
  /** Median polygon size, √area in µm; null when the image has no mpp. */
  sideUm: number | null;
}

/**
 * Region annotations of one image, named the way dev-ingestor names them, so
 * that a copied `owner=` / `annotation_type=` selects the same label set there:
 *
 *   annotation type   the annotations' own `name` when all of a type agree on
 *                     it, otherwise the name of the type record, otherwise its id
 *   owner             the user's display name, or "imported" for labels that
 *                     came with a third-party dataset; two ids sharing one
 *                     name are kept apart as "name [id]"
 *
 * Global (polygon-less) and degenerate annotations are dropped.
 */
export function annotationPolygons(
  annotations: AnnotationInput[],
  userNames: Record<string, string>,
  typeNames: Record<string, string>,
  report?: BuildReport
): LabelPolygon[] {
  const rows: (Omit<LabelPolygon, 'annotationType' | 'owner'> & { name: string })[] = [];
  for (const ann of annotations) {
    if (ann.isGlobal || !ann.polygon || ann.polygon.length < 3) continue;
    const region = validRegion(
      ann.polygon.map((p) => [p.x, p.y]),
      [],
      report
    );
    const area = regionArea(region);
    const bounds = regionBounds(region);
    if (!bounds || !(area > 0)) continue;
    rows.push({
      annotationId: ann.id,
      label: String(ann.value),
      name: ann.name,
      annotationTypeId: ann.annotationTypeId,
      ownerId: ann.creatorId,
      resource: ann.resource,
      region,
      area,
      bounds,
    });
  }

  const namesByType = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!namesByType.has(row.annotationTypeId)) namesByType.set(row.annotationTypeId, new Set());
    namesByType.get(row.annotationTypeId)!.add(row.name);
  }
  const typeName = (id: string) => {
    const names = namesByType.get(id)!;
    const agreed = names.size === 1 ? [...names][0] : undefined;
    return agreed || typeNames[id] || id;
  };

  const ownerName = new Map<string, string>();
  for (const row of rows) {
    const known = row.resource !== 'imported' ? userNames[row.ownerId] : undefined;
    ownerName.set(row.ownerId, known || (row.resource === 'imported' ? 'imported' : row.ownerId));
  }
  const nameCount = new Map<string, number>();
  for (const name of ownerName.values()) nameCount.set(name, (nameCount.get(name) ?? 0) + 1);

  return rows.map(({ name: _name, ...row }) => {
    const owner = ownerName.get(row.ownerId)!;
    return {
      ...row,
      annotationType: typeName(row.annotationTypeId),
      owner: nameCount.get(owner)! > 1 ? `${owner} [${row.ownerId}]` : owner,
    };
  });
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/**
 * One entry per (owner, annotation type), sorted like `label_sets`. Compare
 * `sideUm` with the patch footprint `patchSize · mpp`: polygons smaller than a
 * patch cannot be labelled by a grid and need centred patches.
 */
export function labelSets(polygons: LabelPolygon[], baseMpp: number | null): LabelSet[] {
  const groups = new Map<string, LabelPolygon[]>();
  for (const polygon of polygons) {
    const key = `${polygon.ownerId}\u0000${polygon.annotationTypeId}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(polygon);
  }

  const sets: LabelSet[] = [];
  for (const [key, group] of groups) {
    const counts = new Map<string, number>();
    for (const p of group) counts.set(p.label, (counts.get(p.label) ?? 0) + 1);
    sets.push({
      key,
      owner: group[0]!.owner,
      annotationType: group[0]!.annotationType,
      resource: [...new Set(group.map((p) => p.resource))].sort().join('|'),
      // A fixed order, so that no tie further down depends on the order of the input.
      polygons: [...group].sort((a, b) => compare(a.annotationId, b.annotationId)),
      labelCounts: [...counts]
        .sort(([a], [b]) => compare(a, b))
        .map(([label, count]) => ({ label, count })),
      sideUm: baseMpp
        ? Math.round(median(group.map((p) => Math.sqrt(p.area))) * baseMpp * 10) / 10
        : null,
    });
  }
  return sets.sort(
    (a, b) => compare(a.owner, b.owner) || compare(a.annotationType, b.annotationType)
  );
}

/** Code-point order, as Python sorts strings — not the locale's. */
export function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * `{label: region}` — all polygons of a label merged into one region, and the
 * regions made disjoint: where polygons of different labels overlap, the
 * smaller polygon owns the overlap (a region drawn inside a bigger one is the
 * more specific statement; equal areas: the lower annotation id). Labels come
 * back sorted, so a square split evenly goes to the first label by name.
 *
 * `polygons` must be sorted by annotation id (as `labelSets` returns them).
 */
export function labelRegions(
  polygons: LabelPolygon[],
  report?: BuildReport
): { labels: string[]; regions: Region[] } {
  // Pairs whose bounding boxes intersect, by a sweep over minX: a field of
  // thousands of glands must not cost a comparison per pair.
  const cutters: Region[][] = polygons.map(() => []);
  const order = polygons
    .map((_, i) => i)
    .sort((a, b) => polygons[a]!.bounds.minX - polygons[b]!.bounds.minX);
  for (let s = 0; s < order.length; s++) {
    const i = order[s]!;
    const a = polygons[i]!;
    for (
      let t = s + 1;
      t < order.length && polygons[order[t]!]!.bounds.minX <= a.bounds.maxX;
      t++
    ) {
      const j = order[t]!;
      const b = polygons[j]!;
      if (a.label === b.label || !boundsIntersect(a.bounds, b.bounds)) continue;
      // The smaller of the two cuts the larger; equal areas: the lower position cuts.
      const bCutsA = b.area < a.area || (b.area === a.area && j < i);
      if (bCutsA) cutters[i]!.push(b.region);
      else cutters[j]!.push(a.region);
    }
  }
  const cut = polygons.map((polygon, i) => subtractRegions(polygon.region, cutters[i]!, report));

  const labels = [...new Set(polygons.map((p) => p.label))].sort(compare);
  const regions = labels.map((label) =>
    unionRegions(
      cut.filter((_, i) => polygons[i]!.label === label),
      report
    )
  );
  return { labels, regions };
}
