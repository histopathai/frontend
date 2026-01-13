// src/presentation/composables/annotator/useOpenSeadragon.ts
import { ref, onMounted, onUnmounted, shallowRef } from 'vue';
import OpenSeadragon from 'openseadragon';
import Annotorious from '@recogito/annotorious-openseadragon';
import { Point } from '@/core/value-objects/Point';
import type { Image } from '@/core/entities/Image';

// Stil dosyasını unutmuyoruz
import '@recogito/annotorious-openseadragon/dist/annotorious.min.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export function useOpenSeadragon(viewerId: string, emit: any) {
  const viewer = shallowRef<OpenSeadragon.Viewer | null>(null);
  const anno = shallowRef<any>(null);
  const currentImageId = ref<string | null>(null);
  const loading = ref(false);

  /**
   * Annotorious'un ürettiği karmaşık SVG/Fragment string'inden
   * koordinatları ayıklayıp Point[] dizisine dönüştürür.
   */
  function parsePolygonPoints(selectorValue: string): Point[] {
    let pointsStr = '';
    if (selectorValue.includes('<polygon')) {
      const match = selectorValue.match(/points=["'](.*?)["']/);
      if (match && match[1]) pointsStr = match[1];
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
        points.push(
          Point.from({
            x: x as number,
            y: y as number,
          })
        );
      }
    }
    return points;
  }

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
   * İptal durumunda son çizilen (henüz kaydedilmemiş) poligonu viewer'dan kaldırır.
   */
  function removeAnnotation(annotation: any) {
    if (anno.value) {
      anno.value.removeAnnotation(annotation);
    }
  }

  function initViewer() {
    viewer.value = OpenSeadragon({
      id: viewerId,
      prefixUrl: 'https://cdn.jsdelivr.net/npm/openseadragon@4.1/build/openseadragon/images/',
      tileSources: [],
      gestureSettingsMouse: { clickToZoom: false }, // Çizim yaparken zoom karışmaması için
      showNavigationControl: true,
      ajaxWithCredentials: true,
    });

    // Annotorious Kurulumu
    anno.value = new Annotorious(viewer.value, {
      widgets: [], // Tag/Comment widgetları kapalı
      disableEditor: true, // Kendi modalımızı kullanacağımız için editör kapalı
    });

    // Çizim tamamlandığında tetiklenir
    anno.value.on('createAnnotation', (annotation: any) => {
      const points = parsePolygonPoints(annotation.target.selector.value);

      if (points.length < 3) {
        anno.value.removeAnnotation(annotation);
        return;
      }

      // Veritabanına yazmak yerine, modal açılması için koordinatları emit ediyoruz
      emit('polygon-complete', { annotation, points });
    });
  }

  async function loadImage(image: Image) {
    if (!viewer.value || !image.processedpath) return;

    loading.value = true;
    currentImageId.value = image.id;

    if (anno.value) anno.value.clearAnnotations();

    viewer.value.addHandler('open', () => {
      loading.value = false;
    });

    try {
      const tileSourceUrl = `${API_BASE_URL}/api/v1/proxy/${image.processedpath}/image.dzi`;
      viewer.value.open(tileSourceUrl);
    } catch (err) {
      console.error('OSD yükleme hatası:', err);
      loading.value = false;
    }
  }

  onMounted(initViewer);

  onUnmounted(() => {
    if (viewer.value) viewer.value.destroy();
    if (anno.value) anno.value.destroy();
  });

  return {
    loading,
    loadImage,
    startDrawing,
    stopDrawing,
    removeAnnotation,
    anno,
  };
}
