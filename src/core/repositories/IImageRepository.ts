import {Image} from '../entities/Image';
import { PaginatedResult, Pagination } from '../types/common';

export interface CreateImageRequest {
    patientId: string;
    creatorId: string;
    contentType: string;
    name: string;
    format: string;
    width?: number;
    height?: number;
    size?: number;
}

export interface UploadImageRequest {
    uploadUrl: string;
    Header: Record<string, string>;
    file?: File;
}

export interface IImageRepository {
    list(pagination: Pagination): Promise<PaginatedResult<Image>>;
    create(request: CreateImageRequest): Promise<UploadImageRequest>; // Return signed URL and headers for upload
    upload(payload: UploadImageRequest): Promise<void>; // Upload actual file to storage
    getById(imageId: string): Promise<Image>;
    delete(imageId: string): Promise<void>;
    getByPatientId(patientId: string, pagination: Pagination): Promise<PaginatedResult<Image>>;
    transfer(imageId: string, newPatientId: string): Promise<void>;
}

 