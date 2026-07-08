import { ref, shallowRef } from 'vue';
import { repositories } from '@/services';
import type { Workspace } from '@/core/entities/Workspace';
import type { Annotation } from '@/core/entities/Annotation';
import type { AnnotationReview } from '@/core/entities/AnnotationReview';
import { fetchAllPages, isThirdParty } from './useDatasetProgress';

const CONCURRENCY = 8;
// Çok büyük datasetlerde istek patlamasını sınırla; aşılırsa sonuç "kısmi" işaretlenir.
const MAX_REVIEWED = 5000;

export interface ReviewReliability {
  totalReviewed: number; // review görmüş 3. taraf anotasyon sayısı
  approved: number;
  rejected: number;
  modified: number;
  unknown: number; // review_ids dolu ama review bulunamadı / statü okunamadı
  truncated: boolean; // MAX_REVIEWED aşıldı mı
}

// Bir anotasyonun review'ları içinden EN SON olanın statüsünü döndürür.
function latestStatus(reviews: AnnotationReview[]): 'approved' | 'rejected' | 'modified' | null {
  if (!reviews || reviews.length === 0) return null;
  const time = (r: AnnotationReview) =>
    Math.max(
      r.reviewedAt?.getTime?.() || 0,
      r.updatedAt?.getTime?.() || 0,
      r.createdAt?.getTime?.() || 0
    );
  let latest = reviews[0]!;
  for (const r of reviews) if (time(r) >= time(latest)) latest = r;
  return latest.status;
}

// Sınırlı eşzamanlılıkla (havuz) çalıştırır, her tamamlananda ilerlemeyi bildirir.
async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
  onProgress?: (done: number) => void
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  let done = 0;
  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]!);
      onProgress?.(++done);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  );
  return results;
}

export function useReviewReliability() {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const result = shallowRef<ReviewReliability | null>(null);
  const fetched = ref(0); // çekilen review sayısı (ilerleme)
  const totalToFetch = ref(0);
  const cache = new Map<string, ReviewReliability>();

  async function load(workspace: Workspace | null, opts: { refresh?: boolean } = {}) {
    if (!workspace) {
      result.value = null;
      return;
    }
    const wsId = workspace.id;
    if (!opts.refresh && cache.has(wsId)) {
      result.value = cache.get(wsId)!;
      return;
    }

    loading.value = true;
    error.value = null;
    fetched.value = 0;
    totalToFetch.value = 0;
    try {
      // 1) Workspace'in tüm anotasyonları → review görmüş 3. taraf alt-kümesi
      const annotations = await fetchAllPages<Annotation>((limit, offset) =>
        repositories.annotation.listByWorkspace(wsId, { pagination: { limit, offset } })
      );
      let reviewedThirdParty = annotations.filter(
        (a) => isThirdParty(a) && a.reviewIds && a.reviewIds.length > 0
      );

      const truncated = reviewedThirdParty.length > MAX_REVIEWED;
      if (truncated) reviewedThirdParty = reviewedThirdParty.slice(0, MAX_REVIEWED);

      totalToFetch.value = reviewedThirdParty.length;

      // 2) Her biri için review'ları çek (bounded havuz), en son statüyü belirle
      const statuses = await mapPool(
        reviewedThirdParty,
        CONCURRENCY,
        async (ann) => {
          const reviews = await repositories.annotationReview.getByAnnotationId(String(ann.id));
          return latestStatus(reviews);
        },
        (done) => {
          fetched.value = done;
        }
      );

      let approved = 0;
      let rejected = 0;
      let modified = 0;
      let unknown = 0;
      for (const s of statuses) {
        if (s === 'approved') approved++;
        else if (s === 'rejected') rejected++;
        else if (s === 'modified') modified++;
        else unknown++;
      }

      const agg: ReviewReliability = {
        totalReviewed: reviewedThirdParty.length,
        approved,
        rejected,
        modified,
        unknown,
        truncated,
      };
      cache.set(wsId, agg);
      result.value = agg;
    } catch (e: any) {
      error.value = e?.message || 'Review verisi yüklenemedi';
      result.value = null;
    } finally {
      loading.value = false;
    }
  }

  return { loading, error, result, fetched, totalToFetch, load };
}
