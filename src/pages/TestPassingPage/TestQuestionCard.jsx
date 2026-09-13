import { Sparkles, Lightbulb, Loader2, Pencil } from 'lucide-react';
import { MarkdownRenderer, MathHintPreview } from '../../shared/ui';
import AnswerOptions from './AnswerOptions';

export default function TestQuestionCard({
  currentTask, currentIdx,
  userAnswers, onToggleAnswer, onTextChange,
  hintUsed, hintLoading, hintData, onFetchHint,
  showDrawing, onToggleDrawing,
  canvasRef, drawings, onDrawingSave, onDrawingDataChange,
  DrawingPadComponent,
}) {
  if (!currentTask) return null;
  const taskId = currentTask.id;

  const renderHintContent = () => {
    if (!hintUsed[taskId]) {
      return (
        <button
          type="button"
          onClick={() => onFetchHint(taskId)}
          className="inline-flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800/60 px-4 py-2.5 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors border border-zinc-200 dark:border-zinc-700"
        >
          <Sparkles size={14} />
          ИИ-подсказка (1 раз)
        </button>
      );
    }

    if (hintLoading[taskId]) {
      return (
        <div className="flex items-center gap-3 p-5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 rounded-3xl">
          <Loader2 size={16} className="animate-spin text-zinc-400" />
          <span className="text-sm text-zinc-500 dark:text-zinc-400">ИИ думает...</span>
        </div>
      );
    }

    if (hintData[taskId]) {
      const hd = hintData[taskId];
      const hintText = typeof hd === 'object' ? hd.hint : hd;
      const hintGeo = typeof hd === 'object' ? hd.geogebra : null;
      return (
        <div className="p-6 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 rounded-3xl">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300 flex items-center gap-2">
              <Lightbulb size={14} />
              Подсказка ИИ
            </span>
            <span className="text-[11px] font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">использовано</span>
          </div>
          <MathHintPreview text={hintText} geogebra={hintGeo} title="" />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-[#09090b] shadow-sm">
        <h4 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-4">
          Задание №{currentIdx + 1}
        </h4>
        <div className="prose prose-zinc dark:prose-invert max-w-none text-sm md:text-base text-zinc-800 dark:text-zinc-200
          [&_img]:rounded-2xl [&_img]:my-6 [&_img]:mx-auto [&_img]:block [&_img]:max-h-64
          [&_.katex-display]:my-4 [&_.katex-display]:text-sm [&_p]:leading-relaxed">
          <MarkdownRenderer>{currentTask.content}</MarkdownRenderer>
        </div>
      </div>

      <div className="mt-2">
        {renderHintContent()}
      </div>

      {showDrawing[taskId] && DrawingPadComponent && (
        <DrawingPadComponent
          ref={canvasRef}
          initialData={drawings[taskId]}
          onSave={(dataUrl) => onDrawingSave(taskId, dataUrl)}
          onDataChange={(dataUrl) => onDrawingDataChange(taskId, dataUrl)}
        />
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 ml-1">Ваш вариант ответа</p>
          <button
            type="button"
            onClick={() => onToggleDrawing(taskId)}
            className="flex items-center gap-2 px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800/60 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-300 transition-colors"
          >
            <Pencil size={14} />
            {showDrawing[taskId] ? 'Скрыть рисовалку' : 'Показать рисовалку'}
          </button>
        </div>

        <AnswerOptions
          task={currentTask}
          userAnswers={userAnswers}
          onToggleAnswer={onToggleAnswer}
          onTextChange={onTextChange}
        />
      </div>
    </div>
  );
}
