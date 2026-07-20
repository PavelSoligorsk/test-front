// Константы маршрутов
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  RESET_PASSWORD: '/reset-password',
  STUDENT: '/student',
  TEACHER: '/teacher',
  ADMIN: '/admin',
  TEST_PASSING: (testId) => `/test/${testId}`,
  RESULT: (resultId) => `/result/${resultId}`,
  ADMIN_RESULT: (resultId) => `/admin/results/${resultId}`,
  TEACHER_RESULT: (resultId) => `/teacher/results/${resultId}`,
  USER_PROFILE: (userId) => `/admin/users/${userId}`,
  TEACHER_STUDENT_PROFILE: (userId) => `/teacher/students/${userId}`,
  STATS: '/stats/me',
  STATS_USER: (userId) => `/stats/${userId}`,
  TASK_FORM: (id) => id ? `/admin/tasks/${id}` : '/admin/tasks/new',
};

// Основные темы для теории
export const MAIN_TOPICS = {
  numbers: 'Числа и вычисления',
  expressions: 'Выражения и их преобразования',
  equations: 'Уравнения',
  inequalities: 'Неравенства',
  functions: 'Координаты и функции',
  text: 'Текстовые задачи',
  planim: 'Планиметрия',
  stereo: 'Стереометрия',
  geometry: 'Геометрия',
  algebra: 'Алгебра',
};

// Уровни сложности
export const DIFFICULTY_LABELS = {
  1: 'Очень легко',
  2: 'Легко',
  3: 'Средне',
  4: 'Сложно',
  5: 'Очень сложно',
};

// Цвета для уровней сложности
export const DIFFICULTY_COLORS = {
  1: '#22c55e',
  2: '#84cc16',
  3: '#eab308',
  4: '#f97316',
  5: '#ef4444',
};

// Периоды для статистики
export const STATS_PERIODS = [
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: '3months', label: '3 месяца' },
  { value: '6months', label: 'Полгода' },
  { value: 'year', label: 'Год' },
  { value: 'all', label: 'Всё время' },
];
