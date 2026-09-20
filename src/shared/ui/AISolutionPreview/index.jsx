import { XCircle } from 'lucide-react';
import MarkdownWithGeoGebra from '../MarkdownWithGeoGebra';

const markdownComponents = {
  inlineMath: ({ children }) => <span className="inline justify-center text-zinc-900 dark:text-zinc-100">{children}</span>,
  math: ({ children }) => <div className="my-4 flex justify-center overflow-x-auto">{children}</div>,
};

function Shell({ children, onClose, title, error = false }) {
  return (
    <div className={`relative p-6 rounded-3xl border shadow-sm ${
      error
        ? 'border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10'
        : 'border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-[#09090b]'
    }`}>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className={`absolute top-4 right-4 p-1 rounded-full z-10 ${
            error
              ? 'hover:bg-red-100 dark:hover:bg-red-500/20'
              : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <XCircle size={18} className={error ? 'text-red-400' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'} />
        </button>
      )}
      {title && (
        <h4 className={`text-xs font-medium mb-4 pr-6 ${
          error ? 'text-red-500' : 'text-zinc-500 dark:text-zinc-400'
        }`}>
          {title}
        </h4>
      )}
      {children}
    </div>
  );
}

export default function AISolutionPreview({ data, isLoading = false, error = null, onClose = null }) {
  if (isLoading) {
    return (
      <Shell title="AI-решение" onClose={onClose}>
        <div className="flex items-center space-x-3 py-4">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-zinc-200 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-100" />
          <p className="text-sm text-zinc-500">Генерирую решение...</p>
        </div>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell title="AI-решение" onClose={onClose} error>
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </Shell>
    );
  }

  if (!data) return null;

  const hasSolution = data.ai_solution && data.ai_solution.trim().length > 0;
  const isSuccess = data.success !== false;
  const figures = Array.isArray(data.geogebra) ? data.geogebra : null;

  if (!isSuccess || !hasSolution) {
    return (
      <Shell title="AI-решение" onClose={onClose}>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">{data.message || 'Не удалось получить решение от ИИ.'}</p>
      </Shell>
    );
  }

  const body = data.ai_solution.replace(/===\s*ОТВЕТ\s*===/gi, '\n\n**Ответ**\n\n');

  return (
    <Shell title="AI-решение" onClose={onClose}>
      <div className="text-zinc-700 dark:text-zinc-300 text-sm md:text-base leading-relaxed">
        <MarkdownWithGeoGebra figures={figures} markdownComponents={markdownComponents}>
          {body}
        </MarkdownWithGeoGebra>
      </div>
      <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-left">
        <p className="text-xs text-zinc-400">Ответ сгенерирован с помощью ИИ. Возможны ошибки</p>
      </div>
    </Shell>
  );
}
