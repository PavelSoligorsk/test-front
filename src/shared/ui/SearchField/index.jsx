import { Search, XCircle } from 'lucide-react';

export default function SearchField({
  value,
  onChange,
  onClear,
  placeholder,
  className = '',
}) {
  return (
    <div className={`relative ${className}`}>
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 py-2.5 pl-9 pr-9 rounded-xl text-sm font-medium text-zinc-900 dark:text-zinc-100 outline-none focus:ring-4 focus:ring-zinc-100 dark:focus:ring-zinc-800/50 focus:border-zinc-300 dark:focus:border-zinc-700 placeholder:text-zinc-400"
      />
      {onClear && value ? (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          aria-label="Очистить"
        >
          <XCircle size={14} />
        </button>
      ) : null}
    </div>
  );
}
