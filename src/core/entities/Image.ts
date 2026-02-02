import {
  type OpticalMagnification,
  ImageStatus,
  type ParentRef,
  ParentRefUtils,
} from '../value-objects';

export interface ImageProps {
  id: string;
  wsId: string;
  parent: ParentRef;
  name: string;
  creatorId: string;

  // Basic image properties
  format: string;
  width: number | null;
  height: number | null;

  // WSI-specific properties
  magnification: OpticalMagnification | null;

  status: ImageStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class Image {
  private constructor(private props: ImageProps) {}

  static create(data: any): Image {
    if (!data.parent) {
      throw new Error('Parent reference is required');
    }
    if (!ParentRefUtils.isValid(data.parent)) {
      throw new Error('Invalid parent reference');
    }
    let magnification: OpticalMagnification | null = null;
    if (data.magnification) {
      magnification = {
        objective: data.magnification.objective,
        nativeLevel: data.magnification.native_level,
        scanMagnification: data.magnification.scan_magnification,
      };
    }
    return new Image({
      id: data.id,
      wsId: data.ws_id,
      parent: data.parent,
      creatorId: data.creator_id,
      name: data.name,
      format: data.format,
      width: data.width ?? null,
      height: data.height ?? null,
      magnification: magnification,
      status: ImageStatus.fromString(data.status || 'PROCESSING'),
      createdAt: typeof data.created_at === 'string' ? new Date(data.created_at) : data.created_at,
      updatedAt: typeof data.updated_at === 'string' ? new Date(data.updated_at) : data.updated_at,
    });
  }

  get id(): string {
    return this.props.id;
  }

  get parent(): ParentRef {
    return this.props.parent;
  }

  get parentId(): string {
    return this.props.parent.id;
  }

  get creatorId(): string {
    return this.props.creatorId;
  }

  get name(): string {
    return this.props.name;
  }

  get format(): string {
    return this.props.format;
  }

  get width(): number | null {
    return this.props.width;
  }

  get height(): number | null {
    return this.props.height;
  }

  get status(): ImageStatus {
    return this.props.status;
  }

  get magnification(): OpticalMagnification | null {
    return this.props.magnification;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  isProcessed(): boolean {
    return this.status.isProcessed();
  }

  toJSON() {
    return { ...this.props };
  }
}
