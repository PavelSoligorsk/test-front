/**
 * Вычисление оценки по проценту
 */
export function getGrade(percent) {
  if (percent >= 90) return { label: 'Отлично', color: 'text-emerald-600' };
  if (percent >= 75) return { label: 'Хорошо', color: 'text-blue-600' };
  if (percent >= 50) return { label: 'Удовлетворительно', color: 'text-amber-600' };
  return { label: 'Неудовлетворительно', color: 'text-red-600' };
}

/**
 * Форматирование результата для отображения
 */
export function formatResult(result) {
  if (!result) return null;

  return {
    ...result,
    grade: getGrade(result.percent || 0),
    formattedDate: new Date(result.completed_at || result.created_at).toLocaleDateString('ru-RU'),
    formattedPercent: `${Math.round(result.percent || 0)}%`,
  };
}
