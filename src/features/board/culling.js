import { objectBounds } from './geometry';
import { isHiddenBoardObject } from './meta';

// Отсечение по экрану. На маленькой доске его нет: монтировать и снимать объекты
// дороже, чем держать их. GeoGebra не снимаем вообще: повторная загрузка апплета
// заметна, и пока его не трогают, он остаётся тем же кадром.
const CULL_MIN_OBJECTS = 300;

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
  return box.x < rect.x + rect.w && box.x + box.w > rect.x
    && box.y < rect.y + rect.h && box.y + box.h > rect.y;
}

export function visibleIds(objects, rect, keep) {
  const shown = objects.filter((obj) => !isHiddenBoardObject(obj));
  const applets = shown.filter((obj) => obj.type === 'geogebra').map((obj) => obj.id);
  const rest = shown.filter((obj) => obj.type !== 'geogebra');
  if (!rect || rest.length < CULL_MIN_OBJECTS) return shown.map((obj) => obj.id);
  const visible = rest.filter((obj) => keep.has(obj.id) || inCullRect(rect, obj)).map((obj) => obj.id);
  return visible.concat(applets);
}
