import { ref, onMounted, onUnmounted, shallowRef, watch, nextTick } from 'vue';
import { useAnnotationStore } from '@/stores/annotation';
import { useAnnotationTypeStore } from '@/stores/annotation_type';
import type { Image } from '@/core/entities/Image';
import OpenSeadragon from 'openseadragon';
import Annotorious from '@recogito/annotorious-openseadragon';
import '@recogito/annotorious-openseadragon/dist/annotorious.min.css';
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

  const onSelectionCreated = ref<((selection: any) => void) | null>(null);
  const onAnnotationSelected = ref<((annotation: any) => void) | null>(null);
  const onAnnotationCreated = ref<((annotation: any) => void) | null>(null);
  const onAnnotationDeselected = ref<(() => void) | null>(null);
  const onDeleteAnnotationRequest = ref<((annotationId: string) => void) | null>(null);

  const labelOverlays = ref<Map<string, HTMLElement>>(new Map());
  const activeContextId = ref<string | null>(null);
  let setupTimeout: any = null;

  function clearLabelOverlays() {
    if (!viewer.value) return;
    labelOverlays.value.forEach((el) => {
      try { viewer.value?.removeOverlay(el); } catch (e) {}
    });
    labelOverlays.value.clear();
  }

  let debounceTimeout: any = null;
  function updateLabelOverlays() {
    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      performUpdateLabelOverlays();
    }, 50);
  }

  function performUpdateLabelOverlays() {
    if (!viewer.value || !currentImageId.value) return;
    clearLabelOverlays();

    const processed = new Set<string>();
    const drawLabel = (id: string, polygon: any[], text: string, color: string, resource: string, creatorId: string, creatorName: string, isReviewFlag: boolean) => {
      try {
        if (!polygon || polygon.length === 0) return;
        const polyKey = polygon.map((p) => Math.round(p.x || p.X || 0) + ',' + Math.round(p.y || p.Y || 0)).join('|');
        if (processed.has(polyKey)) return;
        processed.add(polyKey);

        const labelDiv = document.createElement('div');
        labelDiv.className = 'a9s-label-overlay';
        labelDiv.style.pointerEvents = 'none';
        labelDiv.style.zIndex = '9999';

        const isManual = resource === 'manual';
        const currentUserId = authStore.user?.userId || '';
        const isReviewMode = isReviewFlag || resource === 'model' || resource === 'imported' || (isManual && creatorId && currentUserId && String(creatorId) !== String(currentUserId));


        const badgeSource = resource.toUpperCase();
        const displayName = (creatorName && creatorName !== creatorId) ? creatorName : (creatorId || '');
        const showBadge = (displayName && String(creatorId) !== String(currentUserId)) || (resource !== 'manual');

        const minY = Math.min(...polygon.map((p) => p.y || p.Y || 0));
        const topPoints = polygon.filter(p => (p.y || p.Y || 0) === minY);
        const anchorX = topPoints.reduce((sum, p) => sum + (p.x || p.X || 0), 0) / topPoints.length;

        const contentSize = (viewer.value as any).world.getItemAt(0)?.getContentSize();
        const imgWidth = contentSize?.x || 0;

        const isNearTop = minY < 60;
        const isNearLeft = anchorX < 100;
        const isNearRight = anchorX > (imgWidth - 200);

        const translateX = isNearLeft ? '0%' : (isNearRight ? '-100%' : '-50%');
        const translateY = isNearTop ? '10px' : '-130%';

        const isDirty = annotationStore.dirtyAnnotations.has(id);
        const isMe = String(creatorId) === String(currentUserId);
        const effectiveReviewMode = isReviewFlag && !isMe;

        labelDiv.innerHTML = `
          <div class="a9s-label-bubble" data-id="${id}" style="display: inline-flex; flex-direction: column; align-items: ${isNearLeft ? 'flex-start' : isNearRight ? 'flex-end' : 'center'}; gap: 2px; transform: translate(${translateX}, ${translateY}); pointer-events: auto; transition: all 0.2s ease;">
            
            <!-- Details Badge (Revealed on hover) -->
            <div class="hover-only" style="opacity: 0; transition: opacity 0.2s ease; pointer-events: none;">
              ${showBadge ? `
                <div style="display: flex; align-items: center; gap: 4px; padding: 1px 6px; border-radius: 8px; background: rgba(15, 23, 42, 0.9); color: #94a3b8; font-size: 7px; font-weight: 800; border: 1px solid ${color}44; margin-bottom: -2px; z-index: 10;">
                  <span style="color: ${resource === 'model' ? '#818cf8' : resource === 'imported' ? '#fbbf24' : '#94a3b8'};">${badgeSource}</span>
                  ${displayName ? `<span style="width: 1px; height: 5px; background: rgba(255,255,255,0.2);"></span><span style="color: white;">${displayName}</span>` : ''}
                </div>
              ` : ''}
            </div>

            <div class="main-pill" style="display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 12px; background: rgba(15, 23, 42, 0.2); color: white; font-size: 9px; font-weight: 700; border: 1.5px solid ${color}; white-space: nowrap; box-shadow: 0 4px 10px ${color}11; position: relative; transition: all 0.2s ease;">
              <span>${text || 'Anotasyon'}</span>
              
              <div style="width: 1px; height: 10px; background: rgba(255,255,255,0.2); margin: 0 6px;"></div>
              
              <!-- Controls (Always visible, but transparent background) -->
              <div style="display: flex; align-items: center; gap: 4px;">
                ${effectiveReviewMode ? `
                  <button id="edit-pts-${id}" style="background: none; border: none; color: #94a3b8; cursor: pointer; padding: 1px; display: flex; align-items: center; justify-content: center;">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button id="approve-${id}" title="${isDirty ? 'Önce kaydedin' : 'Onayla'}" ${isDirty ? 'disabled' : ''} style="background: none; border: none; color: #10b981; ${isDirty ? 'opacity: 0.3;' : 'cursor: pointer;'} padding: 1px; display: flex; align-items: center; justify-content: center;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><polyline points="20 6 9 17 4 12"/></svg>
                  </button>
                  <button id="reject-${id}" title="${isDirty ? 'Önce kaydedin' : 'Reddet'}" ${isDirty ? 'disabled' : ''} style="background: none; border: none; color: #f43f5e; ${isDirty ? 'opacity: 0.3;' : 'cursor: pointer;'} padding: 1px; display: flex; align-items: center; justify-content: center;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                ` : `
                  <button id="edit-pts-${id}" style="background: none; border: none; color: #94a3b8; cursor: pointer; padding: 1px;">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button id="del-${id}" style="background: none; border: none; color: #f43f5e; cursor: pointer; padding: 1px;">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                `}
              </div>
              
              <!-- Pin Line Indicator -->
              <div class="pin-line" style="position: absolute; ${isNearTop ? 'top: -30px; height: 30px;' : 'bottom: -30px; height: 30px;'} left: 50%; transform: translateX(-50%); width: 1.2px; background: ${color}; opacity: 0.3; transition: all 0.2s ease;"></div>
            </div>
          </div>
        `;

        const bubble = labelDiv.querySelector('.a9s-label-bubble') as HTMLElement;
        const mainPill = labelDiv.querySelector('.main-pill') as HTMLElement;
        const hoverItems = labelDiv.querySelectorAll('.hover-only');

        if (bubble) {
          bubble.addEventListener('mouseenter', () => { 
            if (viewer.value) (viewer.value as any).setMouseNavEnabled(false);
            
            bubble.style.transform = `translate(${translateX}, ${translateY}) scale(1.05)`;
            bubble.style.zIndex = '10000';
            if (mainPill) {
              mainPill.style.background = 'rgba(15, 23, 42, 0.95)';
              mainPill.style.padding = '4px 10px';
            }
            hoverItems.forEach(el => (el as HTMLElement).style.opacity = '1');

            document.querySelectorAll('.a9s-label-bubble').forEach(b => {
              if (b !== bubble) (b as HTMLElement).style.opacity = '0.2';
            });
            document.querySelectorAll('.a9s-annotation').forEach(s => {
              const sid = s.getAttribute('data-id');
              if (sid !== id) {
                (s as HTMLElement).style.opacity = '0.1';
              } else {
                (s as HTMLElement).style.strokeWidth = '8px';
                (s as HTMLElement).style.filter = `drop-shadow(0 0 10px ${color})`;
              }
            });
          });

          bubble.addEventListener('mouseleave', () => { 
            if (viewer.value) (viewer.value as any).setMouseNavEnabled(true);
            
            bubble.style.transform = `translate(${translateX}, ${translateY}) scale(1)`;
            bubble.style.opacity = '1';
            bubble.style.zIndex = '';
            if (mainPill) {
              mainPill.style.background = 'rgba(15, 23, 42, 0.2)';
              mainPill.style.padding = '2px 8px';
            }
            hoverItems.forEach(el => (el as HTMLElement).style.opacity = '0');

            document.querySelectorAll('.a9s-label-bubble').forEach(b => {
              (b as HTMLElement).style.opacity = '1';
            });
            document.querySelectorAll('.a9s-annotation').forEach(s => {
              (s as HTMLElement).style.opacity = '1';
              (s as HTMLElement).style.strokeWidth = '';
              (s as HTMLElement).style.filter = '';
            });
          });
        }

        const editBtn = labelDiv.querySelector(`#edit-pts-${id}`);
        if (editBtn) editBtn.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); if (anno.value) anno.value.selectAnnotation(id); });

        const delBtn = labelDiv.querySelector(`#del-${id}`);
        if (delBtn) delBtn.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); if (onDeleteAnnotationRequest.value) onDeleteAnnotationRequest.value(id); });

        const approveBtn = labelDiv.querySelector(`#approve-${id}`);
        if (approveBtn) approveBtn.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); annotationStore.approveAnnotation(id); });

        const rejectBtn = labelDiv.querySelector(`#reject-${id}`);
        if (rejectBtn) rejectBtn.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); annotationStore.rejectAnnotation(id, currentImageId.value!); });

        const imagePoint = new OpenSeadragon.Point(anchorX, minY);
        const viewportPoint = viewer.value?.viewport.imageToViewportCoordinates(imagePoint);
        
        if (viewportPoint) {
          viewer.value?.addOverlay({
            element: labelDiv,
            location: viewportPoint,
            placement: OpenSeadragon.Placement.TOP_LEFT
          });
          labelOverlays.value.set(id, labelDiv);
        }
      } catch (err) {
        console.error('drawLabel failed', err);
      }
    };

    const counts = new Map<string, number>();
    annotationStore.getAnnotationsByImageId(currentImageId.value)
      .forEach((ann) => {
        const dirty = annotationStore.dirtyAnnotations.get(String(ann.id));
        const type = annotationTypeStore.annotationTypes.find((t) => t.id === ann.annotationTypeId);
        const baseText = String(dirty?.value || (ann as any).tag?.value || ann.value).trim();
        
        const count = (counts.get(baseText) || 0) + 1;
        counts.set(baseText, count);
        const textWithIndex = `${baseText} #${count}`;

        const color = annotationStore.getTagColor(ann.annotationTypeId, baseText);
        const creatorName = annotationStore.userNames[ann.creatorId] || ann.creatorName || '';
        drawLabel(String(ann.id), dirty?.polygon || ann.polygon, textWithIndex, color, ann.resource, ann.creatorId, creatorName, !!(ann as any).isReview);
      });

    annotationStore.pendingAnnotations.filter(p => String(p.imageId) === String(currentImageId.value))
      .forEach(p => {
        const baseText = String(p.value).trim();
        const count = (counts.get(baseText) || 0) + 1;
        counts.set(baseText, count);
        const textWithIndex = `${baseText} #${count}`;

        const color = annotationStore.getTagColor(p.imageId, baseText); 
        drawLabel(p.tempId, p.polygon || [], textWithIndex, color, 'manual', authStore.user?.userId || '', authStore.user?.displayName || '', false);
      });
  }

  function startDrawing() { if (anno.value && viewer.value) { (viewer.value as any).setMouseNavEnabled(false); anno.value.setDrawingTool('polygon'); anno.value.setDrawingEnabled(true); } }
  function stopDrawing() { if (anno.value && viewer.value) { (viewer.value as any).setMouseNavEnabled(true); anno.value.setDrawingEnabled(false); anno.value.setDrawingTool(null); } }

  function initViewer() {
    if (viewer.value) viewer.value.destroy();
    const container = document.getElementById(viewerId);
    if (!container) return;
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
    viewer.value.addHandler('open', () => {
      setupAnnotorious();
    });
  }

  const setupAnnotorious = () => {
    if (!viewer.value) return;
    document.querySelectorAll('.a9s-annotationlayer').forEach(el => el.remove());

    if (setupTimeout) clearTimeout(setupTimeout);
    setupTimeout = setTimeout(() => {
      try {
        if (anno.value) {
          try { anno.value.destroy(); } catch (e) { /* ignore */ }
        }

        anno.value = new (Annotorious as any)(viewer.value, {
          locale: 'en',
          allowEmpty: true,
          disableEditor: true,
          keyboardShortcuts: false,
          formatter: (annotation: any) => {
            const id = String(annotation.id).replace('#', '');
            const ann = annotationStore.annotations.find(a => String(a.id) === id) || 
                        annotationStore.pendingAnnotations.find(p => p.tempId === id);
            let color = '#ec4899';
            if (ann) {
              const text = String((ann as any).value || (ann as any).tag?.value || '').trim();
              const indexColor = annotationStore.getTagColor((ann as any).annotationTypeId || (ann as any).imageId, text);
              const statusColors = ['#10b981', '#3b82f6'];
              color = (ann.color && statusColors.includes(ann.color)) ? ann.color : indexColor;
            }
            return { style: `stroke: ${color}; stroke-width: 2.5; fill: ${color}; fill-opacity: 0.25;` };
          }
        });

        anno.value.setDrawingTool('polygon');
        anno.value.setDrawingEnabled(false);
        
        anno.value.on('createSelection', (selection: any) => onSelectionCreated.value?.(selection));
        anno.value.on('updateAnnotation', handleUpdate);
        anno.value.on('deleteAnnotation', (ann: any) => { 
          if (currentImageId.value) annotationStore.deleteAnnotation(ann.id, currentImageId.value); 
          updateLabelOverlays(); 
        });
        anno.value.on('selectAnnotation', () => onAnnotationSelected.value?.(anno.value.getSelected()));
        anno.value.on('cancelSelected', () => onAnnotationDeselected.value?.());
        anno.value.on('createAnnotation', (annotation: any) => {
          onAnnotationCreated.value?.(annotation);
          setTimeout(() => { updateLabelOverlays(); attachSvgListeners(); }, 50);
        });

        attachSvgListeners();
        
        // Finalize load if image was already pending
        if (currentImageId.value) loadAnnotations(currentImageId.value);
      } catch (err) {
        console.warn("Annotorious init failed safely", err);
      }
    }, 50);
  };

  const attachSvgListeners = () => {
    const svgLayer = document.querySelector('.a9s-annotationlayer');
    if (!svgLayer) return;

    svgLayer.addEventListener('mouseover', (e) => {
      const target = e.target as HTMLElement;
      const shape = target.closest('.a9s-annotation');
      if (shape) {
        const id = shape.getAttribute('data-id')?.replace('#', '');
        if (id) {
          const bubble = document.querySelector(`.a9s-label-bubble[data-id="${id}"]`) as HTMLElement;
          if (bubble) {
            const transform = bubble.style.transform.split(' scale')[0];
            bubble.style.transform = `${transform} scale(1.1)`;
            bubble.style.zIndex = '10000';
            bubble.style.opacity = '1';
            const mainPill = bubble.querySelector('.main-pill') as HTMLElement;
            if (mainPill) {
              mainPill.style.background = 'rgba(15, 23, 42, 0.95)';
              mainPill.style.padding = '4px 10px';
              mainPill.style.boxShadow = `0 0 15px white, 0 4px 12px ${mainPill.style.borderColor}`;
            }
            bubble.querySelectorAll('.hover-only').forEach(el => (el as HTMLElement).style.opacity = '1');
            document.querySelectorAll('.a9s-label-bubble').forEach(b => { if (b !== bubble) (b as HTMLElement).style.opacity = '0.2'; });
            document.querySelectorAll('.a9s-annotation').forEach(s => {
              const sid = s.getAttribute('data-id');
              if (sid !== id) (s as HTMLElement).style.opacity = '0.1';
              else { (s as HTMLElement).style.strokeWidth = '8px'; (s as HTMLElement).style.filter = `drop-shadow(0 0 12px white) drop-shadow(0 0 8px ${s.getAttribute('stroke') || 'white'})`; }
            });
          }
        }
      }
    });

    svgLayer.addEventListener('mouseout', (e) => {
      const target = e.target as HTMLElement;
      const shape = target.closest('.a9s-annotation');
      if (shape) {
        const id = shape.getAttribute('data-id')?.replace('#', '');
        if (id) {
          const bubble = document.querySelector(`.a9s-label-bubble[data-id="${id}"]`) as HTMLElement;
          if (bubble) {
            const transform = bubble.style.transform.split(' scale')[0];
            bubble.style.transform = `${transform} scale(1)`;
            bubble.style.opacity = '1';
            bubble.style.zIndex = '';
            const mainPill = bubble.querySelector('.main-pill') as HTMLElement;
            if (mainPill) { mainPill.style.background = 'rgba(15, 23, 42, 0.2)'; mainPill.style.padding = '2px 8px'; mainPill.style.boxShadow = ''; }
            bubble.querySelectorAll('.hover-only').forEach(el => (el as HTMLElement).style.opacity = '0');
            document.querySelectorAll('.a9s-label-bubble').forEach(b => { (b as HTMLElement).style.opacity = '1'; });
            document.querySelectorAll('.a9s-annotation').forEach(s => { (s as HTMLElement).style.opacity = '1'; (s as HTMLElement).style.strokeWidth = ''; (s as HTMLElement).style.filter = ''; });
          }
        }
      }
    });
  };

  const handleUpdate = (annotation: any) => {
    const rawId = annotation.id || anno.value?.getSelected()?.id;
    if (!rawId) return;
    const selector = (annotation as any).target?.selector?.value || (annotation as any).selector?.value || '';
    if (!selector) return;
    let pointsStr = '';
    if (selector.includes('points=')) {
      const match = selector.match(/points=["']([^"']+)["']/);
      if (match) pointsStr = match[1];
    } else { pointsStr = selector; }
    if (!pointsStr) return;
    const coords = pointsStr.trim().split(/[\s,]+/).filter((v: string) => v !== '');
    const polygonData = [];
    for (let i = 0; i < coords.length; i += 2) { 
      const xStr = coords[i];
      const yStr = coords[i+1];
      if (xStr !== undefined && yStr !== undefined) {
        const x = parseFloat(xStr);
        const y = parseFloat(yStr);
        if (!isNaN(x) && !isNaN(y)) polygonData.push({ x, y }); 
      }
    }
    if (polygonData.length === 0) return;
    const targetId = String(rawId).replace('#', '');
    const existing = annotationStore.annotations.find(a => String(a.id) === targetId);
    if (existing) annotationStore.addDirtyAnnotation(targetId, { polygon: polygonData });
    else annotationStore.updatePendingAnnotation(targetId, { polygon: polygonData });
    updateLabelOverlays();
  };

  async function loadAnnotations(imageId: string, skipFetch: boolean = false) {
    if (!anno.value || activeContextId.value !== imageId) return;
    anno.value.clearAnnotations();
    clearLabelOverlays();
    try {
      if (!skipFetch) await annotationStore.fetchAnnotationsByImage(imageId, { limit: 100 }, { showToast: false });
      if (activeContextId.value !== imageId) return;
      const imageAnnotations = annotationStore.getAnnotationsByImageId(imageId);
      const w3c = imageAnnotations.map((ann) => {
          if (!ann.polygon || ann.polygon.length === 0) return null;
          const polygonStr = ann.polygon.map((p) => p.x + ',' + p.y).join(' ');
          const annType = annotationTypeStore.annotationTypes.find(t => t.id === ann.annotationTypeId);
          const color = ann.color || annType?.color || '#ec4899';
          const tagValue = (ann as any).tag ? (ann as any).tag.value : (annType?.name || 'Tag');
          const tagIndex = annotationStore.getTagIndex(ann.annotationTypeId, tagValue);
          
          return {
            '@context': 'http://www.w3.org/ns/anno.jsonld',
            type: 'Annotation', id: String(ann.id),
            body: [
              { type: 'TextualBody', value: tagValue, purpose: 'tagging' },
              { type: 'TextualBody', value: ann.annotationTypeId, purpose: 'metadata' },
              { type: 'TextualBody', value: String(tagIndex), purpose: 'index' },
            ],
            target: { selector: { type: 'SvgSelector', value: '<svg><polygon points="' + polygonStr + '" /></svg>' } },
          };
      }).filter(Boolean);
      anno.value.setAnnotations(w3c);
      updateLabelOverlays();
    } catch (e) {}
  }

  async function loadImage(image: Image | null) {
    if (!viewer.value) return;
    activeContextId.value = image?.id || null;
    currentImageId.value = null;
    if (anno.value) anno.value.clearAnnotations();
    clearLabelOverlays();
    loading.value = false;
    viewer.value.removeAllHandlers('open');
    viewer.value.close();
    if (!image) return;
    if (!image.status.isProcessed()) { toast.warning('İşlenmemiş görüntü.'); return; }
    loading.value = true;
    const loadId = image.id;
    const onOpen = async () => {
      if (activeContextId.value !== loadId) { loading.value = false; return; }
      currentImageId.value = loadId;
      loading.value = false;
      setupAnnotorious();
      await loadAnnotations(loadId);
    };
    viewer.value.addHandler('open', onOpen);
    viewer.value.open(API_BASE_URL + '/api/v1/proxy/' + image.processedpath + '/image.dzi');
  }

  watch(() => annotationStore.annotations, () => {
    if (viewer.value && anno.value && currentImageId.value) loadAnnotations(currentImageId.value, true);
  }, { deep: true });

  onMounted(() => nextTick(initViewer));
  watch(() => annotationStore.userNames, () => { performUpdateLabelOverlays(); }, { deep: true });

  onUnmounted(() => { 
    clearTimeout(setupTimeout);
    if (anno.value) { try { anno.value.destroy(); } catch (e) {} }
    if (viewer.value) { viewer.value.destroy(); viewer.value = null; anno.value = null; }
  });

  return {
    loading, loadImage, loadAnnotations, startDrawing, stopDrawing,
    anno, viewer, updateLabelOverlays,
    onSelectionCreated, onAnnotationSelected, onAnnotationCreated, onAnnotationDeselected, onDeleteAnnotationRequest
  };
}
