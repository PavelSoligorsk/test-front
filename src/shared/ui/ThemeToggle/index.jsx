import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../hooks';

export default function ThemeToggle({ className = '' }) {
  const { dark, toggle } = useTheme();

  return (
    <button
      type="button"
      onClick={toggle}
      className={`p-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-white ${className}`}
      title={dark ? 'Светлая тема' : 'Тёмная тема'}
      aria-label={dark ? 'Светлая тема' : 'Тёмная тема'}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
