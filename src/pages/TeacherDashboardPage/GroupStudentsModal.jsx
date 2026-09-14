import React, { useState, useEffect } from 'react';
import { Search, Users, XCircle, CheckSquare, Square, UserPlus, Trophy, GraduationCap } from 'lucide-react';

export default function GroupStudentsModal({ group, allStudents, onClose, onAdd, onRemove, navigate }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentStudents, setCurrentStudents] = useState(group.students || []);

  useEffect(() => { setCurrentStudents(group.students || []); }, [group.students]);

  const groupStudentIds = currentStudents.map((s) => s.id);
  const availableStudents = allStudents.filter((s) =>
    !groupStudentIds.includes(s.id) &&
    `${s.first_name} ${s.last_name} ${s.username}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = async () => {
    if (selectedIds.length === 0) return;
    setLoading(true);
    try {
      await onAdd(group.id, selectedIds);
      const newStudents = allStudents.filter((s) => selectedIds.includes(s.id));
      setCurrentStudents((prev) => [...prev, ...newStudents]);
      setSelectedIds([]);
      setSearchTerm('');
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleRemove = async (studentId) => {
    try {
      await onRemove(group.id, studentId);
      setCurrentStudents((prev) => prev.filter((s) => s.id !== studentId));
    } catch (e) { console.error(e); }
  };

  const toggleSelect = (id) => setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-sm max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-zinc-100">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-semibold text-zinc-800">{group.name}</h3>
              <p className="text-sm text-zinc-500 mt-1">{currentStudents.length} студентов в группе</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-xl"><XCircle size={20} className="text-zinc-400" /></button>
          </div>
        </div>

        <div className="p-6 border-b border-zinc-50">
          <h4 className="text-xs font-semibold text-zinc-400 mb-3 flex items-center gap-2"><Users size={14} className="text-zinc-400" /> В группе ({currentStudents.length})</h4>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {currentStudents.length === 0 ? <p className="text-xs text-zinc-400 py-4 text-center">Нет студентов</p> :
              currentStudents.map((student) => (
                <div key={student.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl hover:bg-zinc-100 transition-all">
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <button onClick={() => navigate(`/teacher/students/${student.id}`)} className="text-sm font-bold text-zinc-700 hover:text-zinc-600 transition-colors truncate text-left">
                      {student.first_name} {student.last_name}
                    </button>
                    <span className="text-[10px] text-zinc-400 shrink-0">@{student.username}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => navigate(`/stats/${student.id}`)} className="p-2 hover:bg-zinc-50 rounded-lg text-zinc-400 hover:text-zinc-500"><Trophy size={14} /></button>
                    <button onClick={() => handleRemove(student.id)} disabled={loading} className="p-2 hover:bg-red-50 rounded-lg text-zinc-400 hover:text-red-500 disabled:opacity-50"><XCircle size={16} /></button>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-zinc-400 flex items-center gap-2"><UserPlus size={14} className="text-zinc-400" /> Добавить студентов</h4>
            <span className="text-[10px] font-bold text-zinc-400">Доступно: {availableStudents.length}</span>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-300" />
            <input type="text" placeholder="Поиск..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-3 bg-zinc-50 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-zinc-100" />
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {availableStudents.length === 0 ? <p className="text-xs text-zinc-400 py-4 text-center">{searchTerm ? "Ничего не найдено" : "Все студенты уже в группе"}</p> :
              availableStudents.map((student) => (
                <button key={student.id} onClick={() => toggleSelect(student.id)} disabled={loading}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all disabled:opacity-50 ${selectedIds.includes(student.id) ? 'bg-zinc-50 border border-zinc-200' : 'bg-zinc-50 hover:bg-zinc-100 border border-transparent'}`}>
                  {selectedIds.includes(student.id) ? <CheckSquare size={18} className="text-zinc-600 shrink-0" /> : <Square size={18} className="text-zinc-300 shrink-0" />}
                  <div className="flex-1 min-w-0"><div className="text-sm font-bold text-zinc-800 truncate">{student.first_name} {student.last_name}</div><div className="text-[10px] text-zinc-400">@{student.username}</div></div>
                </button>
              ))}
          </div>
        </div>

        <div className="p-6 border-t border-zinc-100 flex gap-3">
          <button onClick={onClose} disabled={loading} className="flex-1 p-4 bg-zinc-100 text-zinc-600 rounded-2xl font-semibold text-sm hover:bg-zinc-200 disabled:opacity-50">ЗАКРЫТЬ</button>
          <button onClick={handleAdd} disabled={selectedIds.length === 0 || loading}
            className="flex-1 p-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-2xl font-semibold text-sm hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
            {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> ДОБАВЛЕНИЕ...</> : <><UserPlus size={16} /> ДОБАВИТЬ ({selectedIds.length})</>}
          </button>
        </div>
      </div>
    </div>
  );
}
