import { XCircle } from 'lucide-react';
import { remarkMath, rehypeKatex, ReactMarkdown } from '../MarkdownRenderer';

/**
 * Компонент отображения AI-подсказки
 * Используется в TestPassing и TestResultDetail
 */
export default function MathHintPreview({ text, title = "💡 AI-ПОДСКАЗКА", isLoading = false, error = null, onClose = null }) {
  if (isLoading) {
    return (
      <div className="relative p-6 rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        {onClose && (
          <button onClick={onClose} className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-full">
            <XCircle size={18} className="text-slate-400" />
          </button>
        )}
        {title && <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">{title}</h4>}
        <div className="flex items-center space-x-3 py-4">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-200 border-t-blue-500" />
          <p className="text-sm text-slate-500">Генерирую подсказку...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative p-6 rounded-[2rem] border border-red-200 bg-red-50 shadow-sm">
        {onClose && (
          <button onClick={onClose} className="absolute top-4 right-4 p-1 hover:bg-red-100 rounded-full">
            <XCircle size={18} className="text-red-400" />
          </button>
        )}
        {title && <h4 className="text-[10px] font-black uppercase text-red-400 tracking-widest mb-4">{title}</h4>}
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  const formattedText = text
    ? text.replace(/\\n/g, '  \n').replace(/\n/g, '  \n')
    : "*Подсказка появится здесь...*";

  return (
    <div className="relative p-6 rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      {onClose && (
        <button onClick={onClose} className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-full z-10">
          <XCircle size={18} className="text-slate-400 hover:text-slate-600" />
        </button>
      )}
      {title && <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 pr-6">{title}</h4>}
      <div className="text-slate-700 text-sm md:text-base leading-relaxed">
        <ReactMarkdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
            p: ({ children }) => <p className="mb-4 last:mb-0 text-left">{children}</p>,
            inlineMath: ({ children }) => <span className="inline justify-center text-blue-600">{children}</span>,
            math: ({ children }) => <div className="my-4 flex justify-center overflow-x-auto">{children}</div>,
            br: () => <br className="block my-1" />,
            ul: ({ children }) => <ul className="list-disc pl-5 mb-4 text-left space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-5 mb-4 text-left space-y-1">{children}</ol>,
            li: ({ children }) => <li className="text-slate-700">{children}</li>,
          }}
        >
          {formattedText}
        </ReactMarkdown>
      </div>
      {text && text !== "*Подсказка появится здесь..." && (
        <div className="mt-4 pt-3 border-t border-slate-100 text-left">
          <p className="text-xs text-slate-400">Ответ сгенерирован с помощью ИИ. Возможны ошибки</p>
        </div>
      )}
    </div>
  );
}
