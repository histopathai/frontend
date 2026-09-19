import { describe, expect, it } from 'vitest';
import { UserRole } from '../UserRole';

describe('UserRole.fromString', () => {
  it('reads the current groups', () => {
    for (const name of ['admin', 'pathologist', 'datascientist', 'unassigned']) {
      expect(UserRole.fromString(name).toString()).toBe(name);
    }
  });

  it('maps the names used before the groups existed', () => {
    expect(UserRole.fromString('user').toString()).toBe('pathologist');
    expect(UserRole.fromString('viewer').toString()).toBe('datascientist');
  });

  it('ignores case and surrounding space', () => {
    expect(UserRole.fromString(' Admin ').isAdmin()).toBe(true);
  });

  it('treats a role it does not know as no group instead of throwing', () => {
    // A group added later, served to a browser still running this build, must not break login.
    for (const value of ['curator', '', undefined, null]) {
      expect(UserRole.fromString(value as unknown as string).toString()).toBe('unassigned');
    }
  });

  it('only calls admin an admin', () => {
    expect(UserRole.admin().isAdmin()).toBe(true);
    expect(UserRole.pathologist().isAdmin()).toBe(false);
    expect(UserRole.datascientist().isAdmin()).toBe(false);
  });
});
