import { ref, onMounted, onUnmounted, shallowRef } from 'vue';
import { useAnnotationStore } from '@/stores/annotation';
import { useAuthStore } from '@/stores/auth';
import type { Image } from '@/core/entities/Image';
import OpenSeadragon from 'openseadragon';
import Annotorious from '@recogito/annotorious-openseadragon';
import '@recogito/annotorious-openseadragon/dist/annotorious.min.css';
import { Point } from '@/core/value-objects/Point';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export function useOpenSeadragon(viewerId: string) {
  const annotationStore = useAnnotationStore();
  const authStore = useAuthStore();

  const viewer = shallowRef<OpenSeadragon.Viewer | null>(null);
  const anno = shallowRef<InstanceType<typeof Annotorious> | null>(null);
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

  function parseAnnotationBody(annotation: any) {
    const bodies = Array.isArray(annotation.body)
      ? annotation.body
      : annotation.body
        ? [annotation.body]
        : [];

    const tagBody = bodies.find((b: any) => b.purpose === 'tagging');
    const commentBody = bodies.find((b: any) => b.purpose === 'commenting');

    return {
      className: tagBody ? tagBody.value : undefined,
      description: commentBody ? commentBody.value : undefined,
    };
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
      widgets: ['COMMENT', 'TAG'],
      readOnly: false,
    });

    // --- CREATE LISTENER ---
    anno.value.on('createAnnotation', (annotation: any) => {
      if (!currentImageId.value) return;

      const points = parsePolygonPoints(annotation.target.selector.value);
      const { className, description } = parseAnnotationBody(annotation);

      if (points.length < 3) {
        console.warn('Yetersiz nokta sayısı, anotasyon eklenmedi.');
        return;
      }

      annotationStore.addUnsavedAnnotation({
        tempId: annotation.id,
        image_id: currentImageId.value,
        annotator_id: '',
        polygon: points,
        class: className,
        description: description,
      });

      console.log('Desc:', description);
    });

    // --- UPDATE LISTENER ---
    anno.value.on('updateAnnotation', async (annotation: any, previous: any) => {
      if (!currentImageId.value) return;

      const { className, description } = parseAnnotationBody(annotation);
      const points = parsePolygonPoints(annotation.target.selector.value);

      const isUnsaved = annotationStore.unsavedAnnotations.some((a) => a.tempId === annotation.id);

      if (isUnsaved) {
        annotationStore.updateUnsavedAnnotation(annotation.id, {
          polygon: points,
          class: className,
          description: description,
        });
      } else {
        await annotationStore.updateAnnotation(annotation.id, {
          class: className,
          description: description,
        });
      }
    });

    // --- DELETE LISTENER ---
    anno.value.on('deleteAnnotation', (annotation: any) => {
      const isUnsaved = annotationStore.unsavedAnnotations.some((a) => a.tempId === annotation.id);

      if (isUnsaved) {
        annotationStore.removeUnsavedAnnotation(annotation.id);
      } else if (currentImageId.value) {
        annotationStore.deleteAnnotation(annotation.id, currentImageId.value);
      }
    });
  }

  async function loadAnnotations(imageId: string) {
    if (!anno.value) return;

    anno.value.clearAnnotations();

    try {
      await annotationStore.fetchAnnotationsByImage(imageId, undefined, { showToast: false });

      const annotations = annotationStore.annotations;

      if (annotations.length === 0) return;

      const w3cAnnotations = annotations.map((ann) => {
        const polygonStr = ann.polygon.map((p) => `${p.x},${p.y}`).join(' ');

        const body = [];

        if (ann.class) {
          body.push({
            type: 'TextualBody',
            value: ann.class,
            purpose: 'tagging',
          });
        }

        if (ann.description) {
          body.push({
            type: 'TextualBody',
            value: ann.description,
            purpose: 'commenting',
          });
        }

        if (ann.score !== null && ann.score !== undefined) {
          body.push({
            type: 'TextualBody',
            value: `Skor: ${ann.score}`,
            purpose: 'commenting',
          });
        }

        return {
          '@context': 'http://www.w3.org/ns/anno.jsonld',
          type: 'Annotation',
          id: ann.id,
          body: body,
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

  async function loadImage(image: Image) {
    if (!viewer.value || !image.processedpath) {
      console.error('OSD viewer başlatılamadı veya görüntü yolu yok.');
      return;
    }

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
      console.error('Görüntü açma komutu hatası:', err);
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
  };
}
