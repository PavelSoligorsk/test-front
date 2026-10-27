import { arrowBounds, clamp, distToSegment } from './geometry';

const PLANE = [
  { id: 'point', label: 'Точка' },
  { id: 'polyline', label: 'Ломаная' },
  { id: 'triangle', label: 'Треугольник' },
  { id: 'right', label: 'Прямоугольный треугольник' },
  { id: 'rect', label: 'Прямоугольник' },
  { id: 'parallelogram', label: 'Параллелограмм' },
  { id: 'trapezoid', label: 'Трапеция' },
  { id: 'diamond', label: 'Ромб' },
  { id: 'hexagon', label: 'Шестиугольник' },
  { id: 'circle', label: 'Окружность' },
];

const SOLID = [
  { id: 'cube', label: 'Куб' },
  { id: 'box', label: 'Параллелепипед' },
  { id: 'prism3', label: 'Треугольная призма' },
  { id: 'prism6', label: 'Шестиугольная призма' },
  { id: 'pyramid3', label: 'Треугольная пирамида' },
  { id: 'pyramid4', label: 'Правильная пирамида' },
  { id: 'pyramid6', label: 'Шестиугольная пирамида' },
  { id: 'cylinder', label: 'Цилиндр' },
  { id: 'cone', label: 'Конус' },
  { id: 'sphere', label: 'Шар' },
];

export const SHAPE_GROUPS = [
  { id: 'plane', label: 'Планиметрия', kinds: PLANE },
  { id: 'solid', label: 'Стереометрия', kinds: SOLID },
];

export const SHAPE_KINDS = [...PLANE, ...SOLID];

const SOLID_IDS = new Set(SOLID.map((item) => item.id));

export function isSolid(id) {
  return SOLID_IDS.has(id);
}

const TONE = { top: 1, front: 0.92, side: 0.72, line: 1 };

function clampDepth(value, id) {
  const n = Number(value);
  const fallback = defaultDepth(id);
  const depth = Number.isFinite(n) ? n : fallback;
  return Math.max(-20, Math.min(40, depth));
}

export function defaultDepth(id) {
  if (id === 'cone' || id === 'pyramid3' || id === 'pyramid4' || id === 'pyramid6') return 0;
  if (id === 'sphere') return 16;
  if (id === 'cylinder') return 14;
  return 20;
}

function r(n) {
  return Math.round(n * 10) / 10;
}

function poly(points, tone = 'front') {
  return { points: points.map(([x, y]) => `${r(x)},${r(y)}`).join(' '), tone };
}

function segment(a, b, dashed = false) {
  return { d: `M${r(a[0])} ${r(a[1])} L${r(b[0])} ${r(b[1])}`, fill: 'none', dashed, tone: 'line' };
}

function ellipse(cx, cy, rx, ry, tone = 'front', extra = {}) {
  return { ellipse: { cx: r(cx), cy: r(cy), rx: r(rx), ry: r(Math.max(ry, 0.8)) }, tone, ...extra };
}

function ring(n, cx, cy, rx, ry, rotate = -Math.PI / 2) {
  return Array.from({ length: n }, (_, i) => {
    const a = rotate + (i * 2 * Math.PI) / n;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
  });
}

const PYRAMID_HEIGHT = 46;

function solidLean(props) {
  return clamp(Number.isFinite(Number(props?.lean)) ? Number(props.lean) : 0, -1, 1);
}

function centroid(points) {
  const sum = points.reduce((acc, point) => [acc[0] + point[0], acc[1] + point[1]], [0, 0]);
  return [sum[0] / points.length, sum[1] / points.length];
}

function backPoint(points) {
  return points.reduce((best, point) => (
    point[1] < best[1] - 0.1 || (Math.abs(point[1] - best[1]) <= 0.1 && point[0] > best[0]) ? point : best
  ), points[0]);
}

function sampleEllipse(cx, cy, rx, ry, count = 20) {
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2;
    return [cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry];
  });
}

function convexHull(points) {
  const uniq = [];
  points.forEach((point) => {
    if (!uniq.some((other) => Math.abs(other[0] - point[0]) < 0.05 && Math.abs(other[1] - point[1]) < 0.05)) uniq.push(point);
  });
  if (uniq.length < 3) return uniq;
  const sorted = uniq.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const turn = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const build = (list) => {
    const hull = [];
    list.forEach((point) => {
      while (hull.length >= 2 && turn(hull[hull.length - 2], hull[hull.length - 1], point) <= 0) hull.pop();
      hull.push(point);
    });
    return hull;
  };
  const lower = build(sorted);
  const upper = build(sorted.slice().reverse());
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

function localInside(point, polygon) {
  return pointInPolygon(
    { x: point[0], y: point[1] },
    polygon.map((item) => ({ x: item[0], y: item[1] })),
  );
}

function arcAngles(cx, cy, rx, ry, a0, delta, dashed) {
  const p0 = [cx + Math.cos(a0) * rx, cy + Math.sin(a0) * ry];
  const p1 = [cx + Math.cos(a0 + delta) * rx, cy + Math.sin(a0 + delta) * ry];
  const large = delta > Math.PI ? 1 : 0;
  return {
    d: `M${r(p0[0])} ${r(p0[1])} A${r(rx)} ${r(Math.max(ry, 0.8))} 0 ${large} 1 ${r(p1[0])} ${r(p1[1])}`,
    fill: 'none',
    dashed,
    tone: 'line',
  };
}

function sweepDelta(a0, a1) {
  let delta = a1 - a0;
  while (delta <= 0) delta += Math.PI * 2;
  while (delta > Math.PI * 2) delta -= Math.PI * 2;
  return delta;
}

function sweepHits(a0, delta, via) {
  let value = via - a0;
  while (value < 0) value += Math.PI * 2;
  while (value >= Math.PI * 2) value -= Math.PI * 2;
  return value <= delta + 1e-4;
}

function ellipseTangents(px, py, cx, cy, rx, ry) {
  const x = (px - cx) / rx;
  const y = (py - cy) / ry;
  const dist = Math.hypot(x, y);
  if (dist <= 1.02) return null;
  const base = Math.atan2(y, x);
  const alpha = Math.acos(clamp(1 / dist, -1, 1));
  return [base + alpha, base - alpha];
}

function cabinet(d, front, lean) {
  const dx = d * 0.7 + lean * 22;
  const dy = d * 0.46;
  const nodes = [
    [front.l, front.t],
    [front.r, front.t],
    [front.r, front.b],
    [front.l, front.b],
    [front.l + dx, front.t - dy],
    [front.r + dx, front.t - dy],
    [front.r + dx, front.b - dy],
    [front.l + dx, front.b - dy],
  ];
  const right = dx >= 0;
  const hidden = right ? new Set(['3-7', '4-7', '6-7']) : new Set(['2-6', '5-6', '6-7']);
  const pairs = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  const edgeKey = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);
  return {
    nodes,
    edges: pairs.map(([a, b]) => ({ a, b, hidden: hidden.has(edgeKey(a, b)) })),
    faces: [
      { points: [0, 1, 5, 4], tone: 'top' },
      right ? { points: [1, 2, 6, 5], tone: 'side' } : { points: [0, 3, 7, 4], tone: 'side' },
      { points: [0, 1, 2, 3], tone: 'front' },
    ],
    shell: nodes,
    handle: nodes[4],
  };
}

function standingBase(n, d, faceFront = false) {
  const ry = Math.max(4.5, 6 + d * 0.32);
  if (n === 4) {
    const half = 26;
    const shear = 14;
    const y = 80;
    const back = y - ry * 1.7;
    return [
      [50 - half, y],
      [50 + half, y],
      [50 + half + shear, back],
      [50 - half + shear, back],
    ];
  }
  const turn = faceFront ? Math.PI / 2 - Math.PI / n : Math.PI / 2;
  return ring(n, 50, 74, n === 6 ? 28 : 30, ry, turn);
}

function pyramidBase(id, d, props) {
  if (id === 'pyramid3' && Array.isArray(props?.base) && props.base.length === 3) return props.base;
  if (id === 'pyramid4') return standingBase(4, d);
  if (id === 'pyramid6') return standingBase(6, d);
  return standingBase(3, d);
}

function uprightPrism(n, d, lean) {
  const bottom = standingBase(n, d, n === 6);
  const top = bottom.map(([x, y]) => [x + lean * 24, y - 44]);
  const nodes = [...bottom, ...top];
  const cy = centroid(bottom)[1];
  const faceOn = bottom.map((point, index) => {
    const next = bottom[(index + 1) % n];
    return (point[1] + next[1]) / 2 >= cy - 1;
  });
  const faces = [];
  const edges = [];
  bottom.forEach((point, index) => {
    const next = (index + 1) % n;
    const visible = faceOn[index];
    if (visible) {
      faces.push({
        points: [index, next, n + next, n + index],
        tone: point[1] > cy && bottom[next][1] > cy ? 'front' : 'side',
        mid: (point[1] + bottom[next][1]) / 2,
      });
    }
    edges.push({ a: index, b: next, hidden: !visible });
    const vertical = faceOn[index] || faceOn[(index - 1 + n) % n];
    edges.push({ a: index, b: n + index, hidden: !vertical });
    edges.push({ a: n + index, b: n + next, hidden: false });
  });
  faces.sort((a, b) => a.mid - b.mid);
  faces.push({ points: top.map((_, index) => n + index), tone: 'top' });
  return {
    nodes,
    edges,
    faces,
    shell: nodes,
    handle: backPoint(bottom),
  };
}

function pyramidSolid(id, d, props) {
  const base = pyramidBase(id, d, props);
  const n = base.length;
  const stored = Array.isArray(props?.foot) && props.foot.length === 2 ? props.foot : null;
  const foot = stored || centroid(base);
  const apex = [foot[0], foot[1] - PYRAMID_HEIGHT];
  const nodes = [...base, apex, foot];
  const apexI = n;
  const footI = n + 1;
  let front = 0;
  let frontY = -Infinity;
  for (let index = 0; index < n; index += 1) {
    const mid = (base[index][1] + base[(index + 1) % n][1]) / 2;
    if (mid > frontY) {
      frontY = mid;
      front = index;
    }
  }
  const fa = base[front];
  const fb = base[(front + 1) % n];
  const sign = Math.sign((fa[0] - apex[0]) * (fb[1] - apex[1]) - (fa[1] - apex[1]) * (fb[0] - apex[0])) || 1;
  const visible = base.map((point, index) => {
    const next = base[(index + 1) % n];
    const cross = (point[0] - apex[0]) * (next[1] - apex[1]) - (point[1] - apex[1]) * (next[0] - apex[0]);
    return cross * sign > 0;
  });
  const faces = [];
  const edges = [];
  base.forEach((point, index) => {
    const next = (index + 1) % n;
    if (visible[index]) {
      faces.push({
        points: [apexI, index, next],
        tone: (point[1] + base[next][1]) / 2 > frontY - 8 ? 'front' : 'side',
        mid: (point[1] + base[next][1]) / 2,
      });
    }
    edges.push({ a: index, b: next, hidden: !visible[index] });
    const side = visible[index] || visible[(index - 1 + n) % n];
    edges.push({ a: apexI, b: index, hidden: !side });
  });
  faces.sort((a, b) => a.mid - b.mid);
  edges.push({ a: apexI, b: footI, hidden: false });
  const inside = localInside(foot, base);
  const figures = [segment(apex, foot, inside)];
  const far = backPoint(base);
  return {
    nodes,
    edges,
    faces,
    figures,
    shell: [...base, apex],
    handle: [far[0], far[1] - 8],
    apex,
    baseDrag: id === 'pyramid3' ? base : null,
  };
}

function cylinderSolid(d) {
  const ry = Math.max(3.2, 4 + d * 0.32);
  const top = 28;
  const bot = 76;
  const rx = 30;
  const cx = 50;
  const left = cx - rx;
  const right = cx + rx;
  const nodes = [[left, top], [right, top], [right, bot], [left, bot]];
  return {
    nodes,
    edges: [
      { a: 0, b: 3, hidden: false },
      { a: 1, b: 2, hidden: false },
    ],
    faces: [],
    figures: [
      {
        d: `M${r(left)} ${r(top)} L${r(right)} ${r(top)} L${r(right)} ${r(bot)} A${r(rx)} ${r(ry)} 0 0 1 ${r(left)} ${r(bot)} Z`,
        tone: 'front',
        stroke: 'none',
      },
      ellipse(cx, top, rx, ry, 'top'),
      segment([left, top], [left, bot]),
      segment([right, top], [right, bot]),
      arcAngles(cx, bot, rx, ry, 0, Math.PI, false),
      arcAngles(cx, bot, rx, ry, Math.PI, Math.PI, true),
    ],
    rims: [
      { cx, cy: top, rx, ry },
      { cx, cy: bot, rx, ry },
    ],
    shell: [...sampleEllipse(cx, top, rx, ry), ...sampleEllipse(cx, bot, rx, ry)],
    handle: [right, top + ry],
  };
}

function coneSolid(d) {
  const ry = Math.max(3.2, 5 + d * 0.24);
  const cx = 50;
  const cy = 74;
  const rx = 32;
  const apex = [50, 16];
  const angles = ellipseTangents(apex[0], apex[1], cx, cy, rx, ry) || [Math.PI, 0];
  let start = angles[0];
  let delta = sweepDelta(angles[0], angles[1]);
  if (!sweepHits(start, delta, Math.PI / 2)) {
    start = angles[1];
    delta = sweepDelta(angles[1], angles[0]);
  }
  const touch = [start, start + delta].map((angle) => [cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry]);
  const front = arcAngles(cx, cy, rx, ry, start, delta, false);
  const back = arcAngles(cx, cy, rx, ry, start + delta, Math.PI * 2 - delta, true);
  const foot = [cx, cy];
  const nodes = [apex, touch[0], touch[1], foot];
  return {
    nodes,
    edges: [
      { a: 0, b: 1, hidden: false },
      { a: 0, b: 2, hidden: false },
      { a: 0, b: 3, hidden: false },
    ],
    faces: [],
    figures: [
      {
        d: `M${r(apex[0])} ${r(apex[1])} L${front.d.slice(1)} Z`,
        tone: 'front',
        stroke: 'none',
      },
      segment(apex, touch[0]),
      segment(apex, touch[1]),
      front,
      back,
      segment(apex, foot, true),
    ],
    rims: [{ cx, cy, rx, ry }],
    shell: [apex, ...sampleEllipse(cx, cy, rx, ry)],
    handle: [cx + rx, cy + ry],
  };
}

function sphereSolid(d) {
  const ry = Math.max(3.5, 4 + d * 0.72);
  const cx = 50;
  const cy = 50;
  const radius = 40;
  return {
    nodes: [
      [cx, cy - radius],
      [cx + radius, cy],
      [cx, cy + radius],
      [cx - radius, cy],
      [cx, cy + ry],
      [cx, cy - ry],
    ],
    edges: [],
    faces: [],
    figures: [
      ellipse(cx, cy, radius, radius, 'front'),
      arcAngles(cx, cy, radius, ry, 0, Math.PI, false),
      arcAngles(cx, cy, radius, ry, Math.PI, Math.PI, true),
    ],
    rims: [
      { cx, cy, rx: radius, ry: radius },
      { cx, cy, rx: radius, ry },
    ],
    shell: sampleEllipse(cx, cy, radius, radius),
    handle: [cx, cy + ry],
  };
}

function solidModel(id, depth, props) {
  const lean = solidLean(props);
  let model;
  if (id === 'cube') model = cabinet(depth, { l: 16, t: 40, r: 64, b: 88 }, 0);
  else if (id === 'box') model = cabinet(depth, { l: 10, t: 48, r: 70, b: 86 }, lean);
  else if (id === 'prism3') model = uprightPrism(3, depth, lean);
  else if (id === 'prism6') model = uprightPrism(6, depth, lean);
  else if (id === 'pyramid3' || id === 'pyramid4' || id === 'pyramid6') model = pyramidSolid(id, depth, props);
  else if (id === 'cylinder') model = cylinderSolid(depth);
  else if (id === 'cone') model = coneSolid(depth);
  else if (id === 'sphere') model = sphereSolid(depth);
  else model = cabinet(depth, { l: 16, t: 40, r: 64, b: 88 }, 0);
  if (Array.isArray(props?.verts) && props.verts.length === model.nodes.length) {
    return { ...model, nodes: props.verts.map((point) => [point[0], point[1]]) };
  }
  return model;
}

function renderSolid(id, depth, props) {
  const model = solidModel(id, depth, props || {});
  const skip = new Set((props?.skipEdges || []).filter((index) => Number.isInteger(index)));
  const parts = [];
  model.faces.forEach((face) => {
    const facePoly = poly(face.points.map((index) => model.nodes[index]), face.tone);
    parts.push(skip.size ? { ...facePoly, stroke: 'none' } : facePoly);
  });
  model.edges.forEach((edge, index) => {
    if (skip.has(index)) return;
    if (!skip.size && !edge.hidden) return;
    parts.push(segment(model.nodes[edge.a], model.nodes[edge.b], edge.hidden));
  });
  (model.figures || []).forEach((fig) => parts.push(fig));
  return parts;
}

function outlineFigure(id, props) {
  const nodes = planeNodes(id, props);
  if (!nodes?.length) return [];
  const skip = new Set((props?.skipEdges || []).filter((index) => Number.isInteger(index)));
  const closed = id !== 'polyline' || props?.closed;
  if (!skip.size) {
    if (!closed) return [{ d: linePath(nodes), fill: 'none', tone: 'line' }];
    return [poly(nodes)];
  }
  const parts = [];
  if (closed && nodes.length >= 3) parts.push({ ...poly(nodes), stroke: 'none' });
  const count = closed ? nodes.length : Math.max(0, nodes.length - 1);
  for (let index = 0; index < count; index += 1) {
    if (skip.has(index)) continue;
    parts.push(segment(nodes[index], nodes[(index + 1) % nodes.length], false));
  }
  return parts;
}

const RHOMBUS_SIDE = 52;
const RHOMBUS_SKEW = 18;
const RHOMBUS_HEIGHT = Math.sqrt(RHOMBUS_SIDE * RHOMBUS_SIDE - RHOMBUS_SKEW * RHOMBUS_SKEW);

const FIXED_NODES = {
  polyline: [[8, 74], [30, 28], [52, 58], [74, 16], [94, 48]],
  right: [[12, 10], [12, 90], [90, 90]],
  rect: [[8, 16], [92, 16], [92, 84], [8, 84]],
  parallelogram: [[28, 16], [94, 16], [72, 84], [6, 84]],
  diamond: [
    [18 + RHOMBUS_SKEW, 86 - RHOMBUS_HEIGHT],
    [18 + RHOMBUS_SIDE + RHOMBUS_SKEW, 86 - RHOMBUS_HEIGHT],
    [18 + RHOMBUS_SIDE, 86],
    [18, 86],
  ],
  hexagon: [[50, 6], [90, 28], [90, 72], [50, 94], [10, 72], [10, 28]],
  circle: [[50, 8], [92, 50], [50, 92], [8, 50]],
};

function trianglePoints(skew, spin = 0) {
  const raw = [[22 + 56 * skew, 20], [78, 86], [22, 86]];
  const angle = Number(spin) || 0;
  if (!angle) return raw;
  const rad = (angle * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const cx = (raw[0][0] + raw[1][0] + raw[2][0]) / 3;
  const cy = (raw[0][1] + raw[1][1] + raw[2][1]) / 3;
  return raw.map(([x, y]) => {
    const dx = x - cx;
    const dy = y - cy;
    return [cx + dx * c - dy * s, cy + dx * s + dy * c];
  });
}

function trapezoidPoints(left, right) {
  return [[8 + 84 * left, 18], [8 + 84 * right, 18], [92, 86], [8, 86]];
}

export function shapeParams(id, props = {}) {
  if (id === 'triangle') {
    const skew = Number(props.skew);
    const spin = Number(props.spin);
    return {
      skew: clamp(Number.isFinite(skew) ? skew : 0.5, -0.25, 1.25),
      spin: clamp(Number.isFinite(spin) ? spin : 0, -180, 180),
    };
  }
  if (id === 'trapezoid') {
    const rawLeft = Number(props.slantL);
    const rawRight = Number(props.slantR);
    let left = clamp(Number.isFinite(rawLeft) ? rawLeft : 0.18, 0, 1);
    let right = clamp(Number.isFinite(rawRight) ? rawRight : 0.82, 0, 1);
    if (right - left < 0.12) right = Math.min(1, left + 0.12);
    if (right - left < 0.12) left = Math.max(0, right - 0.12);
    return { slantL: left, slantR: right };
  }
  return {};
}

export function planeDefaults(id) {
  if (id === 'triangle') return { skew: 0.5, spin: 0 };
  if (id === 'trapezoid') return { slantL: 0.18, slantR: 0.82 };
  if (id === 'box' || id === 'prism3' || id === 'prism6') return { lean: 0 };
  return {};
}

export function planeNodes(id, props) {
  if (id !== 'polyline' && id !== 'circle' && Array.isArray(props?.verts) && props.verts.length >= 3) return props.verts;
  if (id === 'polyline' && Array.isArray(props?.points) && props.points.length >= 2) return props.points;
  if (id === 'triangle') {
    const params = shapeParams(id, props);
    return trianglePoints(params.skew, params.spin);
  }
  if (id === 'trapezoid') {
    const params = shapeParams(id, props);
    return trapezoidPoints(params.slantL, params.slantR);
  }
  return FIXED_NODES[id] || null;
}

export function shapeKnobs(id, props) {
  if (Array.isArray(props?.verts) && props.verts.length >= 3) return [];
  if (id === 'triangle') {
    const params = shapeParams(id, props);
    const [apex] = trianglePoints(params.skew, 0);
  return [
      { key: 'skew', x: apex[0], y: 6 },
      { key: 'spin', x: 50 + (params.spin / 180) * 42, y: 94 },
    ];
  }
  if (id === 'trapezoid') {
    const params = shapeParams(id, props);
    const points = trapezoidPoints(params.slantL, params.slantR);
  return [
      { key: 'slantL', x: points[0][0], y: 6 },
      { key: 'slantR', x: points[1][0], y: 6 },
    ];
  }
  if (id === 'box' || id === 'prism3' || id === 'prism6') {
    return [{ key: 'lean', x: 50 + solidLean(props) * 42, y: 94 }];
  }
  return [];
}

export function shapeKnobPatch(id, key, u, props) {
  if (id === 'triangle' && key === 'skew') return { skew: clamp((u - 22) / 56, -0.25, 1.25) };
  if (id === 'triangle' && key === 'spin') return { spin: clamp(((u - 50) / 42) * 180, -180, 180) };
  if (key === 'lean') return { lean: clamp((u - 50) / 42, -1, 1) };
  if (id !== 'trapezoid') return null;
  const current = shapeParams(id, props);
  const t = clamp((u - 8) / 84, 0, 1);
  if (key === 'slantL') return { slantL: Math.min(t, current.slantR - 0.12) };
  if (key === 'slantR') return { slantR: Math.max(t, current.slantL + 0.12) };
  return null;
}

function linePath(points) {
  return `M ${points.map((point) => point.join(' ')).join(' L ')}`;
}

const FIGURES = {
  polyline: (_depth, props) => outlineFigure('polyline', props),
  triangle: (_depth, props) => outlineFigure('triangle', props),
  right: (_depth, props) => outlineFigure('right', props),
  rect: (_depth, props) => outlineFigure('rect', props),
  parallelogram: (_depth, props) => outlineFigure('parallelogram', props),
  trapezoid: (_depth, props) => outlineFigure('trapezoid', props),
  diamond: (_depth, props) => outlineFigure('diamond', props),
  hexagon: (_depth, props) => outlineFigure('hexagon', props),
  circle: () => [ellipse(50, 50, 42, 42)],
  point: () => [{ ...ellipse(50, 50, 16, 16), stroke: 'none' }],
  cube: (d, props) => renderSolid('cube', d, props),
  box: (d, props) => renderSolid('box', d, props),
  prism3: (d, props) => renderSolid('prism3', d, props),
  prism6: (d, props) => renderSolid('prism6', d, props),
  pyramid3: (d, props) => renderSolid('pyramid3', d, props),
  pyramid4: (d, props) => renderSolid('pyramid4', d, props),
  pyramid6: (d, props) => renderSolid('pyramid6', d, props),
  cylinder: (d, props) => renderSolid('cylinder', d, props),
  cone: (d, props) => renderSolid('cone', d, props),
  sphere: (d, props) => renderSolid('sphere', d, props),
};

export function shapeFigures(id, depth, props) {
  const draw = FIGURES[id] || FIGURES.cube;
  return draw(clampDepth(depth, id), props || {});
}

export function shapeToneOpacity(tone) {
  return TONE[tone] || 1;
}

function handlePoint(id, depth, props) {
  const model = solidModel(id, clampDepth(depth, id), props || {});
  return { x: model.handle[0], y: model.handle[1] };
}

export function shapeHandle(id, depth, props) {
  return handlePoint(id, depth, props);
}

export function solidAnchors(id, depth, props) {
  if (!isSolid(id)) return null;
  const model = solidModel(id, clampDepth(depth, id), props || {});
  return { apex: model.apex || null, base: model.baseDrag || null };
}

export function moveApex(id, props, u, v) {
  const foot = [clamp(u, 4, 96), clamp(v + PYRAMID_HEIGHT, 4, 96)];
  return { foot: [r(foot[0]), r(foot[1])] };
}

export function movePyramidBase(shape, index, local) {
  const depth = clampDepth(shape.props?.depth, shape.props?.shape);
  const base = pyramidBase(shape.props.shape, depth, shape.props).map((point) => [point[0], point[1]]);
  if (!base[index]) return shape;
  base[index] = [r(clamp(local[0], -20, 120)), r(clamp(local[1], -20, 120))];
  const binds = Array.isArray(shape.props.baseBinds) ? shape.props.baseBinds.slice() : base.map(() => null);
  binds[index] = null;
  return { ...shape, props: { ...shape.props, base, baseBinds: binds } };
}

function worldOf(shape, u, v) {
  return { x: shape.x + (u / 100) * shape.w, y: shape.y + (v / 100) * shape.h };
}

function projectEllipse(point, shape, rim, rimIndex) {
  const cx = shape.x + (rim.cx / 100) * shape.w;
  const cy = shape.y + (rim.cy / 100) * shape.h;
  const rx = (rim.rx / 100) * shape.w;
  const ry = (rim.ry / 100) * shape.h;
  if (rx < 0.5 || ry < 0.5) return null;
  const dx = (point.x - cx) / rx;
  const dy = (point.y - cy) / ry;
  if (dx * dx + dy * dy < 1e-8) return null;
  const angle = Math.atan2(dy, dx);
  const projected = { x: cx + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry };
  return { point: projected, dist: Math.hypot(point.x - projected.x, point.y - projected.y), angle, rimIndex };
}

function modelOf(shape) {
  return solidModel(shape.props.shape, clampDepth(shape.props.depth, shape.props.shape), shape.props);
}

const CORNER_SHAPES = new Set([
  'triangle', 'right', 'rect', 'parallelogram', 'trapezoid', 'diamond', 'hexagon',
  'cube', 'box', 'prism3', 'prism6', 'pyramid3', 'pyramid4', 'pyramid6',
]);

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

export function hitShapeContour(shape, point, zoom) {
  if (!shape || shape.type !== 'shape' || !point) return false;
  const limit = 12 / (zoom || 1);
  const id = shape.props?.shape;
  const nearPoint = (item) => Math.hypot(point.x - item.x, point.y - item.y) <= limit;
  const nearEdge = (a, b) => distToSegment(point, a, b) <= limit;
  if (isSolid(id)) {
    const model = modelOf(shape);
    if (model.edges.some((edge) => nearEdge(
      worldOf(shape, model.nodes[edge.a][0], model.nodes[edge.a][1]),
      worldOf(shape, model.nodes[edge.b][0], model.nodes[edge.b][1]),
    ))) return true;
    if ((model.rims || []).some((rim) => {
      const hit = projectEllipse(point, shape, rim, 0);
      return hit && hit.dist <= limit;
    })) return true;
    return model.nodes.some((node) => nearPoint(worldOf(shape, node[0], node[1])));
  }
  if (id === 'circle') {
    const hit = projectEllipse(point, shape, { cx: 50, cy: 50, rx: 42, ry: 42 }, 0);
    return Boolean(hit && hit.dist <= limit);
  }
  const nodes = planeNodes(id, shape.props);
  if (!nodes?.length) return false;
  const world = nodes.map((node) => worldOf(shape, node[0], node[1]));
  const closed = id !== 'polyline' || shape.props?.closed;
  const count = closed ? world.length : Math.max(0, world.length - 1);
  for (let index = 0; index < count; index += 1) {
    if (nearEdge(world[index], world[(index + 1) % world.length])) return true;
  }
  return world.some(nearPoint);
}

export function jointLocal(shape, joint) {
  if (Number.isFinite(joint?.rim) && Number.isInteger(joint?.rimIndex) && isSolid(shape.props?.shape)) {
    const rim = modelOf(shape).rims?.[joint.rimIndex];
    if (!rim) return [50, 50];
    return [rim.cx + Math.cos(joint.rim) * rim.rx, rim.cy + Math.sin(joint.rim) * rim.ry];
  }
  if (Number.isFinite(joint?.rim)) return [50 + Math.cos(joint.rim) * 42, 50 + Math.sin(joint.rim) * 42];
  if (isSolid(shape.props?.shape)) {
    const model = modelOf(shape);
    const edge = model.edges[joint?.edge];
    if (!edge) return [50, 50];
    const a = model.nodes[edge.a];
    const b = model.nodes[edge.b];
    const t = Number(joint.t) || 0;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  }
  const nodes = planeNodes(shape.props?.shape, shape.props);
  const a = nodes?.[joint?.edge];
  const b = nodes?.[(joint.edge + 1) % nodes.length];
  if (!a || !b) return [50, 50];
  const t = Number(joint.t) || 0;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function projectSegment(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy || 1;
  const t = clamp(((point.x - a.x) * dx + (point.y - a.y) * dy) / len2, 0, 1);
  const projected = { x: a.x + dx * t, y: a.y + dy * t };
  return { t, point: projected, dist: Math.hypot(point.x - projected.x, point.y - projected.y) };
}

function projectRim(point, shape) {
  const cx = shape.x + shape.w * 0.5;
  const cy = shape.y + shape.h * 0.5;
  const rx = shape.w * 0.42;
  const ry = shape.h * 0.42;
  if (rx < 1 || ry < 1) return null;
  const dx = (point.x - cx) / rx;
  const dy = (point.y - cy) / ry;
  if (dx * dx + dy * dy < 1e-8) return null;
  const angle = Math.atan2(dy, dx);
  const projected = { x: cx + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry };
  return { point: projected, dist: Math.hypot(point.x - projected.x, point.y - projected.y), angle };
}

function arrowEnds(host) {
  return [
    { x: host.x + host.props.x1, y: host.y + host.props.y1 },
    { x: host.x + host.props.x2, y: host.y + host.props.y2 },
  ];
}

function considerNode(hit, dist, point, bind) {
  if (!hit || dist < hit.dist) return { dist, point, bind };
  return hit;
}

function considerEdge(hit, dist, point, spec) {
  if (!hit || dist < hit.dist) return { dist, point, spec };
  return hit;
}

export function snapFigurePoint(point, hosts, zoom, ignoreId) {
  const nodeR = 16 / (zoom || 1);
  const edgeR = 12 / (zoom || 1);
  let nodeHit = null;
  let edgeHit = null;
  hosts.forEach((host) => {
    if (!host || host.id === ignoreId) return;
    if (host.type === 'point') {
      const dist = Math.hypot(point.x - host.x, point.y - host.y);
      if (dist <= nodeR) nodeHit = considerNode(nodeHit, dist, { x: host.x, y: host.y }, { id: host.id, point: true });
      return;
    }
    if (host.type === 'arrow') {
      const [start, end] = arrowEnds(host);
      const startDist = Math.hypot(point.x - start.x, point.y - start.y);
      const endDist = Math.hypot(point.x - end.x, point.y - end.y);
      if (startDist <= nodeR) nodeHit = considerNode(nodeHit, startDist, start, { id: host.id, index: 0 });
      if (endDist <= nodeR) nodeHit = considerNode(nodeHit, endDist, end, { id: host.id, index: 1 });
      const projected = projectSegment(point, start, end);
      if (projected.t > 0.07 && projected.t < 0.93 && projected.dist <= edgeR) {
        edgeHit = considerEdge(edgeHit, projected.dist, projected.point, { id: host.id, edge: 0, t: projected.t });
      }
      return;
    }
    if (host.type !== 'shape') return;
    const id = host.props?.shape;
    if (isSolid(id)) {
      const model = modelOf(host);
      model.nodes.forEach((node, index) => {
        const world = worldOf(host, node[0], node[1]);
        const dist = Math.hypot(point.x - world.x, point.y - world.y);
        if (dist <= nodeR) nodeHit = considerNode(nodeHit, dist, world, { id: host.id, index });
      });
      model.edges.forEach((edge, index) => {
        const a = worldOf(host, model.nodes[edge.a][0], model.nodes[edge.a][1]);
        const b = worldOf(host, model.nodes[edge.b][0], model.nodes[edge.b][1]);
        if (Math.hypot(b.x - a.x, b.y - a.y) < 1) return;
        const projected = projectSegment(point, a, b);
        if (projected.t < 0.07 || projected.t > 0.93 || projected.dist > edgeR) return;
        edgeHit = considerEdge(edgeHit, projected.dist, projected.point, { id: host.id, edge: index, t: projected.t });
      });
      (model.rims || []).forEach((rim, rimIndex) => {
        const hit = projectEllipse(point, host, rim, rimIndex);
        if (!hit || hit.dist > edgeR) return;
        const onNode = model.nodes.some((node) => {
          const world = worldOf(host, node[0], node[1]);
          return Math.hypot(hit.point.x - world.x, hit.point.y - world.y) < nodeR * 0.75;
        });
        if (onNode) return;
        edgeHit = considerEdge(edgeHit, hit.dist, hit.point, { id: host.id, rim: hit.angle, rimIndex });
      });
      return;
    }
    const nodes = planeNodes(id, host.props);
    if (!nodes) return;
    nodes.forEach((node, index) => {
      const world = worldOf(host, node[0], node[1]);
      const dist = Math.hypot(point.x - world.x, point.y - world.y);
      if (dist <= nodeR) nodeHit = considerNode(nodeHit, dist, world, { id: host.id, index });
    });
    if (id === 'circle') {
      const rim = projectRim(point, host);
      if (!rim || rim.dist > edgeR) return;
      const onNode = nodes.some((node) => {
        const world = worldOf(host, node[0], node[1]);
        return Math.hypot(rim.point.x - world.x, rim.point.y - world.y) < nodeR * 0.75;
      });
      if (onNode) return;
      edgeHit = considerEdge(edgeHit, rim.dist, rim.point, { id: host.id, rim: rim.angle });
      return;
    }
    const edges = id === 'polyline' && !host.props?.closed ? nodes.length - 1 : nodes.length;
    for (let index = 0; index < edges; index += 1) {
      const a = worldOf(host, nodes[index][0], nodes[index][1]);
      const next = nodes[(index + 1) % nodes.length];
      const b = worldOf(host, next[0], next[1]);
      const projected = projectSegment(point, a, b);
      if (projected.t < 0.07 || projected.t > 0.93 || projected.dist > edgeR) continue;
      edgeHit = considerEdge(edgeHit, projected.dist, projected.point, { id: host.id, edge: index, t: projected.t });
    }
  });
  if (nodeHit && (!edgeHit || nodeHit.dist <= edgeHit.dist)) {
    return { point: nodeHit.point, bind: nodeHit.bind, dist: nodeHit.dist };
  }
  if (edgeHit) return { point: edgeHit.point, spec: edgeHit.spec, dist: edgeHit.dist };
  return { point, dist: Infinity };
}

function sameJoint(joint, spec) {
  if (Number.isFinite(spec.rim)) {
    return Number.isFinite(joint.rim)
      && (joint.rimIndex ?? null) === (spec.rimIndex ?? null)
      && Math.abs(joint.rim - spec.rim) < 0.18;
  }
  return joint.edge === spec.edge && Math.abs((joint.t || 0) - spec.t) < 0.045;
}

export function attachSnap(objects, hit, makeId) {
  if (!hit?.spec) return { objects, bind: hit?.bind || null };
  const index = objects.findIndex((obj) => obj.id === hit.spec.id);
  if (index < 0) return { objects, bind: null };
  const shape = objects[index];
  const joints = shape.props.joints || [];
  const found = joints.find((joint) => sameJoint(joint, hit.spec));
  if (found) return { objects, bind: { id: shape.id, joint: found.id } };
  const joint = Number.isFinite(hit.spec.rim)
    ? { id: makeId(), rim: hit.spec.rim, ...(Number.isInteger(hit.spec.rimIndex) ? { rimIndex: hit.spec.rimIndex } : {}) }
    : { id: makeId(), edge: hit.spec.edge, t: hit.spec.t };
  const next = objects.slice();
  next[index] = { ...shape, props: { ...shape.props, joints: [...joints, joint] } };
  return { objects: next, bind: { id: shape.id, joint: joint.id } };
}

export function boundPoint(bind, objects) {
  if (!bind) return null;
  const host = objects.find((obj) => obj.id === bind.id);
  if (!host) return null;
  if (bind.point) return host.type === 'point' ? { x: host.x, y: host.y } : null;
  if (host.type === 'arrow') {
    const [start, end] = arrowEnds(host);
    if (bind.index === 0) return start;
    if (bind.index === 1) return end;
    const joint = (host.props.joints || []).find((item) => item.id === bind.joint);
    if (!joint) return null;
    const t = Number(joint.t) || 0;
    return { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t };
  }
  if (host.type !== 'shape') return null;
  if (Number.isInteger(bind.index)) {
    const node = isSolid(host.props.shape)
      ? modelOf(host).nodes[bind.index]
      : planeNodes(host.props.shape, host.props)?.[bind.index];
    return node ? worldOf(host, node[0], node[1]) : null;
  }
  if (!bind.joint) return null;
  const joint = (host.props.joints || []).find((item) => item.id === bind.joint);
  if (!joint) return null;
  const [u, v] = jointLocal(host, joint);
  return worldOf(host, u, v);
}

export function polylineWorld(shape) {
  const nodes = planeNodes(shape.props?.shape, shape.props) || [];
  return nodes.map((node) => ({
    x: shape.x + (node[0] / 100) * shape.w,
    y: shape.y + (node[1] / 100) * shape.h,
  }));
}

export function moveShapeVertex(shape, index, point) {
  const locals = shapeVertexLocals(shape);
  if (!locals?.[index]) return shape;
  const world = locals.map(([u, v]) => worldOf(shape, u, v));
  world[index] = point;
  if (isSolid(shape.props.shape)) {
    const verts = world.map((item) => [
      r(((item.x - shape.x) / shape.w) * 100),
      r(((item.y - shape.y) / shape.h) * 100),
    ]);
    return { ...shape, props: { ...shape.props, verts } };
  }
  const framed = polylineFrame(world, shape.props);
  return {
    ...shape,
    x: framed.x,
    y: framed.y,
    w: framed.w,
    h: framed.h,
    props: { ...framed.props, points: shape.props.points, verts: framed.props.points },
  };
}

export function movePolylineVertex(shape, index, point) {
  const world = polylineWorld(shape);
  if (!world[index]) return shape;
  world[index] = point;
  const binds = Array.isArray(shape.props.binds) ? shape.props.binds.slice() : world.map(() => null);
  binds[index] = null;
  return { ...shape, ...polylineFrame(world, { ...shape.props, binds }) };
}

export function bindPolylineVertex(objects, shapeId, index, zoom, makeId) {
  const shape = objects.find((obj) => obj.id === shapeId);
  if (!shape) return objects;
  const world = polylineWorld(shape);
  if (!world[index]) return objects;
  const hosts = objects.filter((obj) => obj.id !== shapeId);
  const hit = settleSnap(snapFigurePoint(world[index], hosts, zoom, shapeId), hosts);
  const placed = attachSnap(objects, hit, makeId);
  const fresh = placed.objects.find((obj) => obj.id === shapeId) || shape;
  const binds = Array.isArray(fresh.props.binds) ? fresh.props.binds.slice() : world.map(() => null);
  binds[index] = placed.bind;
  world[index] = hit.point;
  const frame = polylineFrame(world, { ...fresh.props, binds });
  const next = placed.objects.map((obj) => (obj.id === shapeId ? { ...fresh, ...frame } : obj));
  return retargetBound(next, [shapeId]);
}

export function polylineFrame(points, props) {
  const pad = 18;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  points.forEach((item) => {
    minX = Math.min(minX, item.x);
    minY = Math.min(minY, item.y);
    maxX = Math.max(maxX, item.x);
    maxY = Math.max(maxY, item.y);
  });
  if (!Number.isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = 0;
    maxY = 0;
  }
  const x = minX - pad;
  const y = minY - pad;
  const w = Math.max(36, maxX - minX + pad * 2);
  const h = Math.max(36, maxY - minY + pad * 2);
  return {
    x,
    y,
    w,
    h,
    props: {
      ...props,
      points: points.map((item) => [((item.x - x) / w) * 100, ((item.y - y) / h) * 100]),
    },
  };
}

function hostSegments(host) {
  if (host.type === 'arrow') return [arrowEnds(host)];
  if (host.type !== 'shape' || host.props?.shape === 'circle') return [];
  if (isSolid(host.props.shape)) {
    const model = modelOf(host);
    return model.edges.map((edge) => [
      worldOf(host, model.nodes[edge.a][0], model.nodes[edge.a][1]),
      worldOf(host, model.nodes[edge.b][0], model.nodes[edge.b][1]),
    ]);
  }
  const nodes = planeNodes(host.props?.shape, host.props);
  if (!nodes) return [];
  const closed = host.props.shape !== 'polyline' || host.props.closed;
  const count = closed ? nodes.length : Math.max(0, nodes.length - 1);
  const lines = [];
  for (let index = 0; index < count; index += 1) {
    const next = nodes[(index + 1) % nodes.length];
    lines.push([
      worldOf(host, nodes[index][0], nodes[index][1]),
      worldOf(host, next[0], next[1]),
    ]);
  }
  return lines;
}

function pointInPolygon(point, polygon) {
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

function insideClosed(point, host) {
  if (host.type !== 'shape') return false;
  if (isSolid(host.props.shape)) {
    const model = modelOf(host);
    const shell = convexHull(model.shell?.length >= 3 ? model.shell : model.nodes);
    if (shell.length < 3) return false;
    return pointInPolygon(point, shell.map((node) => worldOf(host, node[0], node[1])));
  }
  if (host.props.shape === 'polyline' && !host.props.closed) return false;
  if (host.props.shape === 'circle') {
    const dx = (point.x - (host.x + host.w / 2)) / (host.w * 0.42 || 1);
    const dy = (point.y - (host.y + host.h / 2)) / (host.h * 0.42 || 1);
    return dx * dx + dy * dy <= 1;
  }
  const nodes = planeNodes(host.props.shape, host.props);
  if (!nodes || nodes.length < 3) return false;
  return pointInPolygon(point, nodes.map((node) => worldOf(host, node[0], node[1])));
}

function incidentLines(host, anchor) {
  const lines = hostSegments(host);
  if (host.type === 'arrow') return lines;
  if (host.type === 'shape' && isSolid(host.props?.shape)) {
    const model = modelOf(host);
    if (Number.isInteger(anchor.bind?.index)) {
      const index = anchor.bind.index;
      return lines.filter((_, edge) => model.edges[edge].a === index || model.edges[edge].b === index);
    }
    let edge = anchor.spec?.edge;
    if (!Number.isInteger(edge) && anchor.bind?.joint) {
      edge = (host.props.joints || []).find((joint) => joint.id === anchor.bind.joint)?.edge;
    }
    if (Number.isInteger(edge) && lines[edge]) return [lines[edge]];
    return [];
  }
  if (Number.isInteger(anchor.bind?.index)) {
    const index = anchor.bind.index;
    const nodes = planeNodes(host.props.shape, host.props) || [];
    const closed = host.props.shape !== 'polyline' || host.props.closed;
    return lines.filter((_, edge) => edge === index || (closed ? (edge + 1) % nodes.length : edge + 1) === index);
  }
  let edge = anchor.spec?.edge;
  if (!Number.isInteger(edge) && anchor.bind?.joint) {
    edge = (host.props.joints || []).find((joint) => joint.id === anchor.bind.joint)?.edge;
  }
  if (Number.isInteger(edge) && lines[edge]) return [lines[edge]];
  return [];
}

export function settleSnap(hit, objects) {
  if (!hit?.bind || !Number.isInteger(hit.bind.index)) return hit;
  const host = objects.find((obj) => obj.id === hit.bind.id);
  if (!host || host.type !== 'arrow') return hit;
  const inner = hit.bind.index === 0 ? host.props.bind1 : host.props.bind2;
  if (!inner || inner.id === host.id) return hit;
  const point = boundPoint(inner, objects);
  if (!point) return hit;
  return { ...hit, point, bind: inner };
}

export function extendStraight(cursor, anchor, objects, zoom) {
  const hostId = anchor?.bind?.id || anchor?.spec?.id;
  if (!hostId) return null;
  const host = objects.find((obj) => obj.id === hostId);
  if (!host || insideClosed(cursor, host)) return null;
  const origin = anchor.point || (Number.isFinite(anchor.x) ? { x: anchor.x, y: anchor.y } : null);
  if (!origin) return null;
  const scale = zoom || 1;
  const travel = Math.hypot(cursor.x - origin.x, cursor.y - origin.y);
  if (travel < 40 / scale) return null;
  const limit = Math.min(8 / scale, travel * 0.1);
  const found = [];
  incidentLines(host, anchor).forEach(([a, b]) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    if (len2 < 1) return;
    const t = ((cursor.x - a.x) * dx + (cursor.y - a.y) * dy) / len2;
    if (t > -0.04 && t < 1.04) return;
    const point = { x: a.x + dx * t, y: a.y + dy * t };
    const dist = Math.hypot(cursor.x - point.x, cursor.y - point.y);
    if (dist > limit) return;
    const from = t > 1 ? b : a;
    const angle = Math.atan2(dy, dx);
    found.push({
      dist,
      point,
      angle: angle < 0 ? angle + Math.PI : angle,
      guide: { x1: from.x, y1: from.y, x2: point.x, y2: point.y },
    });
  });
  found.sort((left, right) => left.dist - right.dist);
  if (!found.length) return null;
  const sameLine = (left, right) => Math.abs(left.angle - right.angle) < 0.15 || Math.abs(left.angle - right.angle) > Math.PI - 0.15;
  if (found.length > 1 && !sameLine(found[0], found[1]) && found[1].dist < found[0].dist + 4 / scale) return null;
  return found[0];
}

export function retargetArrows(objects, shapeIds) {
  const ids = new Set(shapeIds);
  let changed = false;
  const next = objects.map((obj) => {
    if (obj.type !== 'arrow') return obj;
    const startBind = obj.props.bind1;
    const endBind = obj.props.bind2;
    if (!((startBind && ids.has(startBind.id)) || (endBind && ids.has(endBind.id)))) return obj;
    const start = startBind ? boundPoint(startBind, objects) : { x: obj.x + obj.props.x1, y: obj.y + obj.props.y1 };
    const end = endBind ? boundPoint(endBind, objects) : { x: obj.x + obj.props.x2, y: obj.y + obj.props.y2 };
    if (!start || !end) return obj;
    changed = true;
    return { ...obj, ...arrowBounds(start, end, obj.props) };
  });
  return changed ? next : objects;
}

function noteJoint(used, bind) {
  if (bind?.joint) used.add(`${bind.id}:${bind.joint}`);
}

export function pruneJoints(objects) {
  const used = new Set();
  objects.forEach((obj) => {
    if (obj.type === 'arrow') {
      noteJoint(used, obj.props.bind1);
      noteJoint(used, obj.props.bind2);
    }
    if (obj.type === 'shape' && Array.isArray(obj.props.binds)) obj.props.binds.forEach((bind) => noteJoint(used, bind));
    if (obj.type === 'shape' && Array.isArray(obj.props.baseBinds)) obj.props.baseBinds.forEach((bind) => noteJoint(used, bind));
  });
  let changed = false;
  const next = objects.map((obj) => {
    if ((obj.type !== 'shape' && obj.type !== 'arrow') || !obj.props.joints?.length) return obj;
    const joints = obj.props.joints.filter((joint) => used.has(`${obj.id}:${joint.id}`));
    if (joints.length === obj.props.joints.length) return obj;
    changed = true;
    return { ...obj, props: { ...obj.props, joints } };
  });
  return changed ? next : objects;
}

export function bindArrowEnds(objects, arrowId, zoom, makeId) {
  const arrow = objects.find((obj) => obj.id === arrowId);
  if (!arrow || arrow.type !== 'arrow') return objects;
  const hosts = objects.filter((obj) => obj.id !== arrowId);
  const start = snapFigurePoint({ x: arrow.x + arrow.props.x1, y: arrow.y + arrow.props.y1 }, hosts, zoom, arrowId);
  const end = snapFigurePoint({ x: arrow.x + arrow.props.x2, y: arrow.y + arrow.props.y2 }, hosts, zoom, arrowId);
  let next = objects;
  const startBind = attachSnap(next, start, makeId);
  next = startBind.objects;
  const endBind = attachSnap(next, end, makeId);
  next = endBind.objects;
  const fresh = next.find((obj) => obj.id === arrowId) || arrow;
  const bounded = arrowBounds(start.point, end.point, { ...fresh.props, bind1: startBind.bind, bind2: endBind.bind });
  next = next.map((obj) => (obj.id === arrowId ? { ...fresh, ...bounded } : obj));
  return pruneJoints(next);
}

export function releaseMissingBinds(objects) {
  const hosts = new Set(objects.filter((obj) => obj.type === 'shape' || obj.type === 'arrow' || obj.type === 'point').map((obj) => obj.id));
  const next = objects.map((obj) => {
    if (obj.type === 'arrow') {
      const bind1 = obj.props.bind1 && hosts.has(obj.props.bind1.id) ? obj.props.bind1 : null;
      const bind2 = obj.props.bind2 && hosts.has(obj.props.bind2.id) ? obj.props.bind2 : null;
      if ((obj.props.bind1 || null) === bind1 && (obj.props.bind2 || null) === bind2) return obj;
      return { ...obj, props: { ...obj.props, bind1, bind2 } };
    }
    if (obj.type === 'shape' && (Array.isArray(obj.props.binds) || Array.isArray(obj.props.baseBinds))) {
      const binds = Array.isArray(obj.props.binds)
        ? obj.props.binds.map((bind) => (bind && hosts.has(bind.id) ? bind : null))
        : null;
      const baseBinds = Array.isArray(obj.props.baseBinds)
        ? obj.props.baseBinds.map((bind) => (bind && hosts.has(bind.id) ? bind : null))
        : null;
      const sameBinds = !binds || binds.every((bind, index) => (bind || null) === (obj.props.binds[index] || null));
      const sameBase = !baseBinds || baseBinds.every((bind, index) => (bind || null) === (obj.props.baseBinds[index] || null));
      if (sameBinds && sameBase) return obj;
      return {
        ...obj,
        props: {
          ...obj.props,
          ...(binds ? { binds } : {}),
          ...(baseBinds ? { baseBinds } : {}),
        },
      };
    }
    return obj;
  });
  return pruneJoints(next);
}

export function retargetPolylines(objects, hostIds) {
  const ids = new Set(hostIds);
  let changed = false;
  const next = objects.map((obj) => {
    if (obj.type !== 'shape' || obj.props.shape !== 'polyline' || !Array.isArray(obj.props.binds)) return obj;
    if (!obj.props.binds.some((bind) => bind && ids.has(bind.id))) return obj;
    const nodes = planeNodes(obj.props.shape, obj.props);
    if (!nodes?.length) return obj;
    const world = nodes.map((node, index) => {
      const bind = obj.props.binds[index];
      return (bind && boundPoint(bind, objects)) || worldOf(obj, node[0], node[1]);
    });
    changed = true;
    return { ...obj, ...polylineFrame(world, obj.props) };
  });
  return changed ? next : objects;
}

function pyramidBaseLocal(obj) {
  const depth = clampDepth(obj.props.depth, 'pyramid3');
  const source = Array.isArray(obj.props.base) && obj.props.base.length === 3
    ? obj.props.base
    : pyramidBase('pyramid3', depth, obj.props);
  return source.map((point) => [point[0], point[1]]);
}

export function bindPyramidBase(objects, shapeId, index, zoom, makeId) {
  const shape = objects.find((obj) => obj.id === shapeId);
  if (!shape || shape.props.shape !== 'pyramid3') return objects;
  const base = pyramidBaseLocal(shape);
  if (!base[index]) return objects;
  const world = worldOf(shape, base[index][0], base[index][1]);
  const hosts = objects.filter((obj) => obj.id !== shapeId);
  const hit = settleSnap(snapFigurePoint(world, hosts, zoom, shapeId), hosts);
  const placed = attachSnap(objects, hit, makeId);
  const fresh = placed.objects.find((obj) => obj.id === shapeId) || shape;
  base[index] = [r(((hit.point.x - fresh.x) / fresh.w) * 100), r(((hit.point.y - fresh.y) / fresh.h) * 100)];
  const binds = Array.isArray(fresh.props.baseBinds) ? fresh.props.baseBinds.slice() : base.map(() => null);
  binds[index] = placed.bind;
  const next = placed.objects.map((obj) => (
    obj.id === shapeId ? { ...fresh, props: { ...fresh.props, base, baseBinds: binds } } : obj
  ));
  return retargetBound(next, [shapeId]);
}

function retargetPyramids(objects, hostIds) {
  const ids = new Set(hostIds);
  let changed = false;
  const next = objects.map((obj) => {
    if (obj.type !== 'shape' || obj.props.shape !== 'pyramid3' || !Array.isArray(obj.props.baseBinds)) return obj;
    if (!obj.props.baseBinds.some((bind) => bind && ids.has(bind.id))) return obj;
    const base = pyramidBaseLocal(obj).map((point, index) => {
      const bind = obj.props.baseBinds[index];
      const world = (bind && boundPoint(bind, objects)) || worldOf(obj, point[0], point[1]);
      return [r(((world.x - obj.x) / obj.w) * 100), r(((world.y - obj.y) / obj.h) * 100)];
    });
    changed = true;
    return { ...obj, props: { ...obj.props, base } };
  });
  return changed ? next : objects;
}

function segmentCross(p, q) {
  const rx = p.b.x - p.a.x;
  const ry = p.b.y - p.a.y;
  const sx = q.b.x - q.a.x;
  const sy = q.b.y - q.a.y;
  const den = rx * sy - ry * sx;
  if (Math.abs(den) < 1e-6) return null;
  const qx = q.a.x - p.a.x;
  const qy = q.a.y - p.a.y;
  const t = (qx * sy - qy * sx) / den;
  const u = (qx * ry - qy * rx) / den;
  if (t < -0.02 || t > 1.02 || u < -0.02 || u > 1.02) return null;
  const atEnd = (value) => value <= 0.06 || value >= 0.94;
  if (atEnd(t) && atEnd(u)) return null;
  return { x: p.a.x + rx * t, y: p.a.y + ry * t };
}

function edgesAdjacent(obj, left, right) {
  if (left === right) return true;
  if (Math.abs(left - right) === 1) return true;
  const count = hostSegments(obj).length;
  const closed = obj.type === 'shape' && (obj.props.shape !== 'polyline' || obj.props.closed);
  return closed && count > 2 && ((left === 0 && right === count - 1) || (right === 0 && left === count - 1));
}

function crossingOf(objects, cross) {
  if (!Array.isArray(cross) || cross.length < 2) return null;
  const hosts = cross.map((item) => objects.find((obj) => obj.id === item.id));
  if (hosts.some((host) => !host)) return null;
  const lines = hosts.map((host, index) => hostSegments(host)[cross[index].edge]);
  if (lines.some((line) => !line)) return null;
  return segmentCross(
    { a: lines[0][0], b: lines[0][1] },
    { a: lines[1][0], b: lines[1][1] },
  );
}

export function nearestCrossing(objects, point, zoom, reach = 24) {
  const edges = [];
  (objects || []).forEach((obj) => {
    if (obj.type === 'point') return;
    hostSegments(obj).forEach((line, edge) => {
      edges.push({ id: obj.id, edge, obj, a: line[0], b: line[1] });
    });
  });
  const limit = reach / (zoom || 1);
  let best = null;
  for (let i = 0; i < edges.length; i += 1) {
    for (let j = i + 1; j < edges.length; j += 1) {
      const left = edges[i];
      const right = edges[j];
      if (left.id === right.id && edgesAdjacent(left.obj, left.edge, right.edge)) continue;
      const hit = segmentCross(left, right);
      if (!hit) continue;
      const dist = Math.hypot(point.x - hit.x, point.y - hit.y);
      if (dist > limit || (best && dist >= best.dist)) continue;
      best = {
        dist,
        point: { x: hit.x, y: hit.y },
        cross: [{ id: left.id, edge: left.edge }, { id: right.id, edge: right.edge }],
      };
    }
  }
  return best;
}

function retargetMarks(objects, hostIds) {
  const ids = new Set(hostIds);
  let changed = false;
  const next = objects.map((obj) => {
    if (obj.type !== 'point' || !Array.isArray(obj.props.cross)) return obj;
    if (!obj.props.cross.some((item) => ids.has(item.id))) return obj;
    const point = crossingOf(objects, obj.props.cross);
    if (!point) return obj;
    if (Math.abs(point.x - obj.x) < 0.05 && Math.abs(point.y - obj.y) < 0.05) return obj;
    changed = true;
    return { ...obj, x: point.x, y: point.y };
  });
  return changed ? next : objects;
}

export function cutArrows(objects, point, arrowIds, makeId) {
  const drop = new Set();
  const created = [];
  (arrowIds || []).forEach((id) => {
    if (drop.has(id)) return;
    const arrow = objects.find((obj) => obj.id === id && obj.type === 'arrow');
    if (!arrow) return;
    const [start, end] = arrowEnds(arrow);
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len2 = dx * dx + dy * dy;
    if (len2 < 4) return;
    const t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / len2;
    if (t <= 0.05 || t >= 0.95) return;
    const mid = { x: start.x + dx * t, y: start.y + dy * t };
    const glue = { id: point.id, point: true };
    const heads = arrowHeadState(arrow.props);
    const base = { ...arrow.props };
    delete base.x1;
    delete base.y1;
    delete base.x2;
    delete base.y2;
    delete base.joints;
    delete base.bind1;
    delete base.bind2;
    delete base.head;
    delete base.headStart;
    delete base.headEnd;
    const piece = (from, to, bind1, bind2, headStart, headEnd) => ({
      id: makeId(),
      type: 'arrow',
      rotation: 0,
      ...arrowBounds(from, to, { ...base, bind1, bind2, head: false, headStart, headEnd }),
    });
    drop.add(id);
    created.push(
      piece(start, mid, arrow.props.bind1 || null, glue, heads.headStart, false),
      piece(mid, end, glue, arrow.props.bind2 || null, false, heads.headEnd),
    );
  });
  if (!drop.size) return objects;
  return releaseMissingBinds([...objects.filter((obj) => !drop.has(obj.id)), ...created]);
}

function arrowPropsOnly(props) {
  const base = { ...props };
  delete base.x1;
  delete base.y1;
  delete base.x2;
  delete base.y2;
  delete base.joints;
  delete base.bind1;
  delete base.bind2;
  delete base.head;
  delete base.headStart;
  delete base.headEnd;
  return base;
}

function gluedToPoint(arrow, pointId) {
  return Boolean(
    (arrow.props.bind1?.point && arrow.props.bind1.id === pointId)
    || (arrow.props.bind2?.point && arrow.props.bind2.id === pointId),
  );
}

function arrowAngle(arrow) {
  const [start, end] = arrowEnds(arrow);
  return Math.atan2(end.y - start.y, end.x - start.x);
}

function directionGap(a, b) {
  let gap = Math.abs(a - b) % Math.PI;
  if (gap > Math.PI / 2) gap = Math.PI - gap;
  return gap;
}

function armsOf(objects, pointId) {
  return objects.filter((obj) => obj.type === 'arrow' && gluedToPoint(obj, pointId));
}

function lineMeet(p, q) {
  const rx = p.b.x - p.a.x;
  const ry = p.b.y - p.a.y;
  const sx = q.b.x - q.a.x;
  const sy = q.b.y - q.a.y;
  const den = rx * sy - ry * sx;
  if (Math.abs(den) < 1e-6) return null;
  const t = ((q.a.x - p.a.x) * sy - (q.a.y - p.a.y) * sx) / den;
  const u = ((q.a.x - p.a.x) * ry - (q.a.y - p.a.y) * rx) / den;
  if (p.clamp && (t < -0.05 || t > 1.05)) return null;
  if (q.clamp && (u < -0.05 || u > 1.05)) return null;
  return { x: p.a.x + rx * t, y: p.a.y + ry * t };
}

function crossFromArms(objects, pointId, shapeItem) {
  const arms = armsOf(objects, pointId);
  if (shapeItem && arms.length) return [shapeItem, { id: arms[0].id, edge: 0 }];
  if (arms.length < 2) return null;
  const other = arms.find((arm) => directionGap(arrowAngle(arms[0]), arrowAngle(arm)) > 0.08);
  if (!other) return null;
  return [{ id: arms[0].id, edge: 0 }, { id: other.id, edge: 0 }];
}

function holdNear(objects, point) {
  let shapeItem = null;
  let best = Infinity;
  objects.forEach((obj) => {
    if (obj.type !== 'shape') return;
    hostSegments(obj).forEach((line, edge) => {
      const dist = distToSegment(point, line[0], line[1]);
      if (dist > 10 || dist >= best) return;
      best = dist;
      shapeItem = { id: obj.id, edge };
    });
  });
  const linked = crossFromArms(objects, point.id, shapeItem);
  if (!linked) return null;
  const shape = shapeItem && objects.find((obj) => obj.id === shapeItem.id);
  const edge = shape && hostSegments(shape)[shapeItem.edge];
  const arm = objects.find((obj) => obj.id === linked[shapeItem ? 1 : 0].id);
  if (!arm) return null;
  const [start, end] = arrowEnds(arm);
  let at = null;
  if (edge) at = lineMeet({ a: start, b: end, clamp: false }, { a: edge[0], b: edge[1], clamp: true });
  else {
    const other = objects.find((obj) => obj.id === linked[1].id);
    const ends = other && arrowEnds(other);
    if (!ends) return null;
    at = lineMeet({ a: start, b: end, clamp: false }, { a: ends[0], b: ends[1], clamp: false });
  }
  if (!at || Math.hypot(at.x - point.x, at.y - point.y) > 12) return null;
  return linked;
}

export function plantPoint(objects, pointId, zoom, makeId) {
  const point = objects.find((obj) => obj.id === pointId && obj.type === 'point');
  if (!point) return objects;
  const hit = nearestCrossing(objects, point, zoom, 16);
  const onArrow = hit ? null : arrowUnderPoint(objects, point, zoom);
  if (!hit && !onArrow) return objects;
  const place = hit?.point || onArrow.point;
  const arrowIds = [];
  let cross = null;
  let shapeItem = null;
  if (hit) {
    const shapeCross = [];
    hit.cross.forEach((item) => {
      const host = objects.find((obj) => obj.id === item.id);
      if (host?.type === 'arrow') {
        if (!gluedToPoint(host, pointId)) arrowIds.push(host.id);
      } else if (host) shapeCross.push(item);
    });
    if (!arrowIds.length && shapeCross.length === 2) cross = shapeCross;
    else if (shapeCross.length) shapeItem = shapeCross[0];
  } else {
    const host = objects.find((obj) => obj.id === onArrow.id);
    if (host && !gluedToPoint(host, pointId)) arrowIds.push(host.id);
  }
  let next = objects.map((obj) => (
    obj.id === pointId ? { ...obj, x: place.x, y: place.y, props: { ...obj.props, cross } } : obj
  ));
  if (arrowIds.length) {
    const seated = next.find((obj) => obj.id === pointId);
    next = cutArrows(next, seated, arrowIds, makeId);
    const linked = crossFromArms(next, pointId, shapeItem);
    if (linked) {
      next = next.map((obj) => (
        obj.id === pointId ? { ...obj, props: { ...obj.props, cross: linked } } : obj
      ));
    }
  }
  return retargetBound(next, [pointId]);
}

export function refreshPointHold(objects, pointId) {
  const point = objects.find((obj) => obj.id === pointId && obj.type === 'point');
  if (!point) return objects;
  const cross = holdNear(objects, point);
  const prev = point.props.cross || null;
  if (!cross && !prev) return objects;
  if (cross && prev && cross.length === prev.length && cross.every((item, index) => item.id === prev[index]?.id && item.edge === prev[index]?.edge)) {
    return objects;
  }
  return objects.map((obj) => (
    obj.id === pointId ? { ...obj, props: { ...obj.props, cross } } : obj
  ));
}

function intersectionFor(objects, point, movedArrow) {
  const shapeItem = (point.props.cross || []).find((item) => objects.find((obj) => obj.id === item.id)?.type === 'shape');
  const [start, end] = arrowEnds(movedArrow);
  const moving = { a: start, b: end, clamp: false };
  if (shapeItem) {
    const host = objects.find((obj) => obj.id === shapeItem.id);
    const edge = host && hostSegments(host)[shapeItem.edge];
    return edge ? lineMeet(moving, { a: edge[0], b: edge[1], clamp: true }) : null;
  }
  const other = armsOf(objects, point.id).find((arm) => (
    arm.id !== movedArrow.id && directionGap(arrowAngle(arm), arrowAngle(movedArrow)) > 0.08
  ));
  if (!other) {
    const atStart = movedArrow.props.bind1?.point && movedArrow.props.bind1.id === point.id;
    return atStart ? start : end;
  }
  const [a, b] = arrowEnds(other);
  return lineMeet(moving, { a, b, clamp: false });
}

export function slideSharedPoints(objects, movedIds) {
  const moved = new Set(movedIds);
  const shifts = new Map();
  objects.forEach((obj) => {
    if (!moved.has(obj.id) || obj.type !== 'arrow') return;
    [obj.props.bind1, obj.props.bind2].forEach((bind) => {
      if (!bind?.point || shifts.has(bind.id)) return;
      const point = objects.find((item) => item.id === bind.id && item.type === 'point');
      if (!point) return;
      const at = intersectionFor(objects, point, obj);
      if (!at) return;
      shifts.set(point.id, at);
    });
  });
  if (!shifts.size) return objects;
  const next = objects.map((obj) => {
    const at = shifts.get(obj.id);
    return at ? { ...obj, x: at.x, y: at.y } : obj;
  });
  return retargetBound(next, [...shifts.keys()]);
}

export function splitArrowThroughPoints(objects, arrowIds, makeId, zoom, ignoreIds) {
  const ignore = ignoreIds instanceof Set ? ignoreIds : new Set(ignoreIds || []);
  const limit = 14 / (zoom || 1);
  const drop = new Set();
  const created = [];
  (arrowIds || []).forEach((id) => {
    if (drop.has(id)) return;
    const arrow = objects.find((obj) => obj.id === id && obj.type === 'arrow');
    if (!arrow) return;
    const [start, end] = arrowEnds(arrow);
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len2 = dx * dx + dy * dy;
    if (len2 < 16) return;
    const hits = [];
    objects.forEach((obj) => {
      if (obj.type !== 'point' || ignore.has(obj.id)) return;
      if (gluedToPoint(arrow, obj.id)) return;
      const t = ((obj.x - start.x) * dx + (obj.y - start.y) * dy) / len2;
      if (t <= 0.06 || t >= 0.94) return;
      const at = { x: start.x + dx * t, y: start.y + dy * t };
      if (Math.hypot(obj.x - at.x, obj.y - at.y) > limit) return;
      if (Math.hypot(obj.x - start.x, obj.y - start.y) < 8 || Math.hypot(obj.x - end.x, obj.y - end.y) < 8) return;
      hits.push({ t, point: obj });
    });
    hits.sort((left, right) => left.t - right.t);
    const knots = [];
    hits.forEach((hit) => {
      if (knots.some((item) => Math.hypot(item.point.x - hit.point.x, item.point.y - hit.point.y) < 6)) return;
      knots.push(hit);
    });
    if (!knots.length) return;
    const heads = arrowHeadState(arrow.props);
    const base = arrowPropsOnly(arrow.props);
    const spots = [
      { at: start, bind: arrow.props.bind1 || null },
      ...knots.map((hit) => ({ at: { x: hit.point.x, y: hit.point.y }, bind: { id: hit.point.id, point: true } })),
      { at: end, bind: arrow.props.bind2 || null },
    ];
    drop.add(id);
    for (let index = 0; index < spots.length - 1; index += 1) {
      const from = spots[index];
      const to = spots[index + 1];
      created.push({
        id: makeId(),
        type: 'arrow',
        rotation: 0,
        ...arrowBounds(from.at, to.at, {
          ...base,
          bind1: from.bind,
          bind2: to.bind,
          head: false,
          headStart: index === 0 ? heads.headStart : false,
          headEnd: index === spots.length - 2 ? heads.headEnd : false,
        }),
      });
    }
  });
  if (!drop.size) return objects;
  return releaseMissingBinds([...objects.filter((obj) => !drop.has(obj.id)), ...created]);
}

export function arrowUnderPoint(objects, point, zoom) {
  const limit = 14 / (zoom || 1);
  let best = null;
  (objects || []).forEach((obj) => {
    if (obj.type !== 'arrow') return;
    const [start, end] = arrowEnds(obj);
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len2 = dx * dx + dy * dy;
    if (len2 < 4) return;
    const t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / len2;
    if (t <= 0.06 || t >= 0.94) return;
    const at = { x: start.x + dx * t, y: start.y + dy * t };
    const dist = Math.hypot(point.x - at.x, point.y - at.y);
    if (dist > limit || (best && dist >= best.dist)) return;
    best = { dist, point: at, id: obj.id };
  });
  return best;
}

function edgeEnds(shape, edgeIndex) {
  if (isSolid(shape.props?.shape)) {
    const edge = modelOf(shape).edges[edgeIndex];
    if (!edge) return null;
    return { indexes: [edge.a, edge.b], line: hostSegments(shape)[edgeIndex] };
  }
  const nodes = planeNodes(shape.props?.shape, shape.props);
  if (!nodes?.length || shape.props?.shape === 'circle') return null;
  const closed = shape.props.shape !== 'polyline' || shape.props.closed;
  const count = closed ? nodes.length : Math.max(0, nodes.length - 1);
  if (edgeIndex < 0 || edgeIndex >= count) return null;
  return {
    indexes: [edgeIndex, (edgeIndex + 1) % nodes.length],
    line: hostSegments(shape)[edgeIndex],
  };
}

export function detachEdge(objects, shapeId, edgeIndex, makeId) {
  const shape = objects.find((obj) => obj.id === shapeId);
  if (!shape || shape.type !== 'shape' || !Number.isInteger(edgeIndex)) return objects;
  const skip = new Set((shape.props.skipEdges || []).filter((index) => Number.isInteger(index)));
  if (skip.has(edgeIndex)) return objects;
  const ends = edgeEnds(shape, edgeIndex);
  if (!ends?.line) return objects;
  const [start, end] = ends.line;
  if (Math.hypot(end.x - start.x, end.y - start.y) < 2) return objects;
  const arrow = {
    id: makeId(),
    type: 'arrow',
    rotation: 0,
    ...arrowBounds(start, end, {
      color: shape.props.stroke || '#18181b',
      width: 2,
      head: false,
      dashed: Boolean(shape.props.dashed),
      bind1: { id: shape.id, index: ends.indexes[0] },
      bind2: { id: shape.id, index: ends.indexes[1] },
    }),
  };
  const nextShape = { ...shape, props: { ...shape.props, skipEdges: [...skip, edgeIndex] } };
  return objects.map((obj) => (obj.id === shape.id ? nextShape : obj)).concat(arrow);
}

export function retargetBound(objects, hostIds) {
  let next = objects;
  let pending = [...hostIds];
  const seen = new Set();
  for (let guard = 0; pending.length && guard < 6; guard += 1) {
    pending.forEach((id) => seen.add(id));
    const before = next;
    next = retargetArrows(next, pending);
    next = retargetPolylines(next, pending);
    next = retargetPyramids(next, pending);
    next = retargetMarks(next, pending);
    pending = next.flatMap((obj, index) => (obj !== before[index] && !seen.has(obj.id) ? [obj.id] : []));
  }
  return pruneJoints(next);
}

export function arrowHeadState(props = {}) {
  if (props.headStart != null || props.headEnd != null) {
    return { headStart: props.headStart === true, headEnd: props.headEnd === true };
  }
  return { headStart: false, headEnd: props.head === true };
}

export function arrowHeadSides(obj) {
  const start = { x: obj.x + obj.props.x1, y: obj.y + obj.props.y1 };
  const end = { x: obj.x + obj.props.x2, y: obj.y + obj.props.y2 };
  const startLeft = start.x < end.x - 0.01 || (Math.abs(start.x - end.x) <= 0.01 && start.y <= end.y);
  return startLeft ? { left: 'headStart', right: 'headEnd' } : { left: 'headEnd', right: 'headStart' };
}

const JOIN_SLACK = 6;

function joinLine(arrows) {
  if (!arrows || arrows.length < 2) return null;
  let host = arrows[0];
  let hostLen = 0;
  arrows.forEach((arrow) => {
    const [start, end] = arrowEnds(arrow);
    const len = Math.hypot(end.x - start.x, end.y - start.y);
    if (len > hostLen) {
      host = arrow;
      hostLen = len;
    }
  });
  if (hostLen < 1) return null;
  const [origin, far] = arrowEnds(host);
  const dx = far.x - origin.x;
  const dy = far.y - origin.y;
  const ux = dx / hostLen;
  const uy = dy / hostLen;
  const along = (point) => (point.x - origin.x) * ux + (point.y - origin.y) * uy;
  const off = (point) => Math.abs((point.x - origin.x) * uy - (point.y - origin.y) * ux);
  let min = Infinity;
  let max = -Infinity;
  let minBind = null;
  let maxBind = null;
  let headStart = false;
  let headEnd = false;
  for (let index = 0; index < arrows.length; index += 1) {
    const arrow = arrows[index];
    const [start, end] = arrowEnds(arrow);
    if (off(start) > JOIN_SLACK || off(end) > JOIN_SLACK) return null;
    const heads = arrowHeadState(arrow.props);
    [
      { t: along(start), bind: arrow.props.bind1 || null, head: heads.headStart },
      { t: along(end), bind: arrow.props.bind2 || null, head: heads.headEnd },
    ].forEach((item) => {
      if (item.t < min - 0.5) {
        min = item.t;
        minBind = item.bind;
        headStart = item.head;
      } else if (item.t <= min + 0.5) {
        if (item.bind && !minBind) minBind = item.bind;
        if (item.head) headStart = true;
      }
      if (item.t > max + 0.5) {
        max = item.t;
        maxBind = item.bind;
        headEnd = item.head;
      } else if (item.t >= max - 0.5) {
        if (item.bind && !maxBind) maxBind = item.bind;
        if (item.head) headEnd = true;
      }
    });
  }
  if (!(max - min > 1)) return null;
  return {
    host,
    start: { x: origin.x + ux * min, y: origin.y + uy * min },
    end: { x: origin.x + ux * max, y: origin.y + uy * max },
    bind1: minBind,
    bind2: maxBind,
    headStart,
    headEnd,
  };
}

export function canJoinArrows(arrows) {
  return Boolean(joinLine(arrows));
}

export function joinArrows(objects, ids) {
  const arrows = (ids || [])
    .map((id) => objects.find((obj) => obj.id === id && obj.type === 'arrow'))
    .filter(Boolean);
  const plan = joinLine(arrows);
  if (!plan) return objects;
  const removed = new Set(arrows.map((arrow) => arrow.id));
  removed.delete(plan.host.id);
  const props = arrowPropsOnly(plan.host.props);
  const joined = {
    ...plan.host,
    ...arrowBounds(plan.start, plan.end, {
      ...props,
      bind1: plan.bind1,
      bind2: plan.bind2,
      head: false,
      headStart: plan.headStart,
      headEnd: plan.headEnd,
    }),
  };
  const next = objects
    .filter((obj) => !removed.has(obj.id))
    .map((obj) => {
      if (obj.id === joined.id) return joined;
      if (obj.type !== 'point' || !Array.isArray(obj.props.cross)) return obj;
      if (!obj.props.cross.some((item) => removed.has(item.id) || item.id === joined.id)) return obj;
      const shapeItem = obj.props.cross.find((item) => objects.find((host) => host.id === item.id)?.type === 'shape');
      return {
        ...obj,
        props: { ...obj.props, cross: shapeItem ? [shapeItem, { id: joined.id, edge: 0 }] : null },
      };
    });
  return releaseMissingBinds(next);
}

export function setArrowSide(obj, side) {
  const prop = arrowHeadSides(obj)[side];
  const state = arrowHeadState(obj.props);
  const other = prop === 'headStart' ? 'headEnd' : 'headStart';
  const on = !(state[prop] && !state[other]);
  return {
    head: false,
    headStart: on && prop === 'headStart',
    headEnd: on && prop === 'headEnd',
  };
}

export function depthFromLocal(id, x, y, props) {
  const start = handlePoint(id, 0, props);
  const end = handlePoint(id, 40, props);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len2 = dx * dx + dy * dy || 1;
  const t = ((x - start.x) * dx + (y - start.y) * dy) / len2;
  return clampDepth(t * 40, id);
}
