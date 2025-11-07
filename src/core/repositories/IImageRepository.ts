import {Image} from '../entities/Image';
import { PaginatedResult, Pagination } from '../types/common';


export interface ImageUploadPayload {
  uploadUrl: string;
  headers: Record<string, string>;
}

export interface CreateImageRequest {
    patientId: string;
    contentType: string;
    name: string;
    format: string;
    width?: number;
    height?: number;
    size?: number;
}

export interface UploadImageParams {
  payload: ImageUploadPayload; 
  file: File;
}

export interface IImageRepository {
    create(request: CreateImageRequest): Promise<ImageUploadPayload>;
    upload(params: UploadImageParams): Promise<void>;
    getById(imageId: string): Promise<Image>;
    delete(imageId: string): Promise<void>;
    getByPatientId(patientId: string, pagination: Pagination): Promise<PaginatedResult<Image>>;
    transfer(imageId: string, newPatientId: string): Promise<void>;
}

 