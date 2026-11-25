import { Sparkles, Pencil } from 'lucide-react';
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

  const rawHint = hintData[taskId];
  const hintError = typeof rawHint === 'string' ? rawHint : null;
  const hintVisible = hintUsed[taskId] || hintLoading[taskId] || rawHint;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800/60 dark:bg-[#09090b]">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h4 className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Задание №{currentIdx + 1}
          </h4>
          <button
            type="button"
            onClick={() => onFetchHint(taskId)}
            disabled={hintUsed[taskId]}
            aria-label="ИИ-подсказка"
            title="ИИ-подсказка"
            className="inline-flex text-zinc-400 hover:text-zinc-700 disabled:hover:text-zinc-400 dark:hover:text-zinc-200"
          >
            <Sparkles size={14} strokeWidth={1.75} />
          </button>
        </div>
        <div className="prose prose-zinc max-w-none text-sm text-zinc-800 dark:prose-invert md:text-base dark:text-zinc-200
          [&_img]:mx-auto [&_img]:my-4 [&_img]:block [&_img]:max-h-64 [&_img]:rounded-xl
          [&_.katex-display]:my-3 [&_.katex-display]:text-sm [&_p]:leading-relaxed">
          <MarkdownRenderer>{currentTask.content}</MarkdownRenderer>
        </div>
        {hintVisible ? (
          <div className="mt-4">
            <MathHintPreview
              text={typeof rawHint === 'object' ? rawHint : ''}
              geogebra={typeof rawHint === 'object' ? rawHint?.geogebra : null}
              isLoading={hintLoading[taskId]}
              error={hintError}
            />
          </div>
        ) : null}
      </div>

      {showDrawing[taskId] && DrawingPadComponent && (
        <DrawingPadComponent
          ref={canvasRef}
          initialData={drawings[taskId]}
          onSave={(dataUrl) => onDrawingSave(taskId, dataUrl)}
          onDataChange={(dataUrl) => onDrawingDataChange(taskId, dataUrl)}
        />
      )}

      <div className="space-y-2">
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
