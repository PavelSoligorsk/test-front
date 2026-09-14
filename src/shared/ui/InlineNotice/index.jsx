/**
 * Inline success / error notice — replaces alert() on Operate surfaces.
 */
export default function InlineNotice({ tone = 'error', children, className = '' }) {
  if (!children) return null;

  const tones = {
    error: 'text-red-700 dark:text-red-400',
    success: 'text-zinc-700 dark:text-zinc-300',
    info: 'text-zinc-600 dark:text-zinc-400',
  };

  return (
    <p className={`text-sm ${tones[tone] || tones.error} ${className}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </p>
  );
}

export function formatApiDetail(detail, fallback = 'Что-то пошло не так') {
  if (!detail) return fallback;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => (typeof d === 'string' ? d : d?.msg || JSON.stringify(d))).join('; ') || fallback;
  }
  if (typeof detail === 'object' && detail.msg) return detail.msg;
  return fallback;
}
