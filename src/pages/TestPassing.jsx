import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CheckCircle, Loader2, X } from 'lucide-react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm'; // 👈 новый импорт

import 'katex/dist/katex.min.css';

// Компактный компонент для рендеринга контента с поддержкой формул и изображений
const MarkdownPreview = ({ text, title }) => (
  <div className="p-6 rounded-[2rem] border border-slate-200 bg-white shadow-sm">
    {title && <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">{title}</h4>}
    <div className="prose prose-slate max-w-none text-sm md:text-base text-slate-800
                    [&_img]:rounded-2xl [&_img]:my-6 [&_img]:mx-auto [&_img]:block [&_img]:max-h-64
                    [&_.katex-display]:my-4 [&_.katex-display]:text-sm [&_p]:leading-relaxed">
      <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]} 
      components={{
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border-collapse border border-slate-200 rounded-lg" {...props} />
            </div>
          ),
          th: ({ node, ...props }) => (
            <th className="border border-slate-200 bg-slate-50 px-4 py-2 text-left font-bold" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="border border-slate-200 px-4 py-2" {...props} />
          ),
          code: ({ node, inline, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            return !inline ? (
              <code className={`${className} block bg-slate-800 text-white p-4 rounded-xl overflow-x-auto text-sm`} {...props}>
                {children}
              </code>
            ) : (
              <code className="bg-slate-100 text-rose-600 px-1.5 py-0.5 rounded-md text-sm" {...props}>
                {children}
              </code>
            );
          },
          a: ({ node, ...props }) => (
            <a className="text-blue-600 hover:text-blue-800 underline transition-colors" target="_blank" rel="noopener noreferrer" {...props} />
          ),
        }}>
        {text || "*Загрузка условия...*"}
      </ReactMarkdown>
    </div>
  </div>
);

export default function TestPassing() {
  const { testId } = useParams();
  const navigate = useNavigate();
  
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState({}); // Храним как {taskId: ["1", "3"]}
  const [finished, setFinished] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Сброс подсказки при смене вопроса
  useEffect(() => {
    setShowHint(false);
  }, [currentIdx]);

  useEffect(() => {
    const fetchTest = async () => {
      try {
        const session = localStorage.getItem('edu_session');
        const token = session ? JSON.parse(session)?.token : null;
        if (!token) return navigate('/login');

        const res = await axios.get(`https://tests-production-46d5.up.railway.app/student/tests/${testId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        // --- ОБНОВЛЕННАЯ ЛОГИКА СОРТИРОВКИ ---
        if (res.data && res.data.tasks) {
  res.data.tasks.sort((a, b) => {
    // 1. Сначала по возрастанию id
    if (a.id !== b.id) {
      return a.id - b.id;
    }
    
    // 2. При равных id — закрытые (есть options) сначала, потом открытые
    const aTypeWeight = a.options ? 0 : 1;
    const bTypeWeight = b.options ? 0 : 1;
    
    if (aTypeWeight !== bTypeWeight) {
      return aTypeWeight - bTypeWeight;
    }
    
    // 3. Внутри групп — по возрастанию сложности (1 -> 5)
    return (a.difficulty || 0) - (b.difficulty || 0);
  });
}
        // -------------------------------------

        setTest(res.data);
      } catch (err) {
        console.error("Ошибка загрузки теста:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTest();
  }, [testId, navigate]);

  const currentTask = test?.tasks?.[currentIdx];

  // Логика переключения ответов (ИНДЕКС + 1)
  const handleToggleAnswer = (index) => {
    const taskId = currentTask.id;
    const val = String(index + 1); // Сохраняем "1" вместо 0, "2" вместо 1...
    
    const currentSelection = Array.isArray(userAnswers[taskId]) ? userAnswers[taskId] : [];
    
    if (currentSelection.includes(val)) {
      setUserAnswers({ 
        ...userAnswers, 
        [taskId]: currentSelection.filter(i => i !== val) 
      });
    } else {
      setUserAnswers({ 
        ...userAnswers, 
        [taskId]: [...currentSelection, val] 
      });
    }
  };

  // Текстовый ввод для открытых вопросов
  const handleTextChange = (val) => {
    setUserAnswers({ ...userAnswers, [currentTask.id]: val });
  };

  // Финальная отправка
  const submitTest = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const token = JSON.parse(localStorage.getItem('edu_session'))?.token;
      
      const payload = Object.keys(userAnswers).map(id => {
        const ans = userAnswers[id];
        return {
          task_id: parseInt(id),
          // Склеиваем индексы через запятую и сортируем их
          user_answer: Array.isArray(ans) ? ans.sort((a, b) => a - b).join(',') : String(ans)
        };
      });

      await axios.post(`https://tests-production-46d5.up.railway.app/student/tests/${testId}/submit`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFinished(true);
    } catch (err) {
      alert("Не удалось отправить тест. Проверьте интернет-соединение.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin text-blue-500" size={32} />
    </div>
  );
  
  if (finished) return (
    <div className="h-screen flex flex-col items-center justify-center p-6 text-center bg-slate-50">
      <div className="w-24 h-24 bg-emerald-500 rounded-[2.5rem] flex items-center justify-center text-white mb-8 shadow-xl shadow-emerald-100 italic font-black text-4xl">!</div>
      <h1 className="text-4xl font-black uppercase italic tracking-tighter mb-2">Тест завершен</h1>
      <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-10">Результаты сохранены в профиле</p>
      <button 
        onClick={() => navigate('/student')} 
        className="px-12 py-5 bg-slate-950 text-white rounded-full font-black uppercase text-[11px] tracking-widest hover:scale-105 transition-transform shadow-lg"
      >
        Вернуться в кабинет
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
        
        {/* Header Прогресса */}
        <header className="flex justify-between items-center bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Вопрос</span>
            <span className="text-lg font-black italic">{currentIdx + 1} <span className="text-slate-200 font-medium not-italic mx-1">/</span> {test?.tasks?.length}</span>
          </div>
          <button onClick={() => navigate(-1)} className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
            <X size={20}/>
          </button>
        </header>

        {/* Тело задания */}
        {currentTask && (
          <MarkdownPreview 
            text={currentTask.content} 
            title={`Задание №${currentIdx + 1}`} 
          />
        )}

        {/* Подсказка */}
        {currentTask?.hint && (
          <div className="mt-2">
            {!showHint ? (
              <button 
                onClick={() => setShowHint(true)}
                className="flex items-center gap-2 text-[10px] font-black uppercase text-amber-600 bg-amber-50 px-5 py-3 rounded-2xl hover:bg-amber-100 transition-all border border-amber-200/40"
              >
                <span>💡</span> Нужна помощь?
              </button>
            ) : (
              <div className="p-6 bg-amber-50 border border-amber-200/60 rounded-[2rem] animate-in fade-in zoom-in-95 duration-300">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[9px] font-black uppercase text-amber-600 tracking-widest">Методическая подсказка</span>
                  <button onClick={() => setShowHint(false)} className="text-amber-400 hover:text-amber-600"><X size={16}/></button>
                </div>
                <div className="prose prose-slate prose-sm text-amber-900/80 max-w-none font-medium">
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{currentTask.hint}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Секция выбора ответов */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 ml-2">
            <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Ваш вариант ответа:</p>
          </div>
          
          {currentTask?.is_open_answer ? (
            <input 
              key={currentTask.id}
              autoFocus
              className="w-full p-6 bg-white border-2 border-slate-100 rounded-[2rem] text-xl font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all shadow-sm"
              placeholder="Введите значение..."
              value={userAnswers[currentTask.id] || ''}
              onChange={(e) => handleTextChange(e.target.value)}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentTask?.options?.map((opt, i) => {
                const currentVal = String(i + 1); // Сверка по "1", "2"...
                const isSelected = Array.isArray(userAnswers[currentTask.id]) 
                  ? userAnswers[currentTask.id].includes(currentVal)
                  : userAnswers[currentTask.id] === currentVal;

                return (
                  <button
                    key={i}
                    onClick={() => handleToggleAnswer(i)}
                    className={`p-5 text-left rounded-[1.8rem] border-2 transition-all flex justify-between items-center group relative overflow-hidden ${
                      isSelected 
                      ? 'border-blue-500 bg-blue-50/50 text-blue-700 shadow-md' 
                      : 'border-white bg-white hover:border-slate-200 text-slate-600 shadow-sm'
                    }`}
                  >
                    <div className="flex gap-4 items-center z-10">
                      <span className={`text-[11px] font-black italic ${isSelected ? 'text-blue-400' : 'text-slate-300'}`}>
                        {currentVal}.
                      </span>
                      <div className="prose-sm pointer-events-none font-bold">
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {opt}
                        </ReactMarkdown>
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all z-10 ${
                      isSelected ? 'bg-blue-500 border-blue-500 scale-110 shadow-lg shadow-blue-200' : 'border-slate-100 group-hover:border-slate-300'
                    }`}>
                      {isSelected && <CheckCircle size={14} className="text-white" strokeWidth={3} />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Нижняя панель навигации */}
        <footer className="flex justify-between items-center pt-8">
          <button 
            disabled={currentIdx === 0}
            onClick={() => setCurrentIdx(v => v - 1)}
            className="flex items-center gap-3 text-slate-400 font-black text-[10px] uppercase tracking-widest disabled:opacity-0 p-4 hover:text-slate-600 transition-colors"
          >
            <ChevronLeft size={18}/> Назад
          </button>

          {currentIdx === test.tasks.length - 1 ? (
            <button 
              onClick={submitTest}
              disabled={isSubmitting}
              className="px-12 py-5 bg-blue-600 text-white rounded-full font-black uppercase text-[11px] tracking-[0.15em] shadow-xl shadow-blue-200 active:scale-95 transition-all disabled:bg-slate-300"
            >
              {isSubmitting ? 'Отправка...' : 'Завершить работу'}
            </button>
          ) : (
            <button 
              onClick={() => setCurrentIdx(v => v + 1)}
              className="flex items-center gap-3 px-10 py-5 bg-slate-900 text-white rounded-full font-black uppercase text-[11px] tracking-[0.15em] shadow-xl active:scale-95 transition-all"
            >
              Следующий шаг <ChevronRight size={18}/>
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}