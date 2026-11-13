import { Sheet } from '../Sheet';

export default function EmptyState({ icon, title, hint, children, framed = true, className = '' }) {
  const body = (
    <>
      {icon ? (
        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 text-zinc-400">
          {icon}
        </div>
      ) : null}
      <div>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</p>
        {hint ? <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{hint}</p> : null}
      </div>
      {children}
    </>
  );

  if (!framed) {
    return (
      <div className={`flex flex-col items-center text-center gap-4 ${className}`}>
        {body}
      </div>
    );
  }

  return (
    <Sheet className={`py-16 px-6 flex flex-col items-center text-center gap-4 ${className}`}>
      {body}
    </Sheet>
  );
}
