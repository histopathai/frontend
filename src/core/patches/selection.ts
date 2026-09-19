// Whose labels, of which type — the choice behind `owner=` and
// `annotation_type=` of `workspace_patches`.
//
// Patches are made from one annotator's labels of one annotation type, never
// from a mixture: two annotators may well disagree on the same square. The
// choice is made for the workspace, from the annotators of the workspace (the
// catalog, what dev-ingestor's `label_sets(ds)` lists) — not from whoever
// happens to have drawn on the image on screen. An image the chosen annotator
// did not label gives no patches, which is what dev-ingestor does with it too.

/** One annotator's labels of one annotation type, in a workspace. */
export interface CatalogSet {
  ownerId: string;
  owner: string;
  annotationTypeId: string;
  annotationType: string;
  /** "manual", "model", "imported" — several joined by "|". */
  resource: string;
  polygons: number;
  /** Images that carry the set; null when only the image on screen is known. */
  imageIds: string[] | null;
}

/** What the user picked. */
export interface LabelSetChoice {
  ownerId: string | null;
  annotationTypeId: string | null;
}

export const NO_CHOICE: LabelSetChoice = { ownerId: null, annotationTypeId: null };

/** Someone whose labels are in the workspace: a person, a model, or an imported dataset. */
export interface Annotator {
  ownerId: string;
  owner: string;
  resource: string;
  polygons: number;
  /** Images with any label of this annotator; null when not known. */
  images: number | null;
  sets: CatalogSet[];
}

const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function annotators(catalog: CatalogSet[]): Annotator[] {
  const byOwner = new Map<string, Annotator & { imageIds: Set<string> | null }>();
  for (const set of catalog) {
    let entry = byOwner.get(set.ownerId);
    if (!entry) {
      entry = {
        ownerId: set.ownerId,
        owner: set.owner,
        resource: '',
        polygons: 0,
        images: null,
        sets: [],
        imageIds: new Set(),
      };
      byOwner.set(set.ownerId, entry);
    }
    entry.sets.push(set);
    entry.polygons += set.polygons;
    if (set.imageIds === null) entry.imageIds = null;
    else if (entry.imageIds) for (const id of set.imageIds) entry.imageIds.add(id);
  }
  return [...byOwner.values()]
    .map(({ imageIds, ...annotator }) => ({
      ...annotator,
      images: imageIds ? imageIds.size : null,
      resource: [...new Set(annotator.sets.flatMap((s) => s.resource.split('|')))]
        .sort()
        .join('|'),
      sets: [...annotator.sets].sort((a, b) => compare(a.annotationType, b.annotationType)),
    }))
    .sort((a, b) => compare(a.owner, b.owner));
}

export type Selection =
  /** The workspace has no region annotations at all. */
  | { status: 'empty' }
  | { status: 'choose-annotator' }
  | { status: 'choose-type'; annotator: Annotator }
  | { status: 'chosen'; annotator: Annotator; set: CatalogSet };

/**
 * The label set the choice stands for. Where there is nothing to choose — one
 * annotator in the workspace, or one type of the chosen annotator — it is taken
 * without asking. A choice the catalog does not have (another workspace's, a
 * deleted user's) counts as none.
 */
export function select(catalog: CatalogSet[], choice: LabelSetChoice): Selection {
  if (!catalog.length) return { status: 'empty' };
  const all = annotators(catalog);
  const annotator =
    all.find((a) => a.ownerId === choice.ownerId) ?? (all.length === 1 ? all[0]! : undefined);
  if (!annotator) return { status: 'choose-annotator' };

  const set =
    annotator.sets.find((s) => s.annotationTypeId === choice.annotationTypeId) ??
    (annotator.sets.length === 1 ? annotator.sets[0]! : undefined);
  return set ? { status: 'chosen', annotator, set } : { status: 'choose-type', annotator };
}

/**
 * The choice after picking an annotator: a type they also have is kept (the
 * same question, answered by someone else), their only type is taken along,
 * otherwise the type is asked for next.
 */
export function chooseAnnotator(annotator: Annotator, current: LabelSetChoice): LabelSetChoice {
  const kept = annotator.sets.find((s) => s.annotationTypeId === current.annotationTypeId);
  const set = kept ?? (annotator.sets.length === 1 ? annotator.sets[0]! : null);
  return { ownerId: annotator.ownerId, annotationTypeId: set?.annotationTypeId ?? null };
}

/**
 * The image of the chosen set that comes after (or before) the current one —
 * for going straight to where the chosen annotator has labels. Wraps around.
 */
export function neighbourImage(
  set: CatalogSet,
  currentImageId: string | null,
  step: 1 | -1
): string | null {
  const ids = set.imageIds;
  if (!ids?.length) return null;
  const at = currentImageId ? ids.indexOf(currentImageId) : -1;
  if (at === -1) return step === 1 ? ids[0]! : ids[ids.length - 1]!;
  if (ids.length === 1) return null;
  return ids[(at + step + ids.length) % ids.length]!;
}
