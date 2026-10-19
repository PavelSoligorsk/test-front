const PLANE = [
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
  { id: 'pyramid4', label: 'Четырёхугольная пирамида' },
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

function arc(cx, cy, rx, ry, upper, dashed) {
  const sweep = upper ? 0 : 1;
  return {
    d: `M${r(cx - rx)} ${r(cy)} A${r(rx)} ${r(Math.max(ry, 0.8))} 0 0 ${sweep} ${r(cx + rx)} ${r(cy)}`,
    fill: 'none',
    dashed,
    tone: 'line',
  };
}

function ring(n, cx, cy, rx, ry, rotate = -Math.PI / 2) {
  return Array.from({ length: n }, (_, i) => {
    const a = rotate + (i * 2 * Math.PI) / n;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
  });
}

function block(d, box) {
  const dx = d * 0.62;
  const dy = d * 0.48;
  const L = box.l;
  const T = box.t;
  const R = box.r;
  const B = box.b;
  const l = L - dx;
  const t = T - dy;
  const right = R - dx;
  const bottom = B - dy;
  const parts = [];
  if (d > 0.4) {
    parts.push(poly([[L, T], [R, T], [right, t], [l, t]], 'top'));
    parts.push(poly([[L, T], [l, t], [l, bottom], [L, B]], 'side'));
  }
  parts.push(poly([[L, T], [R, T], [R, B], [L, B]], 'front'));
  if (d > 0.4) {
    parts.push(segment([right, t], [right, bottom], true));
    parts.push(segment([l, bottom], [right, bottom], true));
    parts.push(segment([right, bottom], [R, B], true));
  }
  return parts;
}

function obliquePrism(n, d, cx, cy, rx, ry, rotate) {
  const dx = d * 0.62;
  const dy = d * 0.5;
  const front = ring(n, cx, cy, rx, ry, rotate);
  const back = front.map(([x, y]) => [x - dx, y - dy]);
  const parts = [];
  if (d > 0.4) {
    front.forEach((point, i) => {
      const j = (i + 1) % n;
      const midY = (point[1] + front[j][1]) / 2;
      if (midY < cy - 1) return;
      parts.push(poly([point, front[j], back[j], back[i]], midY > cy + ry * 0.2 ? 'front' : 'side'));
    });
  }
  parts.push(poly(front, 'front'));
  if (d > 0.4) {
    front.forEach((point, i) => {
      const j = (i + 1) % n;
      const midY = (back[i][1] + back[j][1]) / 2;
      if (midY < cy + 1) parts.push(segment(back[i], back[j], true));
      if (point[1] < cy && point[0] > cx - rx * 0.2) parts.push(segment(point, back[i], true));
    });
  }
  return parts;
}

function pyramid(n, d, rotate) {
  const apex = [50 + d * 0.9, 14];
  const base = ring(n, 50, 72, 34, 16, rotate);
  const parts = [];
  base.forEach((point, i) => {
    const j = (i + 1) % n;
    const midY = (point[1] + base[j][1]) / 2;
    if (midY >= 70) parts.push(poly([apex, point, base[j]], midY > 80 ? 'front' : 'side'));
  });
  base.forEach((point, i) => {
    const j = (i + 1) % n;
    const midY = (point[1] + base[j][1]) / 2;
    if (midY < 70) parts.push(segment(point, base[j], true));
    if (point[1] < 70) parts.push(segment(apex, point, true));
  });
  return parts;
}

function cylinder(d) {
  const ry = 5 + d * 0.28;
  const parts = [
    ellipse(50, 24, 32, ry, 'top'),
    poly([[18, 24], [82, 24], [82, 78], [18, 78]], 'front'),
    ellipse(50, 78, 32, ry, 'front'),
    arc(50, 78, 32, ry, true, true),
  ];
  return parts;
}

function cone(d) {
  const ry = 7 + d * 0.12;
  const apex = [50 + d * 0.95, 12];
  return [
    poly([apex, [84, 74], [16, 74]], 'front'),
    ellipse(50, 74, 34, ry, 'front'),
    arc(50, 74, 34, ry, true, true),
  ];
}

function sphere(d) {
  const ry = 4 + d * 0.72;
  return [
    ellipse(50, 50, 40, 40, 'front'),
    arc(50, 50, 40, ry, false, false),
    arc(50, 50, 40, ry, true, true),
    segment([50, 10], [50, 90], true),
  ];
}

const FIGURES = {
  polyline: () => [{ d: 'M8 74 L30 28 L52 58 L74 16 L94 48', fill: 'none', tone: 'line' }],
  triangle: () => [poly([[50, 8], [94, 90], [6, 90]])],
  right: () => [poly([[12, 10], [12, 90], [90, 90]])],
  rect: () => [poly([[8, 16], [92, 16], [92, 84], [8, 84]])],
  parallelogram: () => [poly([[28, 16], [94, 16], [72, 84], [6, 84]])],
  trapezoid: () => [poly([[24, 18], [76, 18], [94, 84], [6, 84]])],
  diamond: () => [poly([[50, 6], [94, 50], [50, 94], [6, 50]])],
  hexagon: () => [poly([[50, 6], [90, 28], [90, 72], [50, 94], [10, 72], [10, 28]])],
  circle: () => [ellipse(50, 50, 42, 42)],
  cube: (d) => block(d, { l: 30, t: 34, r: 90, b: 90 }),
  box: (d) => block(d, { l: 34, t: 42, r: 94, b: 80 }),
  prism3: (d) => obliquePrism(3, d, 58, 60, 30, 30, -Math.PI / 2),
  prism6: (d) => obliquePrism(6, d, 58, 58, 30, 28, -Math.PI / 2),
  pyramid3: (d) => pyramid(3, d, -Math.PI / 2),
  pyramid4: (d) => pyramid(4, d, Math.PI / 4),
  pyramid6: (d) => pyramid(6, d, -Math.PI / 2),
  cylinder,
  cone,
  sphere,
};

export function shapeFigures(id, depth) {
  const draw = FIGURES[id] || FIGURES.cube;
  return draw(clampDepth(depth, id));
}

export function shapeToneOpacity(tone) {
  return TONE[tone] || 1;
}

function handlePoint(id, depth) {
  const d = clampDepth(depth, id);
  if (id === 'cone' || id === 'pyramid3' || id === 'pyramid4' || id === 'pyramid6') {
    return { x: 50 + d * 0.95, y: id === 'cone' ? 12 : 14 };
  }
  if (id === 'sphere') return { x: 90, y: 50 + (4 + d * 0.72) };
  if (id === 'cylinder') return { x: 82, y: 24 + (5 + d * 0.28) };
  const dx = d * 0.62;
  const dy = d * 0.48;
  if (id === 'box') return { x: 34 - dx, y: 42 - dy };
  if (id === 'prism3' || id === 'prism6') return { x: 28 - dx, y: 30 - dy };
  return { x: 30 - dx, y: 34 - dy };
}

export function shapeHandle(id, depth) {
  return handlePoint(id, depth);
}

export function depthFromLocal(id, x, y) {
  const start = handlePoint(id, 0);
  const end = handlePoint(id, 40);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len2 = dx * dx + dy * dy || 1;
  const t = ((x - start.x) * dx + (y - start.y) * dy) / len2;
  return clampDepth(t * 40, id);
}
