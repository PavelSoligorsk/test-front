import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp, Edit3 } from 'lucide-react';
import { MarkdownRenderer } from '../../shared/ui';

export default function ResultTaskCard({ item, index }) {
  const navigate = useNavigate();
  const [isSolutionOpen, setIsSolutionOpen] = useState(false);

  const hasNoAnswer = item.user_answer === 'Нет ответа' || !item.user_answer;
  const diff = parseInt(item.difficulty) || 1;

  const handleEditTask = (taskId) => {
    sessionStorage.setItem('adminReturnContext', JSON.stringify({
      sourceTab: 'result',
      resultId: window.location.pathname.split('/').pop(),
      scrollPosition: window.scrollY,
    }));
    sessionStorage.setItem('editTaskId', taskId);
    navigate('/admin');
  };

  return (
    <div data-task-id={item.task_id} className={`bg-white rounded-[2.5rem] border-2 transition-all duration-500 overflow-hidden ${
      hasNoAnswer ? 'border-slate-100 opacity-80' : item.is_correct ? 'border-emerald-500/10' : 'border-red-500/10'
    }`}>
      <div className="p-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div className="flex gap-8">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Вопрос №{index + 1}</span>
              <span className="text-[9px] font-bold text-blue-500 uppercase mt-0.5">Начислено: {item.points_earned || 0} / {item.max_task_points || 0} б.</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 opacity-50">Сложность</span>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(step => (
                  <div key={step} className={`w-1 h-3 rounded-full transition-all duration-300 ${
                    step <= diff ? (diff >= 4 ? 'bg-red-500' : diff >= 3 ? 'bg-amber-400' : 'bg-emerald-400') : 'bg-slate-100'
                  }`} />
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => handleEditTask(item.task_id)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all border border-transparent hover:border-blue-200"
              title="Редактировать задание">
              <Edit3 size={14} /> <span className="hidden sm:inline">Ред.</span>
            </button>
            <div className={`flex items-center gap-2 font-black uppercase text-[10px] px-5 py-2 rounded-full tracking-wider ${
              hasNoAnswer ? 'bg-slate-100 text-slate-500' : item.is_correct ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
            }`}>
              {hasNoAnswer ? <AlertCircle size={12} /> : item.is_correct ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
              {hasNoAnswer ? 'Пропущено' : item.is_correct ? 'Верно' : 'Ошибка'}
            </div>
          </div>
        </div>

        {/* Condition */}
        <div className="mb-10 text-slate-800 font-medium leading-relaxed">
          <MarkdownRenderer>{item.content}</MarkdownRenderer>
        </div>

        {/* Options */}
        {item.options && (
          <div className="mb-10 space-y-3">
            <span className="text-[9px] font-black uppercase text-slate-400 block mb-4 ml-1 tracking-[0.2em]">Варианты в тесте:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(Array.isArray(item.options) ? item.options : item.options.split(';')).map(opt => opt.trim()).filter(opt => opt.length > 0).map((opt, i) => {
                const isUserChoice = item.user_answer === opt;
                const isCorrectChoice = item.correct_answer === opt;
                let cardStyle = 'border-slate-50 bg-slate-50/30 text-slate-500';
                if (isCorrectChoice) cardStyle = 'border-emerald-500 bg-emerald-50/50 text-emerald-700 ring-2 ring-emerald-500/10';
                else if (isUserChoice && !item.is_correct) cardStyle = 'border-red-500 bg-red-50/50 text-red-700 ring-2 ring-red-500/10';
                return (
                  <div key={i} className={`p-5 rounded-2xl border-2 text-sm font-bold flex gap-4 transition-all duration-300 ${cardStyle}`}>
                    <span className="opacity-30 tabular-nums">{i + 1}.</span>
                    <div className="prose-sm prose-slate leading-snug flex-1"><MarkdownRenderer>{opt}</MarkdownRenderer></div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Answers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          <div className={`p-6 rounded-[2rem] border transition-colors ${
            hasNoAnswer ? 'bg-slate-50 border-slate-100' : item.is_correct ? 'bg-emerald-50/30 border-emerald-100' : 'bg-red-50/30 border-red-100'
          }`}>
            <span className="text-[9px] font-black uppercase text-slate-400 block mb-3 tracking-widest">Ответ студента</span>
            <div className={`text-base font-bold ${hasNoAnswer ? 'text-slate-400 italic' : item.is_correct ? 'text-emerald-700' : 'text-red-700'}`}>
              <MarkdownRenderer>{item.user_answer || '—'}</MarkdownRenderer>
            </div>
          </div>
          <div className="p-6 rounded-[2rem] bg-blue-50/30 border border-blue-100">
            <span className="text-[9px] font-black uppercase text-blue-400 block mb-3 tracking-widest">Эталонный ответ</span>
            <div className="text-base font-bold text-blue-700"><MarkdownRenderer>{item.correct_answer}</MarkdownRenderer></div>
          </div>
        </div>

        {/* Solution */}
        {item.solution && (
          <div className="space-y-4">
            <button onClick={() => setIsSolutionOpen(!isSolutionOpen)}
              className={`w-full py-5 rounded-2xl border-2 border-dashed flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-[0.25em] transition-all duration-300 ${
                isSolutionOpen ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'border-slate-100 text-slate-400 hover:border-blue-200 hover:text-blue-600'
              }`}>
              {isSolutionOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {isSolutionOpen ? 'Скрыть разбор' : 'Показать решение студенту'}
            </button>
            {isSolutionOpen && (
              <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 animate-in slide-in-from-top-4 duration-500">
                <div className="text-[9px] font-black text-blue-600 uppercase mb-6 tracking-[0.3em] flex items-center gap-3">
                  <div className="w-8 h-px bg-blue-600"></div> Полный текст решения
                </div>
                <div className="text-sm leading-relaxed text-slate-600"><MarkdownRenderer>{item.solution}</MarkdownRenderer></div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
