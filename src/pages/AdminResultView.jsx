import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp, ArrowLeft, BarChart3 } from 'lucide-react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// Компонент для карточки статистики по уровню сложности
const DifficultyBadge = ({ level, correct, total }) => {
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
  return (
    <div className="flex-1 bg-white p-5 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center min-w-[120px] transition-transform hover:scale-105">
      <div className="flex gap-1 mb-2">
        {[...Array(5)].map((_, i) => (
          <div 
            key={i} 
            className={`w-1.5 h-1.5 rounded-full ${i < level ? 'bg-blue-600' : 'bg-slate-100'}`} 
          />
        ))}
      </div>
      <div className="text-2xl font-black text-slate-950">{percent}%</div>
      <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest mt-1">
        Lvl {level} ({correct}/{total})
      </div>
    </div>
  );
};

export default function AdminResultView() {
  const { resultId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openSolutions, setOpenSolutions] = useState({});

  const toggleSolution = (id) => {
    setOpenSolutions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const token = JSON.parse(localStorage.getItem('edu_session'))?.token;
        const res = await axios.get(`https://tests-production-46d5.up.railway.app/admin/results/${resultId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setData(res.data);
      } catch (err) {
        console.error("Ошибка при получении данных администратором:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [resultId]);

  // Сортировка: сначала тесты (max_task_points === 1), потом открытые, внутри — по сложности
  const sortedDetails = useMemo(() => {
    if (!data?.details) return [];
    return [...data.details].sort((a, b) => {
      const aType = a.max_task_points > 1 ? 1 : 0;
      const bType = b.max_task_points > 1 ? 1 : 0;
      if (aType !== bType) return aType - bType;
      return (parseInt(a.difficulty) || 0) - (parseInt(b.difficulty) || 0);
    });
  }, [data]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="text-center font-black uppercase tracking-widest text-slate-400 animate-pulse">
        Загрузка данных...
      </div>
    </div>
  );

  if (!data) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <div className="max-w-3xl mx-auto p-6 space-y-8">
        
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors font-bold uppercase text-[10px] tracking-widest"
        >
          <ArrowLeft size={14}/> Назад
        </button>

        <header className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">
              {data.test_title}
            </h1>
            <p className="text-[10px] font-black text-blue-600 uppercase mt-3 tracking-[0.2em]">
              {data.user.first_name} {data.user.last_name} • Просмотр (Админ)
            </p>
          </div>
          <div className="bg-slate-950 text-white px-10 py-7 rounded-[2.5rem] text-center shadow-xl shadow-slate-200">
            <div className="text-4xl font-black tabular-nums">{data.total_points} / {data.max_points}</div>
            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Баллов набрано</div>
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
            const hasNoAnswer = item.user_answer === "Нет ответа" || !item.user_answer;
            const isSolutionOpen = openSolutions[item.task_id];
            const diff = parseInt(item.difficulty) || 1;

            return (
              <div key={item.task_id} className={`bg-white rounded-[2.5rem] border-2 transition-all duration-500 overflow-hidden ${
                hasNoAnswer ? 'border-slate-100 opacity-80' : 
                item.is_correct ? 'border-emerald-500/10' : 'border-red-500/10'
              }`}>
                <div className="p-8">
                  <div className="flex justify-between items-start mb-8">
                    <div className="flex gap-8">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Вопрос №{idx + 1}</span>
                        <span className="text-[9px] font-bold text-blue-500 uppercase mt-0.5">
                          Начислено: {item.points_earned || 0} / {item.max_task_points || 0} б.
                        </span>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 opacity-50">Сложность</span>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((step) => (
                            <div 
                              key={step}
                              className={`w-1 h-3 rounded-full transition-all duration-300 ${
                                step <= diff 
                                  ? (diff >= 4 ? 'bg-red-500' : diff >= 3 ? 'bg-amber-400' : 'bg-emerald-400')
                                  : 'bg-slate-100'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className={`flex items-center gap-2 font-black uppercase text-[10px] px-5 py-2 rounded-full tracking-wider ${
                      hasNoAnswer ? 'bg-slate-100 text-slate-500' :
                      item.is_correct ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                    }`}>
                      {hasNoAnswer ? <AlertCircle size={12}/> : item.is_correct ? <CheckCircle2 size={12}/> : <XCircle size={12}/>}
                      {hasNoAnswer ? 'Пропущено' : item.is_correct ? 'Верно' : 'Ошибка'}
                    </div>
                  </div>

                  <div className="prose prose-slate max-w-none mb-10 text-slate-800 font-medium leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {item.content}
                    </ReactMarkdown>
                  </div>

                  {item.options && (
                    <div className="mb-10 space-y-3">
                      <span className="text-[9px] font-black uppercase text-slate-400 block mb-4 ml-1 tracking-[0.2em]">Варианты в тесте:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(Array.isArray(item.options) ? item.options : item.options.split(';'))
                          .map(opt => opt.trim())
                          .filter(opt => opt.length > 0)
                          .map((opt, i) => {
                            const isUserChoice = item.user_answer === opt;
                            const isCorrectChoice = item.correct_answer === opt;

                            let cardStyle = "border-slate-50 bg-slate-50/30 text-slate-500";
                            if (isCorrectChoice) cardStyle = "border-emerald-500 bg-emerald-50/50 text-emerald-700 ring-2 ring-emerald-500/10";
                            else if (isUserChoice && !item.is_correct) cardStyle = "border-red-500 bg-red-50/50 text-red-700 ring-2 ring-red-500/10";

                            return (
                              <div key={i} className={`p-5 rounded-2xl border-2 text-sm font-bold flex gap-4 transition-all duration-300 ${cardStyle}`}>
                                <span className="opacity-30 tabular-nums">{i + 1}.</span>
                                <div className="prose-sm prose-slate leading-snug">
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                    <div className={`p-6 rounded-[2rem] border transition-colors ${
                      hasNoAnswer ? 'bg-slate-50 border-slate-100' : 
                      item.is_correct ? 'bg-emerald-50/30 border-emerald-100' : 'bg-red-50/30 border-red-100'
                    }`}>
                      <span className="text-[9px] font-black uppercase text-slate-400 block mb-3 tracking-widest">Ответ студента</span>
                      <div className={`text-base font-bold ${
                        hasNoAnswer ? 'text-slate-400 italic' : 
                        item.is_correct ? 'text-emerald-700' : 'text-red-700'
                      }`}>
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {item.user_answer || "—"}
                        </ReactMarkdown>
                      </div>
                    </div>

                    <div className="p-6 rounded-[2rem] bg-blue-50/30 border border-blue-100">
                      <span className="text-[9px] font-black uppercase text-blue-400 block mb-3 tracking-widest">Эталонный ответ</span>
                      <div className="text-base font-bold text-blue-700">
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {item.correct_answer}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>

                  {item.solution && (
                    <div className="space-y-4">
                      <button 
                        onClick={() => toggleSolution(item.task_id)}
                        className={`w-full py-5 rounded-2xl border-2 border-dashed flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-[0.25em] transition-all duration-300 ${
                          isSolutionOpen ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'border-slate-100 text-slate-400 hover:border-blue-200 hover:text-blue-600'
                        }`}
                      >
                        {isSolutionOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                        {isSolutionOpen ? 'Скрыть разбор' : 'Показать решение студенту'}
                      </button>

                      {isSolutionOpen && (
                        <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 animate-in slide-in-from-top-4 duration-500">
                          <div className="text-[9px] font-black text-blue-600 uppercase mb-6 tracking-[0.3em] flex items-center gap-3">
                            <div className="w-8 h-px bg-blue-600"></div> Полный текст решения
                          </div>
                          <div className="prose prose-blue max-w-none text-sm leading-relaxed text-slate-600">
                            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                              {item.solution}
                            </ReactMarkdown>
                          </div>
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
  );
}