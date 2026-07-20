/**
 * Форматирование даты
 */
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ru-RU');
}

/**
 * Обрезка текста до определённой длины
 */
export function truncate(text, length = 100) {
  if (!text) return '';
  return text.length > length ? text.slice(0, length) + '...' : text;
}

/**
 * Нормализация названия теста (удаление префиксов)
 */
export function normalizeTestTitle(title) {
  if (!title) return 'Без названия';
  return title.replace(/Тест:\s*|Класс,?\s*|Тема\s*/gi, '').trim();
}

/**
 * Получение названия темы по ключу
 */
export function getTopicLabel(topicKey, topicsMap = {}) {
  if (topicsMap[topicKey]) return topicsMap[topicKey];
  
  const MAIN_TOPICS = {
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
  
  return MAIN_TOPICS[topicKey] || topicKey;
}

/**
 * Получение цвета для уровня сложности
 */
export function getDifficultyColor(level) {
  if (level >= 4) return 'text-red-500 bg-red-50 border-red-100';
  if (level >= 3) return 'text-amber-500 bg-amber-50 border-amber-100';
  return 'text-emerald-500 bg-emerald-50 border-emerald-100';
}

/**
 * Получение CSS градиента для темы
 */
export function getTopicGradient(topicKey) {
  const gradients = {
    numbers: 'from-orange-500 to-red-500',
    expressions: 'from-purple-500 to-pink-500',
    equations: 'from-blue-500 to-cyan-500',
    inequalities: 'from-yellow-500 to-amber-500',
    functions: 'from-emerald-500 to-teal-500',
    text: 'from-sky-500 to-blue-500',
    planim: 'from-green-500 to-lime-500',
    stereo: 'from-indigo-500 to-violet-500',
    geometry: 'from-rose-500 to-orange-500',
  };
  return gradients[topicKey] || 'from-slate-500 to-slate-600';
}

/**
 * Получение иконки для темы
 */
export function getTopicIcon(topicKey) {
  const icons = {
    numbers: '🔢',
    expressions: '📝',
    equations: '⚖️',
    inequalities: '≷',
    functions: '📈',
    text: '📖',
    planim: '📐',
    stereo: '🧊',
    geometry: '📏',
  };
  return icons[topicKey] || '📚';
}
