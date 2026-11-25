import { HeadingBlock } from '../HeadingBlock';
import { Sheet } from '../Sheet';
import SearchField from '../SearchField';
import EmptyState from '../EmptyState';

/**
 * Карточка-список как у истории ученика: заголовок, поиск, пустое состояние, строки.
 * search: { value, onChange, onClear?, placeholder?, className? }
 * empty: { icon?, title, hint? }
 * getRowProps(row) дополняет <li> (клик, role, className).
 */
export default function ListPage({
  title,
  hint,
  titleAs = 'h2',
  tone = 'page',
  icon,
  onBack,
  backLabel,
  search,
  extra,
  rows = [],
  rowKey,
  renderRow,
  getRowProps,
  empty,
}) {
  const searchField = search ? (
    <SearchField
      className={search.className || 'w-full sm:w-72'}
      value={search.value}
      onChange={search.onChange}
      onClear={search.onClear}
      placeholder={search.placeholder}
    />
  ) : null;

  const headingExtra = extra || searchField ? (
    <div className="flex max-w-full flex-wrap items-center gap-2">
      {extra}
      {searchField}
    </div>
  ) : null;

  return (
    <Sheet className="animate-in fade-in overflow-hidden duration-500">
      <div className={tone === 'section'
        ? 'border-b border-zinc-100 p-6 pb-4 dark:border-zinc-800/60 md:p-8 md:pb-4'
        : 'border-b border-zinc-100 p-5 dark:border-zinc-800/60 sm:p-6 md:p-8'}>
        {tone === 'section' ? (
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{title}</h2>
              {hint ? <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{hint}</p> : null}
            </div>
            {headingExtra}
          </div>
        ) : (
          <HeadingBlock
            title={title}
            hint={hint}
            titleAs={titleAs}
            icon={icon}
            onBack={onBack}
            backLabel={backLabel}
            extra={headingExtra}
          />
        )}
      </div>

      {rows.length > 0 ? (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
          {rows.map((row) => {
            const props = getRowProps?.(row) || {};
            const { className = '', ...rest } = props;
            return (
              <li
                key={rowKey(row)}
                className={`px-5 py-4 sm:px-6 md:px-8 md:py-5 ${className}`}
                {...rest}
              >
                {renderRow(row)}
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          framed={false}
          className="py-16"
          icon={empty?.icon}
          title={empty?.title || 'Пусто'}
          hint={empty?.hint}
        />
      )}
    </Sheet>
  );
}
