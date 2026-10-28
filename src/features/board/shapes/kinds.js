import { clamp, pointInPolygon } from '../geometry';

// Виды фигур. Всё рисуется в локальной системе 0..100 по обеим осям рамки объекта.
// У каждого вида — одна запись в KINDS: подпись, группа, значения по умолчанию,
// узлы или модель тела, ручки и как они меняют props. Новая фигура — одна запись.

const TONE = { top: 1, front: 0.92, side: 0.72, line: 1 };

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

export function convexHull(points) {
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

function linePath(points) {
  return `M ${points.map((point) => point.join(' ')).join(' L ')}`;
}

function solidLean(props) {
  return clamp(Number.isFinite(Number(props?.lean)) ? Number(props.lean) : 0, -1, 1);
}

function triangleParams(props = {}) {
  const skew = Number(props.skew);
  const spin = Number(props.spin);
  return {
    skew: clamp(Number.isFinite(skew) ? skew : 0.5, -0.25, 1.25),
    spin: clamp(Number.isFinite(spin) ? spin : 0, -180, 180),
  };
}

function trapezoidParams(props = {}) {
  const rawLeft = Number(props.slantL);
  const rawRight = Number(props.slantR);
  let left = clamp(Number.isFinite(rawLeft) ? rawLeft : 0.18, 0, 1);
  let right = clamp(Number.isFinite(rawRight) ? rawRight : 0.82, 0, 1);
  if (right - left < 0.12) right = Math.min(1, left + 0.12);
  if (right - left < 0.12) left = Math.max(0, right - 0.12);
  return { slantL: left, slantR: right };
}

function polylineNodes(props) {
  return Array.isArray(props?.points) && props.points.length >= 2 ? props.points : FIXED_NODES.polyline;
}

const leanKnob = {
  defaults: () => ({ lean: 0 }),
  knobs: (props) => [{ key: 'lean', x: 50 + solidLean(props) * 42, y: 94 }],
};

function fixedPlane(label, nodes, extra = {}) {
  return { label, group: 'plane', nodes: () => nodes, figures: () => [poly(nodes)], ...extra };
}

const CUBE_FRONT = { l: 16, t: 40, r: 64, b: 88 };
const BOX_FRONT = { l: 10, t: 48, r: 70, b: 86 };

const KINDS = {
  polyline: {
    label: 'Ломаная',
    group: 'plane',
    nodes: polylineNodes,
    figures: (props) => {
      const points = polylineNodes(props);
      if (props?.closed) return [poly(points)];
      return [{ d: linePath(points), fill: 'none', tone: 'line' }];
    },
  },
  triangle: {
    label: 'Треугольник',
    group: 'plane',
    defaults: () => ({ skew: 0.5, spin: 0 }),
    params: triangleParams,
    nodes: (props) => {
      const params = triangleParams(props);
      return trianglePoints(params.skew, params.spin);
    },
    figures: (props) => {
      const params = triangleParams(props);
      return [poly(trianglePoints(params.skew, params.spin))];
    },
    knobs: (props) => {
      const params = triangleParams(props);
      const [apex] = trianglePoints(params.skew, 0);
      return [
        { key: 'skew', x: apex[0], y: 6 },
        { key: 'spin', x: 50 + (params.spin / 180) * 42, y: 94 },
      ];
    },
    knob: (key, u) => {
      if (key === 'skew') return { skew: clamp((u - 22) / 56, -0.25, 1.25) };
      if (key === 'spin') return { spin: clamp(((u - 50) / 42) * 180, -180, 180) };
      return null;
    },
  },
  right: fixedPlane('Прямоугольный треугольник', FIXED_NODES.right),
  rect: fixedPlane('Прямоугольник', FIXED_NODES.rect),
  parallelogram: fixedPlane('Параллелограмм', FIXED_NODES.parallelogram),
  trapezoid: {
    label: 'Трапеция',
    group: 'plane',
    defaults: () => ({ slantL: 0.18, slantR: 0.82 }),
    params: trapezoidParams,
    nodes: (props) => {
      const params = trapezoidParams(props);
      return trapezoidPoints(params.slantL, params.slantR);
    },
    figures: (props) => {
      const params = trapezoidParams(props);
      return [poly(trapezoidPoints(params.slantL, params.slantR))];
    },
    knobs: (props) => {
      const params = trapezoidParams(props);
      const points = trapezoidPoints(params.slantL, params.slantR);
      return [
        { key: 'slantL', x: points[0][0], y: 6 },
        { key: 'slantR', x: points[1][0], y: 6 },
      ];
    },
    knob: (key, u, props) => {
      const current = trapezoidParams(props);
      const t = clamp((u - 8) / 84, 0, 1);
      if (key === 'slantL') return { slantL: Math.min(t, current.slantR - 0.12) };
      if (key === 'slantR') return { slantR: Math.max(t, current.slantL + 0.12) };
      return null;
    },
  },
  diamond: fixedPlane('Ромб', FIXED_NODES.diamond),
  hexagon: fixedPlane('Шестиугольник', FIXED_NODES.hexagon, { regular: true }),
  circle: {
    label: 'Окружность',
    group: 'plane',
    regular: true,
    nodes: () => FIXED_NODES.circle,
    figures: () => [ellipse(50, 50, 42, 42)],
  },
  cube: { label: 'Куб', group: 'solid', regular: true, depth: 20, model: (depth) => cabinet(depth, CUBE_FRONT, 0) },
  box: { label: 'Параллелепипед', group: 'solid', depth: 20, ...leanKnob, model: (depth, props) => cabinet(depth, BOX_FRONT, solidLean(props)) },
  prism3: { label: 'Треугольная призма', group: 'solid', depth: 20, ...leanKnob, model: (depth, props) => uprightPrism(3, depth, solidLean(props)) },
  prism6: { label: 'Шестиугольная призма', group: 'solid', depth: 20, ...leanKnob, model: (depth, props) => uprightPrism(6, depth, solidLean(props)) },
  pyramid3: { label: 'Треугольная пирамида', group: 'solid', depth: 0, model: (depth, props) => pyramidSolid('pyramid3', depth, props) },
  pyramid4: { label: 'Правильная пирамида', group: 'solid', depth: 0, model: (depth, props) => pyramidSolid('pyramid4', depth, props) },
  pyramid6: { label: 'Шестиугольная пирамида', group: 'solid', depth: 0, model: (depth, props) => pyramidSolid('pyramid6', depth, props) },
  cylinder: { label: 'Цилиндр', group: 'solid', depth: 14, model: (depth) => cylinderSolid(depth) },
  cone: { label: 'Конус', group: 'solid', depth: 0, model: (depth) => coneSolid(depth) },
  sphere: { label: 'Шар', group: 'solid', regular: true, depth: 16, model: (depth) => sphereSolid(depth) },
};

const GROUPS = [
  { id: 'plane', label: 'Планиметрия' },
  { id: 'solid', label: 'Стереометрия' },
];

export const SHAPE_KINDS = Object.entries(KINDS).map(([id, kind]) => ({ id, label: kind.label }));

export const SHAPE_GROUPS = GROUPS.map((group) => ({
  ...group,
  kinds: SHAPE_KINDS.filter((item) => KINDS[item.id].group === group.id),
}));

const KNOB_KEYS = new Set(['skew', 'spin', 'slantL', 'slantR', 'lean']);

function kindOf(id) {
  return KINDS[id] || KINDS.cube;
}

export function isSolid(id) {
  return KINDS[id]?.group === 'solid';
}

/** Правильная фигура: при смене размера по умолчанию держит пропорции. */
export function isRegularShape(id) {
  return Boolean(KINDS[id]?.regular);
}

/** Ручка формы фигуры (вершина, поворот, наклон, скос), а не рамки. */
export function isKnobHandle(key) {
  return KNOB_KEYS.has(key);
}

export function defaultDepth(id) {
  return KINDS[id]?.depth ?? 20;
}

function clampDepth(value, id) {
  const n = Number(value);
  const depth = Number.isFinite(n) ? n : defaultDepth(id);
  return Math.max(-20, Math.min(40, depth));
}

/** Значения props по умолчанию для нового объекта этого вида. */
export function planeDefaults(id) {
  return KINDS[id]?.defaults?.() || {};
}

export function planeNodes(id, props) {
  const kind = KINDS[id];
  return kind && kind.group === 'plane' ? kind.nodes(props) : null;
}

export function shapeKnobs(id, props) {
  return KINDS[id]?.knobs?.(props) || [];
}

export function shapeKnobPatch(id, key, u, props) {
  if (key === 'lean') return { lean: clamp((u - 50) / 42, -1, 1) };
  return KINDS[id]?.knob?.(key, u, props) ?? null;
}

// Модель тела зависит только от вида, глубины и props. props неизменяемые,
// поэтому модель кэшируется на объект props: за один рендер её читают фигура,
// ручки, якоря и точки привязки.
const modelCache = new WeakMap();

export function solidModel(id, depth, props) {
  const kind = KINDS[id]?.model ? KINDS[id] : KINDS.cube;
  const clamped = clampDepth(depth, id);
  if (!props || typeof props !== 'object') return kind.model(clamped, props || {});
  let byKey = modelCache.get(props);
  if (!byKey) {
    byKey = new Map();
    modelCache.set(props, byKey);
  }
  const key = `${id}|${clamped}`;
  let model = byKey.get(key);
  if (!model) {
    model = kind.model(clamped, props);
    byKey.set(key, model);
  }
  return model;
}

export function modelOf(shape) {
  return solidModel(shape.props.shape, shape.props.depth, shape.props);
}

function renderSolid(model) {
  const parts = [];
  model.faces.forEach((face) => {
    parts.push(poly(face.points.map((index) => model.nodes[index]), face.tone));
  });
  model.edges.filter((edge) => edge.hidden).forEach((edge) => {
    parts.push(segment(model.nodes[edge.a], model.nodes[edge.b], true));
  });
  (model.figures || []).forEach((fig) => parts.push(fig));
  return parts;
}

export function shapeFigures(id, depth, props) {
  const kind = kindOf(id);
  if (kind.group === 'plane') return kind.figures(props || {});
  return renderSolid(solidModel(KINDS[id] ? id : 'cube', depth, props));
}

export function shapeToneOpacity(tone) {
  return TONE[tone] || 1;
}

export function shapeHandle(id, depth, props) {
  const model = solidModel(id, depth, props);
  return { x: model.handle[0], y: model.handle[1] };
}

export function solidAnchors(id, depth, props) {
  if (!isSolid(id)) return null;
  const model = solidModel(id, depth, props);
  return { apex: model.apex || null, base: model.baseDrag || null };
}

export function depthFromLocal(id, x, y, props) {
  const start = shapeHandle(id, 0, props);
  const end = shapeHandle(id, 40, props);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len2 = dx * dx + dy * dy || 1;
  const t = ((x - start.x) * dx + (y - start.y) * dy) / len2;
  return clampDepth(t * 40, id);
}

export function pyramidBaseOf(shape) {
  const depth = clampDepth(shape.props?.depth, 'pyramid3');
  return pyramidBase(shape.props?.shape, depth, shape.props).map((point) => [point[0], point[1]]);
}

export function moveApex(id, props, u, v) {
  const foot = [clamp(u, 4, 96), clamp(v + PYRAMID_HEIGHT, 4, 96)];
  return { foot: [r(foot[0]), r(foot[1])] };
}

export function movePyramidBase(shape, index, local) {
  const base = pyramidBaseOf(shape);
  if (!base[index]) return shape;
  base[index] = [r(clamp(local[0], -20, 120)), r(clamp(local[1], -20, 120))];
  const binds = Array.isArray(shape.props.baseBinds) ? shape.props.baseBinds.slice() : base.map(() => null);
  binds[index] = null;
  return { ...shape, props: { ...shape.props, base, baseBinds: binds } };
}
