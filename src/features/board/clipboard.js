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

// Привязки внутри копируемого набора переезжают на копии, привязки наружу снимаются:
// иначе вставленный отрезок тянется за исходной фигурой.
function remapBinds(props, ids) {
  const move = (bind) => (bind && ids.has(bind.id) ? { ...bind, id: ids.get(bind.id) } : null);
  const next = { ...props };
  if ('bind1' in next) next.bind1 = move(next.bind1);
  if ('bind2' in next) next.bind2 = move(next.bind2);
  if (Array.isArray(next.binds)) next.binds = next.binds.map(move);
  if (Array.isArray(next.baseBinds)) next.baseBinds = next.baseBinds.map(move);
  return next;
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
  const ids = new Map(objects.map((obj) => [obj.id, uid()]));
  return objects.map((obj) => {
    const props = remapBinds(obj.props || {}, ids);
    delete props.locked;
    delete props.editor;
    return {
      ...obj,
      id: ids.get(obj.id),
      x: obj.x + shiftX,
      y: obj.y + shiftY,
      props,
    };
  });
}
