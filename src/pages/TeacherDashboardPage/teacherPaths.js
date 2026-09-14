export const TEACHER_PATHS = {
  calendar: '/teacher/calendar',
  bank: '/teacher/bank',
  topics: '/teacher/topics',
  constructor: '/teacher/constructor',
  students: '/teacher/students',
  tests: '/teacher/tests',
  groups: '/teacher/groups',
  theory: '/teacher/theory',
  profile: '/teacher/profile',
};

/** Legacy ?tab= ids → path keys */
export const TEACHER_TAB_ALIASES = {
  calendar: 'calendar',
  bank: 'bank',
  sections: 'topics',
  constructor: 'constructor',
  students: 'students',
  tests_list: 'tests',
  groups: 'groups',
  theory_generator: 'theory',
  profile: 'profile',
};

export const TEACHER_TABS = [
  { key: 'calendar', label: 'Календарь' },
  { key: 'bank', label: 'Банк' },
  { key: 'topics', label: 'Темы' },
  { key: 'constructor', label: 'Конструктор' },
  { key: 'students', label: 'Ученики' },
  { key: 'tests', label: 'Тесты' },
  { key: 'groups', label: 'Группы' },
  { key: 'theory', label: 'Теория' },
];

export function teacherTabFromPath(pathname) {
  if (pathname.startsWith('/teacher/calendar')) return 'calendar';
  if (pathname.startsWith('/teacher/bank')) return 'bank';
  if (pathname.startsWith('/teacher/topics')) return 'topics';
  if (pathname.startsWith('/teacher/constructor')) return 'constructor';
  if (pathname.startsWith('/teacher/tests')) return 'tests';
  if (pathname.startsWith('/teacher/groups')) return 'groups';
  if (pathname.startsWith('/teacher/theory')) return 'theory';
  if (pathname.startsWith('/teacher/profile')) return 'profile';
  if (pathname.startsWith('/teacher/students')) return 'students';
  return 'bank';
}
