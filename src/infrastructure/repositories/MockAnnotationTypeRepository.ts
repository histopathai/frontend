// src/infrastructure/repositories/MockAnnotationTypeRepository.ts

import { AnnotationType } from '@/core/entities/AnnotationType';
import type {
  IAnnotationTypeRepository,
  CreateNewAnnotationTypeRequest,
  UpdateAnnotationTypeRequest,
} from '@/core/repositories/IAnnotationType';
import type { PaginatedResult, Pagination } from '@/core/types/common';

const STORAGE_KEY = 'mock_annotation_types_v1';

export class MockAnnotationTypeRepository implements IAnnotationTypeRepository {
  constructor() {
    // Başlangıçta hiç veri yoksa, test kolaylığı için localStorage'a varsayılan veri atılabilir
    // Ancak temiz bir başlangıç için şimdilik boş bırakıyoruz veya kontrol ediyoruz.
    this.ensureStorage();
  }

  private ensureStorage() {
    if (!localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    }
  }

  private getStoredData(): any[] {
    this.ensureStorage();
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  private saveStoredData(data: any[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  // 1. List Metodu
  async list(pagination: Pagination): Promise<PaginatedResult<AnnotationType>> {
    const allData = this.getStoredData();

    // Basit sayfalama simülasyonu
    const start = pagination.offset;
    const end = start + pagination.limit;
    const slicedData = allData.slice(start, end);

    return {
      data: slicedData.map((d) => AnnotationType.create(d)),
      pagination: {
        ...pagination,
        hasMore: allData.length > end,
      },
    };
  }

  // 2. Parent'a Göre Getirme (Hasta oluşturma için kritik metod)
  async getByParentId(
    parentId: string,
    pagination: Pagination
  ): Promise<PaginatedResult<AnnotationType>> {
    let allData = this.getStoredData();

    // Filtreleme: İlgili workspace'e (parentId) ait olanları bul
    // Mock ortamında kolaylık olsun diye: Eğer hiç veri yoksa, o anki parentId için otomatik sahte veri üretelim
    // Böylece "veri yok" hatası almazsınız.
    let filteredData = allData.filter(
      (item: any) => item.parent?.id === parentId || item.workspace_id === parentId
    );

    if (filteredData.length === 0 && allData.length === 0) {
      // HİÇ veri yoksa, test için otomatik bir tane oluşturup kaydedelim
      const autoMock = {
        id: 'auto-mock-' + Math.floor(Math.random() * 1000),
        name: 'Otomatik Test Tipi',
        color: '#FF0000',
        creator_id: 'mock-user',
        parent: { id: parentId, type: 'workspace' },
        tags: [],
        created_at: new Date(),
        updated_at: new Date(),
      };
      allData.push(autoMock);
      this.saveStoredData(allData);
      filteredData = [autoMock];
    }

    return {
      data: filteredData.map((d) => AnnotationType.create(d)),
      pagination: {
        ...pagination,
        hasMore: false,
      },
    };
  }

  // 3. Tekil Getirme
  async getById(id: string): Promise<AnnotationType> {
    const allData = this.getStoredData();
    const found = allData.find((d: any) => d.id === id);

    if (found) {
      return AnnotationType.create(found);
    }
    throw new Error('Mock Annotation Type not found');
  }

  // 4. Oluşturma (KAYDETME İŞLEMİ BURADA YAPILIYOR)
  async create(data: CreateNewAnnotationTypeRequest): Promise<AnnotationType> {
    const allData = this.getStoredData();

    // Parent bilgisini düzgün formatlayalım
    const parentId = data.parent_id || data.workspace_id || 'unknown-parent';

    const newRecord = {
      ...data,
      id: 'mock-id-' + Date.now(), // Benzersiz ID
      creator_id: 'current-user-mock',
      parent: {
        id: parentId,
        type: 'workspace',
      },
      // Eski alanları temizle veya uyumluluk için tut
      workspace_id: parentId,
      created_at: new Date(),
      updated_at: new Date(),
    };

    allData.push(newRecord); // Listeye ekle
    this.saveStoredData(allData); // LocalStorage'a kaydet

    console.log('Mock Annotation Type Created & Saved:', newRecord);

    return AnnotationType.create(newRecord);
  }

  // 5. Güncelleme
  async update(id: string, data: UpdateAnnotationTypeRequest): Promise<void> {
    const allData = this.getStoredData();
    const index = allData.findIndex((d: any) => d.id === id);

    if (index !== -1) {
      allData[index] = { ...allData[index], ...data, updated_at: new Date() };
      this.saveStoredData(allData);
    }
  }

  // 6. Silme
  async delete(id: string): Promise<void> {
    let allData = this.getStoredData();
    allData = allData.filter((d: any) => d.id !== id);
    this.saveStoredData(allData);
  }

  // 7. Toplu Silme
  async batchDelete(ids: string[]): Promise<void> {
    let allData = this.getStoredData();
    allData = allData.filter((d: any) => !ids.includes(d.id));
    this.saveStoredData(allData);
  }

  // 8. Sayma
  async count(): Promise<number> {
    return this.getStoredData().length;
  }
}
