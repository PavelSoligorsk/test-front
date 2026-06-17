import React, { useState } from 'react';
import { Printer, CheckCircle2, XCircle, AlertCircle, PenTool, Image as ImageIcon, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { MarkdownRenderer as MarkdownViewer } from '../pages/AdminResultView';

export const TestReport = ({ test, userAnswers, drawings, onBack }) => {
  const [expandedSolutions, setExpandedSolutions] = useState({});

  // Подсчет статистики
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

  // Мгновенный экспорт через нативный движок браузера
  const handlePrint = () => {
    window.print();
  };

  const toggleSolution = (taskId) => {
    setExpandedSolutions(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 print:bg-white print:p-0">
      
      {/* Стили для печати: скрываем лишнее, настраиваем разрывы страниц */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .page-break {
            page-break-inside: avoid; /* Карточки заданий не будут рваться пополам */
            break-inside: avoid;
            margin-bottom: 2rem;
          }
        }
      `}</style>

      <div className="max-w-4xl mx-auto space-y-6 print:max-w-none print:space-y-4">
        
        {/* Верхняя панель управления — НЕ ПЕЧАТАЕТСЯ */}
        <div className="no-print flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-black italic">
              <MarkdownViewer className="prose-h1:m-0">
                {test?.title || 'Результаты тестирования'}
              </MarkdownViewer>
            </h1>
            <p className="text-sm text-slate-500 mt-1">Проверено автоматически</p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <button onClick={onBack} className="flex-1 sm:flex-none px-6 py-3 bg-slate-100 text-slate-700 rounded-full text-[10px] font-black uppercase hover:bg-slate-200 transition">
              Назад
            </button>
            <button 
              onClick={handlePrint} 
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase hover:bg-blue-700 transition shadow-lg shadow-blue-200"
            >
              <Printer size={16} /> Сохранить в PDF
            </button>
          </div>
        </div>

        {/* Контейнер отчета */}
        <div className="space-y-6">
          
          {/* Блок статистики (при печати сохраняет структуру) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 print:border-slate-300 shadow-sm flex flex-col items-center justify-center print:p-4">
              <span className="text-3xl font-black text-blue-600 print:text-blue-700">{scorePercentage}%</span>
              <span className="text-[10px] font-black uppercase text-slate-400 mt-2 tracking-widest">Результат</span>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 print:border-slate-300 shadow-sm flex flex-col items-center justify-center print:p-4">
              <span className="text-3xl font-black text-green-500 print:text-green-600">{stats?.correct}</span>
              <span className="text-[10px] font-black uppercase text-slate-400 mt-2 tracking-widest">Верно</span>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 print:border-slate-300 shadow-sm flex flex-col items-center justify-center print:p-4">
              <span className="text-3xl font-black text-red-500 print:text-red-600">{stats?.incorrect}</span>
              <span className="text-[10px] font-black uppercase text-slate-400 mt-2 tracking-widest">Ошибок</span>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 print:border-slate-300 shadow-sm flex flex-col items-center justify-center print:p-4">
              <span className="text-3xl font-black text-slate-400 print:text-slate-500">{stats?.unanswered}</span>
              <span className="text-[10px] font-black uppercase text-slate-400 mt-2 tracking-widest">Пропущено</span>
            </div>
          </div>

          {/* Карточки заданий */}
          <div className="space-y-6 print:space-y-4">
            {test?.tasks?.map((task, idx) => {
              const answer = userAnswers[task.id];
              const drawing = drawings[task.id];
              
              const userAnswerMD = task.is_open_answer 
                ? answer || '*Ответ не дан*'
                : Array.isArray(answer) && answer.length > 0
                  ? answer.map(a => `**${a}.** ${task.options?.[parseInt(a)-1] || ''}`).join('\n\n')
                  : answer 
                    ? `**${answer}.** ${task.options?.[parseInt(answer)-1] || ''}`
                    : '*Ответ не дан*';

              const exactAnswers = task.answer && !task.is_open_answer 
                ? String(task.answer).split(',').map(s => s.trim()).filter(Boolean)
                : [];

              const correctAnswerMD = task.is_open_answer 
                ? task.answer || '*Нет данных*'
                : exactAnswers.length > 1
                  ? exactAnswers.map(a => `**${a}.** ${task.options?.[parseInt(a)-1] || ''}`).join('\n\n')
                  : exactAnswers.length === 1
                    ? `**${exactAnswers[0]}.** ${task.options?.[parseInt(exactAnswers[0])-1] || ''}`
                    : '*Нет данных*';

              let isCorrect = false;
              let isUnanswered = !answer || (Array.isArray(answer) && answer.length === 0);

              if (!isUnanswered) {
                if (task.is_open_answer) {
                  isCorrect = String(answer).trim().toLowerCase() === String(task.answer || '').trim().toLowerCase();
                } else {
                  const uAns = Array.isArray(answer) ? answer.sort().join(',') : String(answer);
                  const cAns = Array.isArray(task.answer) ? task.answer.sort().join(',') : String(task.answer);
                  isCorrect = uAns === cAns;
                }
              }

              return (
                <div key={task.id} className="page-break bg-white border border-slate-200 print:border-slate-300 rounded-[2rem] print:rounded-2xl overflow-hidden shadow-sm print:shadow-none">
                  {/* Шапка карточки */}
                  <div className={`p-4 border-b flex items-center justify-between ${
                    isUnanswered ? 'bg-slate-50 border-slate-200' : isCorrect ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'
                  } print:bg-transparent print:border-slate-200`}>
                    <div className="flex items-center gap-3">
                      {isUnanswered ? (
                        <AlertCircle className="text-slate-400" size={20} />
                      ) : isCorrect ? (
                        <CheckCircle2 className="text-green-500 print:text-green-600" size={20} />
                      ) : (
                        <XCircle className="text-red-500 print:text-red-600" size={20} />
                      )}
                      <span className="text-sm font-black uppercase tracking-widest text-slate-700">Задание {idx + 1}</span>
                    </div>
                    {drawing && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-blue-500 bg-blue-100 print:bg-transparent px-2 py-1 rounded-lg">
                        <PenTool size={12} /> Есть чертеж
                      </span>
                    )}
                  </div>

                  <div className="p-6 space-y-6 print:p-4 print:space-y-4">
                    {/* Условие задачи */}
                    <div className="prose prose-sm max-w-none text-black [&_img]:mx-auto [&_img]:max-w-full [&_img]:h-auto [&_img]:object-contain [&_img]:rounded-xl print:[&_img]:max-h-[300px]">
                      <MarkdownViewer>
                        {task.content || '*Условие не указано*'}
                      </MarkdownViewer>
                    </div>

                    {/* Блок ответов */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-4">
                      <div className={`p-4 rounded-2xl border ${isUnanswered ? 'bg-slate-50 border-slate-200' : isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} print:bg-transparent print:border-slate-300`}>
                        <span className={`text-[9px] font-black uppercase tracking-widest block mb-2 ${isUnanswered ? 'text-slate-400' : isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                          Ваш ответ
                        </span>
                        <MarkdownViewer className="prose prose-sm max-w-none prose-p:my-1">
                          {userAnswerMD}
                        </MarkdownViewer>
                      </div>
                      
                      <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200 print:bg-transparent print:border-slate-300">
                        <span className="text-[9px] font-black uppercase text-blue-500 tracking-widest block mb-2 print:text-blue-600">Верный ответ</span>
                        <MarkdownViewer className="prose prose-sm max-w-none text-blue-900 print:text-black prose-p:my-1">
                          {correctAnswerMD}
                        </MarkdownViewer>
                      </div>
                    </div>

                    {/* Чертеж */}
                    {drawing && (
                      <div className="mt-4 border-t border-slate-100 print:border-slate-200 pt-6 print:pt-4">
                        <div className="flex items-center gap-2 mb-4 no-print">
                          <ImageIcon size={16} className="text-slate-400" />
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Прикрепленный черновик</span>
                        </div>
                        <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden flex justify-center items-center p-4 min-h-[200px] max-h-[450px] print:bg-transparent print:border-none print:p-0 print:max-h-[350px]">
                          <img 
                            src={drawing} 
                            alt={`Чертеж к заданию ${idx+1}`} 
                            className="max-w-full max-h-[400px] w-auto h-auto object-contain rounded-xl shadow-sm bg-white print:shadow-none print:max-h-[320px]" 
                          />
                        </div>
                      </div>
                    )}

                    {/* Разбор от ИИ — При обычной работе скрыт под спойлер, но при печати ИИ-решение разворачивается автоматически */}
                    {task.ai_solution && (
                      <div className="border-t border-slate-100 print:border-slate-200 pt-4">
                        <button 
                          onClick={() => toggleSolution(task.id)}
                          className="no-print flex items-center justify-between w-full p-4 bg-violet-50 hover:bg-violet-100 rounded-2xl transition-colors border border-violet-100"
                        >
                          <div className="flex items-center gap-2">
                            <Sparkles size={16} className="text-violet-500" />
                            <span className="text-[10px] font-black uppercase text-violet-600 tracking-widest">Разбор от ИИ</span>
                          </div>
                          {expandedSolutions[task.id] ? <ChevronUp size={16} className="text-violet-400" /> : <ChevronDown size={16} className="text-violet-400" />}
                        </button>
                        
                        {/* В UI показываем по стейту, а в PDF/печати блок выводится всегда */}
                        {(expandedSolutions[task.id] || window.matchMedia('print').matches) && (
                          <div className="mt-2 p-5 bg-white border border-violet-100 rounded-2xl shadow-sm print:shadow-none print:border-none print:p-0 print:mt-4">
                            <div className="hidden print:flex items-center gap-2 mb-2">
                              <Sparkles size={14} className="text-violet-600" />
                              <span className="text-[10px] font-black uppercase text-violet-600 tracking-widest">Разбор от ИИ</span>
                            </div>
                            <MarkdownViewer className="prose prose-sm max-w-none">
                              {task.ai_solution}
                            </MarkdownViewer>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};