import { Image } from '../entities/Image';
import type { PaginatedResult, Pagination } from '../types/common';

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
}
