import React, { useState, useEffect } from 'react';
import { Search, Users, XCircle, CheckSquare, Square, Sparkles, AlertCircle, Zap, RefreshCw } from 'lucide-react';

export default function AiTestGeneratorModal({
  groups,
  allStudents,
  onClose,
  onGenerate,
}) {
  const [prompt, setPrompt] = useState('');
  const [taskCount, setTaskCount] = useState(10);
  const [difficulty, setDifficulty] = useState('none');
  const [recentWeeks, setRecentWeeks] = useState(1.5);
  const [generating, setGenerating] = useState(false);

  // Group selection
  const [selectedGroupIds, setSelectedGroupIds] = useState([]);
  const [groupSearch, setGroupSearch] = useState('');

  // Student selection
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');

  const toggleGroup = (id) =>
    setSelectedGroupIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );

  const toggleStudent = (id) =>
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(groupSearch.toLowerCase())
  );

  const filteredStudents = allStudents.filter((s) =>
    `${s.first_name} ${s.last_name} ${s.username}`
      .toLowerCase()
      .includes(studentSearch.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    if (selectedGroupIds.length === 0 && selectedStudentIds.length === 0) {
      alert('Выберите хотя бы одну группу или одного ученика');
      return;
    }
    setGenerating(true);
    try {
      await onGenerate({
        prompt: prompt.trim(),
        task_count: taskCount,
        difficulty: difficulty === 'none' ? null : difficulty,
        group_ids: selectedGroupIds.length > 0 ? selectedGroupIds : null,
        student_ids: selectedStudentIds.length > 0 ? selectedStudentIds : null,
        recent_weeks: recentWeeks,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white rounded-t-[2rem]">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <Sparkles size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase">AI Генерация теста</h3>
                <p className="text-emerald-200 text-[10px] font-bold uppercase mt-1">
                  Создайте персонализированный тест для учеников
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={generating}
              className="p-2 hover:bg-white/10 rounded-xl transition-all disabled:opacity-50"
            >
              <XCircle size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {/* Form fields */}
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* Prompt */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">
                Описание темы *
              </label>
              <textarea
                required
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Например: квадратные уравнения, 10 класс..."
                rows={3}
                className="w-full p-4 bg-slate-50 rounded-2xl font-medium text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-400 resize-none placeholder:text-slate-400"
              />
            </div>

            {/* Task count + Difficulty */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">
                  Количество заданий (1-50)
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={taskCount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') { setTaskCount(''); return; }
                    const num = Number(val);
                    if (isNaN(num)) return;
                    if (num < 1) setTaskCount(1);
                    else if (num > 50) setTaskCount(50);
                    else setTaskCount(num);
                  }}
                  onBlur={() => {
                    if (taskCount === '' || isNaN(taskCount) || taskCount < 1) setTaskCount(10);
                  }}
                  className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">
                  Сложность
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <option value="none">Любая сложность</option>
                  <option value="easy">Лёгкий (1-2)</option>
                  <option value="medium">Средний (2-4)</option>
                  <option value="hard">Сложный (4-5)</option>
                </select>
              </div>
            </div>

            {/* Recent weeks */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">
                Исключать решённые за (недель)
              </label>
              <input
                type="number"
                min="0"
                max="12"
                step="0.5"
                value={recentWeeks}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val >= 0) setRecentWeeks(val);
                }}
                className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <p className="text-[9px] text-slate-400 mt-1">0 = не исключать, 1.5 = полторы недели, 4 = месяц</p>
            </div>

            {/* Groups selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-black text-slate-400 uppercase flex items-center gap-2">
                  <Users size={14} className="text-slate-400" /> Группы
                </h4>
                <span className="text-[10px] font-bold text-slate-400">
                  Выбрано: {selectedGroupIds.length}
                </span>
              </div>
              <div className="relative mb-2">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  type="text"
                  placeholder="Поиск групп..."
                  value={groupSearch}
                  onChange={(e) => setGroupSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {filteredGroups.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-4">
                    {groupSearch ? 'Ничего не найдено' : 'Нет доступных групп'}
                  </p>
                ) : (
                  filteredGroups.map((group) => {
                    const isSelected = selectedGroupIds.includes(group.id);
                    return (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => toggleGroup(group.id)}
                        disabled={generating}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all disabled:opacity-50 ${
                          isSelected
                            ? 'bg-emerald-50 border border-emerald-200'
                            : 'bg-slate-50 hover:bg-slate-100 border border-transparent'
                        }`}
                      >
                        {isSelected ? (
                          <CheckSquare size={16} className="text-emerald-600 shrink-0" />
                        ) : (
                          <Square size={16} className="text-slate-300 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-slate-800 truncate">
                            {group.name}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Students selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-black text-slate-400 uppercase flex items-center gap-2">
                  <Users size={14} className="text-slate-400" /> Отдельные ученики
                </h4>
                <span className="text-[10px] font-bold text-slate-400">
                  Выбрано: {selectedStudentIds.length}
                </span>
              </div>
              <div className="relative mb-2">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  type="text"
                  placeholder="Поиск учеников..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {filteredStudents.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-4">
                    {studentSearch ? 'Ничего не найдено' : 'Нет доступных учеников'}
                  </p>
                ) : (
                  filteredStudents.map((student) => {
                    const isSelected = selectedStudentIds.includes(student.id);
                    return (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => toggleStudent(student.id)}
                        disabled={generating}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all disabled:opacity-50 ${
                          isSelected
                            ? 'bg-emerald-50 border border-emerald-200'
                            : 'bg-slate-50 hover:bg-slate-100 border border-transparent'
                        }`}
                      >
                        {isSelected ? (
                          <CheckSquare size={16} className="text-emerald-600 shrink-0" />
                        ) : (
                          <Square size={16} className="text-slate-300 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-slate-800 truncate">
                            {student.first_name} {student.last_name}
                          </div>
                          <div className="text-[10px] text-slate-400">@{student.username}</div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Warning */}
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3">
              <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[10px] font-bold text-amber-700 uppercase">
                AI может допускать ошибки. Проверяйте сгенерированные задания перед отправкой ученикам.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-100 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={generating}
              className="flex-1 p-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-200 disabled:opacity-50 transition-all"
            >
              ОТМЕНА
            </button>
            <button
              type="submit"
              disabled={
                !prompt.trim() ||
                (selectedGroupIds.length === 0 && selectedStudentIds.length === 0) ||
                generating
              }
              className="flex-1 p-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl font-black text-sm hover:shadow-xl hover:shadow-emerald-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  ГЕНЕРАЦИЯ...
                </>
              ) : (
                <>
                  <Zap size={16} />
                  СОЗДАТЬ ТЕСТ
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
