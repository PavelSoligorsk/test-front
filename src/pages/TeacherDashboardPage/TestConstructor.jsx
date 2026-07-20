import React, { useState } from 'react';
import { XCircle, Send } from 'lucide-react';
import { API_BASE } from '../../shared/api';
import { restoreSession } from '../../shared/lib/session';
import { MarkdownPreview } from './MarkdownPreview';

const getDifficultyColor = (lvl) => {
  if (lvl >= 4) return "text-red-500 bg-red-50 border-red-100";
  if (lvl >= 3) return "text-amber-500 bg-amber-50 border-amber-100";
  return "text-emerald-500 bg-emerald-50 border-emerald-100";
};

export default function TestConstructor({ selectedTasks, onTaskToggle, openSolutions, openHints, onToggleSolution, onToggleHint, onTestsUpdate }) {
  const [testForm, setTestForm] = useState({ id: null, title: '', target_class: '', target_topic: '', is_autocompile: false, task_ids: [], is_active: true });

  const getAuthHeaders = () => {
    const user = restoreSession();
    const token = user?.token || user?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...testForm, target_class: testForm.target_class, target_topic: testForm.target_topic, task_ids: selectedTasks.map((t) => t.id) };
    try {
      if (testForm.id) {
        await axios.put(`${API_BASE}/teacher/tests/${testForm.id}`, payload, { headers: getAuthHeaders() });
      } else {
        await axios.post(`${API_BASE}/teacher/tests`, payload, { headers: getAuthHeaders() });
      }
      setTestForm({ id: null, title: '', target_class: '', target_topic: '', is_autocompile: false, task_ids: [], is_active: true });
      onTestsUpdate();
    } catch (e) { alert('Ошибка при сохранении теста'); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 bg-white p-6 md:p-8 rounded-[3rem] shadow-xl border border-slate-100 h-fit">
        <h2 className="text-xl font-black text-slate-800 uppercase mb-6">{testForm.id ? 'Редактировать тест' : 'Новый тест'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase">Название</label>
            <input required className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm" value={testForm.title} onChange={(e) => setTestForm({ ...testForm, title: e.target.value })} placeholder="Контрольная работа №1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase">Раздел</label>
              <input className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm" value={testForm.target_class} onChange={(e) => setTestForm({ ...testForm, target_class: e.target.value })} placeholder="9" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase">Тема</label>
              <input className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm" value={testForm.target_topic} onChange={(e) => setTestForm({ ...testForm, target_topic: e.target.value })} placeholder="1" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Задания ({selectedTasks.length})</label>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {selectedTasks.sort((a, b) => a.id - b.id).map((task, idx) => (
                <div key={task.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-xs">
                  <span className="font-bold truncate">{idx + 1}. {task.content?.substring(0, 50)}...</span>
                  <button type="button" onClick={() => onTaskToggle(task)} className="text-red-400 hover:text-red-600 ml-2"><XCircle size={14} /></button>
                </div>
              ))}
              {selectedTasks.length === 0 && <p className="text-xs text-slate-400 italic p-2">Выберите задания во вкладке "Банк заданий"</p>}
            </div>
          </div>
          <button className="w-full bg-emerald-600 text-white py-5 rounded-[2rem] font-black hover:bg-emerald-700 transition-all shadow-lg flex items-center justify-center gap-2">
            <Send size={18} /> {testForm.id ? 'ОБНОВИТЬ ТЕСТ' : 'СОЗДАТЬ ТЕСТ'}
          </button>
        </form>
      </div>

      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white p-6 rounded-[3rem] shadow-xl border border-slate-100">
          <h3 className="text-lg font-black text-slate-800 uppercase mb-4">Предпросмотр теста</h3>
          {selectedTasks.length === 0 ? (
            <p className="text-slate-300 italic text-sm">Выберите задания для теста</p>
          ) : (
            <div className="space-y-6">
              {selectedTasks.sort((a, b) => { if (a.is_open_answer !== b.is_open_answer) return a.is_open_answer ? 1 : -1; return (a.difficulty || 0) - (b.difficulty || 0); }).map((task, idx) => (
                <div key={task.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-sm font-black text-emerald-600">№{idx + 1}</span>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg ${getDifficultyColor(task.difficulty)}`}>LVL {task.difficulty}</span>
                    <span className="text-[9px] text-slate-400">{task.is_open_answer ? 'Открытый ответ' : 'Выбор варианта'}</span>
                  </div>
                  <MarkdownPreview text={task.content} title="Условие" />
                  {!task.is_open_answer && task.options && (
                    <div className="mt-4">
                      <MarkdownPreview title="ВАРИАНТЫ ОТВЕТА" text={(typeof task.options === 'string' ? task.options.split(';') : Array.isArray(task.options) ? task.options : []).map(o => o.trim()).filter(o => o).map((opt, i) => `**${i + 1}.** ${opt}`).join('\n\n')} />
                    </div>
                  )}
                  <div className="mt-4 bg-emerald-50/50 border border-emerald-100 px-4 py-3 rounded-2xl flex items-center gap-3">
                    <span className="text-[10px] font-black text-emerald-600 uppercase">Ответ:</span>
                    <span className="text-sm font-black text-emerald-700">{task.answer}</span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    {task.hint && (<button type="button" onClick={() => onToggleHint(task.id)} className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase transition-all ${openHints[task.id] ? 'bg-amber-500 text-white border-amber-500' : 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100'}`}>{openHints[task.id] ? 'Скрыть подсказку' : 'Подсказка'}</button>)}
                    {task.solution && (<button type="button" onClick={() => onToggleSolution(task.id)} className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase transition-all ${openSolutions[task.id] ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100'}`}>{openSolutions[task.id] ? 'Скрыть решение' : 'Решение'}</button>)}
                  </div>
                  {openHints[task.id] && <div className="mt-3"><MarkdownPreview text={task.hint} title="ПОДСКАЗКА" type="hint" /></div>}
                  {openSolutions[task.id] && <div className="mt-3"><MarkdownPreview text={task.solution} title="РЕШЕНИЕ" type="solution" /></div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
