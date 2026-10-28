import { clamp } from '../geometry';
import { isSolid, modelOf, planeNodes } from './kinds';

const CORNER_SHAPES = new Set([
  'triangle', 'right', 'rect', 'parallelogram', 'trapezoid', 'diamond', 'hexagon',
  'cube', 'box', 'prism3', 'prism6', 'pyramid3', 'pyramid4', 'pyramid6',
]);

function worldOf(shape, u, v) {
  return { x: shape.x + (u / 100) * shape.w, y: shape.y + (v / 100) * shape.h };
}

export function shapeVertexLocals(shape) {
  if (shape?.type !== 'shape' || !CORNER_SHAPES.has(shape.props?.shape)) return null;
  if (isSolid(shape.props.shape)) return modelOf(shape).nodes;
  return planeNodes(shape.props.shape, shape.props);
}

export function labelVertices(shape) {
  if (shape?.type !== 'shape') return null;
  if (shape.props?.shape === 'polyline') {
    return Array.isArray(shape.props.points) && shape.props.points.length >= 2 ? shape.props.points : null;
  }
  return shapeVertexLocals(shape);
}

export function nearestVertex(objects, point, zoom, reach = 18) {
  const limit = reach / (zoom || 1);
  let best = null;
  (objects || []).forEach((obj) => {
    const locals = labelVertices(obj);
    if (!locals) return;
    locals.forEach((local, index) => {
      const at = worldOf(obj, local[0], local[1]);
      const dist = Math.hypot(point.x - at.x, point.y - at.y);
      if (dist > limit || (best && dist >= best.dist)) return;
      best = { dist, id: obj.id, index };
    });
  });
  return best;
}

export function labelPlace(name) {
  const size = clamp(Number(name?.size) || 22, 14, 96);
  const dx = Number.isFinite(Number(name?.dx)) ? Number(name.dx) : 8;
  const dy = Number.isFinite(Number(name?.dy)) ? Number(name.dy) : -Math.round(size * 1.05);
  return { size, dx, dy };
}

function namedItem(item) {
  if (!item?.letter) return null;
  const next = { letter: String(item.letter), sub: String(item.sub || '') };
  if (Number.isFinite(Number(item.dx))) next.dx = Number(item.dx);
  if (Number.isFinite(Number(item.dy))) next.dy = Number(item.dy);
  if (Number.isFinite(Number(item.size))) next.size = Number(item.size);
  return next;
}

export function setVertexName(shape, index, letter, sub) {
  const locals = labelVertices(shape);
  if (!locals?.[index]) return shape;
  const names = locals.map((_, i) => namedItem(shape.props.names?.[i]));
  const prev = names[index] || {};
  names[index] = letter ? namedItem({ ...prev, letter, sub: sub || '' }) : null;
  return { ...shape, props: { ...shape.props, names } };
}

export function moveVertexLabel(shape, index, patch) {
  const locals = labelVertices(shape);
  if (!locals?.[index]) return shape;
  const names = locals.map((_, i) => namedItem(shape.props.names?.[i]));
  if (!names[index]) return shape;
  names[index] = namedItem({ ...names[index], ...patch });
  return { ...shape, props: { ...shape.props, names } };
}
