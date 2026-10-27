// Вид графики GeoGebra — центр и ширина окна в единицах чертежа, не в пикселях.
// Общий для теории, AI-подсказок и доски.

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

export function readGeoGebraUnit(api) {
  const props = viewProperties(api);
  if (!props) return null;
  return Math.max(props.invXscale, props.invYscale);
}

// Тот же масштаб в единицах на пиксель, центр прежний. Меняется только поле после сдвига меню.
export function writeUniformUnit(api, view, unit) {
  const props = viewProperties(api);
  const frame = viewWindow(view, props);
  if (!props || !frame || !(unit > 0) || typeof api.setCoordSystem !== 'function') return false;
  api.setCoordSystem(
    frame.cx - (unit * props.width) / 2,
    frame.cx + (unit * props.width) / 2,
    frame.cy - (unit * props.height) / 2,
    frame.cy + (unit * props.height) / 2,
  );
  return true;
}

// Один масштаб на обе оси при смене размера рамки: круг остаётся кругом.
export function fitUniformGeoGebraView(api, view) {
  const props = viewProperties(api);
  const frame = viewWindow(view, props);
  if (!props || !frame || typeof api.setCoordSystem !== 'function') return false;
  const unit = Math.max(frame.wx / props.width, frame.wy / props.height);
  if (!(unit > 0)) return false;
  api.setCoordSystem(
    frame.cx - (unit * props.width) / 2,
    frame.cx + (unit * props.width) / 2,
    frame.cy - (unit * props.height) / 2,
    frame.cy + (unit * props.height) / 2,
  );
  return true;
}
