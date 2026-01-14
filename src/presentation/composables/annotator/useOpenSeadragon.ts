import { ref, onMounted, onUnmounted, shallowRef, watch } from 'vue';
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
    console.log('4. [useOpenSeadragon] loadAnnotations çağrıldı. ImageId:', imageId);

    if (!anno.value) {
      console.log('4. [useOpenSeadragon] HATA: Annotorious instance (anno) yok!');
      return;
    }

    // Mevcut çizimleri temizle
    anno.value.clearAnnotations();

    // --- YENİ EKLENEN KISIM: Race Condition Çözümü ---
    // Eğer store o sırada başka bir işlem yapıyorsa (loading=true), işlemin bitmesini bekle.
    if (annotationStore.isLoading) {
      console.log('⏳ [useOpenSeadragon] Store şu an meşgul, bitmesi bekleniyor...');
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
      console.log('✅ [useOpenSeadragon] Store işlemi tamamlandı, veri çekmeye devam ediliyor.');
    }
    // ------------------------------------------------

    try {
      console.log('5. [useOpenSeadragon] Store isteği atılıyor...');

      // Store'dan veriyi çek (veya zaten çekildiyse store state'ini güncelle)
      await annotationStore.fetchAnnotationsByImage(imageId, undefined, { showToast: false });

      const annotations = annotationStore.annotations;

      // LOG 6: Store'dan dönen veri sayısı
      console.log("6. [useOpenSeadragon] Store'dan dönen anotasyon sayısı:", annotations.length);

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
                value: ann.tag ? `${ann.tag.tag_name}: ${ann.tag.value}` : 'Etiket Verisi Yok',
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
        console.log('7. [useOpenSeadragon] Anotasyonlar ekrana set ediliyor...');
        anno.value.setAnnotations(w3cAnnotations);
      } else {
        console.log('ℹ️ [useOpenSeadragon] Gösterilecek kayıtlı anotasyon bulunamadı.');
      }

      // Pending (kaydedilmemiş) anotasyonları da yükle
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
      return;
    }

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
  }

  async function loadImage(image: Image) {
    if (!viewer.value || !image.processedpath) return;

    console.log('2. [useOpenSeadragon] loadImage başladı, ID:', image.id);

    loading.value = true;
    currentImageId.value = image.id;

    viewer.value.addHandler('open', async () => {
      // LOG 3: OSD "open" eventi fırlattı
      console.log('3. [useOpenSeadragon] OSD "open" event tetiklendi.');

      if (currentImageId.value !== image.id) return;

      await loadAnnotations(image.id); // <--- Anotasyonları çağıran yer
      loading.value = false;
    });

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
