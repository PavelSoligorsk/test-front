export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function distToSegment(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / len2, 0, 1);
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export function rectFromPoints(a, b) {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(b.x - a.x),
    h: Math.abs(b.y - a.y),
  };
}

export function arrowBounds(a, b, props) {
  const pad = 18;
  const left = Math.min(a.x, b.x) - pad;
  const top = Math.min(a.y, b.y) - pad;
  return {
    x: left,
    y: top,
    w: Math.max(36, Math.abs(b.x - a.x) + pad * 2),
    h: Math.max(36, Math.abs(b.y - a.y) + pad * 2),
    props: {
      ...props,
      x1: a.x - left,
      y1: a.y - top,
      x2: b.x - left,
      y2: b.y - top,
    },
  };
}

function strokePad(width) {
  return (Number(width) || 2) / 2 + 2;
}

/** Рамка штриха по точкам: x, y — левый верхний угол, точки — от него. */
export function strokeBounds(points, width) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  points.forEach((p) => {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  });
  const pad = strokePad(width);
  const left = round1(minX - pad);
  const top = round1(minY - pad);
  return {
    x: left,
    y: top,
    w: round1(maxX - minX + pad * 2),
    h: round1(maxY - minY + pad * 2),
    points: points.map((p) => ({ x: round1(p.x - left), y: round1(p.y - top) })),
  };
}

const strokeBoxes = new WeakMap();

// У старых штрихов рамка 12×12 в первой точке, а точки уходят в любую сторону.
// Настоящие границы считаются по точкам и кэшируются на массив точек.
function strokeLocalBounds(obj) {
  const points = obj.props?.points;
  if (!Array.isArray(points) || !points.length) return { x: 0, y: 0, w: obj.w || 0, h: obj.h || 0 };
  const width = obj.props.width || 2;
  const cached = strokeBoxes.get(points);
  if (cached && cached.width === width) return cached.box;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  points.forEach((p) => {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  });
  const pad = strokePad(width);
  const box = { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 };
  strokeBoxes.set(points, { width, box });
  return box;
}

/** Границы объекта в мире. Для штриха — по точкам, для остальных — x, y, w, h. */
export function objectBounds(obj) {
  if (obj?.type !== 'draw') return obj;
  const box = strokeLocalBounds(obj);
  return { x: obj.x + box.x, y: obj.y + box.y, w: box.w, h: box.h };
}

/** Рамка штриха внутри его собственного блока (для обводки выделения). */
export function strokeOutline(obj) {
  return strokeLocalBounds(obj);
}

function nearBox(box, point, margin) {
  return point.x >= box.x - margin && point.y >= box.y - margin
    && point.x <= box.x + box.w + margin && point.y <= box.y + box.h + margin;
}

function hitBox(obj, point) {
  return point.x >= obj.x && point.y >= obj.y && point.x <= obj.x + obj.w && point.y <= obj.y + obj.h;
}

export function hitObject(obj, point, zoom) {
  if (obj.type === 'shape' && obj.props.shape === 'ellipse') {
    const rx = obj.w / 2;
    const ry = obj.h / 2;
    if (rx <= 0 || ry <= 0) return false;
    const nx = (point.x - (obj.x + rx)) / rx;
    const ny = (point.y - (obj.y + ry)) / ry;
    return nx * nx + ny * ny <= 1;
  }

  if (obj.type === 'shape' && obj.props.shape === 'polyline' && !obj.props.closed && obj.props.points?.length) {
    const limit = 10 / zoom;
    const pts = obj.props.points.map(([u, v]) => ({ x: obj.x + (u / 100) * obj.w, y: obj.y + (v / 100) * obj.h }));
    for (let i = 1; i < pts.length; i += 1) {
      if (distToSegment(point, pts[i - 1], pts[i]) <= limit) return true;
    }
    return pts.some((item) => Math.hypot(point.x - item.x, point.y - item.y) <= limit);
  }

  if (obj.type === 'arrow') {
    const a = { x: obj.x + obj.props.x1, y: obj.y + obj.props.y1 };
    const b = { x: obj.x + obj.props.x2, y: obj.y + obj.props.y2 };
    return distToSegment(point, a, b) <= Math.max(10, (obj.props.width || 2) + 8) / zoom;
  }

  if (obj.type === 'draw') {
    const pts = obj.props.points || [];
    const limit = ((obj.props.width || 2) / 2 + 8) / zoom;
    if (!nearBox(objectBounds(obj), point, limit)) return false;
    if (pts.length === 1) {
      return Math.hypot(point.x - (obj.x + pts[0].x), point.y - (obj.y + pts[0].y)) <= limit;
    }
    for (let i = 1; i < pts.length; i += 1) {
      const a = { x: obj.x + pts[i - 1].x, y: obj.y + pts[i - 1].y };
      const b = { x: obj.x + pts[i].x, y: obj.y + pts[i].y };
      if (distToSegment(point, a, b) <= limit) return true;
    }
    return false;
  }

  return hitBox(obj, point);
}

export function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const cross = ((yi > point.y) !== (yj > point.y))
      && (point.x < ((xj - xi) * (point.y - yi)) / ((yj - yi) || 1e-9) + xi);
    if (cross) inside = !inside;
  }
  return inside;
}

export function resizeBox(start, handle, world, anchor, keepRatio = false) {
  let { x, y, w, h } = start;
  const dx = world.x - anchor.x;
  const dy = world.y - anchor.y;
  if (handle.includes('e')) w = start.w + dx;
  if (handle.includes('s')) h = start.h + dy;
  if (handle.includes('w')) w = start.w - dx;
  if (handle.includes('n')) h = start.h - dy;

  const minW = start.type === 'geogebra' ? 320 : 40;
  const minH = start.type === 'geogebra' ? 240 : 32;
  w = Math.max(minW, w);
  h = Math.max(minH, h);

  if (keepRatio && start.w > 0 && start.h > 0) {
    const ratio = start.w / start.h;
    if (w / start.w >= h / start.h) h = w / ratio;
    else w = h * ratio;
    if (w < minW) {
      w = minW;
      h = w / ratio;
    }
    if (h < minH) {
      h = minH;
      w = h * ratio;
    }
  }

  if (handle.includes('w')) x = start.x + start.w - w;
  if (handle.includes('n')) y = start.y + start.h - h;
  return { x, y, w, h };
}

export function boundsOf(objects) {
  if (!objects.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  objects.forEach((item) => {
    const obj = objectBounds(item);
    minX = Math.min(minX, obj.x);
    minY = Math.min(minY, obj.y);
    maxX = Math.max(maxX, obj.x + (obj.w || 0));
    maxY = Math.max(maxY, obj.y + (obj.h || 0));
  });
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function intersects(a, item) {
  const b = objectBounds(item);
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function snapAxis(start, size, targets, threshold) {
  let best = null;
  for (const target of targets) {
    for (const edge of [target.start, target.start + target.size / 2, target.start + target.size]) {
      for (const point of [start, start + size / 2, start + size]) {
        const delta = edge - point;
        if (Math.abs(delta) > threshold) continue;
        if (!best || Math.abs(delta) < Math.abs(best.delta)) best = { delta, line: edge, target };
      }
    }
  }
  return best;
}

export function snapMove(box, others, threshold) {
  const snapX = snapAxis(box.x, box.w, others.map((o) => ({ start: o.x, size: o.w, box: o })), threshold);
  const snapY = snapAxis(box.y, box.h, others.map((o) => ({ start: o.y, size: o.h, box: o })), threshold);
  const dx = snapX ? snapX.delta : 0;
  const dy = snapY ? snapY.delta : 0;
  const moved = { x: box.x + dx, y: box.y + dy, w: box.w, h: box.h };
  const guides = [];
  if (snapX) {
    const other = snapX.target.box;
    guides.push({
      axis: 'x',
      at: snapX.line,
      from: Math.min(moved.y, other.y),
      to: Math.max(moved.y + moved.h, other.y + other.h),
    });
  }
  if (snapY) {
    const other = snapY.target.box;
    guides.push({
      axis: 'y',
      at: snapY.line,
      from: Math.min(moved.x, other.x),
      to: Math.max(moved.x + moved.w, other.x + other.w),
    });
  }
  return { dx, dy, guides };
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

export function smoothPath(points) {
  if (!points?.length) return '';
  const first = points[0];
  if (points.length === 1) return `M${first.x} ${first.y} l0.01 0`;
  let d = `M${round1(first.x)} ${round1(first.y)}`;
  for (let i = 1; i < points.length - 1; i += 1) {
    const point = points[i];
    const next = points[i + 1];
    d += ` Q${round1(point.x)} ${round1(point.y)} ${round1((point.x + next.x) / 2)} ${round1((point.y + next.y) / 2)}`;
  }
  const last = points[points.length - 1];
  return `${d} L${round1(last.x)} ${round1(last.y)}`;
}

export function eraseStrokes(objects, point, radius) {
  const next = objects.filter((obj) => {
    if (obj.type !== 'draw' || obj.props?.locked) return true;
    const pts = obj.props.points || [];
    if (!pts.length) return false;
    if (!nearBox(objectBounds(obj), point, radius)) return true;
    for (let i = 0; i < pts.length; i += 1) {
      const current = { x: obj.x + pts[i].x, y: obj.y + pts[i].y };
      const prev = i === 0 ? current : { x: obj.x + pts[i - 1].x, y: obj.y + pts[i - 1].y };
      if (distToSegment(point, prev, current) <= radius) return false;
    }
    return true;
  });
  return next.length === objects.length ? objects : next;
}
