import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CheckCircle, Loader2, X, MapPin, XCircle, Lightbulb, Sparkles, Pencil, Eraser, RotateCcw, Palette, Download } from 'lucide-react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import DrawingPad from '../components/DrawingPad';
import { TestReport } from '../components/TestReport';
import 'katex/dist/katex.min.css';


// —————— Компонент предпросмотра подсказки (оставлен без изменений) ——————
const MathHintPreview = ({ text, title = "💡 AI-ПОДСКАЗКА", isLoading = false, error = null }) => {
  // ... (код остаётся прежним)
  if (isLoading) {
    return (
      <div className="p-6 rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        {title && <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">{title}</h4>}
        <div className="flex items-center space-x-3 py-4">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-200 border-t-blue-500"></div>
          <p className="text-sm text-slate-500">Генерирую подсказку...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-6 rounded-[2rem] border border-red-200 bg-red-50 shadow-sm">
        {title && <h4 className="text-[10px] font-black uppercase text-red-400 tracking-widest mb-4">{title}</h4>}
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }
  const formattedText = text ? text.replace(/\\n/g, '  \n').replace(/\n/g, '  \n') : "*Подсказка появится здесь...*";
  return (
    <div className="p-6 rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      {title && <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">{title}</h4>}
      <div className="text-slate-700 text-sm md:text-base leading-relaxed">
        <ReactMarkdown 
          remarkPlugins={[remarkMath, remarkGfm]} 
          rehypePlugins={[rehypeKatex]}
          components={{
            p: ({ children }) => <p className="mb-4 last:mb-0 text-left">{children}</p>,
            inlineMath: ({ children }) => <span className="inline justify-center text-blue-600">{children}</span>,
            math: ({ children }) => <div className="my-4 flex justify-center overflow-x-auto">{children}</div>,
            br: () => <br className="block my-1" />,
            ul: ({ children }) => <ul className="list-disc pl-5 mb-4 text-left space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-5 mb-4 text-left space-y-1">{children}</ol>,
            li: ({ children }) => <li className="text-slate-700">{children}</li>,
          }}
        >
          {formattedText}
        </ReactMarkdown>
      </div>
      {text && text !== "*Подсказка появится здесь..." && (
        <div className="mt-4 pt-3 border-t border-slate-100 text-left">
          <p className="text-xs text-slate-400">Ответ сгенерирован с помощью ИИ. Возможны ошибки</p>
        </div>
      )}
    </div>
  );
};

// —————— Компонент карты вопросов (оставлен без изменений) ——————
const QuestionMap = ({ tasks, userAnswers, currentIdx, onNavigate }) => {
  // ... (код остаётся прежним)
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-white border border-slate-700 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-800 transition-all shadow-2xl shadow-slate-900/20"
        >
          <MapPin size={14} />
          Карта
          <span className="bg-white/20 px-2 py-0.5 rounded-full text-[9px]">
            {Object.keys(userAnswers).filter(id => userAnswers[id]?.length > 0).length}/{tasks?.length || 0}
          </span>
        </button>
      </div>
      {isExpanded && (
        <>
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={() => setIsExpanded(false)} />
          <div className="fixed bottom-24 right-6 bg-white border border-slate-200 rounded-[2rem] p-5 shadow-2xl z-50 w-80 animate-in slide-in-from-bottom-2 duration-200">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Навигация</span>
              <button onClick={() => setIsExpanded(false)} className="p-1 bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all">
                <XCircle size={14} />
              </button>
            </div>
            <div className="grid grid-cols-5 gap-2 max-h-[50vh] overflow-y-auto p-1">
              {tasks?.map((task, idx) => {
                const hasAnswer = userAnswers[task.id] && (Array.isArray(userAnswers[task.id]) ? userAnswers[task.id].length > 0 : userAnswers[task.id] !== '');
                const isCurrent = idx === currentIdx;
                return (
                  <button
                    key={task.id}
                    onClick={() => { onNavigate(idx); setIsExpanded(false); }}
                    className={`aspect-square rounded-xl flex items-center justify-center text-xs font-black transition-all hover:scale-110 ${isCurrent ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-110 ring-2 ring-blue-600/20' : hasAnswer ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-4 mt-4 text-[9px] font-bold text-slate-400">
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-100 rounded-md"></span> Отвечено</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-slate-100 rounded-md"></span> Без ответа</span>
            </div>
          </div>
        </>
      )}
    </>
  );
};

// —————— ГЛАВНЫЙ КОМПОНЕНТ ——————
export default function TestPassing() {
  const { testId } = useParams();
  const navigate = useNavigate();
  
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(() => {
    const saved = localStorage.getItem(`test_progress_${testId}`);
    return saved ? JSON.parse(saved).currentIdx : 0;
  });
  const [userAnswers, setUserAnswers] = useState(() => {
    const saved = localStorage.getItem(`test_progress_${testId}`);
    return saved ? JSON.parse(saved).answers : {};
  });
  const [drawings, setDrawings] = useState(() => {
    const saved = localStorage.getItem(`test_progress_${testId}`);
    return saved ? JSON.parse(saved).drawings || {} : {};
  });
  const [showDrawing, setShowDrawing] = useState({});
  const [finished, setFinished] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [hintData, setHintData] = useState({});
  const [hintLoading, setHintLoading] = useState({});
  const [hintUsed, setHintUsed] = useState({});

  // Ссылка на текущий canvas для сохранения
  const canvasRef = useRef(null);
  const currentTaskId = test?.tasks?.[currentIdx]?.id;

  // Сохранение прогресса (включая рисунки)
  const saveProgress = useCallback(() => {
    if (test && !finished) {
      localStorage.setItem(`test_progress_${testId}`, JSON.stringify({
        currentIdx,
        answers: userAnswers,
        drawings,
        timestamp: Date.now()
      }));
    }
  }, [currentIdx, userAnswers, drawings, testId, test, finished]);

  useEffect(() => {
    const timer = setTimeout(saveProgress, 500);
    return () => clearTimeout(timer);
  }, [currentIdx, userAnswers, drawings, saveProgress]);

  useEffect(() => {
    const handleBeforeUnload = () => saveProgress();
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveProgress]);

  // Загрузка теста
  useEffect(() => {
    let isMounted = true;
    const fetchTest = async () => {
      try {
        const session = localStorage.getItem('edu_session');
        const token = session ? JSON.parse(session)?.token : null;
        if (!token) return navigate('/login');

        const res = await axios.get(`https://tests-production-46d5.up.railway.app/student/tests/${testId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!isMounted) return;
        if (res.data && res.data.tasks) {
          res.data.tasks.sort((a, b) => {
            if (a.is_open_answer !== b.is_open_answer) return a.is_open_answer ? 1 : -1;
            if (a.id !== b.id) return a.id - b.id;
            return (a.difficulty || 0) - (b.difficulty || 0);
          });
        }
        setTest(res.data);

        const savedProgress = localStorage.getItem(`test_progress_${testId}`);
        if (savedProgress && isMounted) {
          const { currentIdx: savedIdx, answers: savedAnswers, drawings: savedDrawings, timestamp } = JSON.parse(savedProgress);
          const hoursSinceSave = (Date.now() - timestamp) / (1000 * 60 * 60);
          const alreadyRestored = localStorage.getItem(`test_restored_${testId}`);
          if (!alreadyRestored && hoursSinceSave < 24 && Object.keys(savedAnswers).length > 0) {
            localStorage.setItem(`test_restored_${testId}`, 'true');
            const shouldRestore = window.confirm('У вас есть сохранённый прогресс. Хотите продолжить с того места, где остановились?');
            if (shouldRestore) {
              setCurrentIdx(savedIdx);
              setUserAnswers(savedAnswers);
              setDrawings(savedDrawings || {});
            } else {
              localStorage.removeItem(`test_progress_${testId}`);
            }
          } else if (!alreadyRestored) {
            localStorage.removeItem(`test_progress_${testId}`);
          }
        }
      } catch (err) {
        console.error("Ошибка загрузки теста:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchTest();
    return () => { isMounted = false; };
  }, [testId, navigate]);

  const currentTask = test?.tasks?.[currentIdx];

  // Сохранение рисунка при переключении задания
  const saveCurrentDrawing = useCallback(() => {
    if (currentTaskId && canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL();
      setDrawings(prev => ({ ...prev, [currentTaskId]: dataUrl }));
    }
  }, [currentTaskId]);

  // Автосохранение рисунка при переключении
  useEffect(() => {
    return () => {
      saveCurrentDrawing();
    };
  }, [currentTaskId, saveCurrentDrawing]);

  // Подсказка
  const fetchHint = async (taskId) => {
    if (hintUsed[taskId]) return;
    setHintUsed(prev => ({ ...prev, [taskId]: true }));
    setHintLoading(prev => ({ ...prev, [taskId]: true }));
    try {
      const token = JSON.parse(localStorage.getItem('edu_session'))?.token;
      const res = await axios.post(
        `https://tests-production-46d5.up.railway.app/student/tasks/${taskId}/hint`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.hint) {
        setHintData(prev => ({ ...prev, [taskId]: res.data.hint }));
      }
    } catch (err) {
      console.error('Ошибка загрузки подсказки:', err);
      setHintData(prev => ({ ...prev, [taskId]: 'Не удалось загрузить подсказку. Попробуйте позже.' }));
    } finally {
      setHintLoading(prev => ({ ...prev, [taskId]: false }));
    }
  };

  const handleToggleAnswer = (index) => {
    const taskId = currentTask.id;
    const val = String(index + 1);
    const currentSelection = Array.isArray(userAnswers[taskId]) ? userAnswers[taskId] : [];
    if (currentSelection.includes(val)) {
      setUserAnswers({ ...userAnswers, [taskId]: currentSelection.filter(i => i !== val) });
    } else {
      setUserAnswers({ ...userAnswers, [taskId]: [...currentSelection, val] });
    }
  };

  const handleTextChange = (val) => {
    setUserAnswers({ ...userAnswers, [currentTask.id]: val });
  };

  const toggleDrawing = () => {
    const taskId = currentTask.id;
    setShowDrawing(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const submitTest = async () => {
    if (isSubmitting) return;
    // Сохраняем последний рисунок
    saveCurrentDrawing();
    setIsSubmitting(true);
    try {
      const token = JSON.parse(localStorage.getItem('edu_session'))?.token;
      const payload = Object.keys(userAnswers).map(id => ({
        task_id: parseInt(id),
        user_answer: Array.isArray(userAnswers[id]) ? userAnswers[id].sort((a, b) => a - b).join(',') : String(userAnswers[id])
      }));
      await axios.post(`https://tests-production-46d5.up.railway.app/student/tests/${testId}/submit`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      localStorage.removeItem(`test_progress_${testId}`);
      localStorage.removeItem(`test_restored_${testId}`);
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

  if (finished) {
    return <TestReport test={test} userAnswers={userAnswers} drawings={drawings} onBack={() => navigate('/student')} />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
        <header className="flex justify-between items-center bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Вопрос</span>
              <span className="text-lg font-black italic">{currentIdx + 1} <span className="text-slate-200 font-medium not-italic mx-1">/</span> {test?.tasks?.length}</span>
            </div>
            <QuestionMap tasks={test?.tasks} userAnswers={userAnswers} currentIdx={currentIdx} onNavigate={(idx) => setCurrentIdx(idx)} />
          </div>
          <button onClick={() => navigate(-1)} className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
            <X size={20} />
          </button>
        </header>

        {currentTask && (
          <MarkdownPreview text={currentTask.content} title={`Задание №${currentIdx + 1}`} />
        )}

        {/* AI подсказка */}
        <div className="mt-2">
          {!hintUsed[currentTask?.id] ? (
            <button
              onClick={() => fetchHint(currentTask?.id)}
              className="flex items-center gap-2 text-[10px] font-black uppercase text-violet-600 bg-violet-50 px-5 py-3 rounded-2xl hover:bg-violet-100 transition-all border border-violet-200/40 active:scale-95"
            >
              <Sparkles size={14} className="text-violet-500" />
              ИИ-подсказка (1 раз)
            </button>
          ) : hintLoading[currentTask?.id] ? (
            <div className="flex items-center gap-3 p-5 bg-violet-50/50 border border-violet-100 rounded-[2rem]">
              <Loader2 size={16} className="animate-spin text-violet-400" />
              <span className="text-[10px] font-black uppercase text-violet-400 tracking-widest">ИИ думает...</span>
            </div>
          ) : hintData[currentTask?.id] ? (
            <div className="p-6 bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200/40 rounded-[2rem] animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[9px] font-black uppercase text-violet-600 tracking-widest flex items-center gap-2">
                  <Lightbulb size={14} className="text-amber-500" />
                  Подсказка ИИ
                </span>
                <span className="text-[8px] font-bold text-violet-400 bg-violet-100 px-2 py-0.5 rounded-lg">использовано</span>
              </div>
              <MathHintPreview text={hintData[currentTask?.id]} title="" />
            </div>
          ) : null}
        </div>

        {/* Рисовалка */}
          {showDrawing[currentTask?.id] && (
            <DrawingPad
              ref={canvasRef}
              initialData={drawings[currentTask?.id]}
              onSave={(dataUrl) => setDrawings(prev => ({ ...prev, [currentTask.id]: dataUrl }))}
              onDataChange={(dataUrl) => setDrawings(prev => ({ ...prev, [currentTask.id]: dataUrl }))}
            />
          )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 ml-2">
              <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Ваш вариант ответа:</p>
            </div>
            <button
              onClick={toggleDrawing}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-600 transition"
            >
              <Pencil size={14} />
              {showDrawing[currentTask?.id] ? 'Скрыть рисовалку' : 'Показать рисовалку'}
            </button>

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
                const currentVal = String(i + 1);
                const isSelected = Array.isArray(userAnswers[currentTask.id]) ? userAnswers[currentTask.id].includes(currentVal) : userAnswers[currentTask.id] === currentVal;
                return (
                  <button
                    key={i}
                    onClick={() => handleToggleAnswer(i)}
                    className={`p-5 text-left rounded-[1.8rem] border-2 transition-all flex justify-between items-center group relative overflow-hidden ${
                      isSelected ? 'border-blue-500 bg-blue-50/50 text-blue-700 shadow-md' : 'border-white bg-white hover:border-slate-200 text-slate-600 shadow-sm'
                    }`}
                  >
                    <div className="flex gap-4 items-center z-10">
                      <span className={`text-[11px] font-black italic ${isSelected ? 'text-blue-400' : 'text-slate-300'}`}>{currentVal}.</span>
                      <div className="prose-sm pointer-events-none font-bold">
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{opt}</ReactMarkdown>
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all z-10 ${isSelected ? 'bg-blue-500 border-blue-500 scale-110 shadow-lg shadow-blue-200' : 'border-slate-100 group-hover:border-slate-300'}`}>
                      {isSelected && <CheckCircle size={14} className="text-white" strokeWidth={3} />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          
        </div>

        <footer className="flex justify-between items-center pt-8">
          <button
            disabled={currentIdx === 0}
            onClick={() => setCurrentIdx(v => v - 1)}
            className="flex items-center gap-3 text-slate-400 font-black text-[10px] uppercase tracking-widest disabled:opacity-0 p-4 hover:text-slate-600 transition-colors"
          >
            <ChevronLeft size={18} /> Назад
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
              Следующий шаг <ChevronRight size={18} />
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

// —————— Компонент предпросмотра (оставлен без изменений) ——————
const MarkdownPreview = ({ text, title }) => {
  return (
    <div className="p-6 rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      {title && <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">{title}</h4>}
      <div className="prose prose-slate max-w-none text-sm md:text-base text-slate-800
                      [&_img]:rounded-2xl [&_img]:my-6 [&_img]:mx-auto [&_img]:block [&_img]:max-h-64
                      [&_.katex-display]:my-4 [&_.katex-display]:text-sm [&_p]:leading-relaxed">
        <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}
          components={{
            table: ({ node, ...props }) => <div className="overflow-x-auto my-4"><table className="min-w-full border-collapse border border-slate-200 rounded-lg" {...props} /></div>,
            th: ({ node, ...props }) => <th className="border border-slate-200 bg-slate-50 px-4 py-2 text-left font-bold" {...props} />,
            td: ({ node, ...props }) => <td className="border border-slate-200 px-4 py-2" {...props} />,
            code: ({ node, inline, className, children, ...props }) => {
              const match = /language-(\w+)/.exec(className || '');
              return !inline ? (
                <code className={`${className} block bg-slate-800 text-white p-4 rounded-xl overflow-x-auto text-sm`} {...props}>{children}</code>
              ) : (
                <code className="bg-slate-100 text-rose-600 px-1.5 py-0.5 rounded-md text-sm" {...props}>{children}</code>
              );
            },
            a: ({ node, ...props }) => <a className="text-blue-600 hover:text-blue-800 underline transition-colors" target="_blank" rel="noopener noreferrer" {...props} />,
          }}>
          {text || "*Загрузка условия...*"}
        </ReactMarkdown>
      </div>
    </div>
  );
};