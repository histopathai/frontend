import { ref, onMounted, onUnmounted, shallowRef, watch } from 'vue';
import { useAnnotationStore } from '@/stores/annotation';
import { useAnnotationTypeStore } from '@/stores/annotation_type';
import type { Image } from '@/core/entities/Image';
import OpenSeadragon from 'openseadragon';
import Annotorious from '@recogito/annotorious-openseadragon';
import '@recogito/annotorious-openseadragon/dist/annotorious.min.css';
import { Point } from '@/core/value-objects/Point';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export function useOpenSeadragon(viewerId: string) {
  const annotationStore = useAnnotationStore();
  const annotationTypeStore = useAnnotationTypeStore();

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

  async function loadAnnotations(imageId: string) {
    if (!anno.value) {
      return;
    }

    anno.value.clearAnnotations();

    if (annotationStore.isLoading) {
      await new Promise<void>((resolve) => {
        const stopWatching = watch(
          () => annotationStore.isLoading,
          (isLoading) => {
            if (!isLoading) {
              stopWatching();
              resolve();
            }
          }
        );
      });
    }

    try {
      await annotationStore.fetchAnnotationsByImage(imageId, undefined, { showToast: false });

      const annotations = annotationStore.annotations;
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
                value: (function () {
                  const type = annotationTypeStore.annotationTypes.find(
                    (t) => t.id === ann.annotationTypeId
                  );
                  // Need to handle missing type or pending annotations
                  const tagName = type ? type.name : 'Unknown';
                  // Check if ann has tag object (legacy/pending) or use new structure
                  if ((ann as any).tag) {
                    return `${(ann as any).tag.tag_name}: ${(ann as any).tag.value}`;
                  }
                  return `${tagName}: ${ann.value}`;
                })(),
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

      if (w3cAnnotations.length > 0) {
        anno.value.setAnnotations(w3cAnnotations);
      } else {
      }

      await loadPendingAnnotations(imageId);
    } catch (e) {
      console.warn('Anotasyonlar yüklenirken bir sorun oluştu:', e);
    }
  }

  async function loadPendingAnnotations(imageId: string) {
    if (!anno.value) return;

    const pendingForThisImage = annotationStore.pendingAnnotations.filter(
      (p) => p.imageId === imageId
    );

    if (pendingForThisImage.length === 0) {
      return;
    }

    pendingForThisImage.forEach((pending) => {
      if (!pending.polygon || pending.polygon.length === 0) return;

      const polygonStr = pending.polygon.map((p) => `${p.x},${p.y}`).join(' ');

      anno.value?.addAnnotation({
        id: pending.tempId,
        type: 'Annotation',
        body: [
          {
            type: 'TextualBody',
            value: `${pending.name}: ${pending.value}`,
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
  }

  async function loadImage(image: Image) {
    if (!viewer.value || !image.status.isProcessed()) return;

    loading.value = true;
    currentImageId.value = image.id;

    viewer.value.addHandler('open', async () => {
      if (currentImageId.value !== image.id) return;

      await loadAnnotations(image.id);
      loading.value = false;
    });

    viewer.value.addHandler('open', async () => {
      if (currentImageId.value !== image.id) return;
      await loadAnnotations(image.id);
      loading.value = false;
    });

    try {
      const tileSourceUrl = `${API_BASE_URL}/api/v1/proxy/${image.id}/image.dzi`;
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
