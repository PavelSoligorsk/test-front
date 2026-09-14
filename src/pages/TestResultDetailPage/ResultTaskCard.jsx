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
      <div key={i} className={`p-4 rounded-2xl border text-sm font-medium flex gap-3 ${
        isCorrectAnswer
          ? 'border-emerald-300 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
          : isUserChoice && !isCorrectAnswer
            ? 'border-red-300 dark:border-red-500/30 bg-red-50/60 dark:bg-red-500/10 text-red-700 dark:text-red-300'
            : 'border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 text-zinc-600 dark:text-zinc-400'
      }`}>
        <span className="opacity-40 tabular-nums">{i + 1}.</span>
        <div className="flex-1"><MarkdownRenderer>{opt}</MarkdownRenderer></div>
        {isCorrectAnswer && isUserChoice && <CheckCircle2 size={16} className="text-emerald-500 shrink-0 self-center" />}
        {isCorrectAnswer && !isUserChoice && <CheckCircle2 size={16} className="text-emerald-400/60 shrink-0 self-center" />}
        {isUserChoice && !isCorrectAnswer && <XCircle size={16} className="text-red-500 shrink-0 self-center" />}
      </div>
    );
  };

  return (
    <div data-task-id={item.task_id} className="bg-white dark:bg-[#09090b] rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm overflow-hidden">
      <div className="p-6 md:p-8">
        <div className="flex justify-between items-start mb-6 gap-4">
          <div>
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block mb-1.5">Вопрос №{idx + 1}</span>
            <div className="flex gap-0.5 items-center">
              {[1, 2, 3, 4, 5].map((step) => (
                <div key={step} className={`w-1 h-3 rounded-full ${
                  step <= item.difficulty ? 'bg-zinc-900 dark:bg-white' : 'bg-zinc-100 dark:bg-zinc-800'
                }`} />
              ))}
              <span className="text-[11px] font-medium text-zinc-400 ml-1.5">Ур. {item.difficulty}</span>
            </div>
          </div>
          <div className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full ${
            hasNoAnswer
              ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
              : item.is_correct
                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
          }`}>
            {hasNoAnswer ? <AlertCircle size={12} /> : item.is_correct ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
            {hasNoAnswer ? 'Пропущено' : item.is_correct ? 'Верно' : 'Ошибка'}
          </div>
        </div>

        <div className="mb-8 text-zinc-800 dark:text-zinc-200 font-medium">
          <MarkdownRenderer>{item.content}</MarkdownRenderer>
        </div>

        {item.options && (
          <div className="mb-8 space-y-2">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block mb-3">Варианты</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(Array.isArray(item.options) ? item.options : item.options.split(';'))
                .map(opt => opt.trim())
                .filter(opt => opt.length > 0)
                .map((opt, i) => renderOption(opt, i))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className={`p-5 rounded-2xl border ${
            hasNoAnswer
              ? 'bg-zinc-50 dark:bg-zinc-900/40 border-zinc-100 dark:border-zinc-800'
              : item.is_correct
                ? 'bg-emerald-50/40 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/20'
                : 'bg-red-50/40 dark:bg-red-500/5 border-red-100 dark:border-red-500/20'
          }`}>
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block mb-2">Ваш ответ</span>
            <div className={`text-sm font-medium ${hasNoAnswer ? 'text-zinc-400' : item.is_correct ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
              <MarkdownRenderer>{item.user_answer || "—"}</MarkdownRenderer>
            </div>
          </div>
          <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block mb-2">Правильный ответ</span>
            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              <MarkdownRenderer>{item.correct_answer}</MarkdownRenderer>
            </div>
          </div>
        </div>

        {!hintData[item.task_id] && !loadingHint[item.task_id] && !hintError[item.task_id] && (
          <button type="button" onClick={() => fetchHint(item.task_id)} className="w-full py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 text-zinc-700 dark:text-zinc-200 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors mb-3">
            Получить AI-подсказку
          </button>
        )}
        {(hintData[item.task_id] || loadingHint[item.task_id] || hintError[item.task_id]) && (
          <div className="mb-6">
            <MathHintPreview
              text={typeof hintData[item.task_id] === 'object' ? hintData[item.task_id]?.hint : hintData[item.task_id]}
              geogebra={typeof hintData[item.task_id] === 'object' ? hintData[item.task_id]?.geogebra : null}
              isLoading={loadingHint[item.task_id]}
              error={hintError[item.task_id]}
              onClose={() => closeHint(item.task_id)}
            />
          </div>
        )}

        {!solutionData[item.task_id] && !loadingSolution[item.task_id] && !solutionError[item.task_id] && (
          <button type="button" onClick={() => fetchSolution(item.task_id)} className="w-full py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 text-zinc-700 dark:text-zinc-200 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors mb-3">
            Получить AI-решение
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

        {item.solution && (
          <>
            <button type="button" onClick={() => toggleSolution(item.task_id)} className={`w-full py-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-medium transition-colors ${
              isSolutionOpen
                ? 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white text-white dark:text-zinc-950'
                : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
            }`}>
              {isSolutionOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {isSolutionOpen ? 'Скрыть разбор' : 'Посмотреть решение'}
            </button>
            {isSolutionOpen && (
              <div className="mt-4 p-6 bg-zinc-50 dark:bg-zinc-900/40 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-4">Полный разбор задачи</div>
                <div className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
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
