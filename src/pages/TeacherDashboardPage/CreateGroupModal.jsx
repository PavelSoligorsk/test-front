import React, { useState, useEffect } from 'react';
import { Search, Users, XCircle, CheckSquare, Square, UserPlus } from 'lucide-react';

export default function CreateGroupModal({
  groupForm,
  allStudents,
  onClose,
  onSave,
  navigate,
}) {
  const [form, setForm] = useState({ name: '', description: '' });
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);

  const isEditing = !!groupForm?.id;

  useEffect(() => {
    if (groupForm) {
      setForm({ name: groupForm.name || '', description: groupForm.description || '' });
      if (groupForm.students) {
        setSelectedIds(groupForm.students.map((s) => s.id));
      }
    }
  }, [groupForm]);

  const filteredStudents = allStudents.filter((s) =>
    `${s.first_name} ${s.last_name} ${s.username}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const toggleSelect = (id) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        ...form,
        id: groupForm?.id || null,
        student_ids: selectedIds,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#09090b] rounded-3xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800/60">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                {isEditing ? 'Редактировать группу' : 'Создать группу'}
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                {isEditing
                  ? `Выбрано ${selectedIds.length} студентов`
                  : 'Заполните данные группы и выберите студентов'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <XCircle size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {/* Form fields */}
          <div className="p-6 space-y-4 border-b border-zinc-100 dark:border-zinc-800/60">
            <div>
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block mb-2">
                Название группы
              </label>
              <input
                required
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="9А, Олимпиадники, Отстающие..."
                className="w-full p-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl font-medium text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-4 focus:ring-zinc-100 dark:focus:ring-zinc-800/50 focus:border-zinc-300 dark:focus:border-zinc-700 placeholder:text-zinc-400"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block mb-2">
                Описание (опционально)
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Описание группы..."
                rows={2}
                className="w-full p-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl font-medium text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-4 focus:ring-zinc-100 dark:focus:ring-zinc-800/50 focus:border-zinc-300 dark:focus:border-zinc-700 resize-none placeholder:text-zinc-400"
              />
            </div>
          </div>

          {/* Student selection */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                <Users size={14} /> Выберите студентов
              </h4>
              <span className="text-xs font-medium text-zinc-400 tabular-nums">
                Выбрано: {selectedIds.length}
              </span>
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Поиск студентов..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 rounded-xl text-sm font-medium text-zinc-900 dark:text-zinc-100 outline-none focus:ring-4 focus:ring-zinc-100 dark:focus:ring-zinc-800/50 focus:border-zinc-300 dark:focus:border-zinc-700 placeholder:text-zinc-400"
              />
            </div>

            <div className="space-y-1 max-h-64 overflow-y-auto">
              {filteredStudents.length === 0 ? (
                <p className="text-xs text-zinc-400 text-center py-8">
                  {searchTerm ? 'Ничего не найдено' : 'Нет доступных студентов'}
                </p>
              ) : (
                filteredStudents.map((student) => {
                  const isSelected = selectedIds.includes(student.id);
                  return (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => toggleSelect(student.id)}
                      disabled={saving}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all disabled:opacity-50 ${
                        isSelected
                          ? 'bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700'
                          : 'bg-zinc-50 dark:bg-zinc-900/40 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 border border-transparent'
                      }`}
                    >
                      {isSelected ? (
                        <CheckSquare size={18} className="text-zinc-700 dark:text-zinc-300 shrink-0" />
                      ) : (
                        <Square size={18} className="text-zinc-300 dark:text-zinc-600 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                          {student.first_name} {student.last_name}
                        </div>
                        <div className="text-xs text-zinc-400">@{student.username}</div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-zinc-100 dark:border-zinc-800/60 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 p-4 bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 rounded-2xl font-semibold text-sm hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-50 transition-all"
            >
              ОТМЕНА
            </button>
            <button
              type="submit"
              disabled={!form.name.trim() || saving}
              className="flex-1 p-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-2xl font-semibold text-sm hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 dark:border-zinc-950/30 border-t-white dark:border-t-zinc-950 rounded-full animate-spin" />
                  {isEditing ? 'СОХРАНЕНИЕ...' : 'СОЗДАНИЕ...'}
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  {isEditing ? 'СОХРАНИТЬ' : 'СОЗДАТЬ'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
