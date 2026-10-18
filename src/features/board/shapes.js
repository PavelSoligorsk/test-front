const PLANE = [
  { id: 'rect', label: 'Прямоугольник', group: 'plane' },
  { id: 'round', label: 'Скруглённый', group: 'plane' },
  { id: 'ellipse', label: 'Эллипс', group: 'plane' },
  { id: 'triangle', label: 'Треугольник', group: 'plane' },
  { id: 'right', label: 'Прямоугольный', group: 'plane' },
  { id: 'diamond', label: 'Ромб', group: 'plane' },
  { id: 'parallelogram', label: 'Параллелограмм', group: 'plane' },
  { id: 'trapezoid', label: 'Трапеция', group: 'plane' },
  { id: 'hexagon', label: 'Шестиугольник', group: 'plane' },
  { id: 'heart', label: 'Сердце', group: 'plane' },
  { id: 'star', label: 'Звезда', group: 'plane' },
  { id: 'cloud', label: 'Облако', group: 'plane' },
  { id: 'bubble', label: 'Реплика', group: 'plane' },
];

const SOLID = [
  { id: 'cube', label: 'Куб', group: 'solid' },
  { id: 'box', label: 'Брусок', group: 'solid' },
  { id: 'pyramid', label: 'Пирамида', group: 'solid' },
  { id: 'prism', label: 'Призма', group: 'solid' },
  { id: 'cylinder', label: 'Цилиндр', group: 'solid' },
  { id: 'cone', label: 'Конус', group: 'solid' },
];

export const SHAPE_GROUPS = [
  { id: 'plane', label: 'Планиметрия', kinds: PLANE },
  { id: 'solid', label: 'Геометрия', kinds: SOLID },
];

export const SHAPE_KINDS = [...PLANE, ...SOLID];

const TONE = { top: 1, front: 0.86, side: 0.68 };

function poly(points, tone = 'front') {
  return { points, tone };
}

function path(d, tone = 'front') {
  return { d, tone };
}

function ellipse(cx, cy, rx, ry, tone = 'front') {
  return { ellipse: { cx, cy, rx, ry }, tone };
}

const FIGURES = {
  rect: [poly('4,4 96,4 96,96 4,96')],
  round: [path('M18 4 H82 Q96 4 96 18 V82 Q96 96 82 96 H18 Q4 96 4 82 V18 Q4 4 18 4 Z')],
  ellipse: [ellipse(50, 50, 46, 46)],
  triangle: [poly('50,6 94,94 6,94')],
  right: [poly('10,8 10,92 92,92')],
  diamond: [poly('50,4 96,50 50,96 4,50')],
  parallelogram: [poly('26,12 96,12 74,88 4,88')],
  trapezoid: [poly('22,14 78,14 96,88 4,88')],
  hexagon: [poly('50,4 93,27 93,73 50,96 7,73 7,27')],
  heart: [path('M50 86 C22 66 8 52 8 34 C8 18 20 8 34 8 C42 8 47 13 50 20 C53 13 58 8 66 8 C80 8 92 18 92 34 C92 52 78 66 50 86 Z')],
  star: [poly('50,6 61,36 94,38 68,58 76,90 50,72 24,90 32,58 6,38 39,36')],
  cloud: [path('M28 74 H74 C86 74 94 66 94 56 C94 48 88 42 80 40 C80 26 70 16 56 16 C46 16 38 22 34 30 C24 30 16 38 16 48 C16 60 24 70 28 74 Z')],
  bubble: [path('M14 10 H86 Q96 10 96 20 V62 Q96 72 86 72 H40 L24 90 V72 H14 Q4 72 4 62 V20 Q4 10 14 10 Z')],
  cube: [
    poly('50,16 84,34 50,52 16,34', 'top'),
    poly('16,34 50,52 50,86 16,68', 'side'),
    poly('50,52 84,34 84,68 50,86', 'front'),
  ],
  box: [
    poly('46,18 88,32 54,48 12,34', 'top'),
    poly('12,34 54,48 54,84 12,70', 'side'),
    poly('54,48 88,32 88,68 54,84', 'front'),
  ],
  pyramid: [
    poly('50,10 86,42 50,56 14,42', 'top'),
    poly('14,42 50,56 50,90 14,74', 'side'),
    poly('50,56 86,42 86,74 50,90', 'front'),
  ],
  prism: [
    poly('22,28 50,14 78,28 50,42', 'top'),
    poly('22,28 50,42 50,86 22,72', 'side'),
    poly('50,42 78,28 78,72 50,86', 'front'),
  ],
  cylinder: [
    ellipse(50, 24, 32, 12, 'top'),
    poly('18,24 82,24 82,78 18,78', 'front'),
    ellipse(50, 78, 32, 12, 'front'),
  ],
  cone: [
    poly('50,10 84,72 16,72', 'front'),
    ellipse(50, 72, 34, 12, 'top'),
  ],
};

export function shapeFigures(id) {
  return FIGURES[id] || FIGURES.rect;
}

export function shapeToneOpacity(tone) {
  return TONE[tone] || 1;
}
