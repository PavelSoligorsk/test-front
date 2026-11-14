import { smoothPath } from '../geometry';
import { LASER_COLOR, LASER_FADE_MS, LASER_WIDTH } from '../constants';

// Аккуратная указка: один цвет, мягкое свечение и светлая сердцевина.
// Дорисовывается за время, сравнимое со временем жеста, затем хвост догоняет голову.

const SVG_NS = 'http://www.w3.org/2000/svg';

// Слои снаружи внутрь: [множитель ширины, прозрачность, цвет (null = цвет указки)]
const LAYERS = [
  [4.2, 0.14, null],
  [2.2, 0.28, null],
  [1.15, 0.95, null],
  [0.4, 0.85, '#ffffff'],
];

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function el(name, attrs) {
  const node = document.createElementNS(SVG_NS, name);
  for (const key in attrs) node.setAttribute(key, String(attrs[key]));
  return node;
}

export function playLaser(host, message) {
  const raw = Array.isArray(message?.points) ? message.points : [];
  const points = raw
    .map((point) => ({ x: Number(point?.x), y: Number(point?.y) }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  if (!host || points.length < 2) return;

  const origin = points[0];
  const local = points.map((point) => ({ x: point.x - origin.x, y: point.y - origin.y }));
  const color = message.color || LASER_COLOR;
  const width = Number(message.width) || LASER_WIDTH;
  const fadeMs = Math.max(1, Number(message.fadeMs) || LASER_FADE_MS);
  const reduceMotion =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const drawMs = reduceMotion ? 0 : Math.min(1600, Math.max(400, local.length * 6));

  const wrap = document.createElement('div');
  wrap.style.cssText =
    `position:absolute;left:${origin.x}px;top:${origin.y}px;width:12px;height:12px;` +
    'overflow:visible;pointer-events:none;opacity:1;';
  const svg = el('svg', { width: 12, height: 12 });
  svg.style.display = 'block';
  svg.style.overflow = 'visible';

  const d = smoothPath(local);
  const trail = el('g', {});
  const paths = LAYERS.map(([k, opacity, tint]) => {
    const path = el('path', {
      d,
      fill: 'none',
      stroke: tint || color,
      'stroke-width': width * k,
      'stroke-opacity': opacity,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      pathLength: 1,
    });
    trail.appendChild(path);
    return path;
  });

  // Кончик: мягкий ореол и маленькая светлая точка.
  const head = el('g', {});
  head.append(
    el('circle', { r: width * 3.2, fill: color, opacity: 0.22 }),
    el('circle', { r: width * 1.5, fill: color, opacity: 0.55 }),
    el('circle', { r: width * 0.75, fill: '#ffffff', opacity: 0.95 }),
  );

  svg.append(trail, head);
  wrap.appendChild(svg);
  host.appendChild(wrap);

  let total = 0;
  try {
    total = paths[0].getTotalLength();
  } catch (error) {
    total = 0;
  }

  // Показываем участок пути [from..to] в долях длины.
  const setWindow = (from, to) => {
    const dash = `${Math.max(to - from, 0.0001)} 2`;
    const offset = String(-from);
    for (const path of paths) {
      path.setAttribute('stroke-dasharray', dash);
      path.setAttribute('stroke-dashoffset', offset);
    }
  };

  const placeHead = (at, opacity) => {
    let x = local[0].x;
    let y = local[0].y;
    if (total > 0) {
      const tip = paths[0].getPointAtLength(Math.min(1, Math.max(0, at)) * total);
      x = tip.x;
      y = tip.y;
    }
    head.setAttribute('transform', `translate(${x} ${y})`);
    head.setAttribute('opacity', String(Math.max(0, opacity)));
  };

  setWindow(0, 0);
  placeHead(0, 1);

  let started = 0;
  const tick = (now) => {
    if (!wrap.isConnected) return;
    if (!started) started = now;
    const elapsed = now - started;

    if (elapsed < drawMs) {
      const progress = elapsed / drawMs;
      setWindow(0, progress);
      placeHead(progress, 1);
      requestAnimationFrame(tick);
      return;
    }

    // Затухание: хвост догоняет голову, свечение плавно гаснет.
    const fade = Math.min(1, (elapsed - drawMs) / fadeMs);
    setWindow(easeInOutCubic(fade), 1);
    trail.setAttribute('opacity', String(1 - fade * fade));
    placeHead(1, 1 - fade);

    if (fade < 1) requestAnimationFrame(tick);
    else wrap.remove();
  };
  requestAnimationFrame(tick);

  return () => wrap.remove();
}