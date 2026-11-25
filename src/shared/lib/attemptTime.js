const SHIFT_MS = 3 * 60 * 60 * 1000;

/** Сервер пишет попытку без пояса. К такому времени добавляем 3 часа. */
export function attemptDate(iso) {
  if (!iso) return null;
  const raw = String(iso).trim();
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  if (/(?:z|[+-]\d{2}:?\d{2})$/i.test(raw)) return date;
  return new Date(date.getTime() + SHIFT_MS);
}

export function formatAttemptTime(iso) {
  const date = attemptDate(iso);
  if (!date) return '—';
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
