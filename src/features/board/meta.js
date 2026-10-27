import { isPagesMeta } from './pages';

// Служебные объекты документа: фон и сетка доски, старый список страниц.

export const SURFACE_MARK = 'board-surface';
export const SURFACE_COLORS = ['#e7f4fb', '#ffffff', '#eceff1', '#2c2c2e', '#dff6fb', '#e4e8fb', '#fbf3d4', '#f3e8f6', '#e7f6e4', '#fde8e8'];
export const DEFAULT_SURFACE = { color: '#e7f4fb', grid: 'cell' };

export function isSurfaceMeta(obj) {
  return obj?.props?.system === SURFACE_MARK;
}

export function isHiddenBoardObject(obj) {
  return isPagesMeta(obj) || isSurfaceMeta(obj);
}

export function readSurface(objects) {
  const meta = (objects || []).find(isSurfaceMeta);
  const color = SURFACE_COLORS.includes(meta?.props?.color) ? meta.props.color : DEFAULT_SURFACE.color;
  const grid = meta?.props?.grid === 'empty' || meta?.props?.grid === 'rule' || meta?.props?.grid === 'cell'
    ? meta.props.grid
    : DEFAULT_SURFACE.grid;
  return { color, grid };
}
