import {
  fitUniformGeoGebraView,
  isGeoGebraView,
  readGeoGebraUnit,
  readGeoGebraView,
  sameGeoGebraView,
  writeGeoGebraView,
  writeUniformUnit,
} from '../../shared/geogebra/view';

export {
  fitUniformGeoGebraView,
  isGeoGebraView,
  readGeoGebraUnit,
  readGeoGebraView,
  sameGeoGebraView,
  writeGeoGebraView,
  writeUniformUnit,
};

// Потолок настоящего буфера холста (CSS-размер × масштаб × dpr²): дальше браузер,
// особенно мобильный, начинает терять холсты.
const MAX_BACKING_PIXELS = 4096 * 4096;
const PIXEL_STEPS = [1, 1.5, 2, 3, 4];

// Во сколько раз апплет больше своей рамки на доске. GeoGebra сама рисует холст
// с плотностью экрана (canvas.width = clientWidth × devicePixelRatio), поэтому здесь
// только зум доски, без dpr. Шаги вместо точного зума: мелкий зум не пересоздаёт холст.
export function geoPixelScale(zoom = 1, box, cap = 0) {
  const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
  let ratio = PIXEL_STEPS.find((step) => step >= (zoom || 1) - 1e-3) ?? PIXEL_STEPS[PIXEL_STEPS.length - 1];
  if (cap > 0) ratio = Math.min(ratio, cap);
  if (box && box.w > 0 && box.h > 0) {
    ratio = Math.min(ratio, Math.sqrt(MAX_BACKING_PIXELS / (box.w * box.h * dpr * dpr)));
  }
  return Math.max(1, ratio);
}

export function readGeoGebraPerspective(api) {
  if (typeof api?.getPerspectiveXML !== 'function') return '';
  try {
    const xml = api.getPerspectiveXML();
    return typeof xml === 'string' ? xml : '';
  } catch {
    return '';
  }
}

function elementLabels(xml) {
  const labels = [];
  const re = /<element\b[^>]*\blabel="([^"]+)"/g;
  let match = re.exec(xml);
  while (match) {
    labels.push(match[1]);
    match = re.exec(xml);
  }
  labels.sort();
  return labels;
}

export function readConstructionTargets(xml) {
  const targets = [];
  const elementRe = /<element\b([^>]*)>([\s\S]*?)<\/element>/g;
  let match = elementRe.exec(xml);
  while (match) {
    const attrs = match[1];
    const body = match[2];
    const type = /type="([^"]+)"/.exec(attrs)?.[1];
    const label = /label="([^"]+)"/.exec(attrs)?.[1];
    if (label && (type === 'numeric' || type === 'angle')) {
      const raw = /<value\b[^>]*\bval="([^"]+)"/.exec(body)?.[1];
      const value = raw == null ? NaN : parseFloat(raw);
      if (Number.isFinite(value)) targets.push({ name: label, kind: 'number', value });
    } else if (label && (type === 'point' || type === 'point3d')) {
      const coords = /<coords\b([^>]*?)\/?>/.exec(body)?.[1] || '';
      const x = parseFloat(/\bx="([^"]+)"/.exec(coords)?.[1]);
      const y = parseFloat(/\by="([^"]+)"/.exec(coords)?.[1]);
      const z = parseFloat(/\bz="([^"]+)"/.exec(coords)?.[1] ?? '1');
      const w = parseFloat(/\bw="([^"]+)"/.exec(coords)?.[1] ?? '');
      if (Number.isFinite(x) && Number.isFinite(y) && type === 'point3d') {
        const scale = Number.isFinite(w) && Math.abs(w) > 1e-8 ? w : 1;
        targets.push({ name: label, kind: 'point3', x: x / scale, y: y / scale, z: (Number.isFinite(z) ? z : 0) / scale });
      } else if (Number.isFinite(w) && Math.abs(w) > 1e-8) {
        targets.push({ name: label, kind: 'point3', x: x / w, y: y / w, z: (Number.isFinite(z) ? z : 0) / w });
      } else if (Number.isFinite(z) && Math.abs(z) > 1e-8) {
        targets.push({ name: label, kind: 'point', x: x / z, y: y / z });
      }
    }
    match = elementRe.exec(xml);
  }
  return targets;
}

export function sameConstruction(api, xml) {
  if (!api || !xml || typeof api.exists !== 'function') return false;
  const labels = elementLabels(xml);
  if (!labels.length) return false;
  return !labels.some((name) => !api.exists(name));
}

// Доли панелей меню. Пиксели экрана сюда не входят: на телефоне и на компьютере они разные.
export function readMenuValue(api) {
  const xml = readGeoGebraPerspective(api);
  if (!xml) return '';
  const panes = [];
  const paneRe = /<pane\b([^>]*)\/?>/g;
  let pane = paneRe.exec(xml);
  while (pane) {
    const divider = parseFloat(/\bdivider="([^"]+)"/.exec(pane[1])?.[1]);
    const orientation = /\borientation="([^"]+)"/.exec(pane[1])?.[1] || '1';
    if (divider >= 0 && divider <= 1) panes.push(`${orientation}:${divider.toFixed(4)}`);
    pane = paneRe.exec(xml);
  }
  return panes.join(',');
}

function placeSplit(dragger, fraction) {
  if (!(dragger instanceof HTMLElement) || !(fraction >= 0 && fraction <= 1)) return false;
  const panel = dragger.parentElement;
  const menu = dragger.previousElementSibling;
  const graphics = dragger.nextElementSibling;
  if (!(panel instanceof HTMLElement) || !(menu instanceof HTMLElement)) return false;
  const horizontal = dragger.classList.contains('gwt-SplitLayoutPanel-HDragger');
  const total = horizontal ? panel.clientWidth : panel.clientHeight;
  if (!(total > 2)) return false;
  const size = Math.round(total * fraction);
  const current = horizontal ? menu.offsetWidth : menu.offsetHeight;
  if (Math.abs(current - size) < 2) return false;
  const bar = horizontal ? dragger.offsetWidth : dragger.offsetHeight;
  if (horizontal) {
    menu.style.width = `${size}px`;
    dragger.style.left = `${size}px`;
    if (graphics instanceof HTMLElement) graphics.style.left = `${size + bar}px`;
  } else {
    menu.style.height = `${size}px`;
    dragger.style.top = `${size}px`;
    if (graphics instanceof HTMLElement) graphics.style.top = `${size + bar}px`;
  }
  return true;
}

// Ориентация 1 — левая панель (ширина), 0 — верхняя. Та же доля на любом устройстве.
export function applyMenuValue(host, value) {
  if (!host || !value) return false;
  const parts = String(value).split(',').map((item) => {
    const [orientation, raw] = item.split(':');
    return { orientation: orientation || '1', divider: parseFloat(raw) };
  }).filter((item) => item.divider >= 0 && item.divider <= 1);
  if (!parts.length) return false;
  const horizontal = [...host.querySelectorAll('.gwt-SplitLayoutPanel-HDragger')];
  const vertical = [...host.querySelectorAll('.gwt-SplitLayoutPanel-VDragger')];
  let across = 0;
  let down = 0;
  let applied = false;
  parts.forEach((part) => {
    const dragger = part.orientation === '0' ? vertical[down++] : horizontal[across++];
    if (placeSplit(dragger, part.divider)) applied = true;
  });
  return applied;
}

const CAMERA_KEYS = ['xZero', 'yZero', 'zZero', 'scale', 'xAngle', 'zAngle'];

export function readCamera3d(xml) {
  const view = /<euclidianView3D\b[^>]*>([\s\S]*?)<\/euclidianView3D>/.exec(String(xml || ''))?.[1];
  const attrs = view && /<coordSystem\b([^>]*)\/?>/.exec(view)?.[1];
  if (!attrs) return null;
  const camera = {};
  for (const key of CAMERA_KEYS) {
    const value = parseFloat(new RegExp(`\\b${key}="([^"]+)"`).exec(attrs)?.[1]);
    if (!Number.isFinite(value)) return null;
    camera[key] = value;
  }
  return camera.scale > 0 ? camera : null;
}

export function angleGap(from, to) {
  return ((((to - from) % 360) + 540) % 360) - 180;
}

export function sameCamera(a, b, tolerance = 1e-3) {
  if (!a || !b) return false;
  return CAMERA_KEYS.every((key) => (
    key === 'xAngle' || key === 'zAngle'
      ? Math.abs(angleGap(a[key], b[key])) < tolerance
      : Math.abs(a[key] - b[key]) < tolerance * Math.max(1, Math.abs(a[key]))
  ));
}

export function readGeoGebraCamera(api) {
  return readCamera3d(readGeoGebraXml(api));
}

export function stripCamera(xml) {
  return String(xml || '').replace(
    /(<euclidianView3D\b[^>]*>[\s\S]*?)<coordSystem\b[^>]*\/>/,
    '$1',
  );
}

function roundCam(value) {
  return Math.round(value * 1e4) / 1e4;
}

export function cameraToWire(cam, size) {
  const base = Math.min(size.w, size.h);
  if (!(base > 0) || !(cam?.scale > 0)) return null;
  return {
    az: roundCam(cam.zAngle),
    el: roundCam(cam.xAngle),
    c: [roundCam(cam.xZero), roundCam(cam.yZero), roundCam(cam.zZero)],
    z: roundCam(cam.scale / base),
  };
}

export function cameraFromWire(wire, size) {
  const base = Math.min(size.w, size.h);
  if (!wire || !(base > 0) || !(wire.z > 0)) return null;
  const [xZero, yZero, zZero] = wire.c || [];
  if (![wire.az, wire.el, xZero, yZero, zZero].every(Number.isFinite)) return null;
  return {
    zAngle: wire.az,
    xAngle: wire.el,
    xZero,
    yZero,
    zZero,
    scale: wire.z * base,
  };
}

export function withCamera(xml, cam) {
  if (!cam) return String(xml || '');
  return String(xml || '').replace(
    /(<euclidianView3D\b[^>]*>[\s\S]*?)<coordSystem\b([^>]*)\/>/,
    (full, head, attrs) => {
      let next = attrs;
      for (const key of CAMERA_KEYS) {
        if (!Number.isFinite(cam[key])) continue;
        const re = new RegExp(`\\b${key}="[^"]*"`);
        const value = `${key}="${cam[key]}"`;
        next = re.test(next) ? next.replace(re, value) : `${next} ${value}`;
      }
      return `${head}<coordSystem${next}/>`;
    },
  );
}

// Поворот — точной командой, центр и масштаб — кубом вокруг центра: у куба
// масштаб обратно пропорционален половине ребра, коэффициент уточняется по факту.
export function writeGeoGebraCamera(api, camera, fit) {
  if (!api || !camera || !(fit > 0)) return 0;
  const azimuth = camera.zAngle + 180;
  const elevation = -camera.xAngle;
  const half = fit / camera.scale;
  const x = -camera.xZero;
  const y = -camera.yZero;
  const z = -camera.zZero;
  try { api.setRepaintingActive?.(false); } catch { /* старая сборка рисует сразу */ }
  try {
    api.evalCommand(`SetViewDirection(Vector((1; ${azimuth.toFixed(4)}°; ${elevation.toFixed(4)}°)), false)`);
    api.setCoordSystem(x - half, x + half, y - half, y + half, z - half, z + half);
  } finally {
    try { api.setRepaintingActive?.(true); } catch { /* перерисовка включится сама */ }
  }
  return half;
}

export function elementStates(xml) {
  const states = new Map();
  const re = /<element\b([^>]*)>([\s\S]*?)<\/element>/g;
  let match = re.exec(String(xml || ''));
  while (match) {
    const label = /label="([^"]+)"/.exec(match[1])?.[1];
    if (label) {
      const body = match[2];
      const coords = /<coords\b[^>]*\/?>/.exec(body)?.[0] || '';
      const value = /<value\b[^>]*\/?>/.exec(body)?.[0] || '';
      states.set(label, coords + value);
    }
    match = re.exec(String(xml || ''));
  }
  return states;
}

export function layoutSignature(api) {
  const xml = readGeoGebraPerspective(api);
  if (!xml) return '';
  const views = [];
  const re = /<view\b([^>]*)\/?>/g;
  let match = re.exec(xml);
  while (match) {
    const attr = (name) => new RegExp(`\\b${name}="([^"]*)"`).exec(match[1])?.[1] || '';
    if (attr('id')) views.push(`${attr('id')}:${attr('visible')}:${attr('tab')}:${attr('location')}`);
    match = re.exec(xml);
  }
  const panes = [];
  const paneRe = /<pane\b([^>]*)\/?>/g;
  let pane = paneRe.exec(xml);
  while (pane) {
    const divider = parseFloat(/\bdivider="([^"]+)"/.exec(pane[1])?.[1]);
    const orientation = /\borientation="([^"]+)"/.exec(pane[1])?.[1] || '';
    panes.push(`${orientation}:${Number.isFinite(divider) ? divider.toFixed(2) : ''}`);
    pane = paneRe.exec(xml);
  }
  const toolbar = /<toolbar\b([^>]*)\/?>/.exec(xml)?.[1] || '';
  const input = /<input\b([^>]*)\/?>/.exec(xml)?.[1] || '';
  return `${views.sort().join(',')}|${panes.join(',')}|${toolbar.replace(/\s+/g, ' ')}|${input.replace(/\s+/g, ' ')}`;
}

export function graphStructure(xml) {
  return String(xml || '')
    .replace(/<coords\b[^>]*\/?>/g, '')
    .replace(/<value\b[^>]*\/?>/g, '')
    .replace(/<coordSystem\b[^>]*\/?>/g, '')
    .replace(/\s+/g, '');
}

export function readGeoGebraXml(api) {
  if (typeof api?.getXML !== 'function') return '';
  try {
    const xml = api.getXML();
    return typeof xml === 'string' ? xml : '';
  } catch {
    return '';
  }
}

export function readGeoGebraBase64(api) {
  if (!api?.getBase64) return Promise.resolve('');
  return new Promise((resolve) => {
    let timer = 0;
    const finish = (value) => {
      if (!timer) return;
      window.clearTimeout(timer);
      timer = 0;
      resolve(typeof value === 'string' ? value : '');
    };
    timer = window.setTimeout(() => finish(''), 4000);
    try {
      const sync = api.getBase64((value) => finish(value));
      if (typeof sync === 'string') finish(sync);
    } catch {
      finish('');
    }
  });
}
