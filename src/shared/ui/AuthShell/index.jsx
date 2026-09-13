import { useState } from 'react';
import { Eye, EyeOff, GraduationCap } from 'lucide-react';
import ThemeToggle from '../ThemeToggle';

export const authField =
  'w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 rounded-xl text-sm font-medium text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white placeholder:text-zinc-400';

export const authLabel = 'text-xs font-medium text-zinc-500 dark:text-zinc-400';

export const authButton =
  'w-full py-3 rounded-xl text-sm font-medium bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-white dark:focus-visible:ring-offset-[#09090b] disabled:opacity-50 disabled:pointer-events-none';

export const authLink =
  'text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-white rounded-md';

export function AuthPasswordField({
  id,
  label,
  name,
  autoComplete,
  value,
  onChange,
  required,
  placeholder,
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-1.5">
      {label ? (
        <label htmlFor={id} className={authLabel}>{label}</label>
      ) : null}
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          required={required}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={`${authField} pr-12`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-1 top-1/2 -translate-y-1/2 min-h-10 min-w-10 inline-flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-white"
          aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
          title={visible ? 'Скрыть пароль' : 'Показать пароль'}
        >
          {visible ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
        </button>
      </div>
    </div>
  );
}

export default function AuthShell({ title, hint, children, footer }) {
  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100">
      <div className="flex justify-end px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <ThemeToggle className="min-h-11 min-w-11" />
      </div>
      <main className="flex items-center justify-center px-4 pb-10 pt-6">
        <div className="w-full max-w-md space-y-6 animate-in fade-in duration-500">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 shadow-sm">
              <GraduationCap size={18} strokeWidth={2} />
            </div>
            <p className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              EDU.CORE
            </p>
          </div>

          <div className="bg-white dark:bg-[#09090b] rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm p-6 md:p-8">
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">{title}</h1>
            {hint ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 mb-6">{hint}</p>
            ) : (
              <div className="mb-6" />
            )}
            {children}
          </div>

          {footer ? <div className="text-center space-y-2">{footer}</div> : null}
        </div>
      </main>
    </div>
  );
}
