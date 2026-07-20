import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, XCircle, CheckCircle2, Clock, Users, BookOpen, CheckSquare, Square, Send, Calendar, FileText, Trash2, ArrowRight } from 'lucide-react';
import { API_BASE } from '../../shared/api';
import { restoreSession } from '../../shared/lib/session';

export default function TestManageModal({ test, students, onClose, onAssign }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState("view");
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const getAuthHeaders = () => {
    const user = restoreSession();
    const token = user?.token || user?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => { fetchAssignments(); }, []);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/teacher/test/${test.id}/assignments`, { headers: getAuthHeaders() });
      setAssignments(res.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const assignedIds = assignments.map((a) => a.user_id);
  const assignedStudents = students.filter((s) => assignedIds.includes(s.id));
  const availableStudents = students.filter((s) => !assignedIds.includes(s.id));
  const filteredAvailable = availableStudents.filter((s) => `${s.first_name} ${s.last_name} ${s.username}`.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredAssigned = assignedStudents.filter((s) => `${s.first_name} ${s.last_name} ${s.username}`.toLowerCase().includes(searchTerm.toLowerCase()));

  const toggleStudent = (id) => setSelectedStudents((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);

  const handleAssign = async () => {
    if (selectedStudents.length === 0) { alert('Выберите хотя бы одного ученика'); return; }
    try {
      await onAssign({ test_id: test.id, user_ids: selectedStudents });
      setSelectedStudents([]);
      setMode("view");
      fetchAssignments();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (assignmentId) => {
    if (!confirm('Отменить назначение?')) return;
    try {
      await axios.delete(`${API_BASE}/teacher/assignments/${assignmentId}`, { headers: getAuthHeaders() });
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
    } catch (e) { alert('Ошибка при удалении'); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-black text-slate-800 truncate">{mode === "view" ? "Назначения теста" : "Назначить тест"}</h3>
              <p className="text-sm text-slate-500 mt-1 truncate">{test.title}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl ml-2 shrink-0"><XCircle size={20} className="text-slate-400" /></button>
          </div>
          <div className="flex gap-2 mt-4 bg-slate-50 p-1.5 rounded-xl">
            <button onClick={() => { setMode("view"); setSearchTerm(""); }} className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase transition-all ${mode === "view" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400"}`}>Назначено ({assignments.length})</button>
            <button onClick={() => { setMode("assign"); setSearchTerm(""); }} className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase transition-all ${mode === "assign" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400"}`}>Назначить</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {mode === "view" && (
            loading ? <div className="text-center py-8 text-slate-400">Загрузка...</div> :
            assignments.length === 0 ? <div className="text-center py-12"><Users size={48} className="mx-auto text-slate-200 mb-3" /><p className="text-slate-400 text-sm font-bold">Нет назначений</p></div> :
            <div className="space-y-2">{assignments.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-slate-800 truncate">{a.student_name}</div>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    {a.is_completed ? (
                      <><span className="text-[9px] font-black text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full"><CheckCircle2 size={12} /> Выполнено</span>
                      {a.total_points !== null && <span className="text-[9px] font-bold text-slate-500">{a.total_points}/{a.max_points} балл.</span>}
                      {a.percentage !== null && <span className="text-[9px] font-bold text-blue-600">{a.percentage}%</span>}
                      {a.result_id && <button onClick={() => navigate(`/teacher/results/${a.result_id}`)} className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full hover:bg-emerald-100"><FileText size={10} /> Рез-т</button>}</>
                    ) : <span className="text-[9px] font-black text-amber-600 flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full"><Clock size={12} /> Ожидается</span>}
                  </div>
                </div>
                <button onClick={() => handleDelete(a.id)} className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-all shrink-0"><Trash2 size={14} /></button>
              </div>
            ))}</div>
          )}
          {mode === "assign" && (
            <div className="space-y-6">
              {assignedStudents.length > 0 && (
                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase mb-3 flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> Уже назначены ({assignedStudents.length})</h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">{assignedStudents.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                      <div className="flex-1 min-w-0"><div className="font-bold text-sm text-slate-700 truncate">{s.first_name} {s.last_name}</div><div className="text-[10px] text-slate-400">@{s.username}</div></div>
                    </div>
                  ))}</div>
                </div>
              )}
              <div>
                <h4 className="text-xs font-black text-slate-400 uppercase mb-3 flex items-center gap-2"><Users size={14} className="text-slate-400" /> Доступно ({availableStudents.length})</h4>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                  <input type="text" placeholder="Поиск..." className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-100" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto">{filteredAvailable.map((s) => (
                  <button key={s.id} onClick={() => toggleStudent(s.id)} className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${selectedStudents.includes(s.id) ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 hover:bg-slate-100 border border-transparent'}`}>
                    {selectedStudents.includes(s.id) ? <CheckSquare size={18} className="text-emerald-600 shrink-0" /> : <Square size={18} className="text-slate-300 shrink-0" />}
                    <div className="flex-1 min-w-0"><div className="font-bold text-sm text-slate-800 truncate">{s.first_name} {s.last_name}</div><div className="text-[10px] text-slate-400">@{s.username}</div></div>
                  </button>
                ))}</div>
              </div>
            </div>
          )}
        </div>
        <div className="p-6 border-t border-slate-100 flex gap-3">
          <button onClick={onClose} className="flex-1 p-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-200">ЗАКРЫТЬ</button>
          {mode === "assign" && <button onClick={handleAssign} disabled={selectedStudents.length === 0} className="flex-1 p-4 bg-emerald-600 text-white rounded-2xl font-black text-sm hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"><Send size={16} /> НАЗНАЧИТЬ ({selectedStudents.length})</button>}
        </div>
      </div>
    </div>
  );
}
