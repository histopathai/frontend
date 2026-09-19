import { describe, expect, it } from 'vitest';
import {
  annotators,
  chooseAnnotator,
  chooseLabelSet,
  NO_CHOICE,
  resolveLabelSet,
  type LabelSet,
} from '..';

const set = (
  ownerId: string,
  owner: string,
  typeId: string,
  type: string,
  resource: string,
  n: number
): LabelSet => ({
  key: `${ownerId}\u0000${typeId}`,
  ownerId,
  owner,
  annotationTypeId: typeId,
  annotationType: type,
  resource,
  polygons: Array.from({ length: n }) as LabelSet['polygons'],
  labelCounts: [],
  sideUm: null,
});

const ayseGleason = set('u1', 'Dr. Ayşe', 't1', 'Gleason Pattern', 'manual', 5);
const ayseTumor = set('u1', 'Dr. Ayşe', 't2', 'Tümör Bölgesi', 'manual', 2);
const mehmet = set('u2', 'Dr. Mehmet', 't1', 'Gleason Pattern', 'manual', 3);
const imported = set('placeholder', 'imported', 't3', 'Gleason Skorlama', 'imported', 520);

describe('annotators', () => {
  it('lists everyone with labels on the image, an imported dataset included', () => {
    const list = annotators([ayseGleason, imported, mehmet, ayseTumor]);
    expect(list.map((a) => [a.owner, a.resource, a.polygons, a.sets.length])).toEqual([
      ['Dr. Ayşe', 'manual', 7, 2],
      ['Dr. Mehmet', 'manual', 3, 1],
      ['imported', 'imported', 520, 1],
    ]);
  });
});

describe('resolveLabelSet', () => {
  it('asks for nothing when there is nothing to choose', () => {
    const r = resolveLabelSet([imported], NO_CHOICE);
    expect(r.status === 'ok' && r.set).toBe(imported);
  });

  it('asks for the annotator first, then for the type', () => {
    const sets = [ayseGleason, ayseTumor, mehmet, imported];
    expect(resolveLabelSet(sets, NO_CHOICE).status).toBe('choose-annotator');

    const ayse = chooseAnnotator(annotators(sets)[0]!, NO_CHOICE);
    expect(ayse).toMatchObject({ ownerId: 'u1', ownerName: 'Dr. Ayşe', annotationTypeId: null });
    expect(resolveLabelSet(sets, ayse).status).toBe('choose-type');

    const r = resolveLabelSet(sets, chooseLabelSet(ayseTumor));
    expect(r.status === 'ok' && r.set).toBe(ayseTumor);
  });

  it('takes the only type of an annotator along, and keeps a type the next annotator also has', () => {
    const list = annotators([ayseGleason, ayseTumor, mehmet, imported]);
    const viaImported = chooseAnnotator(list[2]!, NO_CHOICE);
    expect(viaImported).toMatchObject({ ownerId: 'placeholder', annotationTypeId: 't3' });

    const fromMehmetToAyse = chooseAnnotator(list[0]!, chooseLabelSet(mehmet));
    expect(fromMehmetToAyse).toMatchObject({ ownerId: 'u1', annotationTypeId: 't1' });
  });

  it('never swaps an explicit choice for what happens to be on the image', () => {
    // dev-ingestor skips such an image; showing the imported labels instead would mislead.
    expect(resolveLabelSet([imported], chooseLabelSet(ayseGleason)).status).toBe(
      'annotator-absent'
    );
    expect(resolveLabelSet([ayseTumor, mehmet], chooseLabelSet(ayseGleason)).status).toBe(
      'type-absent'
    );
  });

  it('knows an image without region annotations', () => {
    expect(resolveLabelSet([], chooseLabelSet(imported)).status).toBe('no-annotations');
  });
});
