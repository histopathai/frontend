import { ref, computed, onUnmounted, watch } from 'vue';
import OpenSeadragon from 'openseadragon';
import 'openseadragon-annotations'; // OSD Annotations eklentisini import et
import { useAnnotationStore } from '@/stores/annotation';
import { useToast } from 'vue-toastification';
import type { Image } from '@/core/entities/Image';
import type { AnnotationType } from '@/core/entities/AnnotationType';
import type { ToolName } from '@/presentation/components/viewer/ViewerToolbar.vue';
import type { NotificationStatus } from '@/presentation/components/viewer/ViewerNotification.vue';

// OpenSeadragon Annotations eklentisi için tipleri genişlet
declare module 'openseadragon' {
  interface Viewer {
    annotations: any; // Gerçekte 'Annotations' tipindedir, şimdilik any
  }
}

export function useAnnotationViewer(image: Image | null) {
  const store = useAnnotationStore();
  const toast = useToast();

  // OSD Referansları
  const viewer = ref<OpenSeadragon.Viewer | null>(null);
  const viewerDivId = 'osd-viewer';

  // State
  const activeTool = ref<ToolName>('PAN');
  const selectedType = ref<AnnotationType | null>(null);
  const notification = ref<{ message: string; status: NotificationStatus } | null>(null);

  // Store'dan gelen veriler
  const annotationTypes = computed(() => store.getAnnotationTypes);
  const annotations = computed(() => store.getAnnotations);
  const loading = computed(() => store.isLoading);

  // === NOTIFICATION (Bildirim) ===
  const showNotification = (
    message: string,
    status: NotificationStatus,
    duration: number = 3000
  ) => {
    notification.value = { message, status };
    if (duration > 0) {
      setTimeout(() => (notification.value = null), duration);
    }
  };

  watch(loading, (isLoading) => {
    if (isLoading) {
      showNotification('Veri işleniyor...', 'loading', 0);
    } else if (notification.value?.status === 'loading') {
      showNotification('İşlem tamamlandı', 'success', 2000);
    }
  });

  // === OSD ve ANNOTASYON BAŞLATMA ===
  const initViewer = () => {
    if (!image || !image.processedpath) {
      toast.error('Görüntü yolu bulunamadı.');
      return;
    }

    // Öncekini (varsa) yok et
    if (viewer.value) {
      viewer.value.destroy();
    }

    const dziUrl = `/api/v1/proxy/${image.processedpath}/image.dzi`;

    viewer.value = OpenSeadragon({
      id: viewerDivId,
      prefixUrl: 'https://openseadragon.github.io/openseadragon/images/',
      tileSources: [dziUrl],
      sequenceMode: false,
      showNavigator: true,
      navigatorPosition: 'BOTTOM_RIGHT',
      // Annotasyon eklentisini başlat
      annotations: {
        // Çizim olayları buraya bağlanacak
        onAnnotationCreated: handleAnnotationCreated,
      },
    });

    // Başlangıçta gezinme (Pan) modunu ayarla
    viewer.value.annotations.setHandler(false);
  };

  /**
   * Store'dan verileri yükler ve OSD üzerine çizer
   */
  const loadData = async () => {
    if (!image) return;
    try {
      showNotification('Annotasyonlar yükleniyor...', 'loading', 0);
      await store.loadDataForImage(image.id);

      // Veritabanından gelen annotasyonları OSD'ye ekle
      annotations.value.forEach((ann) => {
        const annType = annotationTypes.value.find((t) => t.id === ann.annotationTypeId);
        if (ann.geoJson) {
          // geoJson verisi olduğunu varsayıyoruz
          viewer.value?.annotations.addAnnotation(ann.geoJson, {
            ...ann, // ID'yi ve diğer metadatayı sakla
            color: annType?.color || '#FF0000',
          });
        }
      });
      showNotification('Yükleme tamamlandı', 'success');
    } catch (err) {
      toast.error(store.error);
      showNotification(store.error || 'Yükleme hatası', 'error');
    }
  };

  // === ARAÇ YÖNETİMİ (Tool Management) ===

  const setActiveTool = (tool: ToolName) => {
    if (!viewer.value) return;
    activeTool.value = tool;

    // Önce tüm modları kapat
    viewer.value.annotations.setHandler(false); // Çizim modunu kapat
    viewer.value.setMouseNavEnabled(false); // Pan modunu kapat

    switch (tool) {
      case 'PAN':
        viewer.value.setMouseNavEnabled(true);
        break;
      case 'BRUSH':
        if (!selectedType.value) {
          toast.info('Lütfen önce bir sınıf (örn: Tümör) seçin.');
          setActiveTool('PAN'); // Pan'a geri dön
          return;
        }
        viewer.value.annotations.setHandler(true, {
          mode: 'BRUSH',
          color: selectedType.value.color,
        });
        break;
      case 'ERASER':
        viewer.value.annotations.setHandler(true, {
          mode: 'ERASER',
        });
        break;
      case 'BBOX':
        if (!selectedType.value) {
          toast.info('Lütfen önce bir sınıf (örn: Tümör) seçin.');
          setActiveTool('PAN'); // Pan'a geri dön
          return;
        }
        viewer.value.annotations.setHandler(true, {
          mode: 'RECTANGLE',
          color: selectedType.value.color,
        });
        break;
    }
  };

  const setSelectedType = (type: AnnotationType) => {
    selectedType.value = type;
    if (activeTool.value === 'BRUSH' || activeTool.value === 'BBOX') {
      setActiveTool(activeTool.value); // Aracı yeniden etkinleştir
    }
  };

  // === OLAY YÖNETİCİLERİ (Event Handlers) ===

  /**
   * OSD Annotations kütüphanesi bir çizimi bitirdiğinde tetiklenir.
   */
  const handleAnnotationCreated = async (annotation: any, source: any) => {
    if (!selectedType.value || !image) {
      toast.error('Sınıf seçilmediği için annotasyon kaydedilemedi.');
      return;
    }

    try {
      // 1. Veritabanına kaydetmek için request objesi oluştur
      const request: CreateAnnotationRequest = {
        annotationTypeId: selectedType.value.id,
        geoJson: source, // 'source' genellikle GeoJSON verisini içerir
        metadata: {},
      };

      // 2. Store aracılığıyla API'ye gönder
      const newAnnotation = await store.createAnnotation(request);

      // 3. OSD'deki geçici çizime, veritabanından dönen ID'yi ekle
      // Bu, 'Silgi' aracının onu tanımasını sağlar.
      source.id = newAnnotation.id; // VEYA annotation.id = newAnnotation.id (kütüphaneye bağlı)

      toast.success('Annotasyon kaydedildi.');
    } catch (err) {
      toast.error(store.error || 'Annotasyon kaydedilemedi.');
      // OSD üzerinden bu başarısız olan çizimi kaldır
      viewer.value?.annotations.removeAnnotation(annotation);
    }
  };

  /**
   * Yan menüden "Sil" butonuna basıldığında tetiklenir.
   */
  const handleAnnotationDeleted = async (id: string) => {
    try {
      await store.deleteAnnotation(id);

      // OSD üzerinden de sil
      const osdAnnotation = viewer.value?.annotations
        .getAnnotations()
        .find((a: any) => a.id === id);
      if (osdAnnotation) {
        viewer.value?.annotations.removeAnnotation(osdAnnotation);
      }

      toast.success('Annotasyon silindi.');
    } catch (err) {
      toast.error(store.error || 'Annotasyon silinemedi.');
    }
  };

  /**
   * Yan menüden bir annotasyona tıklandığında OSD'de ona odaklanır.
   */
  const handleAnnotationSelected = (id: string) => {
    const osdAnnotation = viewer.value?.annotations.getAnnotations().find((a: any) => a.id === id);
    if (osdAnnotation) {
      toast.info('Seçili annotasyona odaklanılıyor...');
    }
  };

  // === YAŞAM DÖNGÜSÜ (Lifecycle) ===

  const cleanup = () => {
    if (viewer.value) {
      viewer.value.destroy();
      viewer.value = null;
    }
    store.clearStore(); // Pinia store'u temizle
  };

  onUnmounted(() => {
    cleanup();
  });

  return {
    // State
    viewerDivId,
    activeTool,
    selectedType,
    notification,
    // Store Getters
    annotationTypes,
    annotations,
    loading,
    // Olay Yöneticileri
    initViewer,
    loadData,
    setActiveTool,
    setSelectedType,
    handleAnnotationDeleted,
    handleAnnotationSelected,
    cleanup,
  };
}
