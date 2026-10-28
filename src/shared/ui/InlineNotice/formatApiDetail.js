/** Текст ошибки из `detail` ответа FastAPI: строка, список ошибок валидации или объект. */
export function formatApiDetail(detail, fallback = 'Что-то пошло не так') {
  if (!detail) return fallback;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => (typeof d === 'string' ? d : d?.msg || JSON.stringify(d))).join('; ') || fallback;
  }
  if (typeof detail === 'object' && detail.msg) return detail.msg;
  return fallback;
}
