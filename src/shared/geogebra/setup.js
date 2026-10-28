import { readGeoGebraView, writeGeoGebraView } from './view';

// Единый разбор setup из теории и AI-подсказок. Раньше было три копии с разным
// порядком применения, и один и тот же чертёж выглядел по-разному в теории и на доске.
//
// Порядок как на странице теории: оси и сетка по умолчанию (если это не материал
// geogebra.org) → строки view: → perspective: → команды по порядку → оформление
// (color:, size:, label:, show:, hide:, animate:) после короткой паузы.

const STYLE_PREFIXES = ['color:', 'size:', 'label:', 'show:', 'hide:', 'animate:'];
const STYLE_DELAY_MS = 200;

export function setupLines(setup) {
  return String(setup || '')
    .split('\n')
    .map((cmd) => cmd.trim())
    .filter((cmd) => cmd && !cmd.startsWith('//') && !cmd.startsWith('#'));
}

/** Код вида из SetPerspective("…") или perspective: — первый найденный. */
export function theoryPerspectiveCode(setup) {
  for (const cmd of setupLines(setup)) {
    const call = cmd.match(/^SetPerspective\s*\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)$/i);
    if (call) return (call[1] || call[2] || call[3] || '').trim();
    if (cmd.startsWith('perspective:')) return cmd.slice(12).trim();
  }
  return '';
}

const SOLID_COMMAND = /\b(Cube|Pyramid|Prism|Sphere|Cone|Cylinder|Tetrahedron|Octahedron|Dodecahedron|Icosahedron|Plane|PerpendicularPlane|Surface|Net|SetViewDirection)\s*\(/i;
const SPACE_POINT = /(^|[^\w\s])\s*\(\s*-?[\d.]+\s*,\s*-?[\d.]+\s*,\s*-?[\d.]+\s*\)/m;
const GRAPH_COMMAND = /(^|\n)\s*[a-zA-Z]\w*\s*\(\s*x\s*\)\s*=|(^|\n)\s*y\s*=|\b(ShowAxes|AxesVisible|ShowGrid|Function|Derivative|Integral|Asymptote|Extremum|Root)\s*\(/i;

/** Какое приложение нужно чертежу: 3d, graphing или geometry. */
export function theoryAppKind(setup) {
  const text = String(setup || '');
  const code = theoryPerspectiveCode(text).toUpperCase();
  if (code.includes('T') || SOLID_COMMAND.test(text) || SPACE_POINT.test(text)) return '3d';
  if (GRAPH_COMMAND.test(text)) return 'graphing';
  return 'geometry';
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

// Команды вида и осей идут через API: так они срабатывают сразу и одинаково в 2D и 3D.
function applyApiCommand(api, cmd) {
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

function applyView(api, parts) {
  if (parts.length < 4 || typeof api.setCoordSystem !== 'function') return;
  const xMin = parseFloat(parts[0]) || -10;
  const xMax = parseFloat(parts[1]) || 10;
  const yMin = parseFloat(parts[2]) || -10;
  const yMax = parseFloat(parts[3]) || 10;
  const zMin = parseFloat(parts[4]);
  const zMax = parseFloat(parts[5]);
  if (Number.isFinite(zMin) && Number.isFinite(zMax)) api.setCoordSystem(xMin, xMax, yMin, yMax, zMin, zMax);
  else api.setCoordSystem(xMin, xMax, yMin, yMax);
  if (parts.includes('grid')) api.setGridVisible(true);
  if (parts.includes('axes')) api.setAxesVisible(true, true);
}

function applyStyle(api, cmd) {
  if (cmd.startsWith('color:')) {
    const match = cmd.match(/color:\s*(\w+)\s*,\s*([\w#]+)/);
    if (match) api.setColor(match[1], ...hexToRgb(match[2]));
    return;
  }
  if (cmd.startsWith('size:')) {
    const match = cmd.match(/size:\s*(\w+)\s*,\s*(\d+)/);
    if (match) api.setPointSize(match[1], parseInt(match[2], 10));
    return;
  }
  if (cmd.startsWith('label:')) {
    const match = cmd.match(/label:\s*(\w+)\s*,\s*"([^"]+)"/);
    if (match) api.setCaption(match[1], match[2]);
    return;
  }
  if (cmd.startsWith('show:') || cmd.startsWith('hide:')) {
    const visible = cmd.startsWith('show:');
    cmd.slice(5).split(',').map((item) => item.trim()).filter(Boolean).forEach((item) => {
      if (item === 'grid') api.setGridVisible(visible);
      else if (item === 'axes') api.setAxesVisible(visible, visible);
      else api.setVisible(item, visible);
    });
    return;
  }
  if (cmd.startsWith('animate:')) {
    const match = cmd.match(/animate:\s*(\w+)\s*,\s*(\w+)\s*,?\s*(\d+)?/);
    if (!match) return;
    const on = match[2] === 'true';
    api.setAnimating(match[1], on);
    if (match[3]) api.setAnimationSpeed(match[1], parseFloat(match[3]));
    if (on) api.startAnimation();
    else api.stopAnimation();
  }
}

/** Разбор без побочных эффектов: удобно проверять и переиспользовать. */
export function parseSetup(setup) {
  const views = [];
  let perspective = '';
  const commands = [];
  const styles = [];
  setupLines(setup).forEach((cmd) => {
    if (cmd.startsWith('view:')) views.push(cmd.slice(5).split(',').map((item) => item.trim()));
    else if (cmd.startsWith('perspective:')) perspective = cmd.slice(12).trim();
    else if (STYLE_PREFIXES.some((prefix) => cmd.startsWith(prefix))) styles.push(cmd);
    else commands.push(cmd);
  });
  return { views, perspective, commands, styles };
}

function safely(fn) {
  try { fn(); } catch { /* команда не применилась */ }
}

/**
 * Строит чертёж по setup. Возвращает функцию отмены отложенного оформления.
 * material — чертёж из материала geogebra.org: оси и сетку по умолчанию не трогаем.
 */
export function runSetup(api, setup, { material = false } = {}) {
  if (!api) return () => {};
  const plan = parseSetup(setup);
  if (!material) {
    safely(() => api.setAxesVisible(true, true));
    safely(() => api.setGridVisible(true));
  }
  plan.views.forEach((parts) => safely(() => applyView(api, parts)));
  if (plan.perspective) safely(() => api.setPerspective(plan.perspective));
  plan.commands.forEach((cmd) => {
    safely(() => {
      if (!applyApiCommand(api, cmd)) api.evalCommand(cmd);
    });
  });
  if (!plan.styles.length) return () => {};
  const timer = setTimeout(() => {
    plan.styles.forEach((cmd) => safely(() => applyStyle(api, cmd)));
  }, STYLE_DELAY_MS);
  return () => clearTimeout(timer);
}

/** Сырые команды AI-подсказки: по одной через evalCommand. */
export function runCommands(api, commands) {
  (commands || []).forEach((cmd) => {
    const line = String(cmd || '').trim();
    if (line) safely(() => api.evalCommand(line));
  });
}
