import React, { useState, useRef } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Download, CheckCircle2, XCircle, AlertCircle, PenTool, Image as ImageIcon, Sparkles } from 'lucide-react';
import { MarkdownRenderer as MarkdownViewer } from '../pages/AdminResultView';

export const TestReport = ({ test, userAnswers, drawings, onBack }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const pdfTemplateRef = useRef(null); 

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

  // 2. Генерация PDF ОДНОЙ ДЛИННОЙ СТРАНИЦЕЙ
  const handleDownloadPDF = async () => {
    if (!pdfTemplateRef.current) return;
    setIsGenerating(true);

    try {
      const element = pdfTemplateRef.current;
      
      const canvas = await html2canvas(element, {
        scale: 2,             // Высокое разрешение для четкого отображения формул и графики
        useCORS: true,        // Пропуск внешних изображений
        logging: false,
        backgroundColor: '#FFFFFF',
        windowWidth: 1024,    // Стабильная десктопная ширина шаблона
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      
      const pdfWidth = 210; // Базовая ширина А4 в мм
      // Динамический расчет высоты страницы в мм пропорционально высоте канваса
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width; 

      // Инициализируем кастомный размер страницы [ширина, высота] вместо стандартного 'a4'
      const pdf = new jsPDF('p', 'mm', [pdfWidth, pdfHeight]);

      // Рендерим всё изображение на одну единую страницу
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

      pdf.save(`Результат_${test?.title || 'теста'}.pdf`);
    } catch (error) {
      console.error('Ошибка при сборке PDF:', error);
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
      
      {/* Экранный интерфейс */}
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-black italic">{test?.title || 'Результаты тестирования'}</h1>
            <p className="text-sm text-slate-500 mt-1">Проверено автоматически</p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <button onClick={onBack} className="px-6 py-3 bg-slate-100 text-slate-700 rounded-full text-[10px] font-black uppercase hover:bg-slate-200 transition">
              Назад
            </button>
            <button 
              onClick={handleDownloadPDF} 
              disabled={isGenerating}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase hover:bg-blue-700 transition shadow-lg shadow-blue-200 disabled:bg-blue-400"
            >
              <Download size={16} /> 
              {isGenerating ? 'Сохранение...' : 'Скачать PDF'}
            </button>
          </div>
        </div>

        {/* Сетка статистики на экране */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-blue-600">{scorePercentage}%</span>
            <span className="text-[10px] font-black uppercase text-slate-400 mt-2 tracking-widest">Результат</span>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-green-500">{stats?.correct}</span>
            <span className="text-[10px] font-black uppercase text-slate-400 mt-2 tracking-widest">Верно</span>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-red-500">{stats?.incorrect}</span>
            <span className="text-[10px] font-black uppercase text-slate-400 mt-2 tracking-widest">Ошибок</span>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-slate-400">{stats?.unanswered}</span>
            <span className="text-[10px] font-black uppercase text-slate-400 mt-2 tracking-widest">Пропущено</span>
          </div>
        </div>

        {/* Карточки на экране */}
        <div className="space-y-6">
          {test?.tasks?.map((task, idx) => {
            const answer = userAnswers[task.id];
            const isUnanswered = !answer || (Array.isArray(answer) && answer.length === 0);
            const isCorrect = !isUnanswered && (task.is_open_answer 
              ? String(answer).trim().toLowerCase() === String(task.answer || '').trim().toLowerCase()
              : (Array.isArray(answer) ? answer.sort().join(',') : String(answer)) === (Array.isArray(task.answer) ? task.answer.sort().join(',') : String(task.answer))
            );

            return (
              <div key={task.id} className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
                <div className={`p-4 border-b flex items-center justify-between ${isUnanswered ? 'bg-slate-50' : isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
                  <span className="text-sm font-black uppercase tracking-widest text-slate-700">Задание {idx + 1}</span>
                </div>
                <div className="p-6 space-y-4">
                  <MarkdownViewer>{task.content || '*Условие не указано*'}</MarkdownViewer>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl border bg-slate-50">
                      <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Ваш ответ</span>
                      <MarkdownViewer>{renderAnswerMD(task, answer, false)}</MarkdownViewer>
                    </div>
                    <div className="p-4 rounded-2xl border bg-blue-50/50 border-blue-100">
                      <span className="text-[9px] font-black uppercase text-blue-500 block mb-1">Верный ответ</span>
                      <MarkdownViewer>{renderAnswerMD(task, answer, true)}</MarkdownViewer>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. ШАБЛОН PDF С ФИКСИРОВАННЫМИ РАЗМЕРАМИ И ОТОБРАЖЕНИЕМ МАТЕМАТИКИ        */}
      {/* ========================================================================= */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', overflow: 'hidden', width: '0', height: '0' }}>
        <div 
          ref={pdfTemplateRef} 
          className="w-[1024px] bg-white p-16 space-y-10 text-black select-none"
          style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
        >
          {/* Стили для аккуратного выравнивания формул (KaTeX/MathJax) и картинок внутриMarkdown */}
          <style>{`
            .pdf-prose p { margin-bottom: 0.75rem; line-height: 1.6; font-size: 15px; }
            /* Центрирование и ограничение формул, если они выведены через $$ */
            .pdf-prose .katex-display, .pdf-prose .math-display { 
              margin: 1.25rem 0 !important; 
              padding: 0.5rem;
              background-color: #F8FAFC;
              border-radius: 0.75rem;
              display: inline-block;
              min-width: 100%;
              text-align: center;
            }
            /* Ограничение картинок, зашитых внутри контента Markdown */
            .pdf-prose img { 
              max-width: 550px !important; 
              height: auto !important; 
              margin: 1.5rem auto !important; 
              display: block;
              border-radius: 0.75rem;
            }
          `}</style>

          {/* Заголовок PDF */}
          <div className="border-b-4 border-slate-900 pb-8 flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-black italic tracking-tight">{test?.title || 'Результаты тестирования'}</h1>
              <p className="text-slate-500 font-medium mt-1 text-lg">Сгенерировано автоматически образовательной платформой</p>
            </div>
            <div className="text-right">
              <div className="text-5xl font-black text-blue-600">{scorePercentage}%</div>
              <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-1">Итоговый балл</div>
            </div>
          </div>

          {/* Статистика */}
          <div className="grid grid-cols-3 gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-200">
            <div className="text-center border-r border-slate-200">
              <div className="text-2xl font-black text-green-600">{stats?.correct}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Правильных ответов</div>
            </div>
            <div className="text-center border-r border-slate-200">
              <div className="text-2xl font-black text-red-600">{stats?.incorrect}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Ошибок в тесте</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-slate-500">{stats?.unanswered}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Пропущено заданий</div>
            </div>
          </div>

          {/* Список заданий */}
          <div className="space-y-10">
            {test?.tasks?.map((task, idx) => {
              const answer = userAnswers[task.id];
              const drawing = drawings[task.id];
              const isUnanswered = !answer || (Array.isArray(answer) && answer.length === 0);
              const isCorrect = !isUnanswered && (task.is_open_answer 
                ? String(answer).trim().toLowerCase() === String(task.answer || '').trim().toLowerCase()
                : (Array.isArray(answer) ? answer.sort().join(',') : String(answer)) === (Array.isArray(task.answer) ? task.answer.sort().join(',') : String(task.answer))
              );

              return (
                <div key={`pdf-${task.id}`} className="border border-slate-300 rounded-[2rem] overflow-hidden bg-white shadow-sm">
                  {/* Шапка карточки */}
                  <div className={`p-5 border-b border-slate-200 flex justify-between items-center ${isUnanswered ? 'bg-slate-50' : isCorrect ? 'bg-green-50/70' : 'bg-red-50/70'}`}>
                    <span className="text-sm font-black uppercase tracking-wider text-slate-800">Задание {idx + 1}</span>
                    <span className={`text-xs font-bold uppercase tracking-wider ${isUnanswered ? 'text-slate-500' : isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                      {isUnanswered ? 'Не зачтено' : isCorrect ? 'Верно' : 'Неверно'}
                    </span>
                  </div>

                  <div className="p-8 space-y-6">
                    {/* Текст условия + формулы */}
                    <div className="pdf-prose max-w-none text-black">
                      <MarkdownViewer>{task.content || '*Условие отсутствует*'}</MarkdownViewer>
                    </div>

                    {/* Сетка ответов */}
                    <div className="grid grid-cols-2 gap-6">
                      <div className={`p-5 rounded-2xl border ${isUnanswered ? 'bg-slate-50 border-slate-200' : isCorrect ? 'bg-green-50/30 border-green-200' : 'bg-red-50/30 border-red-200'}`}>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">Ваш ответ:</span>
                        <div className="pdf-prose"><MarkdownViewer>{renderAnswerMD(task, answer, false)}</MarkdownViewer></div>
                      </div>
                      <div className="p-5 rounded-2xl border bg-blue-50/30 border-blue-200">
                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-500 block mb-2">Правильный ответ:</span>
                        <div className="pdf-prose"><MarkdownViewer>{renderAnswerMD(task, answer, true)}</MarkdownViewer></div>
                      </div>
                    </div>

                    {/* Чертежи / Геометрические рисунки (Зажаты по ширине, отцентрированы) */}
                    {drawing && (
                      <div className="pt-4 border-t border-slate-100 flex flex-col items-center bg-[#FAFAFA] p-4 rounded-2xl">
                        <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 self-start">Прикрепленный чертеж:</div>
                        <img 
                          src={drawing} 
                          alt="Чертеж к заданию" 
                          className="max-w-[450px] max-h-[320px] w-auto h-auto object-contain rounded-xl border border-slate-200 bg-white shadow-sm" 
                        />
                      </div>
                    )}

                    {/* Разбор от ИИ */}
                    {task.ai_solution && (
                      <div className="pt-6 border-t border-slate-200 space-y-2">
                        <div className="flex items-center gap-2 text-violet-700 font-bold text-xs uppercase tracking-wider">
                          <Sparkles size={14} />
                          <span>Подробный разбор решения задачи от искусственного интеллекта</span>
                        </div>
                        <div className="p-6 bg-violet-50/40 border border-violet-100 rounded-2xl">
                          <div className="pdf-prose text-slate-900">
                            <MarkdownViewer>{task.ai_solution}</MarkdownViewer>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Подвал для бесконечной страницы */}
          <div className="text-center text-slate-400 text-xs font-bold uppercase tracking-widest pt-8 border-t border-slate-100">
            Конец отчета о тестировании
          </div>
        </div>
      </div>

    </div>
  );
};