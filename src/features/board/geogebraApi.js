// Холст GeoGebra — картинка. Рисуем его в пикселях экрана, не крупнее 3× рамки.
export function geoPixelScale(zoom = 1) {
  const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
  const raw = Math.min(3, Math.max(0.25, zoom) * dpr);
  const stepped = Math.round(raw * 4) / 4;
  return Math.min(3, Math.max(1, stepped));
}

let scriptPromise = null;

export function loadGeoGebraScript() {
  if (typeof window !== 'undefined' && window.GGBApplet) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://www.geogebra.org/apps/deployggb.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error('GeoGebra не загрузилась'));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
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

export function applyGeoGebraPerspective(api, xml) {
  if (!api || !xml || typeof api.setPerspective !== 'function') return false;
  try {
    api.setPerspective(xml);
    return true;
  } catch {
    return false;
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

export function theoryPerspectiveCode(setup) {
  const lines = String(setup || '').split('\n').map((line) => line.trim()).filter(Boolean);
  for (const cmd of lines) {
    const call = cmd.match(/^SetPerspective\s*\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)$/i);
    if (call) return (call[1] || call[2] || call[3] || '').trim();
    if (cmd.startsWith('perspective:')) return cmd.slice(12).trim();
  }
  return '';
}

function viewProperties(api) {
  if (typeof api?.getViewProperties !== 'function') return null;
  try {
    const raw = api.getViewProperties(1);
    const props = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const { xMin, yMin, invXscale, invYscale, width, height } = props || {};
    if (![xMin, yMin, invXscale, invYscale, width, height].every(Number.isFinite)) return null;
    if (!(invXscale > 0) || !(invYscale > 0) || !(width > 0) || !(height > 0)) return null;
    return { xMin, yMin, invXscale, invYscale, width, height };
  } catch {
    return null;
  }
}

function viewWindow(view, props) {
  const wx = Number.isFinite(view?.wx) ? view.wx : (props && Number.isFinite(view?.sx) ? props.width * view.sx : NaN);
  const wy = Number.isFinite(view?.wy) ? view.wy : (props && Number.isFinite(view?.sy) ? props.height * view.sy : NaN);
  if (!(wx > 0) || !(wy > 0) || !Number.isFinite(view?.cx) || !Number.isFinite(view?.cy)) return null;
  return { cx: view.cx, cy: view.cy, wx, wy };
}

// Вид графики — центр и ширина окна в единицах чертежа, не в пикселях.
// Иначе при разном размере холста копия оказывается в другом масштабе.
export function readGeoGebraView(api) {
  const props = viewProperties(api);
  if (!props) return null;
  return {
    cx: props.xMin + (props.width * props.invXscale) / 2,
    cy: props.yMin + (props.height * props.invYscale) / 2,
    wx: props.width * props.invXscale,
    wy: props.height * props.invYscale,
  };
}

export function isGeoGebraView(view) {
  return Boolean(viewWindow(view));
}

export function sameGeoGebraView(a, b) {
  const left = viewWindow(a);
  const right = viewWindow(b);
  if (!left || !right) return false;
  return Math.abs(left.cx - right.cx) <= 1e-6 * Math.max(1, Math.abs(left.cx))
    && Math.abs(left.cy - right.cy) <= 1e-6 * Math.max(1, Math.abs(left.cy))
    && Math.abs(left.wx / right.wx - 1) <= 1e-6
    && Math.abs(left.wy / right.wy - 1) <= 1e-6;
}

export function writeGeoGebraView(api, view) {
  const props = viewProperties(api);
  const window = viewWindow(view, props);
  if (!props || !window || typeof api.setCoordSystem !== 'function') return false;
  api.setCoordSystem(
    window.cx - window.wx / 2,
    window.cx + window.wx / 2,
    window.cy - window.wy / 2,
    window.cy + window.wy / 2,
  );
  return true;
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

// Поворот — точной командой, центр и масштаб — кубом вокруг центра: у куба
// масштаб обратно пропорционален половине ребра, коэффициент уточняется по факту.
export function writeGeoGebraCamera(api, camera, fit) {
  if (!api || !camera || !(fit > 0)) return 0;
  const azimuth = camera.zAngle + 180;
  const elevation = -camera.xAngle;
  api.evalCommand(`SetViewDirection(Vector((1; ${azimuth.toFixed(4)}°; ${elevation.toFixed(4)}°)), false)`);
  const half = fit / camera.scale;
  const x = -camera.xZero;
  const y = -camera.yZero;
  const z = -camera.zZero;
  api.setCoordSystem(x - half, x + half, y - half, y + half, z - half, z + half);
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

const SOLID_COMMAND = /\b(Cube|Pyramid|Prism|Sphere|Cone|Cylinder|Tetrahedron|Octahedron|Dodecahedron|Icosahedron|Plane|PerpendicularPlane|Surface|Net|SetViewDirection)\s*\(/i;
const SPACE_POINT = /(^|[^\w\s])\s*\(\s*-?[\d.]+\s*,\s*-?[\d.]+\s*,\s*-?[\d.]+\s*\)/m;
const GRAPH_COMMAND = /(^|\n)\s*[a-zA-Z]\w*\s*\(\s*x\s*\)\s*=|(^|\n)\s*y\s*=|\b(ShowAxes|AxesVisible|ShowGrid|Function|Derivative|Integral|Asymptote|Extremum|Root)\s*\(/i;

export function theoryAppKind(setup) {
  const text = String(setup || '');
  const code = theoryPerspectiveCode(text).toUpperCase();
  if (code.includes('T') || SOLID_COMMAND.test(text) || SPACE_POINT.test(text)) return '3d';
  if (GRAPH_COMMAND.test(text)) return 'graphing';
  return 'geometry';
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

function hexToRgb(hex) {
  const raw = String(hex || '').replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((ch) => ch + ch).join('') : raw;
  return [
    parseInt(full.slice(0, 2), 16) || 0,
    parseInt(full.slice(2, 4), 16) || 0,
    parseInt(full.slice(4, 6), 16) || 0,
  ];
}

function splitCallArgs(source) {
  const args = [];
  let current = '';
  let depth = 0;
  let quote = null;
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === '(') {
      depth += 1;
      current += ch;
      continue;
    }
    if (ch === ')') {
      if (depth === 0) break;
      depth -= 1;
      current += ch;
      continue;
    }
    if (ch === ',' && depth === 0) {
      args.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) args.push(current.trim());
  return args;
}

function parseCall(cmd) {
  const match = String(cmd).match(/^([A-Za-z_][\w]*)\s*\((.*)\)\s*$/);
  if (!match) return null;
  return { name: match[1].toLowerCase(), args: splitCallArgs(match[2]) };
}

function parseBool(text) {
  const value = String(text || '').trim().toLowerCase();
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}

function parsePoint(text) {
  const match = String(text || '').trim().match(/^\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)(?:\s*,\s*(-?\d+(?:\.\d+)?))?\s*\)$/);
  if (!match) return null;
  return {
    x: parseFloat(match[1]),
    y: parseFloat(match[2]),
    z: match[3] == null ? null : parseFloat(match[3]),
  };
}

function applyCenterView(api, point) {
  const view = point.z == null ? readGeoGebraView(api) : null;
  if (view && writeGeoGebraView(api, { ...view, cx: point.x, cy: point.y })) return;
  const coords = point.z == null ? `${point.x},${point.y}` : `${point.x},${point.y},${point.z}`;
  api.evalCommand(`CenterView((${coords}))`);
}

function applyZoomIn(api, args) {
  const numbers = args.map((item) => Number(String(item).trim()));
  if (numbers.length === 4 && numbers.every(Number.isFinite)) {
    const [xmin, ymin, xmax, ymax] = numbers;
    api.setCoordSystem(xmin, xmax, ymin, ymax);
    return;
  }
  if (numbers.length === 6 && numbers.every(Number.isFinite)) {
    const [xmin, ymin, zmin, xmax, ymax, zmax] = numbers;
    api.setCoordSystem(xmin, xmax, ymin, ymax, zmin, zmax);
    return;
  }
  api.evalCommand(`ZoomIn(${args.join(',')})`);
}

function applyTheoryCommand(api, cmd) {
  if (cmd.startsWith('view:')) {
    const parts = cmd.slice(5).split(',').map((item) => item.trim());
    if (parts.length >= 4 && typeof api.setCoordSystem === 'function') {
      const box = parts.slice(0, 4).map((item) => parseFloat(item));
      if (parts.length >= 6) api.setCoordSystem(...box, parseFloat(parts[4]) || -10, parseFloat(parts[5]) || 10);
      else api.setCoordSystem(...box);
      if (parts.includes('grid') && typeof api.setGridVisible === 'function') api.setGridVisible(true);
      if (parts.includes('axes') && typeof api.setAxesVisible === 'function') api.setAxesVisible(true, true);
    }
    return true;
  }
  if (cmd.startsWith('perspective:')) {
    const code = cmd.slice(12).trim();
    if (code) api.setPerspective(code);
    return true;
  }
  const call = parseCall(cmd);
  if (!call) return false;
  if (call.name === 'setperspective') {
    const code = (call.args[0] || '').replace(/^["']|["']$/g, '').trim();
    if (code) api.setPerspective(code);
    return true;
  }
  if (call.name === 'showaxes' || call.name === 'axesvisible') {
    const flags = call.args.map(parseBool);
    if (flags[0] == null) return false;
    const xAxis = flags[0];
    const yAxis = flags[1] == null ? flags[0] : flags[1];
    api.setAxesVisible(xAxis, yAxis);
    if (flags[2] != null) {
      try { api.setAxesVisible(-1, xAxis, yAxis, flags[2]); } catch { /* плоский вид осей уже выставлен */ }
    }
    return true;
  }
  if (call.name === 'showgrid') {
    const flag = parseBool(call.args[0]);
    if (flag == null) return false;
    api.setGridVisible(flag);
    return true;
  }
  if (call.name === 'zoomin') {
    applyZoomIn(api, call.args);
    return true;
  }
  if (call.name === 'centerview' || call.name === 'setcenterview') {
    const point = parsePoint(call.args[0]);
    if (!point) return false;
    applyCenterView(api, point);
    return true;
  }
  return false;
}

export function runTheorySetup(api, setup) {
  if (!api || !setup) return;
  const commands = String(setup)
    .split('\n')
    .map((cmd) => cmd.trim())
    .filter((cmd) => cmd && !cmd.startsWith('//') && !cmd.startsWith('#'));
  const delayed = [];
  commands.forEach((cmd) => {
    try {
      if (applyTheoryCommand(api, cmd)) return;
    } catch { /* команда вида не применилась, ниже обычный eval */ }
    if (cmd.startsWith('color:') || cmd.startsWith('size:') || cmd.startsWith('label:') || cmd.startsWith('show:') || cmd.startsWith('hide:') || cmd.startsWith('animate:')) {
      delayed.push(cmd);
      return;
    }
    try { api.evalCommand(cmd); } catch { /* команда не выполнилась */ }
  });
  if (!delayed.length) return;
  window.setTimeout(() => {
    delayed.forEach((cmd) => {
      try {
        if (cmd.startsWith('color:')) {
          const match = cmd.match(/color:\s*(\w+)\s*,\s*([\w#]+)/);
          if (match) api.setColor(match[1], ...hexToRgb(match[2]));
        } else if (cmd.startsWith('size:')) {
          const match = cmd.match(/size:\s*(\w+)\s*,\s*(\d+)/);
          if (match) api.setPointSize(match[1], parseInt(match[2], 10));
        } else if (cmd.startsWith('label:')) {
          const match = cmd.match(/label:\s*(\w+)\s*,\s*"([^"]+)"/);
          if (match) api.setCaption(match[1], match[2]);
        } else if (cmd.startsWith('show:') || cmd.startsWith('hide:')) {
          const visible = cmd.startsWith('show:');
          cmd.slice(5).split(',').map((item) => item.trim()).forEach((item) => {
            if (item === 'grid') api.setGridVisible(visible);
            else if (item === 'axes') api.setAxesVisible(visible, visible);
            else api.setVisible(item, visible);
          });
        } else if (cmd.startsWith('animate:')) {
          const match = cmd.match(/animate:\s*(\w+)\s*,\s*(\w+)\s*,?\s*(\d+)?/);
          if (!match) return;
          const on = match[2] === 'true';
          api.setAnimating(match[1], on);
          if (on) api.startAnimation();
          else api.stopAnimation();
          if (match[3]) api.setAnimationSpeed(match[1], parseFloat(match[3]));
        }
      } catch { /* оформление не применилось */ }
    });
  }, 200);
}

export function readGeoGebraBase64(api) {
  if (!api?.getBase64) return Promise.resolve('');
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(typeof value === 'string' ? value : '');
    };
    try {
      const sync = api.getBase64((value) => finish(value));
      if (typeof sync === 'string') finish(sync);
      setTimeout(() => finish(''), 4000);
    } catch {
      finish('');
    }
  });
}
