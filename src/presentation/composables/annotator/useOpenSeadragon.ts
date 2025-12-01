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
  const anno = shallowRef<InstanceType<typeof Annotorious> | null>(null);
  const currentImageId = ref<string | null>(null);
  const loading = ref(false);

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
      widgets: ['POLYGON'],
    });

    anno.value.on('createAnnotation', async (annotation: any) => {
      const polygonPoints = annotation.target.selector.value
        .replace('xywh=polygon:', '')
        .split(',')
        .map((p: string) => parseFloat(p));

      const points: Point[] = [];
      for (let i = 0; i < polygonPoints.length; i += 2) {
        points.push(Point.from({ x: polygonPoints[i], y: polygonPoints[i + 1] }));
      }

      if (currentImageId.value) {
        await annotationStore.createAnnotation(currentImageId.value, {
          annotator_id: '',
          polygon: points,
        });

        loadAnnotations(currentImageId.value);
      }
    });

    anno.value.on('deleteAnnotation', (annotation: any) => {
      if (currentImageId.value) {
        annotationStore.deleteAnnotation(annotation.id, currentImageId.value);
      }
    });
  }

  async function loadAnnotations(imageId: string) {
    if (!anno.value) return;
    anno.value.clearAnnotations();

    await annotationStore.fetchAnnotationsByImage(imageId);

    const w3cAnnotations = annotationStore.annotations.map((ann) => {
      const polygonStr = ann.polygon.map((p) => `${p.x},${p.y}`).join(',');

      return {
        '@context': 'http://www.w3.org/ns/anno.jsonld',
        type: 'Annotation',
        id: ann.id,
        body: [
          {
            type: 'TextualBody',
            value: ann.class || (ann.score !== null ? `Skor: ${ann.score}` : ''),
            purpose: 'commenting',
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

    w3cAnnotations.forEach((a) => anno.value.addAnnotation(a));
  }

  async function loadImage(image: Image) {
    console.log('loadImage çağrıldı:', image);
    console.log('Görüntü işlenmiş yolu:', image.processedpath);
    console.log('viewer değeri:', viewer.value);
    if (!viewer.value || !image.processedpath) {
      console.error('OSD viewer başlatılamadı veya görüntü yolu yok.');
      return;
    }

    loading.value = true;
    currentImageId.value = image.id;

    try {
      const tileSourceUrl = `${API_BASE_URL}/api/v1/proxy/${image.processedpath}/image.dzi`;
      viewer.value.open(tileSourceUrl);
      await loadAnnotations(image.id);
    } catch (err) {
      console.error('Görüntü yüklenirken hata:', err);
    } finally {
      loading.value = false;
    }
  }

  onMounted(initViewer);

  onUnmounted(() => {
    if (viewer.value) {
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
  };
}
