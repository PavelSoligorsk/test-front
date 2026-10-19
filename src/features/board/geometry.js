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
  const pad = (width || 4) + 6;
  const left = minX - pad;
  const top = minY - pad;
  return {
    x: left,
    y: top,
    w: Math.max(12, maxX - minX + pad * 2),
    h: Math.max(12, maxY - minY + pad * 2),
    points: points.map((p) => ({ x: p.x - left, y: p.y - top })),
  };
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

  if (obj.type === 'arrow') {
    const a = { x: obj.x + obj.props.x1, y: obj.y + obj.props.y1 };
    const b = { x: obj.x + obj.props.x2, y: obj.y + obj.props.y2 };
    return distToSegment(point, a, b) <= Math.max(10, (obj.props.width || 3) + 8) / zoom;
  }

  if (obj.type === 'draw') {
    const pts = obj.props.points || [];
    const limit = ((obj.props.width || 4) / 2 + 8) / zoom;
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

export function topHit(objects, point, zoom) {
  for (let i = objects.length - 1; i >= 0; i -= 1) {
    if (hitObject(objects[i], point, zoom)) return objects[i];
  }
  return null;
}

export function bringToFront(objects, id) {
  const index = objects.findIndex((obj) => obj.id === id);
  if (index < 0 || index === objects.length - 1) return objects;
  const next = objects.slice();
  const [item] = next.splice(index, 1);
  next.push(item);
  return next;
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
  objects.forEach((obj) => {
    minX = Math.min(minX, obj.x);
    minY = Math.min(minY, obj.y);
    maxX = Math.max(maxX, obj.x + (obj.w || 0));
    maxY = Math.max(maxY, obj.y + (obj.h || 0));
  });
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function intersects(a, b) {
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

function perpendicular(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(point.x - a.x, point.y - a.y);
  return Math.abs(dy * point.x - dx * point.y + b.x * a.y - b.y * a.x) / len;
}

export function simplifyPoints(points, epsilon = 0.6) {
  if (points.length < 3) return points.slice();
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let maxDist = 0;
    let index = -1;
    for (let i = first + 1; i < last; i += 1) {
      const dist = perpendicular(points[i], points[first], points[last]);
      if (dist > maxDist) {
        maxDist = dist;
        index = i;
      }
    }
    if (index > 0 && maxDist > epsilon) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  return points.filter((_, i) => keep[i]).map((p) => ({ x: round1(p.x), y: round1(p.y) }));
}

export function smoothPath(points) {
  if (!points?.length) return '';
  const first = points[0];
  if (points.length === 1) return `M${first.x} ${first.y} l0.01 0`;
  let d = `M${first.x} ${first.y}`;
  for (let i = 1; i < points.length; i += 1) {
    d += ` L${points[i].x} ${points[i].y}`;
  }
  return d;
}

export function eraseStrokes(objects, point, radius) {
  return objects.filter((obj) => {
    if (obj.type !== 'draw' || obj.props?.locked) return true;
    const pts = obj.props.points || [];
    if (!pts.length) return false;
    for (let i = 0; i < pts.length; i += 1) {
      const current = { x: obj.x + pts[i].x, y: obj.y + pts[i].y };
      const prev = i === 0 ? current : { x: obj.x + pts[i - 1].x, y: obj.y + pts[i - 1].y };
      if (distToSegment(point, prev, current) <= radius) return false;
    }
    return true;
  });
}

export function contentBounds(objects) {
  if (!objects.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  objects.forEach((obj) => {
    minX = Math.min(minX, obj.x);
    minY = Math.min(minY, obj.y);
    maxX = Math.max(maxX, obj.x + (obj.w || 0));
    maxY = Math.max(maxY, obj.y + (obj.h || 0));
  });
  const pad = 28;
  return {
    minX: minX - pad,
    minY: minY - pad,
    w: Math.max(40, maxX - minX + pad * 2),
    h: Math.max(40, maxY - minY + pad * 2),
  };
}
