export function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function lessonTitle(date = new Date()) {
  const day = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(date);
  const time = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(date);
  return `Урок ${day}, ${time}`;
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

export function createBoard(title = lessonTitle()) {
  const now = new Date().toISOString();
  return {
    id: uid(),
    title,
    lessonId: null,
    createdAt: now,
    updatedAt: now,
    camera: { x: 64, y: 72, zoom: 1 },
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

export const GEOGEBRA_TEMPLATES = [
  { id: 'right-triangle', title: 'Прямоугольный треугольник', appName: 'geometry' },
  { id: 'circle', title: 'Окружность', appName: 'geometry' },
  { id: 'coordinates', title: 'Координатная плоскость', appName: 'graphing' },
  { id: 'parabola', title: 'Парабола', appName: 'graphing' },
];

export function geogebraTemplate(id) {
  return GEOGEBRA_TEMPLATES.find((item) => item.id === id) || null;
}
