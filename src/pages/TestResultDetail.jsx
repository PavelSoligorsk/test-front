import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp, ArrowLeft, BarChart3 } from 'lucide-react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

const DifficultyBadge = ({ level, correct, total }) => {
  const percentage = Math.round((correct / total) * 100);
  
  // Цвета в твоем стиле
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
            <div 
              key={step} 
              className={`w-1 h-2 rounded-full ${step <= level ? getColor(level) : 'bg-slate-100'}`} 
            />
          ))}
        </div>
        <span className="text-[10px] font-black text-slate-300 uppercase italic">LVL {level}</span>
      </div>
      
      <div className="text-2xl font-black text-slate-900 leading-none mb-1">{percentage}%</div>
      <div className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
        {correct} ИЗ {total} ВЕРНО
      </div>
      
      {/* Мини прогресс-бар внизу карточки */}
      <div className="w-full h-1 bg-slate-50 rounded-full mt-3 overflow-hidden">
        <div 
          className={`h-full ${getColor(level)} transition-all duration-1000`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default function TestResultDetail() {
  const { resultId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Храним ID открытых решений (множественное открытие)
  const [openSolutions, setOpenSolutions] = useState({});

  const toggleSolution = (id) => {
    setOpenSolutions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const token = JSON.parse(localStorage.getItem('edu_session'))?.token;
        const res = await axios.get(`https://tests-production-46d5.up.railway.app/student/results/${resultId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setData(res.data);
      } catch (err) { console.error(err); } 
      finally { setLoading(false); }
    };
    fetchResult();
  }, [resultId]);

  if (loading) return <div className="p-20 text-center font-black uppercase">Загрузка анализа...</div>;

const sortedDetails = data?.details ? [...data.details].sort((a, b) => {
  // 1. Сортировка по типу (сначала с опциями, потом без)
  const aHasOptions = a.options ? 0 : 1;
  const bHasOptions = b.options ? 0 : 1;
  
  if (aHasOptions !== bHasOptions) {
    return aHasOptions - bHasOptions;
  }
  
  // 2. Сортировка по сложности (по возрастанию)
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
<h1 className="text-4xl font-black uppercase italic tracking-tighter text-black">
  {data.test_title}
</h1>            <p className="text-[10px] font-black text-slate-400 uppercase mt-2">Результат прохождения</p>
          </div>
          <div className="bg-slate-950 text-white px-8 py-6 rounded-[2rem] text-center">
<div className="text-3xl font-black">{data.total_points} / {data.max_points}</div>            <div className="text-[9px] font-bold text-slate-500 uppercase">Баллов набрано</div>
          </div>
        </header>

        {data.difficulty_stats && (
  <section className="space-y-4">
    <div className="flex items-center gap-2 px-2">
      <BarChart3 size={14} className="text-slate-400" />
      <h2 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Аналитика по сложностям</h2>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-3 md:flex gap-4">
      {Object.entries(data.difficulty_stats).map(([level, stat]) => (
        stat.total > 0 && (
          <DifficultyBadge 
            key={level} 
            level={parseInt(level)} 
            correct={stat.correct} 
            total={stat.total} 
          />
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
              <div key={item.task_id} className={`bg-white rounded-[2.5rem] border-2 transition-all overflow-hidden ${
                hasNoAnswer ? 'border-slate-200 opacity-80' : 
                item.is_correct ? 'border-emerald-500/20' : 'border-red-500/20'
              }`}>
                <div className="p-8">
                  {/* Статус-бар вопроса */}
<div className="flex justify-between items-start mb-6">
  <div>
    <span className="text-[10px] font-black uppercase text-slate-400 block mb-1.5">
      Вопрос №{idx + 1}
    </span>
    
    {/* Та самая шкала из точек */}
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((step) => (
        <div 
          key={step}
          className={`w-1 h-3 rounded-full transition-all duration-300 ${
            step <= item.difficulty 
              ? (item.difficulty >= 4 ? 'bg-red-500' : item.difficulty >= 3 ? 'bg-amber-400' : 'bg-emerald-400')
              : 'bg-slate-100'
          }`}
        />
      ))}
      <span className="text-[8px] font-black text-slate-300 uppercase ml-1.5 self-center tracking-tighter">
        LVL {item.difficulty}
      </span>
    </div>
  </div>

  {/* Индикатор Верно/Ошибка */}
  <div className={`flex items-center gap-2 font-black uppercase text-[10px] px-4 py-1.5 rounded-full ${
    hasNoAnswer ? 'bg-slate-100 text-slate-500' :
    item.is_correct ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
  }`}>
    {hasNoAnswer ? <AlertCircle size={12}/> : item.is_correct ? <CheckCircle2 size={12}/> : <XCircle size={12}/>}
    {hasNoAnswer ? 'Пропущено' : item.is_correct ? 'Верно' : 'Ошибка'}
  </div>
</div>

                  {/* Текст задачи */}
                  <div className="prose prose-slate max-w-none mb-8 text-slate-800 font-medium">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {item.content}
                    </ReactMarkdown>
                  </div>

                  {/* НОВЫЙ БЛОК: Варианты ответа (если это тест) */}
{item.options && (
  <div className="mb-8 space-y-2">
    <span className="text-[9px] font-black uppercase text-slate-400 block mb-3 ml-1">Варианты:</span>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {(Array.isArray(item.options) ? item.options : item.options.split(';'))
        .map(opt => opt.trim())
        .filter(opt => opt.length > 0)
        .map((opt, i) => {
          // Проверяем, выбрал ли этот вариант пользователь
          const isUserChoice = item.user_answer === opt;
          // Проверяем, является ли этот вариант правильным
          const isCorrectChoice = item.correct_answer === opt;

          return (
            <div 
              key={i} 
              className={`p-4 rounded-2xl border-2 text-sm font-bold flex gap-3 transition-all ${
                isCorrectChoice 
                  ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700' 
                  : isUserChoice && !item.is_correct
                    ? 'border-red-500 bg-red-50/50 text-red-700'
                    : 'border-slate-50 bg-slate-50/30 text-slate-600'
              }`}
            >
              <span className="opacity-40">{i + 1}.</span>
              <div className="prose-sm prose-slate">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {opt}
                </ReactMarkdown>
              </div>
            </div>
          );
        })}
    </div>
  </div>
)}

                  {/* Блок с ответами (с поддержкой Markdown) */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
  {/* Блок: Ваш ответ */}
  <div className={`p-5 rounded-3xl border transition-colors ${
    hasNoAnswer ? 'bg-slate-50 border-slate-100' : 
    item.is_correct ? 'bg-emerald-50/30 border-emerald-100' : 'bg-red-50/30 border-red-100'
  }`}>
    <span className="text-[9px] font-black uppercase text-slate-400 block mb-2">Ваш ответ</span>
    <div className={`text-base font-bold prose-sm ${
      hasNoAnswer ? 'text-slate-400 italic' : 
      item.is_correct ? 'text-emerald-700 prose-emerald' : 'text-red-700 prose-red'
    }`}>
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {item.user_answer}
      </ReactMarkdown>
    </div>
  </div>

  {/* Блок: Правильный ответ */}
  <div className="p-5 rounded-3xl bg-blue-50/30 border border-blue-100">
    <span className="text-[9px] font-black uppercase text-blue-400 block mb-2">Правильный ответ</span>
    <div className="text-base font-bold text-blue-700 prose-sm prose-blue">
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {item.correct_answer}
      </ReactMarkdown>
    </div>
  </div>
</div>

                  {/* Кнопка открытия решения */}
                  {item.solution && (
                    <button 
                      onClick={() => toggleSolution(item.task_id)}
                      className={`w-full py-4 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                        isSolutionOpen ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-100 text-slate-400 hover:border-blue-200 hover:text-blue-600'
                      }`}
                    >
                      {isSolutionOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                      {isSolutionOpen ? 'Скрыть разбор' : 'Посмотреть решение'}
                    </button>
                  )}

                  {/* Само решение (выезжает) */}
                  {isSolutionOpen && (
                    <div className="mt-4 p-6 bg-slate-50 rounded-3xl border border-slate-100 animate-in slide-in-from-top-2 duration-300">
                      <div className="text-[9px] font-black text-blue-600 uppercase mb-4 tracking-widest flex items-center gap-2">
                        <div className="w-4 h-px bg-blue-600"></div> Полный разбор задачи
                      </div>
                      <div className="prose prose-blue max-w-none text-sm leading-relaxed">
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {item.solution}
                        </ReactMarkdown>
                      </div>
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
}