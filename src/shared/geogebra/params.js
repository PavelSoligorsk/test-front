const APP_NAMES = new Set(['geometry', 'graphing', '3d']);

export function toGeoGebraAppName(app) {
  const name = String(app || 'geometry').toLowerCase();
  return APP_NAMES.has(name) ? name : 'geometry';
}

/** id материала geogebra.org: строка, не номер фигуры. */
export function materialIdOf(id) {
  return typeof id === 'string' && id.trim() && !/^\d+$/.test(id.trim()) ? id.trim() : '';
}

/**
 * Общие параметры GGBApplet. Скрипты из файла и материала не выполняются:
 * построение на доске может прислать любой участник.
 */
export function appletParams({
  id,
  width,
  height,
  appName = '',
  materialId = '',
  toolbar = false,
  algebraInput = false,
  enable3d,
  ...extra
}) {
  return {
    id,
    width: Math.max(40, Math.round(width)),
    height: Math.max(40, Math.round(height)),
    ...(appName ? { appName } : {}),
    ...(materialId ? { material_id: materialId } : {}),
    language: 'ru',
    showMenuBar: false,
    showToolBar: toolbar,
    showToolBarHelp: false,
    showAlgebraInput: algebraInput,
    showResetIcon: true,
    enableShiftDragZoom: true,
    enableLabelDrags: false,
    enableRightClick: false,
    enableFileFeatures: false,
    errorDialogsActive: false,
    enable3d: enable3d ?? appName === '3d',
    useBrowserForJS: true,
    disableJavaScript: true,
    borderColor: '#ffffff',
    scale: 1,
    allowUpscale: false,
    disableAutoScale: true,
    ...extra,
  };
}

let counter = 0;

export function nextAppletId(prefix = 'ggb') {
  counter += 1;
  return `${prefix}${Date.now().toString(36)}${counter}`;
}

/** Снимает апплет полностью: глобальный window[id], таймеры GWT, DOM. */
export function removeApplet(applet, id, host) {
  try { applet?.removeExistingApplet?.(id, false); } catch { /* апплет уже снят */ }
  try { window[id]?.remove?.(); } catch { /* веб-контекст уже закрыт */ }
  try { delete window[id]; } catch { /* имя занято */ }
  if (host) host.replaceChildren();
}
