import React, { useState } from 'react';
import { Database, Edit3, Trash2, PlusCircle, CheckCircle2 } from 'lucide-react';
import { MarkdownPreview } from './MarkdownPreview';
import { TaskMap } from './TaskMap';
import { deleteTask, sendTaskToTelegram, updateTask } from './api';
import { MAIN_TOPICS, SECTIONS_BY_TOPIC } from './constants';

export default function BankTab({ tasks, groupedTasks, availableClasses, bankClass, setBankClass, bankTopic, setBankTopic, onEditTask, onTasksUpdate }) {
  const [openSolutions, setOpenSolutions] = useState({});
  const [openHints, setOpenHints] = useState({});

  const handleDelete = async (taskId) => {
    if (!window.confirm(`Удалить задание #${taskId}?`)) return;
    try {
      await deleteTask(taskId);
      if (onTasksUpdate) onTasksUpdate();
    } catch (error) { alert('Ошибка при удалении'); }
  };

  const handleSendTg = async (taskId) => {
    try {
      await sendTaskToTelegram(taskId);
      alert('Задача успешно улетела в Telegram! 🚀');
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Ошибка при отправке в Telegram';
      alert(`Косяк: ${errorMsg}`);
    }
  };

  const handleTopicChange = async (taskId, task, newTopic) => {
    try {
      await updateTask(taskId, { ...task, topic: newTopic, section: '' });
      if (onTasksUpdate) onTasksUpdate();
    } catch (err) { alert('Ошибка при обновлении темы'); }
  };

  const handleSectionChange = async (taskId, task, newSection) => {
    try {
      await updateTask(taskId, { ...task, section: newSection });
      if (onTasksUpdate) onTasksUpdate();
    } catch (err) { alert('Ошибка при обновлении раздела'); }
  };

  const handleDifficultyChange = async (taskId, task, newDiff) => {
    try {
      await updateTask(taskId, { ...task, difficulty: parseInt(newDiff) });
      if (onTasksUpdate) onTasksUpdate();
    } catch (err) { alert('Ошибка при обновлении сложности'); }
  };

  const getDifficultyColor = (lvl) => {
    if (lvl >= 4) return 'text-red-500 bg-red-50 border-red-100';
    if (lvl >= 3) return 'text-amber-500 bg-amber-50 border-amber-100';
    return 'text-emerald-500 bg-emerald-50 border-emerald-100';
  };

  return (
    <div className="bg-white rounded-[3rem] shadow-xl border border-slate-200 overflow-hidden min-h-[600px] flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-100 p-4 md:p-8 flex flex-col gap-6 md:gap-8">
        <div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 md:mb-4 italic">Раздел</h3>
          <div className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
            {availableClasses.map(cls => (
              <button key={cls} onClick={() => { setBankClass(cls); setBankTopic(null); }}
                className={`shrink-0 md:shrink p-3 md:p-4 rounded-2xl text-left font-black text-xs transition-all ${bankClass === cls ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-100'}`}>
                {cls}
              </button>
            ))}
          </div>
        </div>
        {bankClass && groupedTasks[bankClass] && (
          <div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 md:mb-4 italic">Темы или Варианты</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 gap-2">
              {Object.keys(groupedTasks[bankClass]).sort().map(topic => (
                <button key={topic} onClick={() => setBankTopic(topic)}
                  className={`p-2 md:p-3 rounded-xl font-black text-[10px] transition-all truncate ${bankTopic === topic ? 'bg-slate-800 text-white' : 'bg-slate-200/50 text-slate-500'}`}>
                  {topic}
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>
      <main className="flex-1 p-4 md:p-10 overflow-y-auto">
        {!bankTopic ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 italic font-black text-xs tracking-widest gap-4 py-20 md:py-0">
            <Database size={48} className="opacity-10" /> Выберите тему
          </div>
        ) : (
          <div className="space-y-4 md:space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 md:mb-8 border-b border-slate-50 pb-4 md:pb-6">
              <h3 className="text-xl md:text-2xl font-black text-slate-800 uppercase italic break-words">{bankTopic}</h3>
              <span className="bg-slate-100 text-slate-500 px-3 md:px-4 py-1.5 md:py-2 rounded-xl text-[10px] font-black uppercase whitespace-nowrap">
                Найдено: {groupedTasks[bankClass][bankTopic].length}
              </span>
            </div>
            {groupedTasks[bankClass][bankTopic].slice().sort((a, b) => {
              if (a.is_open_answer !== b.is_open_answer) return a.is_open_answer ? 1 : -1;
              return (a.difficulty || 0) - (b.difficulty || 0);
            }).map((t, index) => {
              const isSolOpen = openSolutions[t.id];
              const isHintOpen = openHints[t.id];
              return (
                <div key={t.id} data-task-id={t.id} className="group p-4 md:p-8 bg-slate-50 rounded-2xl md:rounded-[2.5rem] border border-transparent hover:border-blue-100 hover:bg-white hover:shadow-2xl transition-all mb-4 md:mb-6">
                  <div className="flex flex-col gap-6 md:gap-8">
                    <div className="flex-1 space-y-4 w-full">
                      <div className="flex flex-wrap items-center gap-2 md:gap-4">
                        <span className="text-[11px] font-black text-blue-600 bg-blue-50 px-2 md:px-3 py-1 rounded-lg">№ {index + 1}</span>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-l border-slate-200 pl-2 md:pl-4">ID: {t.id}</span>
                        <select value={t.topic || ''} onChange={e => handleTopicChange(t.id, t, e.target.value)}
                          className="text-[9px] font-black text-purple-600 bg-purple-50 px-2 py-1 rounded-lg border border-purple-100 cursor-pointer hover:bg-purple-100 transition-colors outline-none">
                          <option value="">Без темы</option>
                          {Object.entries(MAIN_TOPICS).map(([key, label]) => (<option key={key} value={key}>{label}</option>))}
                        </select>
                        <select value={t.section || ''} onChange={e => handleSectionChange(t.id, t, e.target.value)} disabled={!t.topic}
                          className="text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg truncate max-w-[200px] cursor-pointer hover:bg-slate-200 transition-colors outline-none disabled:opacity-50 disabled:cursor-not-allowed">
                          <option value="">Без раздела</option>
                          {t.topic && SECTIONS_BY_TOPIC[t.topic]?.map(section => (<option key={section} value={section}>{section}</option>))}
                        </select>
                        <div className={`flex items-center gap-2 px-2 md:px-3 py-1 rounded-xl border ${getDifficultyColor(t.difficulty)}`}>
                          <span className="text-[9px] font-black uppercase tracking-tight">LVL</span>
                          <select value={t.difficulty || 1} onChange={e => handleDifficultyChange(t.id, t, e.target.value)}
                            className="text-sm font-black italic leading-none bg-transparent border-none outline-none cursor-pointer">
                            {[1, 2, 3, 4, 5].map(n => (<option key={n} value={n}>{n}</option>))}
                          </select>
                        </div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em]">{t.is_open_answer ? '• Открытый ответ' : '• Выбор варианта'}</span>
                        <button onClick={() => handleSendTg(t.id)}
                          className="flex items-center gap-1.5 px-3 py-1 bg-blue-500 hover:bg-blue-600 active:scale-95 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-150 shadow-sm cursor-pointer">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                          </svg>
                          <span>В телегу</span>
                        </button>
                      </div>
                      <MarkdownPreview text={t.content} title="Условие задания" type="default" />
                      {!t.is_open_answer && t.options && (
                        <div className="mt-4 pl-2 md:pl-4 border-l-2 border-blue-100 bg-slate-50/50 py-2 rounded-r-xl">
                          <MarkdownPreview type="default"
                            text={(Array.isArray(t.options) ? t.options : t.options.split(';')).map(opt => opt.trim()).filter(opt => opt !== "").map((opt, i) => `**${i + 1}.** ${opt}`).join('\n\n')} />
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 md:gap-3 mt-4">
                        <div className="bg-emerald-50 border border-emerald-100 px-3 md:px-5 py-2 md:py-3 rounded-2xl flex items-center gap-2 md:gap-3">
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Ответ:</span>
                          <span className="text-xs md:text-sm font-black text-emerald-700 font-mono break-all">{t.answer}</span>
                        </div>
                        {t.hint && (
                          <button onClick={() => setOpenHints(prev => ({ ...prev, [t.id]: !prev[t.id] }))}
                            className={`px-3 md:px-5 py-2 md:py-3 rounded-2xl border flex items-center gap-1 md:gap-2 transition-all ${isHintOpen ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-100' : 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100'}`}>
                            <PlusCircle size={12} className={`md:w-[14px] md:h-[14px] ${isHintOpen ? 'rotate-0' : 'rotate-45 transition-transform'}`} />
                            <span className="text-[10px] font-black uppercase">Подсказка</span>
                          </button>
                        )}
                        {t.solution && (
                          <button onClick={() => setOpenSolutions(prev => ({ ...prev, [t.id]: !prev[t.id] }))}
                            className={`px-3 md:px-5 py-2 md:py-3 rounded-2xl border flex items-center gap-1 md:gap-2 transition-all ${isSolOpen ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100' : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100'}`}>
                            <CheckCircle2 size={12} className="md:w-[14px] md:h-[14px]" />
                            <span className="text-[10px] font-black uppercase">Решение</span>
                          </button>
                        )}
                      </div>
                      <div className="space-y-3 mt-4">
                        {isHintOpen && <div className="animate-in slide-in-from-top-2 duration-300"><MarkdownPreview text={t.hint} title="ПОДСКАЗКА" type="hint" /></div>}
                        {isSolOpen && <div className="animate-in slide-in-from-top-2 duration-300"><MarkdownPreview text={t.solution} title="ПОЛНОЕ РЕШЕНИЕ" type="solution" /></div>}
                      </div>
                    </div>
                    <div className="flex flex-row md:flex-col gap-2 md:opacity-0 md:group-hover:opacity-100 transition-all shrink-0 justify-end md:justify-start">
                      <button className="flex-1 md:flex-none p-3 md:p-4 bg-white text-slate-400 hover:text-blue-600 rounded-2xl shadow-sm border border-slate-100 active:scale-90 hover:shadow-md transition-all"
                        onClick={() => onEditTask(t)}>
                        <Edit3 size={18} className="md:w-5 md:h-5" />
                      </button>
                      <button className="flex-1 md:flex-none p-3 md:p-4 bg-white text-slate-400 hover:text-red-500 rounded-2xl shadow-sm border border-slate-100 active:scale-90 hover:shadow-md transition-all"
                        onClick={() => handleDelete(t.id)}>
                        <Trash2 size={18} className="md:w-5 md:h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      {bankTopic && groupedTasks[bankClass]?.[bankTopic]?.length > 0 && (
        <TaskMap tasks={groupedTasks[bankClass][bankTopic]} onScroll={(taskId) => { const el = document.querySelector(`[data-task-id="${taskId}"]`); el?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }} />
      )}
    </div>
  );
}
