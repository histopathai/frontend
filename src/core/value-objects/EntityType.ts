export enum EntityType {
  Image = 'image',
  Annotation = 'annotation',
  Patient = 'patient',
  Workspace = 'workspace',
  AnnotationType = 'annotation_type',
  Content = 'content',
}

export const EntityTypeUtils = {
  isValid(value: string): value is EntityType {
    return Object.values(EntityType).includes(value as EntityType);
  },

  getAll(): EntityType[] {
    return Object.values(EntityType);
  },

  fromString(value: string): EntityType | null {
    if (!value) return null;

    if (this.isValid(value)) {
      return value as EntityType;
    }

    return null;
  },

  getLabel(entityType: EntityType): string {
    const labels: Record<EntityType, string> = {
      [EntityType.Image]: 'Image',
      [EntityType.Annotation]: 'Annotation',
      [EntityType.Patient]: 'Patient',
      [EntityType.Workspace]: 'Workspace',
      [EntityType.AnnotationType]: 'Annotation Type',
      [EntityType.Content]: 'Content',
    };
    return labels[entityType];
  },

  getPluralLabel(entityType: EntityType): string {
    const labels: Record<EntityType, string> = {
      [EntityType.Image]: 'Images',
      [EntityType.Annotation]: 'Annotations',
      [EntityType.Patient]: 'Patients',
      [EntityType.Workspace]: 'Workspaces',
      [EntityType.AnnotationType]: 'Annotation Types',
      [EntityType.Content]: 'Contents',
    };
    return labels[entityType];
  },

  getIcon(entityType: EntityType): string {
    const icons: Record<EntityType, string> = {
      [EntityType.Image]: 'photo',
      [EntityType.Annotation]: 'annotation',
      [EntityType.Patient]: 'user',
      [EntityType.Workspace]: 'folder',
      [EntityType.AnnotationType]: 'tag',
      [EntityType.Content]: 'document',
    };
    return icons[entityType];
  },
};

export function isEntityType(value: unknown): value is EntityType {
  return typeof value === 'string' && EntityTypeUtils.isValid(value);
}
