import { Image } from '../entities/Image';
import type { PaginatedResult, QueryOptions } from '../types/common';
import type { BatchTransfer } from './common';
import type { ParentRef } from './IPatientRepository';

export interface ImageUploadPayload {
  upload_url: string;
  headers: Record<string, string>;
}

export interface MagnificationRequest {
  objective?: number;
  native_level?: number;
  scan_magnification?: number;
}
export interface ContentRequest {
  content_type: string;
  name: string;
  size: number;
}

export interface CreateNewImageRequest {
  parent: ParentRef;
  name: string;
  ws_id: string;
  format: string;
  contents: ContentRequest[];
  width?: number;
  height?: number;
  magnification?: MagnificationRequest;
}
export type OnUploadProgress = (percentage: number) => void;

export interface UploadImageParams {
  payload: ImageUploadPayload;
  contentType?: string;
  file: File;
  onUploadProgress?: OnUploadProgress;
}

export interface IImageRepository {
  create(data: CreateNewImageRequest): Promise<ImageUploadPayload[]>;
  upload(params: UploadImageParams): Promise<void>;
  getById(imageId: string): Promise<Image>;
  delete(imageId: string): Promise<void>;
  list(options?: QueryOptions): Promise<PaginatedResult<Image>>;
  listByPatient(patientId: string, options?: QueryOptions): Promise<PaginatedResult<Image>>;
  transfer(imageId: string, newPatientId: string): Promise<void>;
  batchTransfer(data: BatchTransfer): Promise<void>;
  count(): Promise<number>;
  batchDelete(ids: string[]): Promise<void>;
}
