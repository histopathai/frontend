/**
 * Value Objects Index
 * Central export point for all value objects
 */

// Existing value objects
export { ImageStatus } from './ImageStatus';
export { Point } from './Point';
export { UserRole } from './UserRole';
export { UserStatus } from './UserStatus';

// Domain value objects (matching backend)
export { OrganType, OrganTypeUtils, isOrganType } from './OrganType';
export { ContentType, ContentTypeUtils, isContentType } from './ContentType';
export { ContentProvider, ContentProviderUtils, isContentProvider } from './ContentProvider';
export { EntityType, EntityTypeUtils, isEntityType } from './EntityType';
export {
  ParentType,
  ParentTypeUtils,
  type ParentRef,
  ParentRefUtils,
  isParentType,
  isParentRef,
} from './ParentRef';
export { TagType, TagTypeUtils, isTagType } from './TagType';
export {
  type OpticalMagnification,
  OpticalMagnificationUtils,
  isOpticalMagnification,
} from './OpticalMagnification';
export { type Entity, EntityUtils, isEntity } from './Entity';
