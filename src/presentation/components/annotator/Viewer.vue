<template>
  <div class="relative w-full h-full bg-gray-800">
    <div :id="viewerId" class="w-full h-full"></div>

    <LocalAnnotationModal
      :is-open="isModalOpen"
      :annotation-types="activeAnnotationTypes"
      :initial-values="editInitialValues"
      @save="handleModalSave"
      @cancel="handleModalCancel"
      @delete="handleModalDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, type PropType, watch, computed, onMounted, onUnmounted } from 'vue';
import type { Image } from '@/core/entities/Image';
import type { Annotation } from '@/core/entities/Annotation';
import { Point } from '@/core/value-objects/Point';
import { useOpenSeadragon } from '@/presentation/composables/annotator/useOpenSeadragon';
import { useAnnotationTypeStore } from '@/stores/annotation_type';
import { useAnnotationStore } from '@/stores/annotation';
import LocalAnnotationModal from './LocalAnnotationModal.vue';
import { useToast } from 'vue-toastification';

const toast = useToast();

const props = defineProps({
  selectedImage: { type: Object as PropType<Image | null>, default: null },
});

const annotationTypeStore = useAnnotationTypeStore();
const annotationStore = useAnnotationStore();
const viewerId = 'osd-viewer-main';
const { loadAnnotations, loadImage, startDrawing, stopDrawing, anno } = useOpenSeadragon(viewerId);

const isModalOpen = ref(false);
const currentDrawingData = ref<any>(null);
const selectedAnnotationData = ref<Annotation | null>(null);
const editInitialValues = ref<Record<string, any>>({});

const activeAnnotationTypes = computed(() =>
  annotationTypeStore.annotationTypes.filter((t) => !t.global)
);

defineExpose({ startDrawing, stopDrawing });

watch(
  () => props.selectedImage,
  async (newImg, oldImg) => {
    // oldImg parametresini ekleyin
    // EĞER: Yeni resim yoksa VEYA (Eski resim varsa VE ID'ler aynıysa) işlem yapma.
    if (!newImg || (oldImg && newImg.id === oldImg.id)) {
      return;
    }

    await loadImage(newImg);
  }
);

onMounted(() => {
  const viewerEl = document.getElementById(viewerId);
  if (viewerEl) {
    viewerEl.addEventListener('dblclick', handleDoubleClick);
  }

  watch(
    () => anno.value,
    (newAnno) => {
      if (!newAnno) return;

      newAnno.on('createSelection', (selection: any) => {
        currentDrawingData.value = selection;
        editInitialValues.value = {};
        isModalOpen.value = true;
      });

      // --- LOG EKLENDİ ---
      newAnno.on('selectAnnotation', (annotation: any) => {
        // 1. Tıklanan ID'yi temizle
        const rawId = String(annotation.id);
        const targetId = rawId.startsWith('#') ? rawId.slice(1) : rawId;

        // 2. Tıklanan 'Birincil' Anotasyonu bul
        const primaryAnnotation = annotationStore.annotations.find(
          (a) => String(a.id) === targetId
        );

        // Pending listesinde de olabilir
        const primaryPending = !primaryAnnotation
          ? annotationStore.pendingAnnotations.find((p) => String(p.tempId) === targetId)
          : null;

        // Referans olarak kullanacağımız veri (Poligonu almak için)
        const referenceData = primaryAnnotation || primaryPending;

        if (referenceData) {
          selectedAnnotationData.value = referenceData as any;
          // Not: Type casting gerekebilir çünkü Pending ile Annotation tipleri az farklı

          console.group('🔍 Çoklu Etiket Birleştirme');
          const initialValues: Record<string, any> = {};
          const normalize = (s: any) =>
            String(s || '')
              .trim()
              .toLowerCase();

          // --- KRİTİK NOKTA: AYNI KOORDİNATA SAHİP TÜM "KARDEŞ" ANOTASYONLARI BUL ---

          // 1. Kayıtlı olanlar arasından kardeşleri bul
          const siblingAnnotations = annotationStore.annotations.filter((a) =>
            arePolygonsEqual(a.polygon, referenceData.polygon as any)
          );

          // 2. Pending olanlar arasından kardeşleri bul
          const siblingPending = annotationStore.pendingAnnotations.filter((p) =>
            arePolygonsEqual(p.polygon as any, referenceData.polygon as any)
          );

          // Hepsini tek bir listede birleştir
          const allSiblings = [...siblingAnnotations, ...siblingPending];

          // --- VERİLERİ BİRLEŞTİRME DÖNGÜSÜ ---
          // Her bir kardeş anotasyonun 'tag' verisini alıp modalı dolduruyoruz
          activeAnnotationTypes.value.forEach((type) => {
            const targetName = normalize(type.name);

            // Kardeşler arasında bu Tip ismine sahip olan var mı?
            const match = allSiblings.find((sibling) => {
              if (!sibling.tag) return false;
              const sName = normalize(sibling.tag.tag_name);
              return sName === targetName;
            });

            if (match && match.tag) {
              initialValues[type.id] = match.tag.value;
            }
          });

          console.groupEnd();

          editInitialValues.value = initialValues;
          currentDrawingData.value = null;
          isModalOpen.value = true;
        } else {
          console.warn('❌ Veri bulunamadı:', targetId);
        }
      });

      newAnno.on('deselectAnnotation', () => {
        if (!isModalOpen.value) {
          selectedAnnotationData.value = null;
        }
      });
    },
    { immediate: true }
  );
});

onUnmounted(() => {
  const viewerEl = document.getElementById(viewerId);
  if (viewerEl) {
    viewerEl.removeEventListener('dblclick', handleDoubleClick);
  }
});

// --- LOG EKLENDİ ---
function handleDoubleClick() {
  console.group('🖱️ Double Click Event');
  if (!anno.value) {
    console.groupEnd();
    return;
  }

  const selected = anno.value.getSelected();

  if (selected && selectedAnnotationData.value) {
    const currentTag = selectedAnnotationData.value.tag;

    if (currentTag) {
      const type = activeAnnotationTypes.value.find((t) => {
        const match = t.name === currentTag.tag_name;
        if (match) return match;
      });

      if (type) {
        editInitialValues.value = { [type.id]: currentTag.value };
      } else {
      }
    } else {
      editInitialValues.value = {};
    }

    currentDrawingData.value = null;
    isModalOpen.value = true;
  } else {
  }
  console.groupEnd();
}

// Viewer.vue -> handleModalSave

async function handleModalSave(results: Array<{ type: any; value: any }>) {
  console.group('💾 Kayıt İşlemi');

  if (!results || results.length === 0) {
    console.warn('Boş veri, iptal ediliyor.');
    if (anno.value) anno.value.cancelSelected();
    isModalOpen.value = false;
    editInitialValues.value = {};
    console.groupEnd();
    return;
  }

  // ADIM 1: Verileri Hazırla
  let rawPoints: Array<{ x: number; y: number }> = [];

  if (currentDrawingData.value) {
    rawPoints = convertAnnotoriousToPoints(currentDrawingData.value);
  } else if (selectedAnnotationData.value) {
    rawPoints = selectedAnnotationData.value.polygon.map((p) => ({ x: p.x, y: p.y }));
  }

  // ADIM 2: Görsel Taslağı Temizle
  if (anno.value) {
    anno.value.cancelSelected();
  }

  // ADIM 3: Kayıt ve Ekrana Çizme
  try {
    // --- CREATE: Yeni Çizim ---
    if (currentDrawingData.value && props.selectedImage) {
      const points = rawPoints.map((p) => Point.from(p));

      const operations = results.map(async (res, index) => {
        if (!res.type) return;

        const tempId = `temp-${Date.now()}-${Math.random()}-${index}`;

        annotationStore.addPendingAnnotation({
          tempId,
          imageId: props.selectedImage!.id,
          tag: {
            tag_type: res.type.type || 'TEXT',
            tag_name: res.type.name,
            value: res.value,
            color: res.type.color || '#ec4899',
            global: false,
          },
          polygon: points.map((p) => ({ x: p.x, y: p.y })),
        });

        if (anno.value) {
          addAnnotationToAnnotorious(tempId, rawPoints, `${res.type.name}: ${res.value}`);
        }
      });

      await Promise.all(operations);
      toast.success('Kayıt başarılı.');
    }

    // --- UPDATE: Güncelleme ---
    else if (selectedAnnotationData.value) {
      const refAnno = selectedAnnotationData.value;

      // HATA ÇÖZÜMÜ BURADA: (s: string) yerine (s: any) yaptık.
      const normalize = (s: any) =>
        String(s || '')
          .trim()
          .toLowerCase();

      const getId = (item: any): string => {
        if (item.id) return String(item.id);
        if (item.tempId) return String(item.tempId);
        return '';
      };

      const siblings = [
        ...annotationStore.annotations.filter((a) => arePolygonsEqual(a.polygon, refAnno.polygon)),
        ...annotationStore.pendingAnnotations.filter((p) =>
          arePolygonsEqual(p.polygon as any, refAnno.polygon as any)
        ),
      ];

      for (const res of results) {
        if (!res.type) continue;
        const targetName = normalize(res.type.name);

        const existingSibling = siblings.find((s) => {
          // Artık undefined gelse bile hata vermez
          const sName = normalize(s.tag?.tag_name);
          return sName === targetName;
        });

        if (existingSibling) {
          // Güncelle
          const id = getId(existingSibling);
          if (!id) continue;

          const currentTag = existingSibling.tag;
          const newTag = {
            tag_type: currentTag?.tag_type || res.type.type || 'TEXT',
            tag_name: currentTag?.tag_name || res.type.name,
            value: res.value,
            color: currentTag?.color || res.type.color || '#ec4899',
            global: currentTag?.global || false,
          };

          if (id.startsWith('temp-')) {
            annotationStore.updatePendingAnnotation(id, { tag: newTag });
          } else {
            await annotationStore.updateAnnotation(id, { tag: newTag } as any);
          }
        } else {
          // Yeni Tip Ekle
          const tempId = `temp-${Date.now()}-${Math.random()}`;
          annotationStore.addPendingAnnotation({
            tempId,
            imageId: refAnno.imageId || props.selectedImage!.id,
            tag: {
              tag_type: res.type.type,
              tag_name: res.type.name,
              value: res.value,
              color: res.type.color || '#000',
              global: false,
            },
            polygon: refAnno.polygon.map((p) => ({ x: p.x, y: p.y })),
          });

          if (anno.value) {
            addAnnotationToAnnotorious(tempId, rawPoints, `${res.type.name}: ${res.value}`);
          }
        }
      }

      // Silme işlemleri
      for (const sibling of siblings) {
        const sName = normalize(sibling.tag?.tag_name);
        const stillExists = results.some((r) => r.type && normalize(r.type.name) === sName);
        if (!stillExists) {
          const id = getId(sibling);
          if (id) {
            if (id.startsWith('temp-')) {
              annotationStore.removePendingAnnotation(id);
            } else {
              await annotationStore.deleteAnnotation(id, refAnno.imageId);
            }
            if (anno.value) anno.value.removeAnnotation(id);
          }
        }
      }
      toast.success('Güncelleme tamamlandı.');
    }
  } catch (err) {
    console.error('❌ Hata:', err);
    toast.error('İşlem sırasında bir hata oluştu.');
  } finally {
    isModalOpen.value = false;
    editInitialValues.value = {};
    currentDrawingData.value = null;
    console.groupEnd();
  }
}

function addAnnotationToAnnotorious(
  id: string,
  points: Array<{ x: number; y: number }>,
  text: string
) {
  if (!anno.value || points.length === 0) return;

  const pointsStr = points.map((p) => `${p.x},${p.y}`).join(' ');

  // Manuel çizim ekleme
  anno.value.addAnnotation({
    id: id,
    type: 'Annotation',
    body: [
      {
        type: 'TextualBody',
        value: text,
        purpose: 'tagging',
      },
    ],
    target: {
      selector: {
        type: 'SvgSelector',
        value: `<svg xmlns="http://www.w3.org/2000/svg"><polygon points="${pointsStr}"></polygon></svg>`,
      },
    },
  });
}

function handleModalCancel() {
  if (anno.value) anno.value.cancelSelected();
  isModalOpen.value = false;
  editInitialValues.value = {};
}

function handleModalDelete() {
  deleteSelected();
  isModalOpen.value = false;
  editInitialValues.value = {};
}

async function deleteSelected() {
  if (!selectedAnnotationData.value || !props.selectedImage) return;

  const annotationId = selectedAnnotationData.value.id;
  if (!annotationId) return;

  if (String(annotationId).startsWith('temp-')) {
    annotationStore.removePendingAnnotation(String(annotationId));
    if (anno.value) anno.value.removeAnnotation(annotationId);
    toast.info('Geçici etiket silindi');
  } else {
    await annotationStore.deleteAnnotation(String(annotationId), props.selectedImage.id);
    if (anno.value) anno.value.removeAnnotation(annotationId);
  }

  selectedAnnotationData.value = null;
}

function convertAnnotoriousToPoints(selection: any): Array<{ x: number; y: number }> {
  try {
    const selector = selection.target?.selector || selection.selector;
    if (!selector || !selector.value) return [];

    // Regex hem çift tırnak (") hem tek tırnak (') desteklemeli
    const match = selector.value.match(/points=["']([^"']+)["']/);
    const pointsStr = match ? match[1] : '';

    if (!pointsStr) {
      console.warn('Koordinat stringi bulunamadı:', selector.value);
      return [];
    }

    // "x,y x,y" veya "x,y,x,y" formatlarını ayır
    return pointsStr
      .split(/[\s,]+/)
      .reduce((acc: Array<{ x: number; y: number }>, val: string, i: number, arr: string[]) => {
        // Çiftler halinde al: [x, y], [x, y]
        if (i % 2 === 0 && val !== '' && arr[i + 1] !== undefined) {
          const x = parseFloat(val);
          const y = parseFloat(arr[i + 1] ?? '');
          if (!isNaN(x) && !isNaN(y)) {
            acc.push({ x, y });
          }
        }
        return acc;
      }, []);
  } catch (e) {
    console.error('Koordinat çevirme hatası:', e);
    return [];
  }
}

// İki poligonun koordinatları birebir aynı mı kontrol eder
function arePolygonsEqual(
  poly1: { x: number; y: number }[],
  poly2: { x: number; y: number }[]
): boolean {
  if (!poly1 || !poly2 || poly1.length !== poly2.length) return false;

  // Basitçe string'e çevirip karşılaştırmak en hızlı yoldur
  // Koordinat hassasiyeti (float) sorunu yaşamamak için toFixed kullanabiliriz
  const str1 = poly1.map((p) => `${p.x.toFixed(6)},${p.y.toFixed(6)}`).join('|');
  const str2 = poly2.map((p) => `${p.x.toFixed(6)},${p.y.toFixed(6)}`).join('|');

  return str1 === str2;
}
</script>
