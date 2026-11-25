import { ArrowLeft } from 'lucide-react';

const wellClass =
  'flex shrink-0 items-center justify-center w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-white';

/** Карточка страницы как у статистики ученика: заголовок и цифры внутри одной секции. */
export function SummaryCard({ onBack, backLabel = 'Назад', icon, title, hint, extra, children }) {
  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800/60 dark:bg-[#09090b]">
      <div className={`flex flex-col items-start justify-between gap-6 p-6 md:flex-row md:items-center md:p-8 ${children ? 'border-b border-zinc-100 dark:border-zinc-800/60' : ''}`}>
        <div className="flex min-w-0 items-center gap-4">
          {onBack ? (
            <button type="button" onClick={onBack} title={backLabel} aria-label={backLabel} className={wellClass}>
              <ArrowLeft size={18} strokeWidth={2} />
            </button>
          ) : icon ? (
            <div className={wellClass}>{icon}</div>
          ) : null}
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{title}</h1>
            {hint ? <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{hint}</p> : null}
          </div>
        </div>
        {extra}
      </div>
      {children}
    </section>
  );
}

export function StatFigures({ columns = 2, children }) {
  const cols = columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2';
  return (
    <div className={`grid grid-cols-1 divide-y divide-zinc-100 dark:divide-zinc-800/60 sm:divide-x sm:divide-y-0 ${cols}`}>
      {children}
    </div>
  );
}

export function StatFigure({ value, caption }) {
  return (
    <div className="px-6 py-8 md:px-8">
      <p className="text-2xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-100">{value}</p>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{caption}</p>
    </div>
  );
}

/** Переключатель как период на статистике ученика. options: [{ value, label }] */
export function Segmented({ options, value, onChange }) {
  return (
    <div className="flex w-full items-center overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800/80 dark:bg-zinc-900/50 md:w-auto">
      {options.map((item) => {
        const active = value === item.value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={`flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-white md:flex-none ${
              active
                ? 'border border-zinc-200/80 bg-white text-zinc-900 shadow-sm dark:border-zinc-700/80 dark:bg-zinc-800 dark:text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

/** Секция под сводкой: заголовок text-lg и список, как блок «Темы». */
export function SectionCard({ title, hint, extra, children }) {
  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800/60 dark:bg-[#09090b]">
      <div className="flex items-start justify-between gap-4 p-6 pb-4 md:p-8 md:pb-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{title}</h2>
          {hint ? <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{hint}</p> : null}
        </div>
        {extra}
      </div>
      {children}
    </section>
  );
}
