import { ref, shallowRef } from 'vue';
import { repositories } from '@/services';
import type { Workspace } from '@/core/entities/Workspace';
import type { Image } from '@/core/entities/Image';
import type { Annotation } from '@/core/entities/Annotation';

// Import edilmiş / seed anotasyonların creator_id'si (gerçek kullanıcı değil, 3. taraf).
export const THIRD_PARTY_CREATOR_ID = '111111111111111111111';
export const DASHBOARD_PAGE_SIZE = 100; // backend limit üst sınırı (lte=100)
const PAGE_SIZE = DASHBOARD_PAGE_SIZE;
const MAX_PAGES = 1000; // güvenlik sınırı (~100k kayıt)

export type ProgressBucket = 'full' | 'partial' | 'reviewed' | 'none';

export interface DatasetProgress {
  total: number;
  full: number;
  partial: number;
  reviewed: number;
  none: number;
  annotated: number; // full + partial + reviewed
  completed: number; // marked_as_completed (tüm görüntülerde)
  completedAmongAnnotated: number;
  definedTypeCount: number;
}

// Bir anotasyon 3. taraf mı (imported / model / seed creator)?
export function isThirdParty(ann: Annotation): boolean {
  return (
    ann.resource === 'imported' ||
    ann.resource === 'model' ||
    String(ann.creatorId) === THIRD_PARTY_CREATOR_ID
  );
}

// Sayfalı bir uçtaki tüm kayıtları döngüyle çeker (has_more alanına güvenmeden,
// dönen sayfa PAGE_SIZE'dan küçükse biter).
export async function fetchAllPages<T>(
  fetchPage: (limit: number, offset: number) => Promise<{ data: T[] }>
): Promise<T[]> {
  const all: T[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await fetchPage(PAGE_SIZE, page * PAGE_SIZE);
    const batch = res.data || [];
    all.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return all;
}

// Görüntü başına sınıflandırma + veriseti geneli toplama.
// Kapsama (coverage): bir annotation type'ı, o görüntüde YA kullanıcı anotasyonu
// YA DA review görmüş (review_ids dolu) 3. taraf anotasyonu ile işaretlenmişse "kapsanmış".
// Review görmemiş 3. taraf anotasyonları kapsama saymaz.
export function computeDatasetProgress(
  workspace: Workspace,
  images: Image[],
  annotations: Annotation[]
): DatasetProgress {
  const definedTypes = workspace.annotationTypeIds || [];
  const definedCount = definedTypes.length;

  const byImage = new Map<string, Annotation[]>();
  for (const ann of annotations) {
    const imgId = ann.parentId;
    if (!imgId) continue;
    const arr = byImage.get(imgId);
    if (arr) arr.push(ann);
    else byImage.set(imgId, [ann]);
  }

  let full = 0;
  let partial = 0;
  let reviewed = 0;
  let none = 0;
  let completed = 0;
  let completedAmongAnnotated = 0;

  for (const img of images) {
    if (img.markedAsCompleted) completed++;
    const anns = byImage.get(img.id) || [];

    const userTypes = new Set<string>();
    const reviewedTypes = new Set<string>();
    let hasUser = false;

    for (const ann of anns) {
      if (isThirdParty(ann)) {
        if (ann.reviewIds && ann.reviewIds.length > 0 && ann.annotationTypeId) {
          reviewedTypes.add(ann.annotationTypeId);
        }
      } else {
        hasUser = true;
        if (ann.annotationTypeId) userTypes.add(ann.annotationTypeId);
      }
    }

    const covered = new Set<string>([...userTypes, ...reviewedTypes]);

    let bucket: ProgressBucket;
    if (covered.size === 0) {
      // Hiç geçerli kapsama yok (yalnız review görmemiş 3. taraf ya da hiç yok).
      bucket = 'none';
    } else if (!hasUser) {
      // Kapsama sadece review görmüş 3. taraf anotasyonlardan geliyor.
      bucket = 'reviewed';
    } else if (definedCount === 0) {
      // Datasette tanımlı type yoksa, kullanıcı anotasyonu = tam sayılır.
      bucket = 'full';
    } else {
      const coveredDefined = definedTypes.filter((t) => covered.has(t)).length;
      bucket = coveredDefined >= definedCount ? 'full' : 'partial';
    }

    if (bucket === 'full') full++;
    else if (bucket === 'partial') partial++;
    else if (bucket === 'reviewed') reviewed++;
    else none++;

    if (bucket !== 'none' && img.markedAsCompleted) completedAmongAnnotated++;
  }

  return {
    total: images.length,
    full,
    partial,
    reviewed,
    none,
    annotated: full + partial + reviewed,
    completed,
    completedAmongAnnotated,
    definedTypeCount: definedCount,
  };
}

export function useDatasetProgress() {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const progress = shallowRef<DatasetProgress | null>(null);
  const cache = new Map<string, DatasetProgress>();

  async function load(workspace: Workspace | null, opts: { refresh?: boolean } = {}) {
    if (!workspace) {
      progress.value = null;
      return;
    }
    const wsId = workspace.id;
    if (!opts.refresh && cache.has(wsId)) {
      progress.value = cache.get(wsId)!;
      return;
    }

    loading.value = true;
    error.value = null;
    try {
      const [images, annotations] = await Promise.all([
        fetchAllPages<Image>((limit, offset) =>
          repositories.image.listByWorkspace(wsId, { pagination: { limit, offset } })
        ),
        fetchAllPages<Annotation>((limit, offset) =>
          repositories.annotation.listByWorkspace(wsId, { pagination: { limit, offset } })
        ),
      ]);
      const result = computeDatasetProgress(workspace, images, annotations);
      cache.set(wsId, result);
      progress.value = result;
    } catch (e: any) {
      error.value = e?.message || 'İlerleme verisi yüklenemedi';
      progress.value = null;
    } finally {
      loading.value = false;
    }
  }

  return { loading, error, progress, load };
}
