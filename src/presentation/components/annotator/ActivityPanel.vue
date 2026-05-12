<template>
  <div
    class="flex flex-col h-full bg-white border-l border-gray-200 shadow-[-2px_0_8px_rgba(0,0,0,0.02)]"
    :class="isOpen ? 'w-80' : 'w-0 overflow-hidden'"
  >
    <!-- Header -->
    <div class="p-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between flex-shrink-0">
      <div class="flex items-center gap-2">
        <div class="w-6 h-6 rounded-md bg-indigo-50 flex items-center justify-center">
          <svg class="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 class="text-xs font-bold text-gray-700 tracking-tight">Etkinlikler</h3>
        <span v-if="activityItems.length > 0" class="text-[9px] font-black bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">
          {{ activityItems.length }}
        </span>
      </div>
      <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600 transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loadingActivities" class="flex-1 flex items-center justify-center">
      <div class="flex flex-col items-center gap-2">
        <div class="w-5 h-5 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin"></div>
        <span class="text-[10px] text-gray-400 font-medium">Etkinlikler yükleniyor...</span>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="activityItems.length === 0" class="flex-1 flex items-center justify-center p-4">
      <div class="text-center">
        <div class="w-10 h-10 mx-auto mb-2 rounded-full bg-gray-100 flex items-center justify-center">
          <svg class="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p class="text-[10px] text-gray-400 font-medium">Henüz etkinlik yok</p>
        <p class="text-[9px] text-gray-300 mt-0.5">Bir görüntü seçin</p>
      </div>
    </div>

    <!-- Activity List -->
    <div v-else class="flex-1 overflow-y-auto custom-scrollbar">
      <!-- Group by date -->
      <div v-for="(group, dateKey) in groupedActivities" :key="dateKey" class="border-b border-gray-50 last:border-b-0">
        <div class="sticky top-0 px-3 py-1.5 bg-gray-50/80 backdrop-blur-sm z-10">
          <span class="text-[9px] font-black text-gray-400 uppercase tracking-wider">{{ dateKey }}</span>
        </div>
        
        <div class="px-2 py-1">
          <div
            v-for="item in group"
            :key="item.id"
            class="group relative flex gap-2.5 px-2 py-2 rounded-lg cursor-pointer transition-all duration-150"
            :class="hoveredActivityId === item.id ? 'bg-indigo-50/80 ring-1 ring-indigo-200' : 'hover:bg-gray-50'"
            @click="onActivityClick(item)"
            @mouseenter="onActivityHover(item)"
            @mouseleave="onActivityLeave()"
          >
            <!-- Timeline dot -->
            <div class="flex flex-col items-center flex-shrink-0 mt-0.5">
              <div
                class="w-2 h-2 rounded-full ring-2 ring-white shadow-sm transition-all"
                :class="getActivityDotColor(item)"
              ></div>
              <div class="w-px flex-1 bg-gray-100 mt-1"></div>
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0 pb-2">
              <!-- User + Time -->
              <div class="flex items-center justify-between gap-1 mb-0.5">
                <span class="text-[10px] font-bold text-gray-800 truncate">
                  {{ item.userName || 'Bilinmeyen' }}
                </span>
                <span class="text-[8px] text-gray-400 flex-shrink-0 font-medium tabular-nums">
                  {{ formatTime(item.timestamp) }}
                </span>
              </div>

              <!-- Action description -->
              <p class="text-[10px] text-gray-500 leading-snug">
                <span :class="getActionBadgeClass(item.action)" class="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider mr-1">
                  {{ getActionIcon(item.action) }} {{ getActionLabel(item.action) }}
                </span>
                <span class="text-gray-600 font-medium">{{ item.targetName }}</span>
              </p>

              <!-- Detail chip -->
              <div v-if="item.detail" class="mt-1 flex items-center gap-1 flex-wrap">
                <span class="inline-flex items-center gap-1 text-[9px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md">
                  <span v-if="item.detailColor" class="w-2 h-2 rounded-full flex-shrink-0" :style="{ backgroundColor: item.detailColor }"></span>
                  {{ item.detail }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import { useAnnotationStore } from '@/stores/annotation';
import { useAnnotationTypeStore } from '@/stores/annotation_type';
import { repositories } from '@/services';

interface ActivityItem {
  id: string;
  action: 'created' | 'updated' | 'approved' | 'rejected' | 'modified' | 'label_changed' | 'global_changed';
  userName: string;
  userId: string;
  targetName: string;
  targetAnnotationId: string;
  isGlobal: boolean;
  detail?: string;
  detailColor?: string;
  timestamp: Date;
}

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  selectedImageId: { type: String, default: undefined },
});

const emit = defineEmits(['close', 'focus-annotation']);

const annotationStore = useAnnotationStore();
const annotationTypeStore = useAnnotationTypeStore();

const loadingActivities = ref(false);
const activityItems = ref<ActivityItem[]>([]);
const hoveredActivityId = ref<string | null>(null);

// --- Build activity list from annotations + reviews ---
async function buildActivities(imageId: string) {
  if (!imageId) {
    activityItems.value = [];
    return;
  }

  loadingActivities.value = true;
  const items: ActivityItem[] = [];

  try {
    // Use the FULL annotation set (not the filtered toggle view) for activity history
    // Merge preReviewAnnotations (originals) + current annotations (may include reviewer's new ones)
    const allAnnotationsMap = new Map<string, any>();
    
    // First add preReview (originals)
    for (const ann of annotationStore.preReviewAnnotations) {
      allAnnotationsMap.set(ann.id, ann);
    }
    // Then add current (overrides/adds reviewer's new ones)
    for (const ann of annotationStore.annotations) {
      if (!allAnnotationsMap.has(String(ann.id))) {
        allAnnotationsMap.set(String(ann.id), ann);
      }
    }
    
    const annotations = Array.from(allAnnotationsMap.values()).filter(
      (a: any) => (a.parentId || a.parent?.id) === imageId
    );

    for (const ann of annotations) {
      const creatorName = annotationStore.userNames[ann.creatorId] || ann.creatorName || ann.creatorId;
      const typeName = getAnnotationTypeName(ann.annotationTypeId);
      const isGlobal = ann.isGlobal;
      const tagColor = annotationStore.getTagColor(ann.annotationTypeId, ann.value);

      // 1. Annotation creation event
      items.push({
        id: `ann-created-${ann.id}`,
        action: 'created',
        userName: creatorName,
        userId: ann.creatorId,
        targetName: isGlobal
          ? `${typeName}`
          : `${ann.name || typeName}`,
        targetAnnotationId: ann.id,
        isGlobal,
        detail: ann.value ? `Değer: ${ann.value}` : undefined,
        detailColor: tagColor,
        timestamp: ann.createdAt instanceof Date ? ann.createdAt : new Date(ann.createdAt),
      });

      // 2. Annotation update event (if updatedAt != createdAt)
      const createdTime = ann.createdAt instanceof Date ? ann.createdAt.getTime() : new Date(ann.createdAt).getTime();
      const updatedTime = ann.updatedAt instanceof Date ? ann.updatedAt.getTime() : new Date(ann.updatedAt).getTime();
      if (updatedTime && createdTime && updatedTime - createdTime > 1000) {
        items.push({
          id: `ann-updated-${ann.id}`,
          action: 'updated',
          userName: creatorName,
          userId: ann.creatorId,
          targetName: isGlobal
            ? `${typeName}`
            : `${ann.name || typeName}`,
          targetAnnotationId: ann.id,
          isGlobal,
          detail: ann.value ? `Yeni değer: ${ann.value}` : undefined,
          detailColor: tagColor,
          timestamp: ann.updatedAt instanceof Date ? ann.updatedAt : new Date(ann.updatedAt),
        });
      }

      // 3. Fetch reviews for this annotation
      try {
        const reviews = await repositories.annotationReview.getByAnnotationId(ann.id);
        for (const review of reviews) {
          const reviewerName = annotationStore.userNames[review.reviewerId] || review.reviewerId;

          let reviewAction: ActivityItem['action'] = 'approved';
          if (review.status === 'rejected') reviewAction = 'rejected';
          if (review.status === 'modified') reviewAction = 'modified';

          let detail: string | undefined;
          if (review.modifiedValue !== undefined && review.modifiedValue !== null) {
            detail = `Yeni değer: ${review.modifiedValue}`;
          }
          if (review.modifiedPolygon && review.modifiedPolygon.length > 0) {
            detail = (detail ? detail + ' + ' : '') + 'Poligon düzenlendi';
          }
          if (review.comments && review.status !== 'modified') {
            detail = review.comments;
          }

          items.push({
            id: `review-${review.id}`,
            action: reviewAction,
            userName: reviewerName,
            userId: review.reviewerId,
            targetName: isGlobal
              ? `${typeName}`
              : `${ann.name || typeName}`,
            targetAnnotationId: ann.id,
            isGlobal,
            detail,
            detailColor: reviewAction === 'approved' ? '#10b981' : reviewAction === 'rejected' ? '#ef4444' : '#3b82f6',
            timestamp: review.updatedAt || review.createdAt,
          });
        }
      } catch {
        // silently skip review fetch errors
      }
    }

    // Sort by timestamp descending (newest first)
    items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    activityItems.value = items;
  } catch (e) {
    console.error('Failed to build activities:', e);
    activityItems.value = [];
  } finally {
    loadingActivities.value = false;
  }
}

// --- Helpers ---

function getAnnotationTypeName(typeId: string): string {
  const type = annotationTypeStore.annotationTypes.find(t => t.id === typeId);
  return type?.name || 'Anonim Etiket';
}

function getActionLabel(action: ActivityItem['action']): string {
  switch (action) {
    case 'created': return 'Oluşturdu';
    case 'updated': return 'Güncelledi';
    case 'approved': return 'Onayladı';
    case 'rejected': return 'Reddetti';
    case 'modified': return 'Düzenledi';
    case 'label_changed': return 'Etiket Değiştirdi';
    case 'global_changed': return 'Global Etiket';
    default: return action;
  }
}

function getActionIcon(action: ActivityItem['action']): string {
  switch (action) {
    case 'created': return '✏️';
    case 'updated': return '🔄';
    case 'approved': return '✅';
    case 'rejected': return '❌';
    case 'modified': return '✂️';
    case 'label_changed': return '🏷️';
    case 'global_changed': return '🌐';
    default: return '📌';
  }
}

function getActionBadgeClass(action: ActivityItem['action']): string {
  switch (action) {
    case 'created': return 'bg-emerald-50 text-emerald-600';
    case 'updated': return 'bg-blue-50 text-blue-600';
    case 'approved': return 'bg-green-50 text-green-700';
    case 'rejected': return 'bg-red-50 text-red-600';
    case 'modified': return 'bg-amber-50 text-amber-600';
    case 'label_changed': return 'bg-purple-50 text-purple-600';
    case 'global_changed': return 'bg-cyan-50 text-cyan-600';
    default: return 'bg-gray-50 text-gray-600';
  }
}

function getActivityDotColor(item: ActivityItem): string {
  switch (item.action) {
    case 'created': return 'bg-emerald-400';
    case 'updated': return 'bg-blue-400';
    case 'approved': return 'bg-green-500';
    case 'rejected': return 'bg-red-400';
    case 'modified': return 'bg-amber-400';
    case 'label_changed': return 'bg-purple-400';
    case 'global_changed': return 'bg-cyan-400';
    default: return 'bg-gray-300';
  }
}

function formatTime(date: Date): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);

  if (diffMin < 1) return 'Şimdi';
  if (diffMin < 60) return `${diffMin}dk önce`;
  if (diffHr < 24) return `${diffHr}sa önce`;

  return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

const groupedActivities = computed(() => {
  const groups: Record<string, ActivityItem[]> = {};
  const now = new Date();
  const todayStr = now.toLocaleDateString('tr-TR');

  for (const item of activityItems.value) {
    const dateStr = item.timestamp.toLocaleDateString('tr-TR');
    let label: string;

    if (dateStr === todayStr) {
      label = 'Bugün';
    } else {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      if (dateStr === yesterday.toLocaleDateString('tr-TR')) {
        label = 'Dün';
      } else {
        label = dateStr;
      }
    }

    if (!groups[label]) groups[label] = [];
    groups[label]!.push(item);
  }

  return groups;
});

// --- Click to focus / Hover highlighting ---

function onActivityClick(item: ActivityItem) {
  if (!item.isGlobal) {
    emit('focus-annotation', item.targetAnnotationId);
  }
}

function onActivityHover(item: ActivityItem) {
  hoveredActivityId.value = item.id;
  annotationStore.selectAnnotation(item.targetAnnotationId);
}

function onActivityLeave() {
  hoveredActivityId.value = null;
  annotationStore.selectAnnotation(null);
}

// --- Watch for image changes ---

watch(
  () => props.selectedImageId,
  (newId) => {
    if (newId && props.isOpen) {
      buildActivities(newId);
    } else {
      activityItems.value = [];
    }
  },
  { immediate: true }
);

// Also rebuild when annotations change (e.g. after save, NOT toggle swaps)
let lastKnownFilter = annotationStore.viewFilter;
watch(
  () => annotationStore.annotations.length,
  () => {
    // Skip rebuild if only viewFilter changed (toggle swap)
    if (annotationStore.viewFilter !== lastKnownFilter) {
      lastKnownFilter = annotationStore.viewFilter;
      return;
    }
    if (props.selectedImageId && props.isOpen) {
      buildActivities(props.selectedImageId);
    }
  }
);

watch(
  () => props.isOpen,
  (open) => {
    if (open && props.selectedImageId) {
      buildActivities(props.selectedImageId);
    }
  }
);

onUnmounted(() => {
  hoveredActivityId.value = null;
});
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 3px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #e5e7eb;
  border-radius: 20px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: #d1d5db;
}
</style>
