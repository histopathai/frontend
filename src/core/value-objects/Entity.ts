import { EntityType } from './EntityType';
import type { ParentRef } from './ParentRef';

export interface Entity {
  id: string;
  entityType: EntityType;
  name: string;
  creatorId: string;
  parent: ParentRef;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const EntityUtils = {
  create(entityType: EntityType, name: string, creatorId: string, parent: ParentRef): Entity {
    const now = new Date();
    return {
      id: '', // Will be set by backend
      entityType,
      name,
      creatorId,
      parent,
      deleted: false,
      createdAt: now,
      updatedAt: now,
    };
  },

  hasParent(entity: Entity): boolean {
    return entity.parent.type !== '' && entity.parent.id !== '';
  },

  isDeleted(entity: Entity): boolean {
    return entity.deleted;
  },

  toJSON(entity: Entity): Record<string, unknown> {
    return {
      id: entity.id,
      entityType: entity.entityType,
      name: entity.name,
      creatorId: entity.creatorId,
      parent: {
        id: entity.parent.id,
        type: entity.parent.type,
      },
      deleted: entity.deleted,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  },

  fromJSON(json: {
    id?: string;
    entityType?: string;
    name?: string;
    creatorId?: string;
    parent?: { id?: string; type?: string };
    deleted?: boolean;
    createdAt?: string;
    updatedAt?: string;
  }): Entity | null {
    if (!json || !json.id || !json.entityType || !json.creatorId) return null;

    return {
      id: json.id,
      entityType: json.entityType as EntityType,
      name: json.name || '',
      creatorId: json.creatorId,
      parent: {
        id: json.parent?.id || '',
        type: (json.parent?.type as any) || '',
      },
      deleted: json.deleted || false,
      createdAt: json.createdAt ? new Date(json.createdAt) : new Date(),
      updatedAt: json.updatedAt ? new Date(json.updatedAt) : new Date(),
    };
  },

  copy(entity: Entity): Entity {
    return {
      ...entity,
      parent: { ...entity.parent },
      createdAt: new Date(entity.createdAt),
      updatedAt: new Date(entity.updatedAt),
    };
  },

  touch(entity: Entity): Entity {
    return {
      ...entity,
      updatedAt: new Date(),
    };
  },
};

export function isEntity(value: unknown): value is Entity {
  if (!value || typeof value !== 'object') return false;

  const entity = value as Entity;
  return (
    typeof entity.id === 'string' &&
    typeof entity.entityType === 'string' &&
    typeof entity.name === 'string' &&
    typeof entity.creatorId === 'string' &&
    typeof entity.parent === 'object' &&
    typeof entity.deleted === 'boolean' &&
    entity.createdAt instanceof Date &&
    entity.updatedAt instanceof Date
  );
}
