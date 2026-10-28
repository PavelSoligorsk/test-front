import { arrowBounds, rectFromPoints, resizeBox, snapMove } from '../geometry';
import {
  bindArrowEnds,
  bindPolylineVertex,
  bindPyramidBase,
  depthFromLocal,
  isKnobHandle,
  isRegularShape,
  moveApex,
  movePolylineVertex,
  movePyramidBase,
  pruneJoints,
  refreshPointHold,
  retargetBound,
  shapeKnobPatch,
  slideSharedPoints,
  splitArrowThroughPoints,
} from '../shapes';

// Жесты над объектами доски. На каждое движение указателя жест получает документ,
// точку в мире и окружение (зум, Alt/Shift, притягивание) и возвращает новый документ
// и список изменённых объектов. Без DOM и состояния редактора — проверяются тестами.

export const SNAP_PX = 6;

const EDIT_KINDS = new Set(['move', 'resize', 'depth', 'apex', 'base-point', 'poly-point', 'shape-knob', 'arrow-end']);

export function isEditGesture(kind) {
  return EDIT_KINDS.has(kind);
}

/** Какой жест начинает ручка объекта. */
export function dragKindForHandle(handle) {
  if (handle === 'start' || handle === 'end') return 'arrow-end';
  if (handle === 'depth') return 'depth';
  if (handle === 'apex') return 'apex';
  if (isKnobHandle(handle)) return 'shape-knob';
  if (handle.startsWith('poly-')) return 'poly-point';
  if (handle.startsWith('base-')) return 'base-point';
  return 'resize';
}

export function handleIndex(handle) {
  if (handle.startsWith('poly-') || handle.startsWith('base-')) return Number(handle.slice(5));
  return -1;
}

/**
 * Сдвинутые вместе объекты сохраняют привязки только к хостам, которые едут с ними;
 * привязанные к сдвинутым хостам отрезки и вершины пересчитываются.
 */
export function followMoved(next, movedIds, releasePoint) {
  const moved = new Set(movedIds);
  const hostIds = next.filter((obj) => moved.has(obj.id) && (obj.type === 'shape' || obj.type === 'arrow' || obj.type === 'point')).map((obj) => obj.id);
  if (releasePoint && hostIds.length === 1 && next.find((obj) => obj.id === hostIds[0])?.type === 'point') {
    const pointId = hostIds[0];
    const result = next.map((obj) => {
      if (obj.type !== 'arrow') return obj;
      const bind1 = obj.props.bind1?.point && obj.props.bind1.id === pointId ? null : obj.props.bind1;
      const bind2 = obj.props.bind2?.point && obj.props.bind2.id === pointId ? null : obj.props.bind2;
      if ((obj.props.bind1 || null) === (bind1 || null) && (obj.props.bind2 || null) === (bind2 || null)) return obj;
      return { ...obj, props: { ...obj.props, bind1, bind2 } };
    });
    return pruneJoints(result);
  }
  const hostSet = new Set(hostIds);
  const keep = (bind) => (bind && (hostSet.has(bind.id) || bind.point) ? bind : null);
  const result = next.map((obj) => {
    if (!moved.has(obj.id)) return obj;
    if (obj.type === 'arrow') {
      const bind1 = keep(obj.props.bind1);
      const bind2 = keep(obj.props.bind2);
      if ((obj.props.bind1 || null) === bind1 && (obj.props.bind2 || null) === bind2) return obj;
      return { ...obj, props: { ...obj.props, bind1, bind2 } };
    }
    if (obj.type === 'shape' && obj.props.shape === 'polyline' && Array.isArray(obj.props.binds)) {
      const binds = obj.props.binds.map(keep);
      if (binds.every((bind, index) => bind === (obj.props.binds[index] || null))) return obj;
      return { ...obj, props: { ...obj.props, binds } };
    }
    if (obj.type === 'shape' && obj.props.shape === 'pyramid3' && Array.isArray(obj.props.baseBinds)) {
      const baseBinds = obj.props.baseBinds.map(keep);
      if (baseBinds.every((bind, index) => bind === (obj.props.baseBinds[index] || null))) return obj;
      return { ...obj, props: { ...obj.props, baseBinds } };
    }
    return obj;
  });
  const slid = slideSharedPoints(result, movedIds);
  return hostIds.length ? retargetBound(slid, hostIds) : pruneJoints(slid);
}

function withFollow(base, movedIds, changed, releasePoint) {
  const next = followMoved(base, movedIds, releasePoint);
  const known = new Set(changed.map((obj) => obj.id));
  const extra = next.filter((obj, index) => obj !== base[index] && !known.has(obj.id));
  return { next, changed: [...changed, ...extra] };
}

function replaceOne(objects, nextObj) {
  return objects.map((obj) => (obj.id === nextObj.id ? nextObj : obj));
}

function local(box, world) {
  return { u: ((world.x - box.x) / box.w) * 100, v: ((world.y - box.y) / box.h) * 100 };
}

const STEPS = {
  move(drag, world, objects, env) {
    let dx = world.x - drag.start.x;
    let dy = world.y - drag.start.y;
    let guides = null;
    const lonePoint = drag.starts.size === 1 && [...drag.starts.values()].every((obj) => obj.type === 'point');
    if (!env.alt && !lonePoint && drag.others.length && drag.bounds) {
      const snap = snapMove(
        { x: drag.bounds.x + dx, y: drag.bounds.y + dy, w: drag.bounds.w, h: drag.bounds.h },
        drag.others,
        SNAP_PX / env.zoom,
      );
      dx += snap.dx;
      dy += snap.dy;
      guides = snap.guides;
    }
    const changed = [];
    const next = objects.map((obj) => {
      const start = drag.starts.get(obj.id);
      if (!start) return obj;
      const moved = { ...start, x: start.x + dx, y: start.y + dy };
      if (start.type === 'point' && lonePoint) moved.props = { ...start.props, cross: null };
      changed.push(moved);
      return moved;
    });
    return { ...withFollow(next, changed.map((obj) => obj.id), changed, env.alt && lonePoint), guides };
  },

  resize(drag, world, objects, env) {
    // Картинки и правильные фигуры (круг, куб, шар) держат пропорции, Shift это отменяет.
    const proportional = drag.obj.type === 'image' || (drag.obj.type === 'shape' && isRegularShape(drag.obj.props.shape));
    const keepRatio = drag.obj.type === 'geogebra' || (proportional ? !env.shift : env.shift);
    const nextObj = { ...drag.obj, ...resizeBox(drag.obj, drag.handle, world, drag.start, keepRatio) };
    // Растянутая ломаная и пирамида отпускают привязанные вершины: иначе их тянуло бы назад.
    if (nextObj.type === 'shape' && nextObj.props.shape === 'polyline' && Array.isArray(nextObj.props.binds)) {
      nextObj.props = { ...nextObj.props, binds: nextObj.props.binds.map(() => null) };
    }
    if (nextObj.type === 'shape' && nextObj.props.shape === 'pyramid3' && Array.isArray(nextObj.props.baseBinds)) {
      nextObj.props = { ...nextObj.props, baseBinds: nextObj.props.baseBinds.map(() => null) };
    }
    const base = replaceOne(objects, nextObj);
    if (nextObj.type === 'shape') return withFollow(base, [nextObj.id], [nextObj]);
    return { next: base, changed: [nextObj] };
  },

  depth(drag, world, objects) {
    const box = drag.obj;
    const { u, v } = local(box, world);
    const nextObj = { ...box, props: { ...box.props, depth: depthFromLocal(box.props.shape, u, v, box.props) } };
    return withFollow(replaceOne(objects, nextObj), [nextObj.id], [nextObj]);
  },

  apex(drag, world, objects) {
    const box = drag.obj;
    const { u, v } = local(box, world);
    const nextObj = { ...box, props: { ...box.props, ...moveApex(box.props.shape, box.props, u, v) } };
    return withFollow(replaceOne(objects, nextObj), [nextObj.id], [nextObj]);
  },

  'base-point'(drag, world, objects, env) {
    const box = drag.obj;
    const hit = env.aim(world, null, env.alt, drag.id);
    const { u, v } = local(box, hit.point);
    const moved = movePyramidBase(box, drag.index, [u, v]);
    return withFollow(replaceOne(objects, moved), [moved.id], [moved]);
  },

  'poly-point'(drag, world, objects, env) {
    const hit = env.aim(world, null, env.alt, drag.id);
    const moved = movePolylineVertex(drag.obj, drag.index, hit.point);
    const base = replaceOne(objects, moved);
    const next = retargetBound(base, [drag.id]);
    const extra = next.filter((obj, index) => obj !== base[index] && obj.id !== drag.id);
    return { next, changed: [next.find((obj) => obj.id === drag.id), ...extra] };
  },

  'shape-knob'(drag, world, objects) {
    const box = drag.obj;
    const patch = shapeKnobPatch(box.props.shape, drag.handle, local(box, world).u, box.props);
    if (!patch) return null;
    const nextObj = { ...box, props: { ...box.props, ...patch } };
    return withFollow(replaceOne(objects, nextObj), [nextObj.id], [nextObj]);
  },

  'arrow-end'(drag, world, objects, env) {
    const { obj } = drag;
    const fixed = drag.handle === 'start'
      ? { x: obj.x + obj.props.x2, y: obj.y + obj.props.y2, bind: obj.props.bind2 }
      : { x: obj.x + obj.props.x1, y: obj.y + obj.props.y1, bind: obj.props.bind1 };
    const moving = env.aim(world, fixed.bind ? fixed : null, env.alt, drag.id);
    const start = drag.handle === 'start' ? moving.point : fixed;
    const end = drag.handle === 'end' ? moving.point : fixed;
    const nextObj = { ...obj, ...arrowBounds(start, end, obj.props) };
    return { next: replaceOne(objects, nextObj), changed: [nextObj] };
  },
};

/**
 * Шаг жеста. env: { zoom, alt, shift, aim(point, anchor, alt, ignoreId) }.
 * Возвращает { next, changed, guides? } или null, если ничего не поменялось.
 */
export function gestureStep(drag, world, objects, env) {
  const step = STEPS[drag.kind];
  return step ? step(drag, world, objects, env) : null;
}

/** Конец жеста: отпущенный конец отрезка или вершина садится на ближайшую фигуру. */
export function settleGesture(drag, objects, { zoom, alt, makeId }) {
  if (!drag.dirty) return objects;
  if (drag.kind === 'move') {
    const ids = [...(drag.starts?.keys() || [])];
    let next = objects;
    if (ids.length === 1 && next.some((obj) => obj.id === ids[0] && obj.type === 'point')) {
      next = refreshPointHold(next, ids[0]);
    }
    if (!alt && makeId) {
      const arrowIds = ids.filter((id) => next.some((obj) => obj.id === id && obj.type === 'arrow'));
      if (arrowIds.length) next = splitArrowThroughPoints(next, arrowIds, makeId, zoom, new Set(ids));
    }
    return next;
  }
  if (alt) return objects;
  if (drag.kind === 'arrow-end') {
    const bound = bindArrowEnds(objects, drag.id, zoom);
    return makeId ? splitArrowThroughPoints(bound, [drag.id], makeId, zoom) : bound;
  }
  if (drag.kind === 'poly-point') return bindPolylineVertex(objects, drag.id, drag.index, zoom);
  if (drag.kind === 'base-point') return bindPyramidBase(objects, drag.id, drag.index, zoom);
  return objects;
}

/** Рамка новой фигуры от точки нажатия. У правильной фигуры — квадрат в сторону указателя. */
export function squareFrom(start, point, square) {
  const rect = rectFromPoints(start, point);
  if (!square) return { ...rect, w: Math.max(rect.w, 16), h: Math.max(rect.h, 16) };
  const side = Math.max(rect.w, rect.h, 16);
  return {
    x: point.x < start.x ? start.x - side : start.x,
    y: point.y < start.y ? start.y - side : start.y,
    w: side,
    h: side,
  };
}
