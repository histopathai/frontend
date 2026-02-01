export enum ParentType {
  None = '',
  Workspace = 'workspace',
  Patient = 'patient',
  Image = 'image',
  AnnotationType = 'annotation_type',
  Annotation = 'annotation',
  Content = 'content',
}

export interface ParentRef {
  id: string;
  type: ParentType;
}

export const ParentTypeUtils = {
  isValid(value: string): value is ParentType {
    return Object.values(ParentType).includes(value as ParentType);
  },

  getAll(): ParentType[] {
    return Object.values(ParentType);
  },

  fromString(value: string): ParentType | null {
    if (!value) return ParentType.None;

    if (this.isValid(value)) {
      return value as ParentType;
    }

    return null;
  },

  getLabel(parentType: ParentType): string {
    const labels: Record<ParentType, string> = {
      [ParentType.None]: 'None',
      [ParentType.Workspace]: 'Workspace',
      [ParentType.Patient]: 'Patient',
      [ParentType.Image]: 'Image',
      [ParentType.AnnotationType]: 'Annotation Type',
      [ParentType.Annotation]: 'Annotation',
      [ParentType.Content]: 'Content',
    };
    return labels[parentType];
  },
};

export const ParentRefUtils = {
  create(id: string, type: ParentType): ParentRef {
    return { id, type };
  },

  isValid(ref: ParentRef | null | undefined): boolean {
    return ref !== null && ref !== undefined && ref.id !== '' && ref.type !== '';
  },

  isEmpty(ref: ParentRef | null | undefined): boolean {
    return ref === null || ref === undefined || ref.id === '' || ref.type === '';
  },

  equals(ref1: ParentRef | null | undefined, ref2: ParentRef | null | undefined): boolean {
    if (ref1 === null && ref2 === null) return true;
    if (ref1 === undefined && ref2 === undefined) return true;
    if (ref1 === null || ref1 === undefined || ref2 === null || ref2 === undefined) return false;

    return ref1.id === ref2.id && ref1.type === ref2.type;
  },

  copy(ref: ParentRef | null | undefined): ParentRef | null {
    if (ref === null || ref === undefined) return null;

    return {
      id: ref.id,
      type: ref.type,
    };
  },

  toString(ref: ParentRef | null | undefined): string {
    if (ref === null || ref === undefined) return '<nil>';

    return `${ref.type}:${ref.id}`;
  },

  getId(ref: ParentRef | null | undefined): string {
    if (ref === null || ref === undefined) return '';
    return ref.id;
  },

  getType(ref: ParentRef | null | undefined): ParentType {
    if (ref === null || ref === undefined) return ParentType.None;
    return ref.type;
  },

  toJSON(ref: ParentRef | null | undefined): Record<string, string> | null {
    if (ref === null || ref === undefined) return null;

    return {
      ID: ref.id,
      Type: ref.type,
    };
  },

  fromJSON(json: { ID?: string; Type?: string } | null | undefined): ParentRef | null {
    if (!json || !json.ID || !json.Type) return null;

    const type = ParentTypeUtils.fromString(json.Type);
    if (!type) return null;

    return {
      id: json.ID,
      type,
    };
  },
};

export function isParentType(value: unknown): value is ParentType {
  return typeof value === 'string' && ParentTypeUtils.isValid(value);
}

export function isParentRef(value: unknown): value is ParentRef {
  if (!value || typeof value !== 'object') return false;

  const ref = value as ParentRef;
  return typeof ref.id === 'string' && isParentType(ref.type);
}
