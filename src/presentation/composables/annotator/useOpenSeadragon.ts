import { ref, onMounted, onUnmounted, shallowRef, watch, nextTick } from 'vue';
import { useAnnotationStore } from '@/stores/annotation';
import { useAnnotationTypeStore } from '@/stores/annotation_type';
import { useWorkspaceStore } from '@/stores/workspace';
import type { Image } from '@/core/entities/Image';
import OpenSeadragon from 'openseadragon';
import Annotorious from '@recogito/annotorious-openseadragon';
import '@recogito/annotorious-openseadragon/dist/annotorious.min.css';
import { Point } from '@/core/value-objects/Point';
import { useAuthStore } from '@/stores/auth';
import { useToast } from 'vue-toastification';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export function useOpenSeadragon(viewerId: string) {
  const annotationStore = useAnnotationStore();
  const annotationTypeStore = useAnnotationTypeStore();
  const authStore = useAuthStore();
  const toast = useToast();

  const viewer = shallowRef<OpenSeadragon.Viewer | null>(null);
  const anno = shallowRef<any>(null);
  const currentImageId = ref<string | null>(null);
  const loading = ref(false);

  // Events
  const onSelectionCreated = ref<((selection: any) => void) | null>(null);
  const onAnnotationSelected = ref<((annotation: any) => void) | null>(null);
  const onAnnotationCreated = ref<((annotation: any) => void) | null>(null);
  const onAnnotationDeselected = ref<(() => void) | null>(null);
  const onDeleteAnnotationRequest = ref<((annotationId: string) => void) | null>(null);

  const labelOverlays = ref<Map<string, HTMLElement>>(new Map());

  function clearLabelOverlays() {
    if (!viewer.value) return;
    labelOverlays.value.forEach((el) => {
      try { viewer.value?.removeOverlay(el); } catch (e) {}
    });
    labelOverlays.value.clear();
  }

  function updateLabelOverlays() {
    if (!viewer.value || !currentImageId.value) return;
    clearLabelOverlays();

    const processed = new Set<string>();

    const drawLabel = (id: string, text: string, color: string, polygon: any[], creatorId: string, resource: string) => {
      if (!polygon || polygon.length === 0) return;
      const polyKey = polygon.map(p => `${Math.round(p.x)},${Math.round(p.y)}`).join('|');
      if (processed.has(polyKey)) return;
      processed.add(polyKey);

      const minX = Math.min(...polygon.map(p => p.x));
      const maxX = Math.max(...polygon.map(p => p.x));
      const minY = Math.min(...polygon.map(p => p.y));
      const centerX = (minX + maxX) / 2;

      const labelDiv = document.createElement('div');
      labelDiv.className = 'a9s-label-overlay';
      labelDiv.style.pointerEvents = 'none';
      labelDiv.style.zIndex = '9999';
      
      const isManual = resource === 'manual';
      const isReviewMode = (resource === 'model' || resource === 'imported') || (isManual && creatorId && authStore.user?.userId && String(creatorId) !== String(authStore.user?.userId));

      labelDiv.innerHTML = `
        <div class="a9s-label-bubble" style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 20px; background: #0f172a; color: white; font-size: 10px; font-weight: bold; border: 1px solid rgba(255,255,255,0.2); white-space: nowrap; transform: translateY(-50%); pointer-events: auto;">
          <span style="width: 6px; height: 6px; border-radius: 50%; background: ${color};"></span>
          <span>${isReviewMode ? `<span style="color: #818cf8; font-weight: 900; margin-right: 4px;">[REVIEW]</span>` : ''}${text}</span>
          
          ${isReviewMode ? `
          <!-- Review Mode Buttons -->
          <button id="edit-pts-${id}" title="Düzenle" style="margin-left: 6px; background: none; border: none; color: #94a3b8; cursor: pointer; padding: 2px; display: flex; align-items: center; justify-content: center; transition: color 0.2s;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          
          <button id="approve-${id}" title="Onayla" style="margin-left: 4px; background: none; border: none; color: #10b981; cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center; transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); transform: scale(1); border-radius: 6px;" onmouseover="this.style.background='rgba(16, 185, 129, 0.1)'" onmouseout="this.style.background='none'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4"><polyline points="20 6 9 17 4 12"/></svg>
          </button>

          <button id="reject-${id}" title="Reddet" style="margin-left: 4px; background: none; border: none; color: #f43f5e; cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center; transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); transform: scale(1); border-radius: 6px;" onmouseover="this.style.background='rgba(244, 63, 94, 0.1)'" onmouseout="this.style.background='none'">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
          ` : `
          <!-- Normal Mode Buttons -->
          <button id="edit-pts-${id}" title="Noktaları Düzenle" style="margin-left: 6px; background: none; border: none; color: #94a3b8; cursor: pointer; padding: 2px; display: flex; align-items: center; justify-content: center; transition: color 0.2s;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>

          <button id="del-${id}" title="Sil" style="margin-left: 4px; background: none; border: none; color: #94a3b8; cursor: pointer; padding: 2px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; transform: scale(1);" onmousedown="this.style.transform='scale(0.85)'" onmouseup="this.style.transform='scale(1)'" onmouseleave="this.style.transform='scale(1)'">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
          `}
        </div>
      `;

      const bubble = labelDiv.querySelector('.a9s-label-bubble') as HTMLElement;
      if (bubble) {
        // Stop propagation to prevent OSD zoom and pan
        const stop = (e: Event) => {
          e.stopPropagation();
          e.stopImmediatePropagation();
        };
        bubble.addEventListener('mousedown', stop);
        bubble.addEventListener('pointerdown', stop);
        bubble.addEventListener('click', stop);
        bubble.addEventListener('dblclick', stop);
        
        // SURGICAL FIX: Disable OSD navigation while mouse is over the bubble
        // This is the most reliable way to prevent image movement during button clicks.
        bubble.addEventListener('mouseenter', () => {
          if (viewer.value) {
            viewer.value.setMouseNavEnabled(false);
          }
        });
        bubble.addEventListener('mouseleave', () => {
          if (viewer.value) {
            viewer.value.setMouseNavEnabled(true);
          }
        });
      }

      const editPtsBtn = labelDiv.querySelector(`#edit-pts-${id}`) as HTMLElement;
      if (editPtsBtn) {
        new OpenSeadragon.MouseTracker({
          element: editPtsBtn,
          pressHandler: (e: any) => {
            if (e.originalEvent) { 
              e.originalEvent.stopPropagation(); 
              e.originalEvent.stopImmediatePropagation();
            }
          },
          clickHandler: (e: any) => {
            if (e.originalEvent) { e.originalEvent.stopPropagation(); }
            
            if (anno.value && viewer.value) {
              const current = anno.value.getSelected();
              const isAlreadySelected = current && (String(current.id) === String(id) || String(current.id) === `#${id}`);

              if (isAlreadySelected) {
                // Toggle OFF: Deselect and re-enable navigation
                console.log('✏️ Toggle OFF: Deselecting annotation');
                anno.value.cancelSelected();
              } else {
                // Toggle ON: Select and disable navigation surgically
                console.log('✏️ Toggle ON: Selecting for edit');
                (window as any)._skipAnnotationModal = true;
                
                // Disable panning and zooming surgically so click-away still works
                if (viewer.value) {
                  viewer.value.panHorizontal = false;
                  viewer.value.panVertical = false;
                  viewer.value.gestureSettingsMouse.clickToZoom = false;
                  viewer.value.gestureSettingsMouse.dblClickToZoom = false;
                }
                
                anno.value.selectAnnotation(id);
              }
            }
            return false;
          }
        });
      }

      const approveBtn = labelDiv.querySelector(`#approve-${id}`) as HTMLElement;
      if (approveBtn) {
        new OpenSeadragon.MouseTracker({
          element: approveBtn,
          pressHandler: (e: any) => {
            if (e.originalEvent) { 
              e.originalEvent.stopPropagation(); 
              e.originalEvent.stopImmediatePropagation();
            }
            approveBtn.style.transform = 'scale(0.85)';
          },
          clickHandler: async (e: any) => {
            if (e.originalEvent) { 
              e.originalEvent.stopPropagation(); 
              e.originalEvent.stopImmediatePropagation();
              e.originalEvent.preventDefault();
            }
            
            // Visual feedback: Change color to green and scale up slightly
            approveBtn.style.color = '#ffffff';
            approveBtn.style.background = '#10b981';
            approveBtn.style.borderRadius = '4px';
            approveBtn.style.transform = 'scale(1.3)';
            approveBtn.style.pointerEvents = 'none';

            try {
              const dirty = annotationStore.dirtyAnnotations.get(id);
              if (dirty && dirty.polygon) {
                if (confirm('Değişiklikleri kaydedip onaylamak istediğinize emin misiniz?')) {
                  const success = await annotationStore.editAndApproveAnnotation(id, dirty.polygon);
                  if (success) {
                    toast.success('Düzenlendi ve Onaylandı.');
                    if (anno.value) anno.value.cancelSelected();
                    setTimeout(() => window.location.reload(), 500);
                  }
                }
              } else {
                const success = await annotationStore.approveAnnotation(id);
                if (success) {
                  toast.success('Onaylandı.');
                  if (anno.value) anno.value.cancelSelected();
                  setTimeout(() => window.location.reload(), 500);
                }
              }
            } finally {
              // Give user a moment to see the 'success' state before redrawing
              setTimeout(() => {
                updateLabelOverlays();
              }, 300);
            }
            return false;
          }
        });
      }

      const rejectBtn = labelDiv.querySelector(`#reject-${id}`) as HTMLElement;
      if (rejectBtn) {
        new OpenSeadragon.MouseTracker({
          element: rejectBtn,
          pressHandler: (e: any) => {
            if (e.originalEvent) { 
              e.originalEvent.stopPropagation(); 
              e.originalEvent.stopImmediatePropagation();
            }
            rejectBtn.style.transform = 'scale(0.85)';
            return false;
          },
          clickHandler: async (e: any) => {
            if (e.originalEvent) { 
              e.originalEvent.stopPropagation(); 
              e.originalEvent.stopImmediatePropagation();
              e.originalEvent.preventDefault();
            }
            
            if (window.confirm('Bu poligonun yanlış olduğunu işaretleyip reddetmek istediğinize emin misiniz?')) {
              // Visual feedback: Change color to red and scale up
              rejectBtn.style.color = '#ffffff';
              rejectBtn.style.background = '#f43f5e';
              rejectBtn.style.borderRadius = '4px';
              rejectBtn.style.transform = 'scale(1.3)';
              rejectBtn.style.pointerEvents = 'none';
              
              try {
                const success = await annotationStore.rejectAnnotation(id, currentImageId.value!);
                if (success) {
                  toast.error('Reddedildi ve gizlendi.');
                  if (anno.value) {
                    anno.value.removeAnnotation(id);
                    anno.value.cancelSelected();
                  }
                  setTimeout(() => window.location.reload(), 500);
                }
              } finally {
                setTimeout(() => {
                  updateLabelOverlays();
                }, 300);
              }
            }
            return false;
          }
        });
      }

      const delBtn = labelDiv.querySelector(`#del-${id}`) as HTMLElement;
      if (delBtn) {
        new OpenSeadragon.MouseTracker({
          element: delBtn,
          pressHandler: (e: any) => {
            if (e.originalEvent) { 
              e.originalEvent.stopPropagation(); 
              e.originalEvent.stopImmediatePropagation();
            }
            return false;
          },
          clickHandler: (e: any) => {
            if (e.originalEvent) {
              e.originalEvent.stopPropagation();
              e.originalEvent.stopImmediatePropagation();
              e.originalEvent.preventDefault();
            }
            // Prevent the custom modal from opening
            (window as any)._skipAnnotationModal = true;
            
            // Native confirm yerine yeni yazdığımız Vue modalı triggerlanıyor
            onDeleteAnnotationRequest.value?.(id);
            
            return false;
          },
          pressHandler: (e: any) => {
            if (e.originalEvent) {
              e.originalEvent.stopPropagation();
              e.originalEvent.stopImmediatePropagation();
            }
            return false;
          },
          dragHandler: () => false,
          scrollHandler: () => false,
          dblClickHandler: (e: any) => {
            if (e.originalEvent) {
              e.originalEvent.stopPropagation();
              e.originalEvent.stopImmediatePropagation();
            }
            return false;
          }
        });
      }

      const viewportPoint = viewer.value!.viewport.imageToViewportCoordinates(new OpenSeadragon.Point(centerX, minY - 10));
      viewer.value!.addOverlay({ element: labelDiv, location: viewportPoint, placement: OpenSeadragon.Placement.TOP });
      labelOverlays.value.set(id, labelDiv);
    };

    // Current & Dirty
    annotationStore.annotations.forEach(ann => {
      const dirty = annotationStore.dirtyAnnotations.get(String(ann.id));
      const type = annotationTypeStore.annotationTypes.find(t => t.id === ann.annotationTypeId);
      
      // Determine text with robust fallback
      let text = '';
      if (dirty) {
        const value = dirty.value !== undefined ? dirty.value : ann.value;
        text = String(value);
      } else {
        text = (ann as any).tag 
          ? String((ann as any).tag.value) 
          : String(ann.value);
      }

      const color = dirty?.color || ann.color || type?.color || '#ec4899';
      const isReview = (ann as any).isReview || false;
      drawLabel(String(ann.id), text, color, dirty?.polygon || ann.polygon, ann.creatorId, ann.resource);
    });

    // Pending
    annotationStore.pendingAnnotations.filter(p => p.imageId === currentImageId.value).forEach(p => {
      drawLabel(p.tempId, String(p.value), p.color || '#ec4899', p.polygon || [], authStore.user?.userId || '', 'manual');
    });
  }

  function startDrawing() {
    if (anno.value && viewer.value) {
      viewer.value.setMouseNavEnabled(false);
      viewer.value.gestureSettingsMouse.clickToZoom = false;
      viewer.value.gestureSettingsMouse.dblClickToZoom = false;
      anno.value.setDrawingTool('polygon');
      anno.value.setDrawingEnabled(true);
    }
  }

  function stopDrawing() {
    if (anno.value && viewer.value) {
      viewer.value.setMouseNavEnabled(true);
      viewer.value.gestureSettingsMouse.clickToZoom = true;
      viewer.value.gestureSettingsMouse.dblClickToZoom = true;
      anno.value.setDrawingEnabled(false);
      anno.value.setDrawingTool(null);
    }
  }

  function initViewer() {
    if (viewer.value) viewer.value.destroy();
    
    const container = document.getElementById(viewerId);
    if (!container) {
      console.warn(`⚠️ Viewer container #${viewerId} bulunamadı, bekleniyor...`);
      return;
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

    const annotoriousInstance = new (Annotorious as any)(viewer.value, { 
      locale: 'auto', allowEmpty: true, disableEditor: true,
      formatter: (annotation: any) => {
        const colorBody = annotation.body?.find((b: any) => b.purpose === 'highlighting' && b.value);
        if (colorBody) return { style: `stroke: ${colorBody.value}; stroke-width: 2.5; fill: ${colorBody.value}; fill-opacity: 0.25;` };
        return {};
      },
    });

    anno.value = annotoriousInstance;

    anno.value.on('createSelection', (selection: any) => { onSelectionCreated.value?.(selection); });
    anno.value.on('selectAnnotation', (annotation: any) => { onAnnotationSelected.value?.(annotation); });
    anno.value.on('cancelSelected', () => { onAnnotationDeselected.value?.(); });

    function parsePolygonPoints(svgValue: string): Array<{ x: number; y: number }> {
      const pointsMatch = svgValue.match(/points=["']([^"']+)["']/);
      if (!pointsMatch) return [];
      return pointsMatch[1].split(/[\s,]+/).reduce((acc: any[], val, i, arr) => {
        if (i % 2 === 0) acc.push({ x: parseFloat(val), y: parseFloat(arr[i + 1]) });
        return acc;
      }, []);
    }

    const handleUpdate = (annotation: any) => {
      // Robust ID detection: check event object first, then current selection
      const rawId = annotation.id || (anno.value?.getSelected()?.id);
      if (!rawId) {
        console.warn('⚠️ No ID found for changing annotation');
        return;
      }

      console.log('🔄 Annotation change detected:', rawId);
      const selector = annotation.target?.selector?.value || annotation.selector?.value || (anno.value?.getSelected()?.target?.selector?.value);
      if (!selector) return;
      
      const newPoints = parsePolygonPoints(selector);
      if (newPoints.length < 3) return;
      
      const targetId = String(rawId).startsWith('#') ? String(rawId).slice(1) : String(rawId);
      const polygonData = newPoints.map((p) => ({ x: p.x, y: p.y }));

      // 1. Check if it is a persisted annotation
      const existing = annotationStore.annotations.find((a: any) => String(a.id) === targetId);
      if (existing) {
        annotationStore.addDirtyAnnotation(targetId, { polygon: polygonData });
      } else {
        // 2. Check if it is a pending annotation
        const pending = annotationStore.pendingAnnotations.find(p => String(p.tempId) === targetId);
        if (pending) {
          annotationStore.updatePendingAnnotation(targetId, { polygon: polygonData });
        }
      }
      
      setTimeout(updateLabelOverlays, 50);
    };

    anno.value.on('updateAnnotation', handleUpdate);
    anno.value.on('changeSelectionTarget', handleUpdate);

    anno.value.on('createAnnotation', (annotation: any) => { 
      onAnnotationCreated.value?.(annotation); 
      setTimeout(updateLabelOverlays, 50); 
    });
    anno.value.on('deleteAnnotation', (annotation: any) => { 
      if (currentImageId.value) annotationStore.deleteAnnotation(annotation.id, currentImageId.value); 
      setTimeout(updateLabelOverlays, 50);
    });
  }

  async function loadAnnotations(imageId: string, skipFetch: boolean = false) {
    if (!anno.value) return;
    anno.value.clearAnnotations();
    try {
      if (!skipFetch) {
        await annotationStore.fetchAnnotationsByImage(imageId, { limit: 100 }, { showToast: false });
      }
      const w3cAnnotations = annotationStore.annotations.map((ann) => {
        if (!ann.polygon || ann.polygon.length === 0) return null;
        const polygonStr = ann.polygon.map((p) => `${p.x},${p.y}`).join(' ');
        const annType = annotationTypeStore.annotationTypes.find((t) => t.id === ann.annotationTypeId);
        const color = ann.color || annType?.color || '#ec4899';
        return {
          '@context': 'http://www.w3.org/ns/anno.jsonld',
          type: 'Annotation', id: String(ann.id),
          body: [
            { type: 'TextualBody', value: (ann as any).tag ? `${(ann as any).tag.tag_name}: ${(ann as any).tag.value}` : `${annType?.name || 'Tag'}: ${ann.value}`, purpose: 'tagging' },
            { type: 'TextualBody', value: color, purpose: 'highlighting' },
          ],
          target: { selector: { type: 'SvgSelector', value: `<svg><polygon points="${polygonStr}" /></svg>` } },
        };
      }).filter(Boolean);
      if (w3cAnnotations.length > 0) anno.value.setAnnotations(w3cAnnotations);
      
      annotationStore.pendingAnnotations.filter(p => p.imageId === imageId).forEach((pending) => {
        if (!pending.polygon) return;
        const polygonStr = pending.polygon.map(p => `${p.x},${p.y}`).join(' ');
        anno.value.addAnnotation({
          id: pending.tempId, type: 'Annotation',
          body: [
            { type: 'TextualBody', value: `${pending.name}: ${pending.value}`, purpose: 'tagging' },
            { type: 'TextualBody', value: pending.color || '#ec4899', purpose: 'highlighting' },
          ],
          target: { selector: { type: 'SvgSelector', value: `<svg><polygon points="${polygonStr}"></polygon></svg>` } },
        });
      });
      updateLabelOverlays();
    } catch (e) { console.warn('Hata:', e); }
  }

  async function loadImage(image: Image) {
    if (!viewer.value || !image.status.isProcessed()) return;
    loading.value = true;
    currentImageId.value = image.id;
    const tileSourceUrl = `${API_BASE_URL}/api/v1/proxy/${image.processedpath}/image.dzi`;
    viewer.value.open(tileSourceUrl);
    
    const onOpen = async () => {
      viewer.value?.removeAllHandlers('open');
      loading.value = false;
      await loadAnnotations(image.id);
    };
    viewer.value.addHandler('open', onOpen);
  }
  
  // İzleyici: Anotasyonlar değiştiğinde (Review verisi geldiğinde vs.) ekranı güncelle
  watch(() => annotationStore.annotations, () => {
    if (currentImageId.value) {
      loadAnnotations(currentImageId.value, true); // skipFetch = true (sadece çizim)
    }
  }, { deep: true, immediate: false });

  onMounted(() => { 
    nextTick(() => {
      initViewer(); 
    });
  });
  onUnmounted(() => {
    if (viewer.value) viewer.value.destroy();
    if (anno.value) anno.value.destroy();
  });

  return {
    loading, loadImage, loadAnnotations, startDrawing, stopDrawing, anno, viewer, updateLabelOverlays,
    onSelectionCreated, onAnnotationSelected, onAnnotationCreated, onAnnotationDeselected, onDeleteAnnotationRequest,
  };
}
