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
      <div className="bg-white rounded-[2rem] shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-black text-slate-800">
                {isEditing ? 'Редактировать группу' : 'Создать группу'}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                {isEditing
                  ? `Выбрано ${selectedIds.length} студентов`
                  : 'Заполните данные группы и выберите студентов'}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl">
              <XCircle size={20} className="text-slate-400" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {/* Form fields */}
          <div className="p-6 space-y-4 border-b border-slate-50">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">
                Название группы
              </label>
              <input
                required
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="9А, Олимпиадники, Отстающие..."
                className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-400 placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">
                Описание (опционально)
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Описание группы..."
                rows={2}
                className="w-full p-4 bg-slate-50 rounded-2xl font-medium text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-400 resize-none placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Student selection */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-400 uppercase flex items-center gap-2">
                <Users size={14} className="text-slate-400" /> Выберите студентов
              </h4>
              <span className="text-[10px] font-bold text-slate-400">
                Выбрано: {selectedIds.length}
              </span>
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                type="text"
                placeholder="Поиск студентов..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div className="space-y-1 max-h-64 overflow-y-auto">
              {filteredStudents.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-8">
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
                          ? 'bg-emerald-50 border border-emerald-200'
                          : 'bg-slate-50 hover:bg-slate-100 border border-transparent'
                      }`}
                    >
                      {isSelected ? (
                        <CheckSquare size={18} className="text-emerald-600 shrink-0" />
                      ) : (
                        <Square size={18} className="text-slate-300 shrink-0" />
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

          {/* Footer */}
          <div className="p-6 border-t border-slate-100 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 p-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-200 disabled:opacity-50 transition-all"
            >
              ОТМЕНА
            </button>
            <button
              type="submit"
              disabled={!form.name.trim() || saving}
              className="flex-1 p-4 bg-emerald-600 text-white rounded-2xl font-black text-sm hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
