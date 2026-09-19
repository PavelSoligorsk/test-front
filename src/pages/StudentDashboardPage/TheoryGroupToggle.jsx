export default function TheoryGroupToggle({ value, onChange }) {
  const item = (id, label) => (
    <button
      type="button"
      onClick={() => { if (value !== id) onChange(id); }}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        value === id
          ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
          : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
      }`}
    >
      {label}
    </button>
  );
  return (
    <div className="flex shrink-0 gap-1 rounded-xl border border-zinc-200 p-1 dark:border-zinc-800">
      {item('topics', 'По темам')}
      {item('class', 'По классам')}
    </div>
  );
}
