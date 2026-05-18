import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp, ArrowLeft, BarChart3, MapPin } from 'lucide-react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';

// Компонент для отображения подсказки ИИ
const MathHintPreview = ({ text, title = "💡 AI-ПОДСКАЗКА", isLoading = false, error = null, onClose = null }) => {
  if (isLoading) {
    return (
      <div className="relative p-6 rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        {onClose && (
          <button onClick={onClose} className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-full">
            <XCircle size={18} className="text-slate-400" />
          </button>
        )}
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
      <div className="relative p-6 rounded-[2rem] border border-red-200 bg-red-50 shadow-sm">
        {onClose && (
          <button onClick={onClose} className="absolute top-4 right-4 p-1 hover:bg-red-100 rounded-full">
            <XCircle size={18} className="text-red-400" />
          </button>
        )}
        {title && <h4 className="text-[10px] font-black uppercase text-red-400 tracking-widest mb-4">{title}</h4>}
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  const formattedText = text ? text.replace(/\\n/g, '\n\n') : "*Подсказка появится здесь...*";

  return (
    <div className="relative p-6 rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      {onClose && (
        <button onClick={onClose} className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-full z-10">
          <XCircle size={18} className="text-slate-400 hover:text-slate-600" />
        </button>
      )}
      {title && <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 pr-6">{title}</h4>}
      <div className="text-slate-700 text-sm md:text-base leading-relaxed">
        <ReactMarkdown 
          remarkPlugins={[remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
            p: ({ children }) => <p className="mb-4 last:mb-0 text-left">{children}</p>,
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

// Компонент для отображения AI-решения
const AISolutionPreview = ({ data, isLoading = false, error = null, onClose = null }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (data?.ai_solution) {
      navigator.clipboard.writeText(data.ai_solution);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="relative p-6 rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        {onClose && (
          <button onClick={onClose} className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-full transition-colors">
            <XCircle size={18} className="text-slate-400" />
          </button>
        )}
        <h4 className="text-[10px] font-black uppercase text-green-600 tracking-widest mb-4">🤖 AI-РЕШЕНИЕ</h4>
        <div className="flex items-center space-x-3 py-4">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-200 border-t-green-500"></div>
          <p className="text-sm text-slate-500">Генерирую решение...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative p-6 rounded-[2rem] border border-red-200 bg-red-50 shadow-sm">
        {onClose && (
          <button onClick={onClose} className="absolute top-4 right-4 p-1 hover:bg-red-100 rounded-full transition-colors">
            <XCircle size={18} className="text-red-400" />
          </button>
        )}
        <h4 className="text-[10px] font-black uppercase text-red-600 tracking-widest mb-4">🤖 AI-РЕШЕНИЕ</h4>
        <div className="flex items-center gap-2 p-3 bg-red-100 rounded-xl">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 text-xs text-red-500 hover:text-red-700 underline"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  if (!data) return null;

  // Проверка на пустое решение
  const hasSolution = data.ai_solution && data.ai_solution.trim().length > 0;
  const hasAnswer = data.ai_answer && data.ai_answer.trim().length > 0;
  const isSuccess = data.success !== false;
  const isVerified = data.verified === true;

  // Если решение не найдено
  if (!isSuccess || !hasSolution) {
    return (
      <div className="relative p-6 rounded-[2rem] border border-amber-200 bg-amber-50 shadow-sm">
        {onClose && (
          <button onClick={onClose} className="absolute top-4 right-4 p-1 hover:bg-amber-100 rounded-full transition-colors">
            <XCircle size={18} className="text-amber-400" />
          </button>
        )}
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle size={16} className="text-amber-600" />
          <h4 className="text-[10px] font-black uppercase text-amber-700 tracking-widest">🤖 AI-РЕШЕНИЕ</h4>
        </div>
        <p className="text-sm text-amber-700">
          {data.message || "Не удалось получить решение от ИИ. Попробуйте позже."}
        </p>
      </div>
    );
  }

  return (
    <div className="relative p-6 rounded-[2rem] border shadow-sm bg-white">
      {onClose && (
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-full transition-colors z-10"
        >
          <XCircle size={18} className="text-slate-400 hover:text-slate-600" />
        </button>
      )}
      
      {/* Заголовок с проверками */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4 pr-6">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-green-600">🤖 AI-РЕШЕНИЕ</h4>
          
          {isVerified ? (
            <span className="text-[8px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 size={10} /> ✓ ПРОВЕРЕНО
            </span>
          ) : (
            <span className="text-[8px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
              <AlertCircle size={10} /> ⚠ НЕ ПРОВЕРЕНО
            </span>
          )}
          
          {data.context?.difficulty && (
            <span className="text-[8px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
              Сложность: {data.context.difficulty}/5
            </span>
          )}
        </div>
        
        {/* Кнопка копирования */}
        <button 
          onClick={handleCopy}
          className="text-[8px] font-black uppercase text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1"
        >
          {copied ? (
            <>
              <CheckCircle2 size={10} /> СКОПИРОВАНО
            </>
          ) : (
            <>
              📋 КОПИРОВАТЬ
            </>
          )}
        </button>
      </div>
      
      {/* Основное решение - с прокруткой для широких формул */}
      <div className={`text-slate-700 text-sm md:text-base leading-relaxed ${!isExpanded && 'max-h-48 overflow-hidden relative'}`}>
        <style>{`
          .math-solution .katex-display {
            overflow-x: auto;
            overflow-y: hidden;
            padding: 8px 0;
            margin: 12px 0;
          }
          .math-solution .katex-display > .katex {
            white-space: nowrap;
          }
          .math-solution .katex {
            font-size: 1.05em;
          }
          .math-solution pre {
            white-space: pre-wrap;
            word-wrap: break-word;
          }
        `}</style>
        
        <div className="math-solution">
          <ReactMarkdown 
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
              p: ({ children }) => <p className="mb-4 last:mb-0 text-left whitespace-normal break-words">{children}</p>,
              strong: ({ children }) => <strong className="font-bold text-slate-900">{children}</strong>,
              code: ({ inline, children }) => inline 
                ? <code className="bg-slate-100 px-1 py-0.5 rounded text-sm font-mono break-words">{children}</code>
                : <code className="block bg-slate-800 text-white p-3 rounded-xl overflow-x-auto text-sm my-2 whitespace-pre-wrap break-words">{children}</code>,
            }}
          >
            {data.ai_solution}
          </ReactMarkdown>
        </div>
        
        {/* Кнопка "Показать ещё" для длинных решений */}
        {!isExpanded && (
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent pointer-events-none" />
        )}
      </div>
      
      {!isExpanded && (
        <button 
          onClick={() => setIsExpanded(true)}
          className="mt-2 text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
        >
          <ChevronDown size={14} /> Показать полное решение
        </button>
      )}
      
      {isExpanded && data.ai_solution?.length > 1500 && (
        <button 
          onClick={() => setIsExpanded(false)}
          className="mt-2 text-xs text-slate-400 hover:text-slate-600 font-medium flex items-center gap-1"
        >
          <ChevronUp size={14} /> Свернуть
        </button>
      )}
      
      {/* Блок с ответами */}
      {hasAnswer && (
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className={`p-3 rounded-xl ${isVerified ? 'bg-emerald-50' : 'bg-amber-50'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Ответ AI</p>
                <p className="text-sm font-bold text-slate-800 font-mono break-words overflow-x-auto">{data.ai_answer}</p>
              </div>
              {data.correct_answer && (
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Правильный ответ</p>
                  <p className="text-sm font-bold text-green-700 font-mono break-words overflow-x-auto">{data.correct_answer}</p>
                </div>
              )}
            </div>
            
            {/* Статус проверки */}
            <div className="mt-2 pt-2 border-t border-slate-100/50">
              <p className={`text-[10px] font-medium ${isVerified ? 'text-emerald-600' : 'text-amber-600'}`}>
                {isVerified ? (
                  <span className="flex items-center gap-1"><CheckCircle2 size={10} /> {data.message || "Ответ совпадает с правильным"}</span>
                ) : (
                  <span className="flex items-center gap-1"><AlertCircle size={10} /> {data.message || "Ответ не совпадает с правильным"}</span>
                )}
              </p>
            </div>
          </div>
          
          {/* Дополнительная информация */}
          {data.context?.topic_mastery_percent !== undefined && (
            <p className="text-[9px] text-slate-400 mt-2">
              📊 Ваша успеваемость по теме: {data.context.topic_mastery_percent}%
            </p>
          )}
        </div>
      )}
      
      {/* Предупреждение */}
      <div className="mt-3">
        <p className="text-[9px] text-slate-400 italic">
          🤖 Решение сгенерировано ИИ. Возможны ошибки. Проверяйте самостоятельно.
        </p>
      </div>
    </div>
  );
};
// Компонент для рендеринга Markdown
const MarkdownRenderer = ({ children, className = "" }) => {
  return (
    <div className={`prose prose-slate max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={{
          img: ({ src, alt, ...props }) => (
            <div className="my-6 overflow-hidden rounded-2xl bg-slate-100">
              <img 
                src={src} 
                alt={alt || 'Изображение'} 
                className="w-full h-auto object-contain max-h-[400px] hover:scale-105 transition-transform duration-500"
                loading="lazy"
                {...props}
              />
            </div>
          ),
          table: ({ ...props }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border-collapse border border-slate-200" {...props} />
            </div>
          ),
          th: ({ ...props }) => (
            <th className="border border-slate-200 bg-slate-50 px-4 py-2 text-left font-bold" {...props} />
          ),
          td: ({ ...props }) => (
            <td className="border border-slate-200 px-4 py-2" {...props} />
          ),
          code: ({ inline, className, children, ...props }) => {
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
          a: ({ ...props }) => (
            <a className="text-blue-600 hover:text-blue-800 underline transition-colors break-all" target="_blank" rel="noopener noreferrer" {...props} />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
};

const DifficultyBadge = ({ level, correct, total }) => {
  const percentage = Math.round((correct / total) * 100);
  
  const getColor = (lvl) => {
    if (lvl >= 4) return 'bg-red-500';
    if (lvl >= 3) return 'bg-amber-400';
    return 'bg-emerald-400';
  };

  return (
    <div className="flex-1 bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm min-w-[120px]">
      <div className="flex justify-between items-start mb-3">
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((step) => (
            <div key={step} className={`w-1 h-2 rounded-full ${step <= level ? getColor(level) : 'bg-slate-100'}`} />
          ))}
        </div>
        <span className="text-[10px] font-black text-slate-300 uppercase italic">LVL {level}</span>
      </div>
      <div className="text-2xl font-black text-slate-900 leading-none mb-1">{percentage}%</div>
      <div className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
        {correct} ИЗ {total} ВЕРНО
      </div>
      <div className="w-full h-1 bg-slate-50 rounded-full mt-3 overflow-hidden">
        <div className={`h-full ${getColor(level)} transition-all duration-1000`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
};

const QuestionMap = ({ details, onScroll }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const correctCount = details?.filter(d => d.is_correct).length || 0;
  const wrongCount = details?.filter(d => !d.is_correct && d.user_answer !== "Нет ответа").length || 0;
  const skippedCount = details?.filter(d => d.user_answer === "Нет ответа").length || 0;
  
  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-white border border-slate-700 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-800 transition-all shadow-2xl shadow-slate-900/20"
        >
          <MapPin size={14} />
          Карта
          <span className="bg-white/20 px-2 py-0.5 rounded-full text-[9px]">{details?.length || 0}</span>
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
            <div className="grid grid-cols-5 gap-2">
              {details?.map((item, idx) => {
                const hasNoAnswer = item.user_answer === "Нет ответа";
                return (
                  <button
                    key={item.task_id}
                    onClick={() => {
                      onScroll(item.task_id);
                      setIsExpanded(false);
                    }}
                    className={`aspect-square rounded-xl flex items-center justify-center text-xs font-black transition-all hover:scale-110 ${
                      hasNoAnswer ? 'bg-slate-200 text-slate-400 hover:bg-slate-300'
                        : item.is_correct ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-4 mt-4 text-[9px] font-bold text-slate-400 flex-wrap">
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-100 rounded-md"></span> Верно ({correctCount})</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-100 rounded-md"></span> Ошибки ({wrongCount})</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-slate-200 rounded-md"></span> Пропущено ({skippedCount})</span>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default function TestResultDetail() {
  const { resultId } = useParams();
  const navigate = useNavigate();
  
  // Все хуки в начале
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openSolutions, setOpenSolutions] = useState({});
  
  // Для подсказок
  const [hintData, setHintData] = useState({});
  const [loadingHint, setLoadingHint] = useState({});
  const [hintError, setHintError] = useState({});
  
  // Для AI-решений
  const [solutionData, setSolutionData] = useState({});
  const [loadingSolution, setLoadingSolution] = useState({});
  const [solutionError, setSolutionError] = useState({});

  const toggleSolution = (id) => {
    setOpenSolutions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Получение подсказки (hint)
  const fetchHint = async (taskId) => {
    setLoadingHint(prev => ({ ...prev, [taskId]: true }));
    setHintError(prev => ({ ...prev, [taskId]: null }));
    
    try {
      const token = JSON.parse(localStorage.getItem('edu_session'))?.token;
      const response = await axios.post(
        `https://tests-production-46d5.up.railway.app/student/tasks/${taskId}/hint`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setHintData(prev => ({ ...prev, [taskId]: response.data.hint }));
    } catch (err) {
      setHintError(prev => ({ ...prev, [taskId]: err.response?.data?.detail || "Ошибка получения подсказки" }));
    } finally {
      setLoadingHint(prev => ({ ...prev, [taskId]: false }));
    }
  };

  const closeHint = (taskId) => {
    setHintData(prev => {
      const newState = { ...prev };
      delete newState[taskId];
      return newState;
    });
    setHintError(prev => {
      const newState = { ...prev };
      delete newState[taskId];
      return newState;
    });
  };

  // Получение AI-решения (ai-solve)
  const fetchSolution = async (taskId) => {
    setLoadingSolution(prev => ({ ...prev, [taskId]: true }));
    setSolutionError(prev => ({ ...prev, [taskId]: null }));
    
    try {
      const token = JSON.parse(localStorage.getItem('edu_session'))?.token;
      const response = await axios.post(
        `https://tests-production-46d5.up.railway.app/student/tasks/${taskId}/ai-solve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSolutionData(prev => ({ ...prev, [taskId]: response.data }));
    } catch (err) {
      setSolutionError(prev => ({ ...prev, [taskId]: err.response?.data?.detail || "Ошибка получения решения" }));
    } finally {
      setLoadingSolution(prev => ({ ...prev, [taskId]: false }));
    }
  };

  const closeSolution = (taskId) => {
    setSolutionData(prev => {
      const newState = { ...prev };
      delete newState[taskId];
      return newState;
    });
    setSolutionError(prev => {
      const newState = { ...prev };
      delete newState[taskId];
      return newState;
    });
  };

  // Загрузка данных результата
  useEffect(() => {
    const fetchResult = async () => {
      try {
        const token = JSON.parse(localStorage.getItem('edu_session'))?.token;
        const res = await axios.get(`https://tests-production-46d5.up.railway.app/student/results/${resultId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setData(res.data);
      } catch (err) { 
        console.error('Ошибка загрузки результата:', err); 
      } finally { 
        setLoading(false); 
      }
    };
    fetchResult();
  }, [resultId]);

  if (loading) {
    return <div className="p-20 text-center font-black uppercase">Загрузка анализа...</div>;
  }

  if (!data) {
    return <div className="p-20 text-center font-black uppercase text-red-500">Ошибка загрузки данных</div>;
  }

  const sortedDetails = data.details ? [...data.details].sort((a, b) => {
    if (a.task_id !== b.task_id) return a.task_id - b.task_id;
    const aHasOptions = a.options ? 0 : 1;
    const bHasOptions = b.options ? 0 : 1;
    if (aHasOptions !== bHasOptions) return aHasOptions - bHasOptions;
    return (a.difficulty || 0) - (b.difficulty || 0);
  }) : [];

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <div className="max-w-3xl mx-auto p-6 space-y-8">
        
        <button onClick={() => navigate('/student')} className="flex items-center gap-2 text-slate-400 font-bold uppercase text-[10px]">
          <ArrowLeft size={14}/> Назад в кабинет
        </button>

        <header className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center">
          <div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter text-black">{data.test_title}</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase mt-2">Результат прохождения</p>
          </div>
          <div className="bg-slate-950 text-white px-8 py-6 rounded-[2rem] text-center mt-4 md:mt-0">
            <div className="text-3xl font-black">{data.total_points} / {data.max_points}</div>
            <div className="text-[9px] font-bold text-slate-500 uppercase">Баллов набрано</div>
          </div>
        </header>

        {data.difficulty_stats && Object.values(data.difficulty_stats).some(stat => stat.total > 0) && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 px-2">
              <BarChart3 size={14} className="text-slate-400" />
              <h2 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Аналитика по сложностям</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:flex gap-4">
              {Object.entries(data.difficulty_stats).map(([level, stat]) => (
                stat.total > 0 && (
                  <DifficultyBadge key={level} level={parseInt(level)} correct={stat.correct} total={stat.total} />
                )
              ))}
            </div>
          </section>
        )}

        <div className="space-y-6">
          {sortedDetails.map((item, idx) => {
            const hasNoAnswer = item.user_answer === "Нет ответа";
            const isSolutionOpen = openSolutions[item.task_id];

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
                      {hasNoAnswer ? <AlertCircle size={12}/> : item.is_correct ? <CheckCircle2 size={12}/> : <XCircle size={12}/>}
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
                          .map((opt, i) => {
                            const indexStr = String(i + 1);
                            const correctAnswers = item.correct_answer ? item.correct_answer.split(',').map(a => a.trim()) : [];
                            const userAnswersList = item.user_answer !== "Нет ответа" && item.user_answer ? item.user_answer.split(',').map(a => a.trim()) : [];
                            const isCorrectAnswer = correctAnswers.includes(indexStr);
                            const isUserChoice = userAnswersList.includes(indexStr);
                            
                            return (
                              <div key={i} className={`p-4 rounded-2xl border-2 text-sm font-bold flex gap-3 transition-all ${
                                isCorrectAnswer ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700' 
                                : isUserChoice && !isCorrectAnswer ? 'border-red-500 bg-red-50/50 text-red-700'
                                : 'border-slate-50 bg-slate-50/30 text-slate-600'
                              }`}>
                                <span className="opacity-40">{i + 1}.</span>
                                <div className="flex-1"><MarkdownRenderer>{opt}</MarkdownRenderer></div>
                                {isCorrectAnswer && isUserChoice && <CheckCircle2 size={16} className="text-emerald-500 shrink-0 self-center" />}
                                {isCorrectAnswer && !isUserChoice && <CheckCircle2 size={16} className="text-emerald-400/60 shrink-0 self-center" />}
                                {isUserChoice && !isCorrectAnswer && <XCircle size={16} className="text-red-500 shrink-0 self-center" />}
                              </div>
                            );
                          })}
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

                  {/* Кнопка для подсказки (hint) */}
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

                  {/* Кнопка для AI-решения (ai-solve) */}
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

                  {item.solution && (
                    <>
                      <button onClick={() => toggleSolution(item.task_id)} className={`w-full py-4 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                        isSolutionOpen ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-100 text-slate-400 hover:border-blue-200 hover:text-blue-600'
                      }`}>
                        {isSolutionOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                        {isSolutionOpen ? 'Скрыть разбор' : 'Посмотреть решение'}
                      </button>

                      {isSolutionOpen && (
                        <div className="mt-4 p-6 bg-slate-50 rounded-3xl border border-slate-100 animate-in slide-in-from-top-2 duration-300">
                          <div className="text-[9px] font-black text-blue-600 uppercase mb-4 tracking-widest flex items-center gap-2">
                            <div className="w-4 h-px bg-blue-600"></div> Полный разбор задачи
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
          })}
        </div>
      </div>
      <QuestionMap details={sortedDetails} onScroll={(taskId) => {
        const el = document.querySelector(`[data-task-id="${taskId}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }} />
    </div>
  );
}