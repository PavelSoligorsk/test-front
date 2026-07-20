import { useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { remarkMath, rehypeKatex, ReactMarkdown } from '../MarkdownRenderer';

/**
 * Компонент отображения AI-решения
 * Используется в TestResultDetail
 */
export default function AISolutionPreview({ data, isLoading = false, error = null, onClose = null }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (data?.ai_solution) {
      navigator.clipboard.writeText(data.ai_solution);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="relative p-6 rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        {onClose && (
          <button onClick={onClose} className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-full transition-colors">
            <XCircle size={18} className="text-slate-400" />
          </button>
        )}
        <h4 className="text-[10px] font-black uppercase text-green-600 tracking-widest mb-4">🤖 AI-РЕШЕНИЕ</h4>
        <div className="flex items-center space-x-3 py-4">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-200 border-t-green-500" />
          <p className="text-sm text-slate-500">Генерирую решение...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative p-6 rounded-[2rem] border border-red-200 bg-red-50 shadow-sm">
        {onClose && (
          <button onClick={onClose} className="absolute top-4 right-4 p-1 hover:bg-red-100 rounded-full transition-colors">
            <XCircle size={18} className="text-red-400" />
          </button>
        )}
        <h4 className="text-[10px] font-black uppercase text-red-600 tracking-widest mb-4">🤖 AI-РЕШЕНИЕ</h4>
        <div className="flex items-center gap-2 p-3 bg-red-100 rounded-xl">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
        <button onClick={() => window.location.reload()} className="mt-4 text-xs text-red-500 hover:text-red-700 underline">
          Попробовать снова
        </button>
      </div>
    );
  }

  if (!data) return null;

  const hasSolution = data.ai_solution && data.ai_solution.trim().length > 0;
  const hasAnswer = data.ai_answer && data.ai_answer.trim().length > 0;
  const isSuccess = data.success !== false;
  const isVerified = data.verified === true;

  if (!isSuccess || !hasSolution) {
    return (
      <div className="relative p-6 rounded-[2rem] border border-amber-200 bg-amber-50 shadow-sm">
        {onClose && (
          <button onClick={onClose} className="absolute top-4 right-4 p-1 hover:bg-amber-100 rounded-full transition-colors">
            <XCircle size={18} className="text-amber-400" />
          </button>
        )}
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle size={16} className="text-amber-600" />
          <h4 className="text-[10px] font-black uppercase text-amber-700 tracking-widest">🤖 AI-РЕШЕНИЕ</h4>
        </div>
        <p className="text-sm text-amber-700">{data.message || "Не удалось получить решение от ИИ."}</p>
      </div>
    );
  }

  return (
    <div className="relative p-6 rounded-[2rem] border shadow-sm bg-white">
      {onClose && (
        <button onClick={onClose} className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-full transition-colors z-10">
          <XCircle size={18} className="text-slate-400 hover:text-slate-600" />
        </button>
      )}
      
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4 pr-6">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-green-600">🤖 AI-РЕШЕНИЕ</h4>
          {isVerified ? (
            <span className="text-[8px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 size={10} /> ✓ ПРОВЕРЕНО
            </span>
          ) : (
            <span className="text-[8px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
              <AlertCircle size={10} /> ⚠ НЕ ПРОВЕРЕНО
            </span>
          )}
          {data.context?.difficulty && (
            <span className="text-[8px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
              Сложность: {data.context.difficulty}/5
            </span>
          )}
        </div>
        <button onClick={handleCopy} className="text-[8px] font-black uppercase text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1">
          {copied ? <><CheckCircle2 size={10} /> СКОПИРОВАНО</> : <>📋 КОПИРОВАТЬ</>}
        </button>
      </div>
      
      <div className={`text-slate-700 text-sm md:text-base leading-relaxed ${!isExpanded && 'max-h-48 overflow-hidden relative'}`}>
        <style>{`
          .math-solution .katex-display { overflow-x: auto; overflow-y: hidden; padding: 8px 0; margin: 12px 0; }
          .math-solution .katex-display > .katex { white-space: nowrap; }
          .math-solution .katex { font-size: 1.05em; }
          .math-solution pre { white-space: pre-wrap; word-wrap: break-word; }
        `}</style>
        <div className="math-solution">
          <ReactMarkdown
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
              p: ({ children }) => <p className="mb-4 last:mb-0 text-left whitespace-normal break-words">{children}</p>,
              strong: ({ children }) => <strong className="font-bold text-slate-900">{children}</strong>,
              code: ({ inline, children }) => inline
                ? <code className="bg-slate-100 px-1 py-0.5 rounded text-sm font-mono break-words">{children}</code>
                : <code className="block bg-slate-800 text-white p-3 rounded-xl overflow-x-auto text-sm my-2 whitespace-pre-wrap break-words">{children}</code>,
            }}
          >
            {data.ai_solution}
          </ReactMarkdown>
        </div>
        {!isExpanded && <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent pointer-events-none" />}
      </div>
      
      {!isExpanded && (
        <button onClick={() => setIsExpanded(true)} className="mt-2 text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1">
          <ChevronDown size={14} /> Показать полное решение
        </button>
      )}
      {isExpanded && data.ai_solution?.length > 1500 && (
        <button onClick={() => setIsExpanded(false)} className="mt-2 text-xs text-slate-400 hover:text-slate-600 font-medium flex items-center gap-1">
          <ChevronUp size={14} /> Свернуть
        </button>
      )}
      
      {hasAnswer && (
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className={`p-3 rounded-xl ${isVerified ? 'bg-emerald-50' : 'bg-amber-50'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Ответ AI</p>
                <p className="text-sm font-bold text-slate-800 font-mono break-words overflow-x-auto">{data.ai_answer}</p>
              </div>
              {data.correct_answer && (
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Правильный ответ</p>
                  <p className="text-sm font-bold text-green-700 font-mono break-words overflow-x-auto">{data.correct_answer}</p>
                </div>
              )}
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100/50">
              <p className={`text-[10px] font-medium ${isVerified ? 'text-emerald-600' : 'text-amber-600'}`}>
                {isVerified
                  ? <span className="flex items-center gap-1"><CheckCircle2 size={10} /> {data.message || "Ответ совпадает с правильным"}</span>
                  : <span className="flex items-center gap-1"><AlertCircle size={10} /> {data.message || "Ответ не совпадает с правильным"}</span>
                }
              </p>
            </div>
          </div>
          {data.context?.topic_mastery_percent !== undefined && (
            <p className="text-[9px] text-slate-400 mt-2">📊 Ваша успеваемость по теме: {data.context.topic_mastery_percent}%</p>
          )}
        </div>
      )}
      
      <div className="mt-3">
        <p className="text-[9px] text-slate-400 italic">🤖 Решение сгенерировано ИИ. Возможны ошибки. Проверяйте самостоятельно.</p>
      </div>
    </div>
  );
}
