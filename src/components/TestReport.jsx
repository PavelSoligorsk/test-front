import React, { useRef, useState, useEffect } from 'react';
import { Download, CheckCircle2, XCircle, AlertCircle, PenTool, Image as ImageIcon, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { MarkdownRenderer as MarkdownViewer } from '../pages/AdminResultView';

export const TestReport = ({ test, userAnswers, drawings, onBack }) => {
  const reportRef = useRef(null);
  const [expandedSolutions, setExpandedSolutions] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);

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

  // Хелпер: Ждем полной загрузки всех картинок (включая чертежи), чтобы html2canvas знал их точные размеры
  const waitForImages = async () => {
    if (!reportRef.current) return;
    const images = reportRef.current.querySelectorAll('img');
    const promises = Array.from(images).map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    });
    await Promise.all(promises);
  };

  // Экспорт в ОДНУ длинную страницу PDF
  const downloadPDF = async () => {
    if (!reportRef.current || isGenerating) return;
    
    setIsGenerating(true);
    try {
      // 1. Даем картинкам догрузиться и занять свои места в DOM
      await waitForImages();
      // Небольшой таймаут для стабилизации стилей перед скриншотом
      await new Promise((resolve) => setTimeout(resolve, 300));

      const element = reportRef.current;
      const canvas = await html2canvas(element, { 
        scale: 2.0,            // Увеличиваем масштаб для четкости (FullHD+ эквивалент)
        useCORS: true,         // Берем картинки с CORS, если настроены заголовки сервера
        allowTaint: true,      // Позволяет рендерить картинки без CORS (но может заблокировать toDataURL на iOS)
        logging: false,
        windowHeight: element.scrollHeight,
        backgroundColor: '#F8FAFC' // Сохраняем оригинальный цвет фона подложки
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.92); // Качество 0.92 — оптимальный баланс веса и четкости
      const pdfWidth = 210;    // Стандартный формат ширины (A4-пропорция в мм)
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pdfWidth, pdfHeight],
        compress: true
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      pdf.save(`Отчет_${test?.title || 'тест'}.pdf`);
    } catch (err) {
      console.error('Ошибка генерации PDF:', err);
      alert('Не удалось создать PDF. Если картинки не отобразились, проверьте настройки CORS на сервере.');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleSolution = (taskId) => {
    setExpandedSolutions(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Верхняя панель управления */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
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
              onClick={downloadPDF} 
              disabled={isGenerating}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 text-white rounded-full text-[10px] font-black uppercase transition shadow-lg ${
                isGenerating ? 'bg-slate-400 cursor-not-allowed shadow-none' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
              }`}
            >
              <Download size={16} /> {isGenerating ? 'Создание...' : 'Скачать PDF'}
            </button>
          </div>
        </div>

        {/* Контейнер для экспорта в PDF */}
        <div ref={reportRef} className="space-y-6 bg-[#F8FAFC] p-4 -m-4">
          
          {/* Блок статистики */}
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

          {/* Карточки заданий */}
          <div className="space-y-6">
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
                <div key={task.id} className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
                  {/* Шапка карточки */}
                  <div className={`p-4 border-b flex items-center justify-between ${
                    isUnanswered ? 'bg-slate-50 border-slate-200' : isCorrect ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'
                  }`}>
                    <div className="flex items-center gap-3">
                      {isUnanswered ? (
                        <AlertCircle className="text-slate-400" size={20} />
                      ) : isCorrect ? (
                        <CheckCircle2 className="text-green-500" size={20} />
                      ) : (
                        <XCircle className="text-red-500" size={20} />
                      )}
                      <span className="text-sm font-black uppercase tracking-widest text-slate-700">Задание {idx + 1}</span>
                    </div>
                    {drawing && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-blue-500 bg-blue-100 px-2 py-1 rounded-lg">
                        <PenTool size={12} /> Есть чертеж
                      </span>
                    )}
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Условие задачи с жестким контролем картинок внутри контента */}
                    <div className="prose prose-sm max-w-none text-black [&_img]:mx-auto [&_img]:max-w-full [&_img]:h-auto [&_img]:object-contain [&_img]:rounded-xl [&_img]:my-4">
                      <MarkdownViewer>
                        {task.content || '*Условие не указано*'}
                      </MarkdownViewer>
                    </div>

                    {/* Блок ответов */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className={`p-4 rounded-2xl border ${isUnanswered ? 'bg-slate-50 border-slate-200' : isCorrect ? 'bg-green-50 border-green-200 text-green-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
                        <span className={`text-[9px] font-black uppercase tracking-widest block mb-2 ${isUnanswered ? 'text-slate-400' : isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                          Ваш ответ
                        </span>
                        <MarkdownViewer className="prose prose-sm max-w-none prose-p:my-1">
                          {userAnswerMD}
                        </MarkdownViewer>
                      </div>
                      
                      <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200">
                        <span className="text-[9px] font-black uppercase text-blue-500 tracking-widest block mb-2">Верный ответ</span>
                        <MarkdownViewer className="prose prose-sm max-w-none text-blue-900 prose-p:my-1">
                          {correctAnswerMD}
                        </MarkdownViewer>
                      </div>
                    </div>

                    {/* Чертеж (Фикс размазывания: контролируем ширину контейнера и картинки) */}
                    {drawing && (
                      <div className="mt-4 border-t border-slate-100 pt-6">
                        <div className="flex items-center gap-2 mb-4">
                          <ImageIcon size={16} className="text-slate-400" />
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Прикрепленный черновик</span>
                        </div>
                        <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden flex justify-center items-center p-4 min-h-[200px] max-h-[450px] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiNlMmU4ZjAiLz48L3N2Zz4=')]">
                          <img 
                            src={drawing} 
                            alt={`Чертеж к заданию ${idx+1}`} 
                            className="max-w-full max-h-[400px] w-auto h-auto object-contain rounded-xl shadow-sm bg-white" 
                          />
                        </div>
                      </div>
                    )}

                    {/* Разбор от ИИ */}
                    {task.ai_solution && (
                      <div className="border-t border-slate-100 pt-4">
                        <button 
                          onClick={() => toggleSolution(task.id)}
                          className="flex items-center justify-between w-full p-4 bg-violet-50 hover:bg-violet-100 rounded-2xl transition-colors border border-violet-100"
                        >
                          <div className="flex items-center gap-2">
                            <Sparkles size={16} className="text-violet-500" />
                            <span className="text-[10px] font-black uppercase text-violet-600 tracking-widest">Разбор от ИИ</span>
                          </div>
                          {expandedSolutions[task.id] ? <ChevronUp size={16} className="text-violet-400" /> : <ChevronDown size={16} className="text-violet-400" />}
                        </button>
                        
                        {expandedSolutions[task.id] && (
                          <div className="mt-2 p-5 bg-white border border-violet-100 rounded-2xl shadow-sm prose prose-sm max-w-none [&_img]:mx-auto [&_img]:max-w-full [&_img]:h-auto [&_img]:object-contain [&_img]:rounded-xl">
                            <MarkdownViewer>
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