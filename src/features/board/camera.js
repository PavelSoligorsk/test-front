import { clamp } from './geometry';

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 4;

const key = (boardId) => `edu-board-camera:${boardId}`;

function validCamera(cam) {
  return cam
    && Number.isFinite(cam.x)
    && Number.isFinite(cam.y)
    && Number.isFinite(cam.zoom)
    && cam.zoom > 0;
}

export function loadLocalCamera(boardId) {
  if (!boardId) return null;
  try {
    const cam = JSON.parse(window.localStorage.getItem(key(boardId)) || 'null');
    return validCamera(cam) ? { x: cam.x, y: cam.y, zoom: clamp(cam.zoom, MIN_ZOOM, MAX_ZOOM) } : null;
  } catch {
    return null;
  }
}

export function saveLocalCamera(boardId, cam) {
  if (!boardId || !validCamera(cam)) return;
  try {
    window.localStorage.setItem(key(boardId), JSON.stringify({ x: cam.x, y: cam.y, zoom: cam.zoom }));
  } catch {
    /* хранилище может быть недоступно */
  }
}

export function fitCamera(bounds, width, height, { padding = 96, maxZoom = 1 } = {}) {
  if (!bounds || !width || !height) return { x: Math.round(width / 2) || 64, y: Math.round(height / 2) || 72, zoom: 1 };
  const zoom = clamp(
    Math.min((width - padding * 2) / Math.max(bounds.w, 1), (height - padding * 2) / Math.max(bounds.h, 1)),
    MIN_ZOOM,
    maxZoom,
  );
  return {
    zoom,
    x: width / 2 - (bounds.x + bounds.w / 2) * zoom,
    y: height / 2 - (bounds.y + bounds.h / 2) * zoom,
  };
}
