import { ref, onMounted, onUnmounted, shallowRef } from 'vue';
import OpenSeadragon from 'openseadragon';
import Annotorious from '@recogito/annotorious-openseadragon';
import '@recogito/annotorious-openseadragon/dist/annotorious.min.css';

import { Point } from '@/core/value-objects/Point';
import type { Image } from '@/core/entities/Image';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export function useOpenSeadragon(
  viewerId: string,
  emit: (event: 'polygon-complete', payload: { annotation: any; points: Point[] }) => void
) {
  // ===========================
  // State
  // ===========================
  const viewer = shallowRef<OpenSeadragon.Viewer | null>(null);
  const anno = shallowRef<any>(null); // Annotorious instance
  const currentImageId = ref<string | null>(null);
  const loading = ref(false);

  // ===========================
  // Helpers
  // ===========================

  /**
   * Annotorious SVG formatından (Selector) koordinatları ayıklar.
   * Gelen değer örnekleri:
   * 1. "<svg><polygon points='100,100 200,200 150,300'></polygon></svg>"
   * 2. "xywh=polygon:100,100,200,200,150,300"
   */
  function parsePolygonPoints(selectorValue: string): Point[] {
    let pointsStr = '';

    if (selectorValue.includes('points=')) {
      // SVG tag formatı
      const match = selectorValue.match(/points=["'](.*?)["']/);
      if (match && match[1]) {
        pointsStr = match[1];
      }
    } else if (selectorValue.includes('polygon:')) {
      // Media fragment formatı
      pointsStr = selectorValue.split('polygon:')[1] || '';
    } else {
      // Fallback: Sadece virgül/boşlukla ayrılmış sayılar varsa
      pointsStr = selectorValue;
    }

    if (!pointsStr) return [];

    // Virgül veya boşluğa göre ayır ve sayıya çevir
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
            x: x,
            y: y,
          })
        );
      }
    }
    return points;
  }

  // ===========================
  // Drawing Actions
  // ===========================

  function startDrawing() {
    if (anno.value) {
      console.log('✏️ [useOpenSeadragon] Çizim modu başlatıldı.');
      anno.value.setDrawingTool('polygon');
      anno.value.setDrawingEnabled(true);
    }
  }

  function stopDrawing() {
    if (anno.value) {
      console.log('🛑 [useOpenSeadragon] Çizim modu durduruldu.');
      anno.value.setDrawingEnabled(false);
      anno.value.setDrawingTool(null);
    }
  }

  /**
   * Oluşturulan (ancak henüz veritabanına kaydedilmeyen) geçici annotasyonu siler.
   * Genellikle modalda "İptal" dendiğinde çağrılır.
   */
  function removeAnnotation(annotation: any) {
    if (anno.value && annotation) {
      anno.value.removeAnnotation(annotation);
    }
  }

  function clearAnnotations() {
    if (anno.value) {
      anno.value.clearAnnotations();
    }
  }

  // ===========================
  // Initialization
  // ===========================

  function initViewer() {
    console.log('🚀 [useOpenSeadragon] Viewer başlatılıyor...', viewerId);

    try {
      viewer.value = OpenSeadragon({
        id: viewerId,
        prefixUrl: 'https://cdn.jsdelivr.net/npm/openseadragon@4.1/build/openseadragon/images/',
        tileSources: [], // Başlangıçta boş
        showNavigationControl: true,
        gestureSettingsMouse: {
          clickToZoom: false, // Çizim sırasında yanlışlıkla zoom yapmayı engeller
          dblClickToZoom: false, // Annotorious çift tıklama ile çizimi bitirdiği için
        },
        zoomPerScroll: 1.2,
        animationTime: 0.5,
        blendTime: 0.1,
        ajaxWithCredentials: true, // Auth cookie'leri için
      });

      // Annotorious Plugin Başlatma
      anno.value = new Annotorious(viewer.value, {
        widgets: [], // Varsayılan popup/editör widget'larını kapatıyoruz
        disableEditor: true, // Kendi modalımızı kullanacağız
        drawOnSingleClick: true, // Tek tıklama ile nokta koyma (bazı sürümlerde gerekir)
      });

      // --- Event Listeners ---

      // 1. Çizim tamamlandığında (Çift tıklama ile biter)
      anno.value.on('createAnnotation', (annotation: any) => {
        console.log('✅ [useOpenSeadragon] Annotorious createAnnotation tetiklendi:', annotation);

        const selectorValue = annotation.target?.selector?.value;
        if (!selectorValue) {
          console.warn('⚠️ [useOpenSeadragon] Selector değeri bulunamadı.');
          return;
        }

        const points = parsePolygonPoints(selectorValue);

        if (points.length < 3) {
          console.warn('⚠️ [useOpenSeadragon] Yetersiz nokta sayısı:', points.length);
          anno.value.removeAnnotation(annotation);
          return;
        }

        // Parent bileşene (AnnotatorView) bildir
        emit('polygon-complete', { annotation, points });
      });

      // 2. Seçim yapıldığında (Mevcut çizimlere tıklandığında)
      anno.value.on('selectAnnotation', (annotation: any) => {
        console.log('👆 [useOpenSeadragon] Annotasyon seçildi:', annotation);
        // Burada gerekirse "cancelSelection" yapılabilir, çizim modundaysak
        // anno.value.cancelSelection();
      });
    } catch (err) {
      console.error('❌ [useOpenSeadragon] Init Error:', err);
    }
  }

  // ===========================
  // Load Image
  // ===========================

  async function loadImage(image: Image) {
    if (!viewer.value || !image.processedpath) {
      console.error('❌ [useOpenSeadragon] Viewer veya resim yolu eksik.');
      return;
    }

    loading.value = true;
    currentImageId.value = image.id;

    // Önceki annotasyonları temizle
    if (anno.value) {
      anno.value.clearAnnotations();
    }

    // OSD 'open' eventi sadece görsel yüklendiğinde tetiklenir
    // Ancak bazen cache'den geldiğinde tetiklenmeyebilir, bu yüzden handler'ı önce ekliyoruz.
    const openHandler = () => {
      console.log('🖼️ [useOpenSeadragon] Görsel yüklendi.');
      loading.value = false;
      viewer.value?.removeHandler('open', openHandler); // Handler'ı temizle
    };

    viewer.value.addHandler('open', openHandler);
    viewer.value.addHandler('open-failed', () => {
      console.error('❌ [useOpenSeadragon] Görsel yüklenemedi.');
      loading.value = false;
    });

    try {
      const tileSourceUrl = `${API_BASE_URL}/api/v1/proxy/${image.processedpath}/image.dzi`;
      console.log('🔄 [useOpenSeadragon] Görsel açılıyor:', tileSourceUrl);
      viewer.value.open(tileSourceUrl);
    } catch (err) {
      console.error('❌ [useOpenSeadragon] loadImage Exception:', err);
      loading.value = false;
    }
  }

  // ===========================
  // Lifecycle
  // ===========================

  onMounted(() => {
    // DOM elemanının oluştuğundan emin olmak için nextTick kullanılabilir
    // ama onMounted genelde yeterlidir.
    initViewer();
  });

  onUnmounted(() => {
    console.log('♻️ [useOpenSeadragon] Kaynaklar temizleniyor...');
    if (anno.value) {
      anno.value.destroy();
      anno.value = null;
    }
    if (viewer.value) {
      viewer.value.destroy();
      viewer.value = null;
    }
  });

  return {
    loading,
    loadImage,
    startDrawing,
    stopDrawing,
    removeAnnotation,
    clearAnnotations,
    anno, // Gerekirse dışarıdan erişim için
  };
}
