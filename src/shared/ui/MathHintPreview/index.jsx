import { XCircle } from 'lucide-react';
import MarkdownWithGeoGebra from '../MarkdownWithGeoGebra';

export default function MathHintPreview({ text, geogebra, title = "AI-подсказка", isLoading = false, error = null, onClose = null }) {
  if (isLoading) {
    return (
      <div className="relative p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-[#09090b] shadow-sm">
        {onClose && (
          <button type="button" onClick={onClose} className="absolute top-4 right-4 p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
            <XCircle size={18} className="text-zinc-400" />
          </button>
        )}
        {title && <h4 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-4">{title}</h4>}
        <div className="flex items-center space-x-3 py-4">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-zinc-200 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-100" />
          <p className="text-sm text-zinc-500">Генерирую подсказку...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative p-6 rounded-3xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 shadow-sm">
        {onClose && (
          <button type="button" onClick={onClose} className="absolute top-4 right-4 p-1 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-full">
            <XCircle size={18} className="text-red-400" />
          </button>
        )}
        {title && <h4 className="text-xs font-medium text-red-500 mb-4">{title}</h4>}
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  const hintText = typeof text === 'object' && text != null
    ? (text.hint || '')
    : (text || '*Подсказка появится здесь...*');
  const figures = Array.isArray(geogebra)
    ? geogebra
    : (Array.isArray(text?.geogebra) ? text.geogebra : null);

  return (
    <div className="relative p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-[#09090b] shadow-sm">
      {onClose && (
        <button type="button" onClick={onClose} className="absolute top-4 right-4 p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full z-10">
          <XCircle size={18} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200" />
        </button>
      )}
      {title && <h4 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-4 pr-6">{title}</h4>}
      <div className="text-zinc-700 dark:text-zinc-300 text-sm md:text-base leading-relaxed">
        <MarkdownWithGeoGebra
          figures={figures}
          markdownComponents={{
            inlineMath: ({ children }) => <span className="inline justify-center text-zinc-900 dark:text-zinc-100">{children}</span>,
            math: ({ children }) => <div className="my-4 flex justify-center overflow-x-auto">{children}</div>,
          }}
        >
          {hintText}
        </MarkdownWithGeoGebra>
      </div>
      {hintText && hintText !== '*Подсказка появится здесь...*' && (
        <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-left">
          <p className="text-xs text-zinc-400">Ответ сгенерирован с помощью ИИ. Возможны ошибки</p>
        </div>
      )}
    </div>
  );
}
