import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { XCircle, Send, Database, BookOpen, Sparkles, Trash2 } from 'lucide-react';
import { API_BASE } from '../../shared/api';
import { restoreSession } from '../../shared/lib/session';
import { MarkdownPreview } from './MarkdownPreview';

const getDifficultyColor = (lvl) => {
  if (lvl >= 4) return "text-red-400 bg-red-900/30 border-red-800";
  if (lvl >= 3) return "text-amber-400 bg-amber-900/30 border-amber-800";
  return "text-emerald-400 bg-emerald-900/30 border-emerald-800";
};

export default function TestConstructor({ selectedTasks, onTaskToggle, openSolutions, openHints, onToggleSolution, onToggleHint, onTestsUpdate, onNavigateToBank, onNavigateToTests, editingTest, onClearEditing, onClearTasks, onOpenAiGenerator }) {
  const EMPTY_FORM = {
    id: null, title: '', target_class: '', target_topic: '',
    is_autocompile: false, task_ids: [], is_active: true,
    max_attempts: null, time_limit_minutes: null, allow_interruptions: true,
    exam_start: '', exam_end: '',
  };
  const [testForm, setTestForm] = useState(EMPTY_FORM);

  // Автозаполнение формы при редактировании теста
  useEffect(() => {
    if (editingTest) {
      setTestForm({
        id: editingTest.id || null,
        title: editingTest.title || '',
        target_class: editingTest.target_class || '',
        target_topic: editingTest.target_topic || '',
        is_autocompile: editingTest.is_autocompile || false,
        task_ids: editingTest.task_ids || [],
        is_active: editingTest.is_active !== undefined ? editingTest.is_active : true,
        max_attempts: editingTest.max_attempts ?? null,
        time_limit_minutes: editingTest.time_limit_minutes ?? null,
        allow_interruptions: editingTest.allow_interruptions !== undefined ? editingTest.allow_interruptions : true,
        exam_start: editingTest.exam_start ? editingTest.exam_start.slice(0, 16) : '',
        exam_end: editingTest.exam_end ? editingTest.exam_end.slice(0, 16) : '',
      });
    } else {
      // Если editingTest=null (сброс после редактирования) — очищаем форму
      setTestForm(EMPTY_FORM);
    }
  }, [editingTest]);

  const getAuthHeaders = () => {
    const user = restoreSession();
    const token = user?.token || user?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...testForm,
      target_class: testForm.target_class,
      target_topic: testForm.target_topic,
      task_ids: selectedTasks.map((t) => t.id),
      max_attempts: testForm.max_attempts === '' ? null : (testForm.max_attempts != null ? parseInt(testForm.max_attempts) : null),
      time_limit_minutes: testForm.time_limit_minutes === '' ? null : (testForm.time_limit_minutes != null ? parseInt(testForm.time_limit_minutes) : null),
      exam_start: testForm.exam_start || null,
      exam_end: testForm.exam_end || null,
    };
    try {
      if (testForm.id) {
        await axios.put(`${API_BASE}/teacher/tests/${testForm.id}`, payload, { headers: getAuthHeaders() });
      } else {
        await axios.post(`${API_BASE}/teacher/tests`, payload, { headers: getAuthHeaders() });
      }
      setTestForm(EMPTY_FORM);
      if (onClearEditing) onClearEditing();
      if (onClearTasks) onClearTasks();
      onTestsUpdate();
    } catch (e) { alert('Ошибка при сохранении теста'); }
  };

  return (
    <div className="space-y-6">
      {/* ── Floating action buttons: left column (Банк + Тесты) ── */}
      <div className="fixed bottom-6 left-6 z-40 flex flex-col gap-2">
        <button
          onClick={onNavigateToBank}
          className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-black uppercase hover:border-emerald-300 dark:hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all shadow-lg hover:scale-105 active:scale-95"
          title="Банк заданий"
        >
          <Database size={16} /> Банк
        </button>
        <button
          onClick={onNavigateToTests}
          className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-black uppercase hover:border-emerald-300 dark:hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all shadow-lg hover:scale-105 active:scale-95"
          title="Мои тесты"
        >
          <BookOpen size={16} /> Тесты
        </button>
      </div>

      {/* ── Floating action button: right (AI) ── */}
      {onOpenAiGenerator && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={onOpenAiGenerator}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl text-xs font-black uppercase shadow-xl shadow-emerald-200 hover:scale-105 active:scale-95 transition-all"
            title="AI Генерация теста"
          >
            <Sparkles size={16} /> AI
          </button>
        </div>
      )}

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
                  <div key={task.id} className="flex items-start justify-between p-2 bg-slate-50 rounded-lg text-xs group relative">
                    <div className="min-w-0 flex-1 mr-2">
                      <span className="font-black text-slate-400 text-[10px] mr-1">{idx + 1}.</span>
                      <MarkdownPreview text={task.content?.length > 80 ? task.content.substring(0, 80) + '...' : task.content} title={null} />
                    </div>
                    <button type="button" onClick={() => onTaskToggle(task)} className="opacity-0 group-hover:opacity-100 flex-shrink-0 text-red-400 hover:text-red-600 ml-1 transition-opacity"><XCircle size={14} /></button>
                  </div>
                ))}
                {selectedTasks.length === 0 && <p className="text-xs text-slate-400 italic p-2">Выберите задания во вкладке "Банк заданий"</p>}
              </div>
            </div>

            {/* --- Настройки прохождения --- */}
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-3">
              <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Настройки прохождения</h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase">Макс. попыток</label>
                  <input
                    type="number" min="1"
                    className="w-full p-3 bg-white rounded-xl font-bold text-sm"
                    value={testForm.max_attempts ?? ''}
                    onChange={(e) => setTestForm({ ...testForm, max_attempts: e.target.value === '' ? null : e.target.value })}
                    placeholder="Без ограничений"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase">Лимит времени (мин)</label>
                  <input
                    type="number" min="1"
                    className="w-full p-3 bg-white rounded-xl font-bold text-sm"
                    value={testForm.time_limit_minutes ?? ''}
                    onChange={(e) => setTestForm({ ...testForm, time_limit_minutes: e.target.value === '' ? null : e.target.value })}
                    placeholder="Без ограничений"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={testForm.allow_interruptions}
                    onChange={(e) => setTestForm({ ...testForm, allow_interruptions: e.target.checked })}
                    className="w-4 h-4 rounded accent-amber-500"
                  />
                  <span className="text-[10px] font-black text-slate-500 uppercase">Разрешить прерывания</span>
                </label>
                <p className="text-[9px] text-slate-400 mt-1 ml-7">
                  {testForm.allow_interruptions
                    ? 'Студент может решать тест частями, прогресс сохраняется.'
                    : 'Тест нужно пройти за один присест. При выходе попытка сгорает.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase">Начало экзамена</label>
                  <input
                    type="datetime-local"
                    className="w-full p-3 bg-white rounded-xl font-bold text-sm"
                    value={testForm.exam_start}
                    onChange={(e) => setTestForm({ ...testForm, exam_start: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase">Конец экзамена</label>
                  <input
                    type="datetime-local"
                    className="w-full p-3 bg-white rounded-xl font-bold text-sm"
                    value={testForm.exam_end}
                    onChange={(e) => setTestForm({ ...testForm, exam_end: e.target.value })}
                  />
                </div>
              </div>
            </div>
            {/* --- /Настройки прохождения --- */}
            <button className="w-full bg-emerald-600 text-white py-5 rounded-[2rem] font-black hover:bg-emerald-700 transition-all shadow-lg flex items-center justify-center gap-2">
              <Send size={18} /> {testForm.id ? 'ОБНОВИТЬ ТЕСТ' : 'СОЗДАТЬ ТЕСТ'}
            </button>
            {testForm.id && (
              <button type="button" onClick={() => { setTestForm(EMPTY_FORM); if (onClearEditing) onClearEditing(); if (onClearTasks) onClearTasks(); }}
                className="w-full bg-slate-100 text-slate-600 py-3 rounded-[2rem] font-black hover:bg-slate-200 transition-all text-xs uppercase">
                Новый тест
              </button>
            )}
          </form>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-6 rounded-[3rem] shadow-xl border border-slate-100">
            {/* ── Заголовок теста markdown-превью ── */}
            {testForm.title && (
              <div className="mb-5 pb-5 border-b border-slate-100">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Название теста</span>
                <MarkdownPreview text={testForm.title} title={null} />
              </div>
            )}

            {/* ── Метаинформация теста ── */}
            {(testForm.target_class || testForm.target_topic || testForm.max_attempts || testForm.time_limit_minutes || testForm.exam_start || testForm.exam_end) && (
              <div className="mb-5 pb-5 border-b border-slate-100">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-3">О тесте</span>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  {testForm.target_class && (
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase">Раздел</span>
                      <p className="font-bold text-slate-700">{testForm.target_class}</p>
                    </div>
                  )}
                  {testForm.target_topic && (
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase">Тема</span>
                      <p className="font-bold text-slate-700">{testForm.target_topic}</p>
                    </div>
                  )}
                  {testForm.max_attempts && (
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase">Макс. попыток</span>
                      <p className="font-bold text-slate-700">{testForm.max_attempts}</p>
                    </div>
                  )}
                  {testForm.time_limit_minutes && (
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase">Лимит времени</span>
                      <p className="font-bold text-slate-700">{testForm.time_limit_minutes} мин</p>
                    </div>
                  )}
                </div>
                <div className="mt-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase">Режим</span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {testForm.allow_interruptions
                      ? 'С прерываниями — можно решать частями.'
                      : 'Без прерываний — тест нужно пройти за один присест.'}
                  </p>
                </div>
                {(testForm.exam_start || testForm.exam_end) && (
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mt-2">
                    {testForm.exam_start && (
                      <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase">Начало экзамена</span>
                        <p className="font-bold text-slate-700">{new Date(testForm.exam_start).toLocaleString('ru-RU')}</p>
                      </div>
                    )}
                    {testForm.exam_end && (
                      <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase">Конец экзамена</span>
                        <p className="font-bold text-slate-700">{new Date(testForm.exam_end).toLocaleString('ru-RU')}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <h3 className="text-lg font-black text-slate-800 uppercase mb-4">Задания ({selectedTasks.length})</h3>
            {selectedTasks.length === 0 ? (
              <p className="text-slate-300 italic text-sm">Выберите задания для теста</p>
            ) : (
              <div className="space-y-6">
                {selectedTasks.sort((a, b) => { if (a.is_open_answer !== b.is_open_answer) return a.is_open_answer ? 1 : -1; return (a.difficulty || 0) - (b.difficulty || 0); }).map((task, idx) => (
                  <div key={task.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 group relative">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black text-emerald-600">№{idx + 1}</span>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg ${getDifficultyColor(task.difficulty)}`}>LVL {task.difficulty}</span>
                        <span className="text-[9px] text-slate-400">{task.is_open_answer ? 'Открытый ответ' : 'Выбор варианта'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onTaskToggle(task)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 bg-white rounded-lg border border-red-100 text-red-400 hover:text-red-600 hover:bg-red-50 transition-all"
                        title="Удалить задание из теста"
                      >
                        <Trash2 size={14} />
                      </button>
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
    </div>
  );
}