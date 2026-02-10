export enum TagType {
  Number = 'number',
  Text = 'text',
  Boolean = 'boolean',
  Select = 'select',
  MultiSelect = 'multi_select',
}

export const TagTypeUtils = {
  isValid(value: string): value is TagType {
    return Object.values(TagType).includes(value as TagType);
  },

  getAll(): TagType[] {
    return Object.values(TagType);
  },

  fromString(value: string): TagType | null {
    if (!value) return null;

    if (this.isValid(value)) {
      return value as TagType;
    }

    return null;
  },

  getLabel(tagType: TagType): string {
    const labels: Record<TagType, string> = {
      [TagType.Number]: 'Number',
      [TagType.Text]: 'Text',
      [TagType.Boolean]: 'Boolean',
      [TagType.Select]: 'Select',
      [TagType.MultiSelect]: 'Multi-Select',
    };
    return labels[tagType];
  },

  getIcon(tagType: TagType): string {
    const icons: Record<TagType, string> = {
      [TagType.Number]: 'hashtag',
      [TagType.Text]: 'document-text',
      [TagType.Boolean]: 'check-circle',
      [TagType.Select]: 'chevron-down',
      [TagType.MultiSelect]: 'view-list',
    };
    return icons[tagType];
  },

  getInputType(tagType: TagType): string {
    const inputTypes: Record<TagType, string> = {
      [TagType.Number]: 'number',
      [TagType.Text]: 'text',
      [TagType.Boolean]: 'checkbox',
      [TagType.Select]: 'select',
      [TagType.MultiSelect]: 'select-multiple',
    };
    return inputTypes[tagType];
  },
};

export function isTagType(value: unknown): value is TagType {
  return typeof value === 'string' && TagTypeUtils.isValid(value);
}
