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

  return (
    <div className="space-y-6">
      {/* Условие */}
      <div className="p-6 rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">
          Задание №{currentIdx + 1}
        </h4>
        <div className="prose prose-slate max-w-none text-sm md:text-base text-slate-800
          [&_img]:rounded-2xl [&_img]:my-6 [&_img]:mx-auto [&_img]:block [&_img]:max-h-64
          [&_.katex-display]:my-4 [&_.katex-display]:text-sm [&_p]:leading-relaxed">
          <MarkdownRenderer>{currentTask.content}</MarkdownRenderer>
        </div>
      </div>

      {/* AI подсказка */}
      <div className="mt-2">
        {!hintUsed[taskId] ? (
          <button
            onClick={() => onFetchHint(taskId)}
            className="flex items-center gap-2 text-[10px] font-black uppercase text-violet-600 bg-violet-50 px-5 py-3 rounded-2xl hover:bg-violet-100 transition-all border border-violet-200/40 active:scale-95"
          >
            <Sparkles size={14} className="text-violet-500" />
            ИИ-подсказка (1 раз)
          </button>
        ) : hintLoading[taskId] ? (
          <div className="flex items-center gap-3 p-5 bg-violet-50/50 border border-violet-100 rounded-[2rem]">
            <Loader2 size={16} className="animate-spin text-violet-400" />
            <span className="text-[10px] font-black uppercase text-violet-400 tracking-widest">ИИ думает...</span>
          </div>
        ) : hintData[taskId] ? (
          <div className="p-6 bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200/40 rounded-[2rem] animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[9px] font-black uppercase text-violet-600 tracking-widest flex items-center gap-2">
                <Lightbulb size={14} className="text-amber-500" />
                Подсказка ИИ
              </span>
              <span className="text-[8px] font-bold text-violet-400 bg-violet-100 px-2 py-0.5 rounded-lg">использовано</span>
            </div>
            <MathHintPreview text={hintData[taskId]} title="" />
          </div>
        ) : null}
      </div>

      {/* Рисовалка */}
      {showDrawing[taskId] && DrawingPadComponent && (
        <DrawingPadComponent
          ref={canvasRef}
          initialData={drawings[taskId]}
          onSave={(dataUrl) => onDrawingSave(taskId, dataUrl)}
          onDataChange={(dataUrl) => onDrawingDataChange(taskId, dataUrl)}
        />
      )}

      {/* Ответы */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 ml-2">
            <div className="w-1 h-4 bg-blue-500 rounded-full" />
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Ваш вариант ответа:</p>
          </div>
          <button
            onClick={() => onToggleDrawing(taskId)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-600 transition"
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
