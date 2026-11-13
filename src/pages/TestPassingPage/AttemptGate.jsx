import { ThemeToggle } from '../../shared/ui';
import { Sheet } from '../../shared/ui/Sheet';

export default function AttemptGate({ icon, title, message, actions, iconClassName = 'bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300' }) {
  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] flex items-center justify-center p-4">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>
      <Sheet className="max-w-md w-full p-8 text-center space-y-5">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto ${iconClassName}`}>
          {icon}
        </div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">{title}</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{message}</p>
        <div className="flex gap-3 justify-center pt-2">{actions}</div>
      </Sheet>
    </div>
  );
}
