import { describe, expect, it } from 'vitest';
import { annotators, chooseAnnotator, neighbourImage, NO_CHOICE, select, type CatalogSet } from '..';

const set = (
  ownerId: string,
  owner: string,
  typeId: string,
  type: string,
  resource: string,
  polygons: number,
  imageIds: string[] | null
): CatalogSet => ({ ownerId, owner, annotationTypeId: typeId, annotationType: type, resource, polygons, imageIds });

// Gleason_CNN as it is: an imported dataset and one person, each with two annotation types.
const importedGleason = set('1111', 'imported', 't1', 'Gleason Pattern', 'imported', 1147, ['a', 'b', 'c']);
const importedTumor = set('1111', 'imported', 't2', 'Tümör Bölgesi', 'imported', 183, ['c', 'd']);
const selvaGleason = set('u1', 'Selva Kabul', 't1', 'Gleason Pattern', 'manual', 19, ['a', 'e']);
const selvaTumor = set('u1', 'Selva Kabul', 't2', 'Tümör Bölgesi', 'manual', 19, ['a', 'e']);
const catalog = [importedGleason, importedTumor, selvaGleason, selvaTumor];

describe('annotators', () => {
  it('lists everyone with labels in the workspace, an imported dataset included', () => {
    expect(annotators(catalog).map((a) => [a.owner, a.resource, a.polygons, a.images, a.sets.length])).toEqual([
      ['Selva Kabul', 'manual', 38, 2, 2],
      ['imported', 'imported', 1330, 4, 2],
    ]);
  });

  it('does not count images it does not know', () => {
    const onScreen = [set('u1', 'Selva Kabul', 't1', 'Gleason Pattern', 'manual', 4, null)];
    expect(annotators(onScreen)[0]!.images).toBeNull();
  });
});

describe('select', () => {
  it('asks for the annotator, then for the type', () => {
    expect(select(catalog, NO_CHOICE)).toEqual({ status: 'choose-annotator' });
    const selva = chooseAnnotator(annotators(catalog)[0]!, NO_CHOICE);
    expect(selva).toEqual({ ownerId: 'u1', annotationTypeId: null });
    expect(select(catalog, selva).status).toBe('choose-type');
    expect(select(catalog, { ownerId: 'u1', annotationTypeId: 't2' })).toMatchObject({
      status: 'chosen',
      set: selvaTumor,
    });
  });

  it('keeps the annotation type when the annotator changes: the same question, another answer', () => {
    const toImported = chooseAnnotator(annotators(catalog)[1]!, { ownerId: 'u1', annotationTypeId: 't2' });
    expect(toImported).toEqual({ ownerId: '1111', annotationTypeId: 't2' });
    expect(select(catalog, toImported)).toMatchObject({ status: 'chosen', set: importedTumor });
  });

  it('asks for nothing where there is nothing to choose', () => {
    expect(select([selvaGleason], NO_CHOICE)).toMatchObject({ status: 'chosen', set: selvaGleason });
    // Zenodo-Dataset: two annotators, one type — picking the annotator is the whole choice.
    const zenodo = [importedGleason, selvaGleason];
    expect(chooseAnnotator(annotators(zenodo)[0]!, NO_CHOICE)).toEqual({ ownerId: 'u1', annotationTypeId: 't1' });
  });

  it('never stands in one annotator for another', () => {
    // The chosen annotator has nothing on image "b"; that is for the caller to say — the choice stays.
    const chosen = select(catalog, { ownerId: 'u1', annotationTypeId: 't1' });
    expect(chosen).toMatchObject({ status: 'chosen', set: selvaGleason });
    expect(chosen.status === 'chosen' && chosen.set.imageIds?.includes('b')).toBe(false);
  });

  it('treats a choice the workspace does not have as none', () => {
    expect(select(catalog, { ownerId: 'someone-else', annotationTypeId: 't1' })).toEqual({
      status: 'choose-annotator',
    });
    expect(select([], { ownerId: 'u1', annotationTypeId: 't1' })).toEqual({ status: 'empty' });
  });
});

describe('neighbourImage', () => {
  it('walks the images of the set and wraps around', () => {
    expect(neighbourImage(importedGleason, 'a', 1)).toBe('b');
    expect(neighbourImage(importedGleason, 'c', 1)).toBe('a');
    expect(neighbourImage(importedGleason, 'a', -1)).toBe('c');
  });

  it('enters the set from an image that is not in it', () => {
    expect(neighbourImage(selvaGleason, 'b', 1)).toBe('a');
    expect(neighbourImage(selvaGleason, 'b', -1)).toBe('e');
  });

  it('has nowhere to go from the only image, or without knowing the images', () => {
    expect(neighbourImage(set('u', 'U', 't', 'T', 'manual', 1, ['a']), 'a', 1)).toBeNull();
    expect(neighbourImage(set('u', 'U', 't', 'T', 'manual', 1, null), 'a', 1)).toBeNull();
  });
});
