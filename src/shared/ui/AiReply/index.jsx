import { XCircle } from 'lucide-react';
import MarkdownWithGeoGebra from '../MarkdownWithGeoGebra';

const markdownComponents = {
  inlineMath: ({ children }) => <span className="inline justify-center text-zinc-900 dark:text-zinc-100">{children}</span>,
  math: ({ children }) => <div className="my-3 flex justify-center overflow-x-auto">{children}</div>,
};

export default function AiReply({
  title,
  text = '',
  figures = null,
  isLoading = false,
  loadingText = 'Генерирую...',
  error = null,
  onClose = null,
  disclaimer = true,
  framed = true,
  className = '',
}) {
  const body = (
    <>
      {isLoading ? (
        <div className="flex items-center gap-2 py-1">
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-500 dark:border-zinc-700 dark:border-t-zinc-300" />
          <p className="text-xs text-zinc-500">{loadingText}</p>
        </div>
      ) : error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : (
        <div className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          <MarkdownWithGeoGebra figures={figures} markdownComponents={markdownComponents}>
            {text}
          </MarkdownWithGeoGebra>
        </div>
      )}
      {disclaimer && !isLoading && !error && text ? (
        <p className="mt-3 border-t border-zinc-100 pt-2 text-[11px] text-zinc-400 dark:border-zinc-800">
          Ответ сгенерирован с помощью ИИ. Возможны ошибки
        </p>
      ) : null}
    </>
  );

  if (!framed) {
    return <div className={className}>{body}</div>;
  }

  return (
    <div className={`relative rounded-xl border p-3 ${
      error
        ? 'border-red-200 bg-red-50/70 dark:border-red-500/30 dark:bg-red-500/10'
        : 'border-zinc-200/80 bg-zinc-50/70 dark:border-zinc-800 dark:bg-zinc-900/40'
    } ${className}`}>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute right-2 top-2 rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          <XCircle size={14} />
        </button>
      ) : null}
      {title ? (
        <p className={`mb-2 pr-6 text-[11px] font-medium ${error ? 'text-red-500' : 'text-zinc-400'}`}>
          {title}
        </p>
      ) : null}
      {body}
    </div>
  );
}
