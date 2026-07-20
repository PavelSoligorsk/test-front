/**
 * Нормализация теста: вычисление доп. полей
 */
export function normalizeTest(test) {
  if (!test) return null;

  return {
    ...test,
    taskCount: test.tasks?.length || test.task_count || 0,
    normalizedTitle: (test.title || '')
      .replace(/Тест:\s*|Класс,?\s*|Тема\s*/gi, '')
      .trim() || 'Без названия',
  };
}

/**
 * Проверка, доступен ли тест для прохождения
 */
export function isTestAvailable(test) {
  if (!test) return false;
  const tasks = test.tasks || [];
  return tasks.length > 0;
}
