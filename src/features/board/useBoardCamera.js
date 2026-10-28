import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { MAX_ZOOM, MIN_ZOOM, fitCamera, loadLocalCamera, saveLocalCamera } from './camera';
import { cullingRect } from './culling';
import { clamp } from './geometry';
import { DEFAULT_SURFACE } from './meta';

const DEFAULT_CAMERA = { x: 64, y: 72, zoom: 1 };
const COMMIT_MS = 120;

/**
 * Камера холста. Во время жеста она живёт в ref и красится раз в кадр прямо в DOM
 * (сдвиг мира, сетка, экранный размер ручек); в состояние React попадает после
 * жеста — или раньше, если экран уехал за отрисованную полосу отсечения.
 */
export function useBoardCamera({ boardId, viewportRef, worldRef, zoomLabelRef, surfaceRef, isDragging, onPaint }) {
  const [saved] = useState(() => loadLocalCamera(boardId));
  const cameraRef = useRef(saved || DEFAULT_CAMERA);
  const [camera, setCamera] = useState(saved || DEFAULT_CAMERA);
  const [viewSize, setViewSize] = useState({ w: 0, h: 0 });
  const hooksRef = useRef({ isDragging, onPaint });
  const stateRef = useRef({ frame: 0, commit: 0, surfaceKey: '', rendered: null, following: false });

  useLayoutEffect(() => {
    hooksRef.current = { isDragging, onPaint };
  });

  const api = useMemo(() => {
    const state = stateRef.current;

    function paintSurface(cam) {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const look = surfaceRef.current || DEFAULT_SURFACE;
      const step = 28 * (cam?.zoom || 1);
      const line = look.color === '#2c2c2e' ? 'rgba(255,255,255,0.28)' : 'rgba(120, 132, 148, 0.45)';
      // Картинку сетки пересобираем только при смене вида или масштаба, при сдвиге — только позицию.
      const key = `${look.color}|${look.grid}|${step}`;
      if (state.surfaceKey !== key) {
        state.surfaceKey = key;
        viewport.style.backgroundColor = look.color;
        if (look.grid === 'empty') {
          viewport.style.backgroundImage = 'none';
        } else if (look.grid === 'rule') {
          viewport.style.backgroundImage = `linear-gradient(to bottom, transparent ${step - 1}px, ${line} ${step - 1}px)`;
          viewport.style.backgroundSize = `100% ${step}px`;
        } else {
          viewport.style.backgroundImage = `linear-gradient(to right, ${line} 1px, transparent 1px), linear-gradient(to bottom, ${line} 1px, transparent 1px)`;
          viewport.style.backgroundSize = `${step}px ${step}px`;
        }
      }
      if (look.grid === 'rule') viewport.style.backgroundPosition = `0px ${cam.y}px`;
      else if (look.grid === 'cell') viewport.style.backgroundPosition = `${cam.x}px ${cam.y}px`;
    }

    // Отрисована полоса вокруг экрана; уехали за неё — перерисовать React сейчас.
    function followCulling(cam) {
      const rect = state.rendered;
      const viewport = viewportRef.current;
      if (!rect || state.following || !viewport) return;
      const w = viewport.clientWidth / cam.zoom;
      const h = viewport.clientHeight / cam.zoom;
      const x = -cam.x / cam.zoom;
      const y = -cam.y / cam.zoom;
      const inside = x >= rect.x && y >= rect.y && x + w <= rect.x + rect.w && y + h <= rect.y + rect.h;
      if (inside && Math.abs(cam.zoom / rect.zoom - 1) < 0.5) return;
      state.following = true;
      setCamera({ ...cam });
    }

    function paintNow() {
      if (state.frame) {
        cancelAnimationFrame(state.frame);
        state.frame = 0;
      }
      const cam = cameraRef.current;
      const world = worldRef.current;
      if (world) world.style.transform = `translate(${cam.x}px, ${cam.y}px) scale(${cam.zoom})`;
      const viewport = viewportRef.current;
      if (viewport) {
        // Ручки, обводки и плашки держат экранный размер через одну переменную, без обхода DOM.
        viewport.style.setProperty('--inv-zoom', String(1 / cam.zoom));
        paintSurface(cam);
      }
      if (zoomLabelRef.current) zoomLabelRef.current.textContent = `${Math.round(cam.zoom * 100)}%`;
      hooksRef.current.onPaint?.();
      followCulling(cam);
    }

    // Камера меняется на каждое событие колеса и указателя, а красится раз в кадр.
    function paint(cam) {
      cameraRef.current = cam;
      if (state.frame) return;
      state.frame = requestAnimationFrame(() => {
        state.frame = 0;
        paintNow();
      });
    }

    function publish() {
      const cam = cameraRef.current;
      setCamera((prev) => (prev.x === cam.x && prev.y === cam.y && prev.zoom === cam.zoom ? prev : cam));
      saveLocalCamera(boardId, cam);
    }

    function cancelCommit() {
      window.clearTimeout(state.commit);
      state.commit = 0;
    }

    function scheduleCommit() {
      cancelCommit();
      state.commit = window.setTimeout(() => {
        if (hooksRef.current.isDragging?.()) {
          scheduleCommit();
          return;
        }
        publish();
      }, COMMIT_MS);
    }

    function clientToWorld(clientX, clientY) {
      const viewport = viewportRef.current;
      if (!viewport) return null;
      const rect = viewport.getBoundingClientRect();
      const cam = cameraRef.current;
      return { x: (clientX - rect.left - cam.x) / cam.zoom, y: (clientY - rect.top - cam.y) / cam.zoom };
    }

    function centerWorld() {
      const viewport = viewportRef.current;
      if (!viewport) return null;
      const rect = viewport.getBoundingClientRect();
      return clientToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2);
    }

    function zoomAt(nextZoom, clientX, clientY) {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const rect = viewport.getBoundingClientRect();
      const cam = cameraRef.current;
      const zoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      const worldX = (px - cam.x) / cam.zoom;
      const worldY = (py - cam.y) / cam.zoom;
      paint({ zoom, x: px - worldX * zoom, y: py - worldY * zoom });
      scheduleCommit();
    }

    function zoomBy(factor) {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const rect = viewport.getBoundingClientRect();
      zoomAt(cameraRef.current.zoom * factor, rect.left + rect.width / 2, rect.top + rect.height / 2);
    }

    /** Показать рамку целиком (или середину пустой доски). */
    function fit(bounds, maxZoom = 2) {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const cam = bounds
        ? fitCamera(bounds, viewport.clientWidth, viewport.clientHeight, { padding: 96, maxZoom })
        : { x: Math.round(viewport.clientWidth / 2), y: Math.round(viewport.clientHeight / 2), zoom: 1 };
      paint(cam);
      scheduleCommit();
    }

    /** Чужой «притянуть к моему виду»: сразу, без жеста. */
    function jumpTo(cam) {
      const next = { x: Number(cam.x) || 0, y: Number(cam.y) || 0, zoom: clamp(Number(cam.zoom) || 1, MIN_ZOOM, MAX_ZOOM) };
      paint(next);
      cameraRef.current = next;
      setCamera(next);
      saveLocalCamera(boardId, next);
    }

    function wheel(event) {
      if (!event.isTrusted) return;
      if (event.target instanceof Element && event.target.closest('[data-geo-live]')) return;
      event.preventDefault();
      const cam = cameraRef.current;
      const scale = event.deltaMode === 1 ? 16 : 1;
      if (event.ctrlKey || event.metaKey) {
        const delta = clamp(event.deltaY * scale, -60, 60);
        zoomAt(cam.zoom * Math.exp(-delta * 0.006), event.clientX, event.clientY);
        return;
      }
      paint({ ...cam, x: cam.x - event.deltaX * scale, y: cam.y - event.deltaY * scale });
      scheduleCommit();
    }

    return {
      paint,
      paintNow,
      paintSurface,
      publish,
      scheduleCommit,
      cancelCommit,
      clientToWorld,
      centerWorld,
      zoomAt,
      zoomBy,
      zoomTo: (zoom) => zoomBy(zoom / cameraRef.current.zoom),
      fit,
      jumpTo,
      wheel,
    };
  }, [boardId, viewportRef, worldRef, zoomLabelRef, surfaceRef]);

  useLayoutEffect(() => {
    stateRef.current.rendered = cullingRect(camera, viewSize);
    stateRef.current.following = false;
  }, [camera, viewSize]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;
    const onWheel = (event) => api.wheel(event);
    el.addEventListener('wheel', onWheel, { passive: false });
    let observer = null;
    if (typeof ResizeObserver === 'function') {
      observer = new ResizeObserver(([entry]) => {
        const w = Math.round(entry.contentRect.width);
        const h = Math.round(entry.contentRect.height);
        setViewSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
      });
      observer.observe(el);
    }
    const state = stateRef.current;
    return () => {
      el.removeEventListener('wheel', onWheel);
      observer?.disconnect();
      cancelAnimationFrame(state.frame);
      window.clearTimeout(state.commit);
    };
  }, [api, viewportRef]);

  return { camera, viewSize, cameraRef, saved, ...api };
}
