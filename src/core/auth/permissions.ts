import type { UserRoleValue } from '@/core/value-objects/UserRole';

/**
 * What a user group may do. The server enforces the same rules (main-service
 * role gates); this table only keeps the UI from offering what would be refused.
 *
 *   labeling.write     change annotations, reviews and patient data in the annotator
 *   dataset.write      create, edit and delete workspaces, patients, images, annotation types
 *   tissue.access      the tissue mask tab, read-write
 *   patchGrid.access   the patch grid tab
 *   admin.access       the admin panel
 *
 * A module moving under the groups adds its capability here and nowhere else.
 */
export type Capability =
  | 'labeling.write'
  | 'dataset.write'
  | 'tissue.access'
  | 'patchGrid.access'
  | 'admin.access';

const CAPABILITIES: Record<UserRoleValue, readonly Capability[]> = {
  admin: ['labeling.write', 'dataset.write', 'tissue.access', 'patchGrid.access', 'admin.access'],
  pathologist: ['labeling.write', 'dataset.write', 'tissue.access', 'patchGrid.access'],
  // Looks at the labelled data without changing a record; works on masks and patches.
  datascientist: ['tissue.access', 'patchGrid.access'],
  unassigned: [],
};

export function can(role: UserRoleValue | null | undefined, capability: Capability): boolean {
  return !!role && CAPABILITIES[role].includes(capability);
}
