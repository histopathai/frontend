export type TagType = 'NUMBER' | 'TEXT' | 'BOOLEAN' | 'SELECT' | 'MULTI_SELECT';

export interface TagDefinition {
  name: string;
  type: TagType;
  options?: string[];
  global: boolean;
  min?: number;
  max?: number;
  color?: string;
}

export interface TagValue {
  tagName: string;
  tagType: TagType;
  value: any;
}

export interface TagResponseDTO {
  name: string;
  type: string;
  options?: string[];
  global: boolean;
  required: boolean;
  min?: number;
  max?: number;
  color?: string;
}
