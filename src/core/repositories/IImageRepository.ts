import { Image } from '../entities/Image';
import type { PaginatedResult, Pagination } from '../types/common';
import type { BatchTransfer } from './common';

export interface ImageUploadPayload {
  upload_url: string;
  headers: Record<string, string>;
}

export interface CreateNewImageRequest {
  patient_id: string;
  content_type: string;
  name: string;
  format: string;
  width?: number;
  height?: number;
  size?: number;
}
export type OnUploadProgress = (percentage: number) => void;

export interface UploadImageParams {
  payload: ImageUploadPayload;
  contentType?: string;
  file: File;
  onUploadProgress?: OnUploadProgress; // Optional progress callback to track upload progress
}

export interface IImageRepository {
  create(data: CreateNewImageRequest): Promise<ImageUploadPayload>;
  upload(params: UploadImageParams): Promise<void>;
  getById(imageId: string): Promise<Image>;
  delete(imageId: string): Promise<void>;
  getByPatientId(patientId: string, pagination: Pagination): Promise<PaginatedResult<Image>>;
  transfer(imageId: string, newPatientId: string): Promise<void>;
  batchTransfer(data: BatchTransfer): Promise<void>;
  count(): Promise<number>;
  batchDelete(ids: string[]): Promise<void>;
}
