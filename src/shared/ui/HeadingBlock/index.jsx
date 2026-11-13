import { ArrowLeft } from 'lucide-react';
import { IconWell, Sheet } from '../Sheet';

const backClass =
  'group inline-flex items-center justify-center w-10 h-10 rounded-lg shrink-0 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-50 active:scale-95 transition-[background-color,color,transform] motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-white';

export function HeadingBlock({
  icon,
  title,
  hint,
  onBack,
  backLabel = 'Назад',
  extra,
  titleAs: Title = 'h1',
}) {
  return (
    // Мобильные: extra переносится под заголовок. От sm: всё в одну строку, extra справа
    <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-x-6 gap-y-4">
      <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1 basis-full sm:basis-[9rem]">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            title={backLabel}
            aria-label={backLabel}
            className={backClass}
          >
            <ArrowLeft
              size={18}
              strokeWidth={2}
              className="transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none"
            />
          </button>
        ) : icon ? (
          <IconWell>{icon}</IconWell>
        ) : null}

        <div className="min-w-0">
          <Title className="text-xl md:text-2xl font-semibold leading-tight tracking-[-0.02em] text-zinc-900 dark:text-zinc-100 text-balance">
            {title}
          </Title>
          {hint ? (
            <p className="mt-1 text-sm leading-snug tabular-nums text-zinc-500 dark:text-zinc-400 truncate">
              {hint}
            </p>
          ) : null}
        </div>
      </div>

      {extra ? <div className="min-w-0 max-w-full sm:shrink-0">{extra}</div> : null}
    </div>
  );
}

export function PageHeading(props) {
  return (
    <Sheet className="p-5 sm:p-6 md:p-8">
      <HeadingBlock {...props} />
    </Sheet>
  );
}