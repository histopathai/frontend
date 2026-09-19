import { describe, expect, it } from 'vitest';
import { can, type Capability } from '../permissions';

const ALL: Capability[] = [
  'labeling.write',
  'dataset.write',
  'tissue.access',
  'patchGrid.access',
  'admin.access',
];

describe('can', () => {
  it('gives admins everything', () => {
    for (const capability of ALL) expect(can('admin', capability)).toBe(true);
  });

  it('lets pathologists write everywhere except the admin panel', () => {
    expect(ALL.filter((c) => can('pathologist', c))).toEqual([
      'labeling.write',
      'dataset.write',
      'tissue.access',
      'patchGrid.access',
    ]);
  });

  it('keeps data scientists read-only in labelling and the dataset builder', () => {
    expect(ALL.filter((c) => can('datascientist', c))).toEqual([
      'tissue.access',
      'patchGrid.access',
    ]);
  });

  it('gives nothing without a group', () => {
    for (const capability of ALL) {
      expect(can('unassigned', capability)).toBe(false);
      expect(can(null, capability)).toBe(false);
      expect(can(undefined, capability)).toBe(false);
    }
  });
});
