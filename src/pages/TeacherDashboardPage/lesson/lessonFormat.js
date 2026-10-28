export const PAYMENT_STATUS_MAP = {
  paid: { label: 'Оплачено', color: 'bg-zinc-100 text-zinc-700' },
  pending: { label: 'Ожидает', color: 'bg-zinc-100 text-zinc-700' },
  unpaid: { label: 'Не оплачено', color: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Отменено', color: 'bg-gray-100 text-gray-700' },
};

export const DAY_CODES = [
  { code: 'mon', label: 'Пн' },
  { code: 'tue', label: 'Вт' },
  { code: 'wed', label: 'Ср' },
  { code: 'thu', label: 'Чт' },
  { code: 'fri', label: 'Пт' },
  { code: 'sat', label: 'Сб' },
  { code: 'sun', label: 'Вс' },
];

// Format balance in kopecks → BYN
export function formatBalance(kopecks) {
  if (kopecks == null) return '—';
  const byn = (kopecks / 100).toFixed(2);
  const sign = kopecks >= 0 ? '+' : '';
  return `${sign}${byn} BYN`;
}

// Format price: kopecks → rubles for display
export function formatPrice(kopecks) {
  if (kopecks == null) return '—';
  return `${(kopecks / 100).toFixed(2)} BYN`;
}

/** Текст ошибки из ответа API или запасной. */
export function apiError(error, fallback) {
  return error?.response?.data?.detail || fallback;
}
