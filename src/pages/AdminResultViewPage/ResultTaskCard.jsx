import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp, Edit3 } from 'lucide-react';
import { MarkdownRenderer } from '../../shared/ui';

export default function ResultTaskCard({ item, index }) {
  const navigate = useNavigate();
  const [isSolutionOpen, setIsSolutionOpen] = useState(false);

  const hasNoAnswer = item.user_answer === 'Нет ответа' || !item.user_answer;
  const diff = parseInt(item.difficulty) || 1;

  const handleEditTask = (taskId) => {
    sessionStorage.setItem('adminReturnContext', JSON.stringify({
      sourceTab: 'result',
      resultId: window.location.pathname.split('/').pop(),
      scrollPosition: window.scrollY,
    }));
    sessionStorage.setItem('editTaskId', taskId);
    navigate('/admin');
  };

  return (
    <div
      data-task-id={item.task_id}
      className="bg-white dark:bg-[#09090b] rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm overflow-hidden"
    >
      <div className="p-6 md:p-8">
        <div className="flex justify-between items-start mb-6 gap-4">
          <div className="flex gap-6">
            <div>
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block mb-1.5">Вопрос №{index + 1}</span>
              <span className="text-xs font-medium text-zinc-400">
                Начислено: {item.points_earned || 0} / {item.max_task_points || 0} б.
              </span>
            </div>
            <div>
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block mb-1.5">Сложность</span>
              <div className="flex gap-0.5 items-center">
                {[1, 2, 3, 4, 5].map(step => (
                  <div
                    key={step}
                    className={`w-1 h-3 rounded-full ${
                      step <= diff ? 'bg-zinc-900 dark:bg-white' : 'bg-zinc-100 dark:bg-zinc-800'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleEditTask(item.task_id)}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 rounded-xl text-xs font-medium transition-all border border-zinc-200 dark:border-zinc-800"
              title="Редактировать задание"
            >
              <Edit3 size={14} /> <span className="hidden sm:inline">Ред.</span>
            </button>
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
        </div>

        <div className="mb-8 text-zinc-800 dark:text-zinc-200 font-medium leading-relaxed">
          <MarkdownRenderer>{item.content}</MarkdownRenderer>
        </div>

        {item.options && (
          <div className="mb-8 space-y-2">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block mb-3">Варианты в тесте</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(Array.isArray(item.options) ? item.options : item.options.split(';')).map(opt => opt.trim()).filter(opt => opt.length > 0).map((opt, i) => {
                const isUserChoice = item.user_answer === opt;
                const isCorrectChoice = item.correct_answer === opt;
                let cardStyle = 'border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 text-zinc-600 dark:text-zinc-400';
                if (isCorrectChoice) cardStyle = 'border-emerald-300 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300';
                else if (isUserChoice && !item.is_correct) cardStyle = 'border-red-300 dark:border-red-500/30 bg-red-50/60 dark:bg-red-500/10 text-red-700 dark:text-red-300';
                return (
                  <div key={i} className={`p-4 rounded-2xl border text-sm font-medium flex gap-3 ${cardStyle}`}>
                    <span className="opacity-40 tabular-nums">{i + 1}.</span>
                    <div className="flex-1"><MarkdownRenderer>{opt}</MarkdownRenderer></div>
                  </div>
                );
              })}
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
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block mb-2">Ответ студента</span>
            <div className={`text-sm font-medium ${
              hasNoAnswer
                ? 'text-zinc-400'
                : item.is_correct
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-red-700 dark:text-red-400'
            }`}>
              <MarkdownRenderer>{item.user_answer || '—'}</MarkdownRenderer>
            </div>
          </div>
          <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block mb-2">Эталонный ответ</span>
            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              <MarkdownRenderer>{item.correct_answer}</MarkdownRenderer>
            </div>
          </div>
        </div>

        {item.solution && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setIsSolutionOpen(!isSolutionOpen)}
              className={`w-full py-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-medium transition-colors ${
                isSolutionOpen
                  ? 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white text-white dark:text-zinc-950'
                  : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
              }`}
            >
              {isSolutionOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {isSolutionOpen ? 'Скрыть разбор' : 'Показать решение студенту'}
            </button>
            {isSolutionOpen && (
              <div className="p-6 bg-zinc-50 dark:bg-zinc-900/40 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-4">Полный текст решения</div>
                <div className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                  <MarkdownRenderer>{item.solution}</MarkdownRenderer>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
