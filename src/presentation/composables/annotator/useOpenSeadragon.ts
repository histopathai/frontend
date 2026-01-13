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
  const anno = shallowRef<any>(null); // Annotorious instance
  const currentImageId = ref<string | null>(null);
  const loading = ref(false);

  // --- Çizim Kontrolleri ---
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

  /**
   * Annotorious'un karmaşık Selector string'inden Point[] dizisi üretir
   */
  function parsePolygonPoints(selectorValue: string): Point[] {
    let pointsStr = '';

    // SVG formatındaysa (points="...")
    if (selectorValue.includes('<polygon')) {
      const match = selectorValue.match(/points=["'](.*?)["']/);
      if (match && match[1]) {
        pointsStr = match[1];
      }
    } else {
      // Standart format
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

    // --- ANNOTORIOUS BAŞLATMA ---
    // disableEditor: true -> Kütüphanenin kendi popup'ını tamamen kapatır.
    // widgets: [] -> Gereksiz widget'ları kaldırır.
    anno.value = new Annotorious(viewer.value, {
      widgets: [],
      disableEditor: true,
      readOnly: false,
    });

    // --- CREATE LISTENER ---
    // Çizim bittiğinde sadece Viewer.vue'nun yakalaması yeterli,
    // ancak burada da poligonun geçerliliğini kontrol edebilirsiniz.
    anno.value.on('createAnnotation', (annotation: any) => {
      const points = parsePolygonPoints(annotation.target.selector.value);
      if (points.length < 3) {
        anno.value.removeAnnotation(annotation);
        console.warn('Geçersiz poligon: En az 3 nokta gereklidir.');
      }
    });

    // --- DELETE LISTENER ---
    anno.value.on('deleteAnnotation', (annotation: any) => {
      if (currentImageId.value) {
        annotationStore.deleteAnnotation(annotation.id, currentImageId.value);
      }
    });
  }

  /**
   * Backend'den gelen anotasyonları kütüphanenin anlayacağı W3C formatına çevirir
   */

  async function loadAnnotations(imageId: string) {
    if (!anno.value) return;
    anno.value.clearAnnotations();

    try {
      await annotationStore.fetchAnnotationsByImage(imageId, undefined, { showToast: false });
      const annotations = annotationStore.annotations;

      if (annotations.length === 0) return;

      const w3cAnnotations = annotations.map((ann) => {
        const polygonStr = ann.polygon.map((p) => `${p.x},${p.y}`).join(' ');

        const label = ann.tag?.tag_name || 'Etiket';
        const value = ann.tag?.value ? `: ${ann.tag.value}` : '';

        return {
          '@context': 'http://www.w3.org/ns/anno.jsonld',
          type: 'Annotation',
          id: ann.id,
          body: [
            {
              type: 'TextualBody',
              value: `${label}${value}`,
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
      });

      anno.value.setAnnotations(w3cAnnotations);
    } catch (e) {
      console.error('Anotasyonlar yüklenirken hata:', e);
    }
  }

  /**
   * Görüntüyü DZI formatında yükler
   */
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
    startDrawing,
    stopDrawing,
    anno, // Viewer.vue'nun createAnnotation event'ini yakalaması için gerekli
  };
}
