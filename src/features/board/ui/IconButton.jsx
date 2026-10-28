export default function IconButton({ label, onClick, disabled, className = '', children }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl text-zinc-700 hover:bg-zinc-100 disabled:opacity-30 min-[720px]:h-8 min-[720px]:w-8 dark:text-zinc-200 dark:hover:bg-zinc-900 ${className}`}
    >
      {children}
    </button>
  );
}
