import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Download, Sparkles } from 'lucide-react';
import { MarkdownRenderer as MarkdownViewer  } from '../shared/ui';

export const TestReport = ({ test, userAnswers, drawings, onBack, testId, userId }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  // 1. Подсчет статистики
  const stats = test?.tasks?.reduce((acc, task) => {
    const userAnswer = userAnswers[task.id];
    let isCorrect = false;

    if (!userAnswer) {
      acc.unanswered++;
      return acc;
    }

    if (task.is_open_answer) {
      isCorrect = String(userAnswer).trim().toLowerCase() === String(task.answer || '').trim().toLowerCase();
    } else {
      const uAns = Array.isArray(userAnswer) ? userAnswer.sort().join(',') : String(userAnswer);
      const cAns = Array.isArray(task.answer) ? task.answer.sort().join(',') : String(task.answer);
      isCorrect = uAns === cAns;
    }

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
      
      const response = await axios.post(
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
      alert('Не удалось скачать отчёт');
    } finally {
      setIsGenerating(false);
    }
  };

  const renderAnswerMD = (task, answer, isCorrectAnswer = false) => {
    const targetAnswer = isCorrectAnswer ? task.answer : answer;
    if (task.is_open_answer) {
      return targetAnswer || (isCorrectAnswer ? '*Нет данных*' : '*Ответ не дан*');
    }
    const exactAnswers = targetAnswer ? String(targetAnswer).split(',').map(s => s.trim()).filter(Boolean) : [];
    if (exactAnswers.length === 0) return isCorrectAnswer ? '*Нет данных*' : '*Ответ не дан*';

    return exactAnswers
      .map(a => `**${a}.** ${task.options?.[parseInt(a) - 1] || ''}`)
      .join('\n\n');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8">
      
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Заголовок */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-black italic text-black">{test?.title || 'Результаты тестирования'}</h1>
            <p className="text-sm text-black mt-1">Проверено автоматически</p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <button onClick={onBack} className="px-6 py-3 bg-slate-100 text-black rounded-full text-[10px] font-black uppercase hover:bg-slate-200 transition">
              Назад
            </button>
            <button 
              onClick={handleDownloadPDF} 
              disabled={isGenerating}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase hover:bg-blue-700 transition shadow-lg shadow-blue-200 disabled:bg-blue-400"
            >
              <Download size={16} /> 
              {isGenerating ? 'Генерация...' : 'Скачать PDF'}
            </button>
          </div>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-blue-600">{scorePercentage}%</span>
            <span className="text-[10px] font-black uppercase text-black mt-2 tracking-widest">Результат</span>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-green-500">{stats?.correct}</span>
            <span className="text-[10px] font-black uppercase text-black mt-2 tracking-widest">Верно</span>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-red-500">{stats?.incorrect}</span>
            <span className="text-[10px] font-black uppercase text-black mt-2 tracking-widest">Ошибок</span>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-black">{stats?.unanswered}</span>
            <span className="text-[10px] font-black uppercase text-black mt-2 tracking-widest">Пропущено</span>
          </div>
        </div>

        {/* Карточки заданий */}
        <div className="space-y-6">
          {test?.tasks?.map((task, idx) => {
            const answer = userAnswers[task.id];
            const drawing = drawings?.[task.id];
            const isUnanswered = !answer || (Array.isArray(answer) && answer.length === 0);
            const isCorrect = !isUnanswered && (task.is_open_answer 
              ? String(answer).trim().toLowerCase() === String(task.answer || '').trim().toLowerCase()
              : (Array.isArray(answer) ? answer.sort().join(',') : String(answer)) === (Array.isArray(task.answer) ? task.answer.sort().join(',') : String(task.answer))
            );

            return (
             <div key={task.id} className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm text-black">
  <div className={`p-4 border-b flex items-center justify-between ${isUnanswered ? 'bg-slate-50' : isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
    <span className="text-sm font-black uppercase tracking-widest">Задание {idx + 1}</span>
  </div>
  <div className="p-6 space-y-4">
    <MarkdownViewer>{task.content || '*Условие не указано*'}</MarkdownViewer>
    
    {drawing && (
      <div className="flex justify-center">
        <img src={drawing} alt="Чертеж" className="max-w-[450px] max-h-[320px] object-contain rounded-xl border" />
      </div>
    )}
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="p-4 rounded-2xl border bg-slate-50">
        <span className="text-[9px] font-black uppercase block mb-1">Ваш ответ</span>
        <MarkdownViewer>{renderAnswerMD(task, answer, false)}</MarkdownViewer>
      </div>
      <div className="p-4 rounded-2xl border bg-blue-50/50 border-blue-100">
        <span className="text-[9px] font-black uppercase block mb-1">Верный ответ</span>
        <MarkdownViewer>{renderAnswerMD(task, answer, true)}</MarkdownViewer>
      </div>
    </div>
    
    {task.ai_solution && (
      <div className="p-4 bg-violet-50 border border-violet-100 rounded-2xl">
        <div className="flex items-center gap-2 text-violet-700 font-bold text-xs uppercase mb-2">
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