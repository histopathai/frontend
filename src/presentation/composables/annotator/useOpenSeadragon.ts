import { ref, onMounted, onUnmounted, shallowRef } from 'vue';
import { useAnnotationStore } from '@/stores/annotation';
import type { Image } from '@/core/entities/Image';
import OpenSeadragon from 'openseadragon';
import Annotorious from '@recogito/annotorious-openseadragon';
import '@recogito/annotorious-openseadragon/dist/annotorious.min.css';
import { Point } from '@/core/value-objects/Point';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export function useOpenSeadragon(viewerId: string) {
  const annotationStore = useAnnotationStore();

  const viewer = shallowRef<OpenSeadragon.Viewer | null>(null);
  const anno = shallowRef<any>(null);
  const currentImageId = ref<string | null>(null);
  const loading = ref(false);

  function startDrawing() {
    if (anno.value) {
      anno.value.setDrawingTool('polygon');
      anno.value.setDrawingEnabled(true);
    }
  }

  function stopDrawing() {
    if (anno.value) {
      anno.value.setDrawingEnabled(false);
      anno.value.setDrawingTool(null);
    }
  }

  function parsePolygonPoints(selectorValue: string): Point[] {
    let pointsStr = '';

    if (selectorValue.includes('<polygon')) {
      const match = selectorValue.match(/points=["'](.*?)["']/);
      if (match && match[1]) {
        pointsStr = match[1];
      }
    } else {
      pointsStr = selectorValue.replace('xywh=polygon:', '');
    }

    const coords = pointsStr
      .split(/[\s,]+/)
      .map((p) => parseFloat(p))
      .filter((n) => !isNaN(n));

    const points: Point[] = [];
    for (let i = 0; i < coords.length; i += 2) {
      const x = coords[i];
      const y = coords[i + 1];
      if (typeof x === 'number' && typeof y === 'number') {
        points.push(Point.from({ x, y }));
      }
    }
    return points;
  }

  function initViewer() {
    if (viewer.value) {
      viewer.value.destroy();
    }

    viewer.value = OpenSeadragon({
      id: viewerId,
      prefixUrl: 'https://cdn.jsdelivr.net/npm/openseadragon@4.1/build/openseadragon/images/',
      tileSources: [],
      animationTime: 0.3,
      blendTime: 0.1,
      constrainDuringPan: true,
      maxZoomPixelRatio: 2,
      visibilityRatio: 1,
      zoomPerScroll: 1.2,
      showNavigationControl: true,
      loadTilesWithAjax: true,
      ajaxWithCredentials: true,
    });

    anno.value = new Annotorious(viewer.value, {
      widgets: [],
      disableEditor: true,
      readOnly: false,
    });

    anno.value.on('createAnnotation', (annotation: any) => {
      const points = parsePolygonPoints(annotation.target.selector.value);
      if (points.length < 3) {
        anno.value.removeAnnotation(annotation);
        console.warn('Geçersiz poligon: En az 3 nokta gereklidir.');
      }
    });

    anno.value.on('deleteAnnotation', (annotation: any) => {
      if (currentImageId.value) {
        annotationStore.deleteAnnotation(annotation.id, currentImageId.value);
      }
    });
  }

  /**
   * Gerçek (DB'den gelen) anotasyonları yükler
   */
  async function loadAnnotations(imageId: string) {
    if (!anno.value) return;
    anno.value.clearAnnotations();

    try {
      await annotationStore.fetchAnnotationsByImage(imageId, undefined, { showToast: false });

      const annotations = annotationStore.annotations;

      // Gerçek anotasyonları W3C formatına çevir
      const w3cAnnotations = annotations
        .map((ann) => {
          if (!ann.polygon || ann.polygon.length === 0) return null;

          const polygonStr = ann.polygon.map((p) => `${p.x},${p.y}`).join(' ');

          return {
            '@context': 'http://www.w3.org/ns/anno.jsonld',
            type: 'Annotation',
            id: String(ann.id),
            body: [
              {
                type: 'TextualBody',
                value: ann.tag?.value || '',
                purpose: 'tagging',
              },
            ],
            target: {
              selector: {
                type: 'SvgSelector',
                value: `<svg><polygon points="${polygonStr}" /></svg>`,
              },
            },
          };
        })
        .filter((ann) => ann !== null);

      // Gerçek anotasyonları ekle
      if (w3cAnnotations.length > 0) {
        anno.value.setAnnotations(w3cAnnotations);
        console.log(`✅ ${w3cAnnotations.length} adet gerçek anotasyon yüklendi`);
      } else {
        console.log('ℹ️ Bu görüntü için henüz kaydedilmiş anotasyon bulunmuyor.');
      }

      // Pending anotasyonları da yükle
      await loadPendingAnnotations(imageId);
    } catch (e) {
      console.warn('Anotasyonlar yüklenirken bir sorun oluştu:', e);
    }
  }

  /**
   * Pending (henüz kaydedilmemiş) anotasyonları yükler
   */
  async function loadPendingAnnotations(imageId: string) {
    if (!anno.value) return;

    // Bu görüntüye ait pending anotasyonları filtrele
    const pendingForThisImage = annotationStore.pendingAnnotations.filter(
      (p) => p.imageId === imageId
    );

    if (pendingForThisImage.length === 0) {
      console.log('ℹ️ Bu görüntü için bekleyen (pending) anotasyon yok');
      return;
    }

    console.log(`📋 ${pendingForThisImage.length} adet pending annotation yükleniyor...`);

    // Her pending anotasyonu UI'a ekle
    pendingForThisImage.forEach((pending) => {
      if (!pending.polygon || pending.polygon.length === 0) return;

      const polygonStr = pending.polygon.map((p) => `${p.x},${p.y}`).join(' ');

      anno.value?.addAnnotation({
        id: pending.tempId,
        type: 'Annotation',
        body: [
          {
            type: 'TextualBody',
            value: `${pending.tag.tag_name}: ${pending.tag.value}`,
            purpose: 'tagging',
          },
        ],
        target: {
          selector: {
            type: 'SvgSelector',
            value: `<svg><polygon points="${polygonStr}"></polygon></svg>`,
          },
        },
      });
    });

    console.log(`✅ ${pendingForThisImage.length} adet pending anotasyon UI'a eklendi`);
  }

  async function loadImage(image: Image) {
    if (!viewer.value || !image.processedpath) return;

    loading.value = true;
    currentImageId.value = image.id;

    viewer.value.removeAllHandlers('open');
    if (anno.value) {
      anno.value.clearAnnotations();
    }

    viewer.value.addHandler('open', async () => {
      if (currentImageId.value !== image.id) return;
      await loadAnnotations(image.id);
      loading.value = false;
    });

    try {
      const tileSourceUrl = `${API_BASE_URL}/api/v1/proxy/${image.processedpath}/image.dzi`;
      viewer.value.open(tileSourceUrl);
    } catch (err) {
      console.error('OSD açma hatası:', err);
      loading.value = false;
    }
  }

  onMounted(initViewer);

  onUnmounted(() => {
    if (viewer.value) {
      viewer.value.removeAllHandlers('open');
      viewer.value.destroy();
    }
    if (anno.value) {
      anno.value.destroy();
    }
    annotationStore.clearAnnotations();
  });

  return {
    loading,
    loadImage,
    loadAnnotations,
    loadPendingAnnotations,
    startDrawing,
    stopDrawing,
    anno,
  };
}
