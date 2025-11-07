import {Image} from '../entities/Image';
import { PaginatedResult, Pagination } from '../types/common';

<<<<<<< HEAD

export interface ImageUploadPayload {
  uploadUrl: string;
  headers: Record<string, string>;
}

export interface CreateImageRequest {
    patientId: string;
=======
export interface CreateImageRequest {
    patientId: string;
    creatorId: string;
>>>>>>> cd44f8c (feat: initialize frontend project with Vite and Vue 3)
    contentType: string;
    name: string;
    format: string;
    width?: number;
    height?: number;
    size?: number;
}

<<<<<<< HEAD
export interface UploadImageParams {
  payload: ImageUploadPayload; 
  file: File;
}

export interface IImageRepository {
    create(request: CreateImageRequest): Promise<ImageUploadPayload>;
    upload(params: UploadImageParams): Promise<void>;
=======
export interface UploadImageRequest {
    uploadUrl: string;
    Header: Record<string, string>;
    file?: File;
}

export interface IImageRepository {
    list(pagination: Pagination): Promise<PaginatedResult<Image>>;
    create(request: CreateImageRequest): Promise<UploadImageRequest>; // Return signed URL and headers for upload
    upload(payload: UploadImageRequest): Promise<void>; // Upload actual file to storage
>>>>>>> cd44f8c (feat: initialize frontend project with Vite and Vue 3)
    getById(imageId: string): Promise<Image>;
    delete(imageId: string): Promise<void>;
    getByPatientId(patientId: string, pagination: Pagination): Promise<PaginatedResult<Image>>;
    transfer(imageId: string, newPatientId: string): Promise<void>;
}

 