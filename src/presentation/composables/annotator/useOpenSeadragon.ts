import { ref, onMounted, onUnmounted, shallowRef, watch } from 'vue';
import { useAnnotationStore } from '@/stores/annotation';
import { useAnnotationTypeStore } from '@/stores/annotation_type';
import { useWorkspaceStore } from '@/stores/workspace';
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
  const onEditLabelsClick = ref<(() => void) | null>(null);

  function startDrawing() {
    const workspace = useWorkspaceStore().currentWorkspace;
    const allTypes = useAnnotationTypeStore().annotationTypes;

    if (!workspace || !workspace.annotationTypeIds) {
      console.warn('Workspace not loaded or no types defined');
      return;
    }

    const localTypes = workspace.annotationTypeIds
      .map((id) => allTypes.find((t) => t.id === id))
      .filter((t) => t && !t.global);

    if (localTypes.length === 0) {
      window.dispatchEvent(
        new CustomEvent('toast-error', {
          detail: 'Bu çalışma alanı için çizim etiketi (lokal) tanımlanmamış.',
        })
      );
      return;
    }

    if (anno.value) {
      anno.value.setDrawingTool('polygon');
      anno.value.setDrawingEnabled(true);
    }
  }

  function stopDrawing() {
    if (anno.value) {
      anno.value.setDrawingEnabled(false);
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

    // Custom Annotorious widget: "Edit Labels" button
    const editLabelsWidget = function (_args: any) {
      const container = document.createElement('div');
      container.className = 'a9s-edit-labels-widget';
      const button = document.createElement('button');
      button.className = 'a9s-edit-labels-btn';
      button.textContent = 'Etiketleri Düzenle';
      button.style.cssText =
        'background: #6366f1; color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; margin: 4px;';
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        onEditLabelsClick.value?.();
      });
      container.appendChild(button);
      return container;
    };

    anno.value = new Annotorious(viewer.value, {
      widgets: [editLabelsWidget],
      disableEditor: false,
      readOnly: false,
      formatter: (annotation: any) => {
        const colorBody = annotation.body?.find(
          (b: any) => b.purpose === 'highlighting' && b.value
        );
        if (colorBody) {
          const color = colorBody.value;
          return {
            style: `stroke: ${color}; stroke-width: 2; fill: ${color}; fill-opacity: 0.25;`,
          };
        }
        return {};
      },
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

    anno.value.on('updateAnnotation', (annotation: any, previous: any) => {
      const newPoints = parsePolygonPoints(annotation.target.selector.value);

      if (newPoints.length < 3) {
        console.warn('[updateAnnotation] too few points, ignoring');
        return;
      }

      const rawId = String(annotation.id);
      const targetId = rawId.startsWith('#') ? rawId.slice(1) : rawId;

      // Check if it's a saved annotation
      const existing = annotationStore.annotations.find((a: any) => String(a.id) === targetId);

      if (existing) {
        // Queue the change — will be persisted when user clicks "Kaydet"
        annotationStore.addDirtyAnnotation(
          targetId,
          newPoints.map((p) => ({ x: p.x, y: p.y }))
        );
        return;
      }

      // Check if it's a pending annotation
      const pendingIdx = annotationStore.pendingAnnotations.findIndex(
        (p) => String(p.tempId) === targetId
      );

      if (pendingIdx >= 0 && annotationStore.pendingAnnotations[pendingIdx]) {
        annotationStore.pendingAnnotations[pendingIdx].polygon = newPoints.map((p) => ({
          x: p.x,
          y: p.y,
        })) as any;
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
      await annotationStore.fetchAnnotationsByImage(imageId, { limit: 100 }, { showToast: false });

      const annotations = annotationStore.annotations;
      const w3cAnnotations = annotations
        .map((ann) => {
          if (!ann.polygon || ann.polygon.length === 0) return null;

          const polygonStr = ann.polygon.map((p) => `${p.x},${p.y}`).join(' ');
          const annType = annotationTypeStore.annotationTypes.find(
            (t) => t.id === ann.annotationTypeId
          );
          const tagName = annType ? annType.name : 'Unknown';
          const color = annType?.color || ann.color || '#ec4899';

          const body: any[] = [
            {
              type: 'TextualBody',
              value: (ann as any).tag
                ? `${(ann as any).tag.tag_name}: ${(ann as any).tag.value}`
                : `${tagName}: ${ann.value}`,
              purpose: 'tagging',
            },
            {
              type: 'TextualBody',
              value: color,
              purpose: 'highlighting',
            },
          ];

          return {
            '@context': 'http://www.w3.org/ns/anno.jsonld',
            type: 'Annotation',
            id: String(ann.id),
            body,
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
          {
            type: 'TextualBody',
            value: pending.color || '#ec4899',
            purpose: 'highlighting',
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

    // Clear previous annotations immediately to avoid ghosting
    if (anno.value) {
      anno.value.clearAnnotations();
      annotationStore.clearAnnotations();
    }

    loading.value = true;
    currentImageId.value = image.id;

    // Use addOnceHandler to avoid stacking listeners
    viewer.value.addOnceHandler('open', async () => {
      if (currentImageId.value !== image.id) return;
      await loadAnnotations(image.id);
      loading.value = false;
    });

    try {
      const tileSourceUrl = `${API_BASE_URL}/api/v1/proxy/${image.id}/image.dzi`;
      viewer.value.open(tileSourceUrl);
    } catch (err) {
      console.error('OSD open error:', err);
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
    viewer,
    onEditLabelsClick,
  };
}
