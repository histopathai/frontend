import {AnnotationType} from '../entities/AnnotationType';
import { PaginatedResult, Pagination } from '../types/common';

export interface CreateAnnotationTypeRequest {
    creatorId: string;
    name: string;
    description?: string;
    scoreEnabled: boolean;
    classificationEnabled: boolean;
    scorename?: string;
    scoremin?: number;
    scoremax?: number;
    classList?: string[];
}

export interface IAnnotationType {
    list(pagination: Pagination): Promise<PaginatedResult<AnnotationType>>;
    getById(id: string): Promise<AnnotationType>;
    create(data: CreateAnnotationTypeRequest): Promise<AnnotationType>;
    update(id: string, data: Partial<CreateAnnotationTypeRequest>): Promise<AnnotationType>;
    delete(id: string): Promise<void>;
}