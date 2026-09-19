// Whose labels, of which type — the choice behind `owner=` and
// `annotation_type=` of `workspace_patches`.
//
// The choice belongs to the workspace, not to the image on screen. dev-ingestor
// takes one owner and one annotation type for a whole workspace and skips the
// images that have no polygons of that label set; the tab does the same instead
// of quietly showing somebody else's labels on such an image.
import { compare, type LabelSet } from './annotations';

/** What the user picked. The names are kept so that an image without the set can still say what is missing. */
export interface LabelSetChoice {
  ownerId: string | null;
  ownerName: string | null;
  annotationTypeId: string | null;
  annotationTypeName: string | null;
}

export const NO_CHOICE: LabelSetChoice = {
  ownerId: null,
  ownerName: null,
  annotationTypeId: null,
  annotationTypeName: null,
};

/** Someone whose labels are on the image: a person, a model, or an imported dataset. */
export interface Annotator {
  ownerId: string;
  owner: string;
  /** "manual", "model", "imported" — several joined by "|" when one owner has more than one kind. */
  resource: string;
  polygons: number;
  sets: LabelSet[];
}

export function annotators(sets: LabelSet[]): Annotator[] {
  const byOwner = new Map<string, Annotator>();
  for (const set of sets) {
    let entry = byOwner.get(set.ownerId);
    if (!entry) {
      entry = { ownerId: set.ownerId, owner: set.owner, resource: '', polygons: 0, sets: [] };
      byOwner.set(set.ownerId, entry);
    }
    entry.sets.push(set);
    entry.polygons += set.polygons.length;
  }
  for (const entry of byOwner.values()) {
    entry.resource = [...new Set(entry.sets.flatMap((s) => s.resource.split('|')))]
      .sort()
      .join('|');
  }
  return [...byOwner.values()].sort((a, b) => compare(a.owner, b.owner));
}

export type Resolution =
  | { status: 'ok'; set: LabelSet; annotator: Annotator }
  | { status: 'no-annotations' }
  | { status: 'choose-annotator' }
  /** The chosen annotator has no polygons on this image: dev-ingestor skips it. */
  | { status: 'annotator-absent' }
  | { status: 'choose-type'; annotator: Annotator }
  /** The annotator is here, but not with the chosen annotation type: dev-ingestor skips it. */
  | { status: 'type-absent'; annotator: Annotator };

/**
 * The label set to use on this image. Where there is nothing to choose — one
 * annotator, one type — it is used without asking; an explicit choice is never
 * replaced by something else.
 */
export function resolveLabelSet(sets: LabelSet[], choice: LabelSetChoice): Resolution {
  if (!sets.length) return { status: 'no-annotations' };
  const all = annotators(sets);

  let annotator: Annotator | undefined;
  if (choice.ownerId) {
    annotator = all.find((a) => a.ownerId === choice.ownerId);
    if (!annotator) return { status: 'annotator-absent' };
  } else if (all.length === 1) {
    annotator = all[0]!;
  } else {
    return { status: 'choose-annotator' };
  }

  // A type that was chosen together with an annotator; without an annotator it says nothing.
  const typeId = choice.ownerId ? choice.annotationTypeId : null;
  if (typeId) {
    const set = annotator.sets.find((s) => s.annotationTypeId === typeId);
    return set ? { status: 'ok', set, annotator } : { status: 'type-absent', annotator };
  }
  return annotator.sets.length === 1
    ? { status: 'ok', set: annotator.sets[0]!, annotator }
    : { status: 'choose-type', annotator };
}

/**
 * The choice after picking an annotator: their only type is taken along, a
 * type they also have is kept, otherwise the type is asked for next.
 */
export function chooseAnnotator(annotator: Annotator, current: LabelSetChoice): LabelSetChoice {
  const kept = annotator.sets.find((s) => s.annotationTypeId === current.annotationTypeId);
  const set = kept ?? (annotator.sets.length === 1 ? annotator.sets[0]! : null);
  return {
    ownerId: annotator.ownerId,
    ownerName: annotator.owner,
    annotationTypeId: set?.annotationTypeId ?? null,
    annotationTypeName: set?.annotationType ?? null,
  };
}

export function chooseLabelSet(set: LabelSet): LabelSetChoice {
  return {
    ownerId: set.ownerId,
    ownerName: set.owner,
    annotationTypeId: set.annotationTypeId,
    annotationTypeName: set.annotationType,
  };
}
