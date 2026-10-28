import { objectBounds } from './geometry';
import { isHiddenBoardObject } from './meta';

// Отсечение по экрану. На маленькой доске его нет: монтировать и снимать объекты
// дороже, чем держать их. Апплеты GeoGebra держим дальше от экрана — их пересоздание
// заметно (загрузка), а выделенный и редактируемый объект не снимается никогда.
const CULL_MIN_OBJECTS = 300;
const CULL_MIN_APPLETS = 7;

/** Отрисованная полоса мира: экран и ещё по экрану с каждой стороны. */
export function cullingRect(cam, size) {
  if (!size.w || !size.h) return null;
  const w = size.w / cam.zoom;
  const h = size.h / cam.zoom;
  const x = -cam.x / cam.zoom;
  const y = -cam.y / cam.zoom;
  return { x: x - w, y: y - h, w: w * 3, h: h * 3, view: { x, y, w, h }, zoom: cam.zoom };
}

function inCullRect(rect, obj) {
  const box = objectBounds(obj);
  const pad = obj.type === 'geogebra' ? Math.max(rect.view.w, rect.view.h) : 0;
  return box.x < rect.x + rect.w + pad && box.x + box.w > rect.x - pad
    && box.y < rect.y + rect.h + pad && box.y + box.h > rect.y - pad;
}

export function visibleIds(objects, rect, keep) {
  const shown = objects.filter((obj) => !isHiddenBoardObject(obj));
  if (!rect) return shown.map((obj) => obj.id);
  const applets = shown.reduce((sum, obj) => sum + (obj.type === 'geogebra' ? 1 : 0), 0);
  if (shown.length < CULL_MIN_OBJECTS && applets < CULL_MIN_APPLETS) return shown.map((obj) => obj.id);
  return shown.filter((obj) => keep.has(obj.id) || inCullRect(rect, obj)).map((obj) => obj.id);
}
