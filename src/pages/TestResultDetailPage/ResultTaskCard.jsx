import { useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { MarkdownRenderer, MathHintPreview, AISolutionPreview } from '../../shared/ui';

export default function ResultTaskCard({
  item, idx, openSolutions, toggleSolution,
  hintData, loadingHint, hintError, fetchHint, closeHint,
  solutionData, loadingSolution, solutionError, fetchSolution, closeSolution,
}) {
  const hasNoAnswer = item.user_answer === "Нет ответа";
  const isSolutionOpen = openSolutions[item.task_id];

  const renderOption = (opt, i) => {
    const indexStr = String(i + 1);
    const correctAnswers = item.correct_answer ? item.correct_answer.split(',').map(a => a.trim()) : [];
    const userAnswersList = item.user_answer !== "Нет ответа" && item.user_answer
      ? item.user_answer.split(',').map(a => a.trim())
      : [];
    const isCorrectAnswer = correctAnswers.includes(indexStr);
    const isUserChoice = userAnswersList.includes(indexStr);

    return (
      <div key={i} className={`p-4 rounded-2xl border-2 text-sm font-bold flex gap-3 transition-all ${
        isCorrectAnswer
          ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700'
          : isUserChoice && !isCorrectAnswer
            ? 'border-red-500 bg-red-50/50 text-red-700'
            : 'border-slate-50 bg-slate-50/30 text-slate-600'
      }`}>
        <span className="opacity-40">{i + 1}.</span>
        <div className="flex-1"><MarkdownRenderer>{opt}</MarkdownRenderer></div>
        {isCorrectAnswer && isUserChoice && <CheckCircle2 size={16} className="text-emerald-500 shrink-0 self-center" />}
        {isCorrectAnswer && !isUserChoice && <CheckCircle2 size={16} className="text-emerald-400/60 shrink-0 self-center" />}
        {isUserChoice && !isCorrectAnswer && <XCircle size={16} className="text-red-500 shrink-0 self-center" />}
      </div>
    );
  };

  return (
    <div key={item.task_id} data-task-id={item.task_id} className="bg-white rounded-[2.5rem] border-2 transition-all overflow-hidden">
      <div className="p-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 block mb-1.5">Вопрос №{idx + 1}</span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((step) => (
                <div key={step} className={`w-1 h-3 rounded-full transition-all duration-300 ${
                  step <= item.difficulty
                    ? (item.difficulty >= 4 ? 'bg-red-500' : item.difficulty >= 3 ? 'bg-amber-400' : 'bg-emerald-400')
                    : 'bg-slate-100'
                }`} />
              ))}
              <span className="text-[8px] font-black text-slate-300 uppercase ml-1.5 self-center tracking-tighter">LVL {item.difficulty}</span>
            </div>
          </div>
          <div className={`flex items-center gap-2 font-black uppercase text-[10px] px-4 py-1.5 rounded-full ${
            hasNoAnswer ? 'bg-slate-100 text-slate-500' : item.is_correct ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
          }`}>
            {hasNoAnswer ? <AlertCircle size={12} /> : item.is_correct ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
            {hasNoAnswer ? 'Пропущено' : item.is_correct ? 'Верно' : 'Ошибка'}
          </div>
        </div>

        <div className="mb-8 text-slate-800 font-medium">
          <MarkdownRenderer>{item.content}</MarkdownRenderer>
        </div>

        {item.options && (
          <div className="mb-8 space-y-2">
            <span className="text-[9px] font-black uppercase text-slate-400 block mb-3 ml-1">Варианты:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(Array.isArray(item.options) ? item.options : item.options.split(';'))
                .map(opt => opt.trim())
                .filter(opt => opt.length > 0)
                .map((opt, i) => renderOption(opt, i))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className={`p-5 rounded-3xl border transition-colors ${
            hasNoAnswer ? 'bg-slate-50 border-slate-100' : item.is_correct ? 'bg-emerald-50/30 border-emerald-100' : 'bg-red-50/30 border-red-100'
          }`}>
            <span className="text-[9px] font-black uppercase text-slate-400 block mb-2">Ваш ответ</span>
            <div className={`text-base font-bold ${hasNoAnswer ? 'text-slate-400 italic' : item.is_correct ? 'text-emerald-700' : 'text-red-700'}`}>
              <MarkdownRenderer>{item.user_answer || "—"}</MarkdownRenderer>
            </div>
          </div>
          <div className="p-5 rounded-3xl bg-blue-50/30 border border-blue-100">
            <span className="text-[9px] font-black uppercase text-blue-400 block mb-2">Правильный ответ</span>
            <div className="text-base font-bold text-blue-700">
              <MarkdownRenderer>{item.correct_answer}</MarkdownRenderer>
            </div>
          </div>
        </div>

        {/* Подсказка */}
        {!hintData[item.task_id] && !loadingHint[item.task_id] && !hintError[item.task_id] && (
          <button onClick={() => fetchHint(item.task_id)} className="w-full py-3 rounded-2xl border border-purple-200 bg-purple-50 text-purple-600 text-[10px] font-black uppercase tracking-widest hover:bg-purple-100 transition-all mb-3">
            💡 Получить AI-подсказку
          </button>
        )}
        {(hintData[item.task_id] || loadingHint[item.task_id] || hintError[item.task_id]) && (
          <div className="mb-6">
            <MathHintPreview
              text={hintData[item.task_id]}
              isLoading={loadingHint[item.task_id]}
              error={hintError[item.task_id]}
              onClose={() => closeHint(item.task_id)}
            />
          </div>
        )}

        {/* AI-решение */}
        {!solutionData[item.task_id] && !loadingSolution[item.task_id] && !solutionError[item.task_id] && (
          <button onClick={() => fetchSolution(item.task_id)} className="w-full py-3 rounded-2xl border border-green-200 bg-green-50 text-green-600 text-[10px] font-black uppercase tracking-widest hover:bg-green-100 transition-all mb-3">
            🤖 Получить AI-решение
          </button>
        )}
        {(solutionData[item.task_id] || loadingSolution[item.task_id] || solutionError[item.task_id]) && (
          <div className="mb-6">
            <AISolutionPreview
              data={solutionData[item.task_id]}
              isLoading={loadingSolution[item.task_id]}
              error={solutionError[item.task_id]}
              onClose={() => closeSolution(item.task_id)}
            />
          </div>
        )}

        {/* Готовое решение */}
        {item.solution && (
          <>
            <button onClick={() => toggleSolution(item.task_id)} className={`w-full py-4 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${
              isSolutionOpen ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-100 text-slate-400 hover:border-blue-200 hover:text-blue-600'
            }`}>
              {isSolutionOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {isSolutionOpen ? 'Скрыть разбор' : 'Посмотреть решение'}
            </button>
            {isSolutionOpen && (
              <div className="mt-4 p-6 bg-slate-50 rounded-3xl border border-slate-100 animate-in slide-in-from-top-2 duration-300">
                <div className="text-[9px] font-black text-blue-600 uppercase mb-4 tracking-widest flex items-center gap-2">
                  <div className="w-4 h-px bg-blue-600" /> Полный разбор задачи
                </div>
                <div className="text-sm leading-relaxed">
                  <MarkdownRenderer>{item.solution}</MarkdownRenderer>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
