import {Annotation} from '../entities/Annotation';
import { PaginatedResult, Pagination } from '../types/common';
import { Point } from '../value-objects/Point';

export interface CreateAnnotationRequest {
    imageId: string;
    annotatorId: string;
    polygon: Point[];
    score?: number;
    class?: string;
    description?: string;
}

export interface IAnnotationRepository {
<<<<<<< HEAD
    getByImageId(imageId: string, pagination: Pagination): Promise<PaginatedResult<Annotation>>;
=======
    list(pagination: Pagination): Promise<PaginatedResult<Annotation>>;
>>>>>>> cd44f8c (feat: initialize frontend project with Vite and Vue 3)
    create(data: CreateAnnotationRequest): Promise<Annotation>;
    getById(id: string): Promise<Annotation>;
    update(id: string, data: Partial<CreateAnnotationRequest>): Promise<Annotation>;
    delete(id: string): Promise<void>;
<<<<<<< HEAD
=======
    getByImageId(imageId: string, pagination: Pagination): Promise<PaginatedResult<Annotation>>;
>>>>>>> cd44f8c (feat: initialize frontend project with Vite and Vue 3)
}