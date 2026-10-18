import { boundsOf } from './geometry';
import { uid } from './model';

const MARK = 'edu-board/objects@1';

export function serializeObjects(objects) {
  return JSON.stringify({ kind: MARK, objects });
}

export function parseObjects(text) {
  if (!text || text[0] !== '{') return null;
  try {
    const data = JSON.parse(text);
    if (data?.kind === MARK && Array.isArray(data.objects)) return data.objects;
  } catch {
    /* обычный текст */
  }
  return null;
}

export function cloneObjects(objects, { dx = 0, dy = 0, center = null } = {}) {
  if (!objects.length) return [];
  let shiftX = dx;
  let shiftY = dy;
  if (center) {
    const bounds = boundsOf(objects);
    shiftX = center.x - (bounds.x + bounds.w / 2);
    shiftY = center.y - (bounds.y + bounds.h / 2);
  }
  return objects.map((obj) => {
    const props = { ...(obj.props || {}) };
    delete props.locked;
    return {
      ...obj,
      id: uid(),
      x: obj.x + shiftX,
      y: obj.y + shiftY,
      props,
    };
  });
}
