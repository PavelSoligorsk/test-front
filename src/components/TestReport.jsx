import { useState } from 'react';
import apiClient from '../shared/api';
import { Download, Sparkles, RotateCcw } from 'lucide-react';
import { MarkdownRenderer as MarkdownViewer, ThemeToggle, useNotify } from '../shared/ui';
import { answersMatch, optionList } from '../features/board/studentsApi';

function closedMatch(task, userAnswer) {
  const user = Array.isArray(userAnswer) ? userAnswer.join(',') : userAnswer;
  const correct = Array.isArray(task.answer) ? task.answer.join(',') : task.answer;
  return answersMatch(user, correct, optionList(task.options));
}

function ReportFigure({ value, caption }) {
  return (
    <div className="px-5 py-5">
      <p className="text-2xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-100">{value}</p>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{caption}</p>
    </div>
  );
}

export const TestReport = ({ test, userAnswers, drawings, onBack, onRetake }) => {
  const notify = useNotify();
  const [isGenerating, setIsGenerating] = useState(false);

  // 1. Подсчет статистики
  const stats = test?.tasks?.reduce((acc, task) => {
    const userAnswer = userAnswers[task.id];
    let isCorrect = false;

    if (!userAnswer) {
      acc.unanswered++;
      return acc;
    }

    isCorrect = task.is_open_answer
      ? String(userAnswer).trim().toLowerCase() === String(task.answer || '').trim().toLowerCase()
      : closedMatch(task, userAnswer);

    if (isCorrect) acc.correct++;
    else acc.incorrect++;

    return acc;
  }, { correct: 0, incorrect: 0, unanswered: 0, total: test?.tasks?.length || 0 });

  const scorePercentage = stats?.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;

  // 2. Генерация PDF через рендеринг-сервис напрямую
  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    
    try {
      const RENDER_SERVICE = 'https://tg-production-cc61.up.railway.app';
      
      const response = await apiClient.post(
        `${RENDER_SERVICE}/render-report`,
        {
          test: {
            id: test?.id,
            title: test?.title,
            tasks: test?.tasks?.map(task => ({
              id: task.id,
              content: task.content,
              answer: task.answer,
              is_open_answer: task.is_open_answer,
              options: task.options,
              difficulty: task.difficulty,
              solution: task.solution,
              ai_solution: task.ai_solution
            }))
          },
          user: {
            first_name: "Студент",
            last_name: ""
          },
          result: {
            completed_at: new Date().toISOString()
          },
          userAnswers: userAnswers,
          drawings: drawings || {},
          stats: {
            correct: stats.correct,
            incorrect: stats.incorrect,
            unanswered: stats.unanswered,
            total: stats.total
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          responseType: 'blob'
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Результат_${test?.title || 'теста'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Ошибка при генерации PDF:', error);
      notify('Не удалось скачать отчёт');
    } finally {
      setIsGenerating(false);
    }
  };

  const renderAnswerMD = (task, answer, isCorrectAnswer = false) => {
    const targetAnswer = isCorrectAnswer ? task.answer : answer;
    if (task.is_open_answer) {
      return targetAnswer || (isCorrectAnswer ? '*Нет данных*' : '*Ответ не дан*');
    }
    const exactAnswers = targetAnswer ? String(targetAnswer).split(/[;,]/).map(s => s.trim()).filter(Boolean) : [];
    if (exactAnswers.length === 0) return isCorrectAnswer ? '*Нет данных*' : '*Ответ не дан*';

    return exactAnswers
      .map(a => `**${a}.** ${task.options?.[parseInt(a) - 1] || ''}`)
      .join('\n\n');
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#09090b] p-5 sm:p-6 rounded-xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">{test?.title || 'Результаты тестирования'}</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Проверено автоматически</p>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
            <ThemeToggle />
            <button type="button" onClick={onBack} className="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 rounded-xl text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition">
              Назад
            </button>
            {onRetake && (
              <button
                type="button"
                onClick={onRetake}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-xl text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition"
              >
                <RotateCcw size={16} /> Пересдать
              </button>
            )}
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isGenerating}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 rounded-xl text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition disabled:opacity-50"
            >
              <Download size={16} />
              {isGenerating ? 'Генерация...' : 'Скачать PDF'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm divide-x divide-y divide-zinc-100 dark:divide-zinc-800/60 dark:border-zinc-800/60 dark:bg-[#09090b] sm:grid-cols-4 sm:divide-y-0">
          <ReportFigure value={`${scorePercentage}%`} caption="Результат" />
          <ReportFigure value={stats?.correct} caption="Верно" />
          <ReportFigure value={stats?.incorrect} caption="Ошибок" />
          <ReportFigure value={stats?.unanswered} caption="Пропущено" />
        </div>

        <div className="space-y-6">
          {test?.tasks?.map((task, idx) => {
            const answer = userAnswers[task.id];
            const drawing = drawings?.[task.id];
            const isUnanswered = !answer || (Array.isArray(answer) && answer.length === 0);
            const isCorrect = !isUnanswered && (task.is_open_answer
              ? String(answer).trim().toLowerCase() === String(task.answer || '').trim().toLowerCase()
              : closedMatch(task, answer)
            );

            return (
             <div key={task.id} className="overflow-hidden rounded-xl border border-zinc-200 bg-white text-zinc-900 shadow-sm dark:border-zinc-800/60 dark:bg-[#09090b] dark:text-zinc-100">
  <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800/60">
    <span className="text-sm font-medium">Задание {idx + 1}</span>
    <span className={`text-sm font-medium ${isUnanswered ? 'text-zinc-400' : isCorrect ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
      {isUnanswered ? 'Пропуск' : isCorrect ? 'Верно' : 'Ошибка'}
    </span>
  </div>
  <div className="p-6 space-y-4">
    <MarkdownViewer>{task.content || '*Условие не указано*'}</MarkdownViewer>

    {drawing && (
      <div className="flex justify-center">
        <img src={drawing} alt="Чертеж" className="max-w-[450px] max-h-[320px] object-contain rounded-xl border border-zinc-200 dark:border-zinc-800" />
      </div>
    )}

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40">
        <span className="text-xs font-medium text-zinc-500 block mb-1">Ваш ответ</span>
        <MarkdownViewer>{renderAnswerMD(task, answer, false)}</MarkdownViewer>
      </div>
      <div className="p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40">
        <span className="text-xs font-medium text-zinc-500 block mb-1">Верный ответ</span>
        <MarkdownViewer>{renderAnswerMD(task, answer, true)}</MarkdownViewer>
      </div>
    </div>

    {task.ai_solution && (
      <div className="p-4 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800 rounded-2xl">
        <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-200 font-medium text-xs mb-2">
          <Sparkles size={14} />
          <span>Разбор от ИИ</span>
        </div>
        <MarkdownViewer>{task.ai_solution}</MarkdownViewer>
      </div>
    )}
  </div>
</div>
            );
          })}
        </div>
      </div>
    </div>
  );
};