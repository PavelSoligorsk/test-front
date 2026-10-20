export function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function audienceKey(board) {
  if (board?.groupId != null) return `g:${board.groupId}`;
  const ids = [...(board?.studentIds || [])].map(Number).filter((id) => Number.isFinite(id)).sort((a, b) => a - b);
  if (!ids.length) return `id:${board?.id || ''}`;
  return `s:${ids.join(',')}`;
}

export function groupBoardSeries(boards) {
  const order = [];
  const groups = new Map();
  (boards || []).forEach((board) => {
    const key = audienceKey(board);
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key).push(board);
  });
  return order.map((key) => {
    const pages = groups.get(key).slice().sort((a, b) => {
      const left = new Date(a.updatedAt || 0).getTime();
      const right = new Date(b.updatedAt || 0).getTime();
      return right - left;
    });
    return { ...pages[0], pageCount: pages.length, pageIds: pages.map((page) => page.id) };
  });
}

export function pageCountLabel(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  const word = mod10 === 1 && mod100 !== 11
    ? 'страница'
    : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
      ? 'страницы'
      : 'страниц';
  return `${count} ${word}`;
}

export function boardCountLabel(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  const word = mod10 === 1 && mod100 !== 11
    ? 'доска'
    : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
      ? 'доски'
      : 'досок';
  return `${count} ${word}`;
}

export function formatUpdated(iso) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function createBoard(title = 'Доска') {
  const now = new Date().toISOString();
  return {
    id: uid(),
    title,
    teacherId: null,
    groupId: null,
    studentIds: [],
    revision: null,
    createdAt: now,
    updatedAt: now,
    camera: { x: 0, y: 0, zoom: 1 },
    objects: [],
  };
}

export const STICKY_COLORS = [
  { id: 'amber', label: 'Жёлтый', bg: '#fde68a' },
  { id: 'rose', label: 'Розовый', bg: '#fecdd3' },
  { id: 'sky', label: 'Голубой', bg: '#bae6fd' },
  { id: 'green', label: 'Зелёный', bg: '#bbf7d0' },
  { id: 'violet', label: 'Сиреневый', bg: '#ddd6fe' },
];

export const PEN_COLORS = ['#18181b', '#dc2626', '#2563eb', '#16a34a', '#d97706', '#7c3aed'];

export const PEN_WIDTHS = [2, 4, 8];

export const TEXT_SIZES = [
  { id: 's', label: 'S', size: 16 },
  { id: 'm', label: 'M', size: 22 },
  { id: 'l', label: 'L', size: 32 },
  { id: 'xl', label: 'XL', size: 48 },
];

export const TASK_SIZES = [
  { id: 's', label: 'S', size: 16 },
  { id: 'm', label: 'M', size: 20 },
  { id: 'l', label: 'L', size: 26 },
  { id: 'xl', label: 'XL', size: 34 },
];

export const TASK_FONT = 20;

export const SELECTION_COLOR = '#4262ff';

export const SHAPE_FILLS = [
  { id: 'white', label: 'Белый', fill: '#ffffff', stroke: '#18181b' },
  { id: 'blue', label: 'Синий', fill: '#dbeafe', stroke: '#1d4ed8' },
  { id: 'green', label: 'Зелёный', fill: '#dcfce7', stroke: '#15803d' },
  { id: 'amber', label: 'Жёлтый', fill: '#fef3c7', stroke: '#b45309' },
  { id: 'rose', label: 'Розовый', fill: '#ffe4e6', stroke: '#be123c' },
];

export function createObject(type, fields) {
  return {
    id: uid(),
    type,
    x: 0,
    y: 0,
    w: 160,
    h: 120,
    rotation: 0,
    props: {},
    ...fields,
  };
}

export const GEOGEBRA_APPS = [
  { id: 'geometry', title: 'Планиметрия' },
  { id: '3d', title: 'Стереометрия' },
  { id: 'graphing', title: 'Графики' },
];

export function geogebraApp(id) {
  return GEOGEBRA_APPS.find((item) => item.id === id) || GEOGEBRA_APPS[0];
}
