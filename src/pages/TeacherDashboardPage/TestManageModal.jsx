import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, XCircle, CheckCircle2, Clock, Users, BookOpen, CheckSquare, Square, Send, Calendar, FileText, Trash2, ArrowRight, Layers } from 'lucide-react';
import { API_BASE } from '../../shared/api';
import { restoreSession } from '../../shared/lib/session';

export default function TestManageModal({ test, students, groups, onClose, onAssign, onAssignToGroup }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState("view");
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [groupSearch, setGroupSearch] = useState("");
  const [assigningGroups, setAssigningGroups] = useState(false);
  const [groupAssignResults, setGroupAssignResults] = useState(null);
  const [localError, setLocalError] = useState('');

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

  const toggleGroup = (id) => setSelectedGroups((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);

  const handleAssignToGroups = async () => {
    if (selectedGroups.length === 0) { setLocalError('Выберите хотя бы одну группу'); return; }
    setLocalError('');
    setAssigningGroups(true);
    setGroupAssignResults(null);
    const results = [];
    for (const gid of selectedGroups) {
      try {
        await onAssignToGroup(test.id, gid);
        results.push({ groupId: gid, ok: true });
      } catch (e) {
        results.push({ groupId: gid, ok: false, err: e.response?.data?.detail || 'Ошибка' });
      }
    }
    setGroupAssignResults(results);
    setSelectedGroups([]);
    setAssigningGroups(false);
  };

  const filteredGroups = (groups || []).filter(g =>
    g.name.toLowerCase().includes(groupSearch.toLowerCase())
  );

  const handleAssign = async () => {
    if (selectedStudents.length === 0) { setLocalError('Выберите хотя бы одного ученика'); return; }
    setLocalError('');
    try {
      await onAssign({ test_id: test.id, user_ids: selectedStudents });
      setSelectedStudents([]);
      setMode("view");
      fetchAssignments();
    } catch (e) { console.error(e); setLocalError(e?.response?.data?.detail || e?.message || 'Ошибка при назначении'); }
  };

  const handleDelete = async (assignmentId) => {
    if (!confirm('Отменить назначение?')) return;
    try {
      await axios.delete(`${API_BASE}/teacher/assignments/${assignmentId}`, { headers: getAuthHeaders() });
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
    } catch (e) { console.error(e); throw e; }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-sm max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-zinc-100">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-semibold text-zinc-800 truncate">{mode === "view" ? "Назначения теста" : "Назначить тест"}</h3>
              <p className="text-sm text-zinc-500 mt-1 truncate">{test.title}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-xl ml-2 shrink-0"><XCircle size={20} className="text-zinc-400" /></button>
          </div>
          <div className="flex gap-2 mt-4 bg-zinc-50 p-1.5 rounded-xl">
            <button onClick={() => { setMode("view"); setSearchTerm(""); }} className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all ${mode === "view" ? "bg-white text-zinc-800 shadow-sm" : "text-zinc-400"}`}>Назначено ({assignments.length})</button>
            <button onClick={() => { setMode("assign"); setSearchTerm(""); setGroupAssignResults(null); }} className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all ${mode === "assign" ? "bg-white text-zinc-800 shadow-sm" : "text-zinc-400"}`}>Ученики</button>
            <button onClick={() => { setMode("groups"); setGroupSearch(""); setGroupAssignResults(null); }} className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all ${mode === "groups" ? "bg-white text-zinc-800 shadow-sm" : "text-zinc-400"}`}>Группы</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {localError && <p className="text-sm text-red-700 mb-4" role="alert">{localError}</p>}
          {mode === "view" && (
            loading ? <div className="text-center py-8 text-zinc-400">Загрузка...</div> :
            assignments.length === 0 ? <div className="text-center py-12"><Users size={48} className="mx-auto text-zinc-200 mb-3" /><p className="text-zinc-400 text-sm font-bold">Нет назначений</p></div> :
            <div className="space-y-2">{assignments.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-4 bg-zinc-50 rounded-xl hover:bg-zinc-100 transition-all">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-zinc-800 truncate">{a.student_name}</div>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    {a.is_completed ? (
                      <><span className="text-xs font-medium text-zinc-600 flex items-center gap-1 bg-zinc-50 px-2 py-0.5 rounded-full"><CheckCircle2 size={12} /> Выполнено</span>
                      {a.total_points !== null && <span className="text-[9px] font-bold text-zinc-500">{a.total_points}/{a.max_points} балл.</span>}
                      {a.percentage !== null && <span className="text-[9px] font-bold text-zinc-600">{a.percentage}%</span>}
                      {a.result_id && <button onClick={() => navigate(`/teacher/results/${a.result_id}`)} className="text-xs font-medium text-zinc-600 bg-zinc-50 px-2 py-0.5 rounded-full hover:bg-zinc-100"><FileText size={10} /> Рез-т</button>}</>
                    ) : <span className="text-xs font-medium text-zinc-600 flex items-center gap-1 bg-zinc-50 px-2 py-0.5 rounded-full"><Clock size={12} /> Ожидается</span>}
                  </div>
                </div>
                <button onClick={() => handleDelete(a.id)} className="p-2 hover:bg-red-50 rounded-lg text-zinc-400 hover:text-red-500 transition-all shrink-0"><Trash2 size={14} /></button>
              </div>
            ))}</div>
          )}
          {mode === "assign" && (
            <div className="space-y-6">
              {assignedStudents.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-zinc-400 mb-3 flex items-center gap-2"><CheckCircle2 size={14} className="text-zinc-500" /> Уже назначены ({assignedStudents.length})</h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">{assignedStudents.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 p-3 bg-zinc-50/50 rounded-xl border border-zinc-100">
                      <CheckCircle2 size={16} className="text-zinc-500 shrink-0" />
                      <div className="flex-1 min-w-0"><div className="font-bold text-sm text-zinc-700 truncate">{s.first_name} {s.last_name}</div><div className="text-[10px] text-zinc-400">@{s.username}</div></div>
                    </div>
                  ))}</div>
                </div>
              )}
              <div>
                <h4 className="text-xs font-semibold text-zinc-400 mb-3 flex items-center gap-2"><Users size={14} className="text-zinc-400" /> Доступно ({availableStudents.length})</h4>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-300" size={14} />
                  <input type="text" placeholder="Поиск..." className="w-full pl-10 pr-4 py-3 bg-zinc-50 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-zinc-100" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto">{filteredAvailable.map((s) => (
                  <button key={s.id} onClick={() => toggleStudent(s.id)} className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${selectedStudents.includes(s.id) ? 'bg-zinc-50 border border-zinc-200' : 'bg-zinc-50 hover:bg-zinc-100 border border-transparent'}`}>
                    {selectedStudents.includes(s.id) ? <CheckSquare size={18} className="text-zinc-600 shrink-0" /> : <Square size={18} className="text-zinc-300 shrink-0" />}
                    <div className="flex-1 min-w-0"><div className="font-bold text-sm text-zinc-800 truncate">{s.first_name} {s.last_name}</div><div className="text-[10px] text-zinc-400">@{s.username}</div></div>
                  </button>
                ))}</div>
              </div>
            </div>
          )}
          {mode === "groups" && (
            <div className="space-y-6">
              {groupAssignResults && (
                <div className={`p-3 rounded-xl text-xs font-bold ${groupAssignResults.every(r => r.ok) ? 'bg-zinc-50 text-zinc-700' : 'bg-zinc-50 text-zinc-700'}`}>
                  {groupAssignResults.every(r => r.ok)
                    ? `✅ Тест назначен в ${groupAssignResults.length} групп(ы)`
                    : `⚠️ Назначено: ${groupAssignResults.filter(r => r.ok).length}, ошибок: ${groupAssignResults.filter(r => !r.ok).length}`}
                </div>
              )}
              <div>
                <h4 className="text-xs font-semibold text-zinc-400 mb-3 flex items-center gap-2"><Layers size={14} className="text-zinc-400" /> Группы ({(groups || []).length})</h4>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-300" size={14} />
                  <input type="text" placeholder="Поиск группы..." className="w-full pl-10 pr-4 py-3 bg-zinc-50 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-zinc-100" value={groupSearch} onChange={(e) => setGroupSearch(e.target.value)} />
                </div>
                <div className="space-y-1 max-h-56 overflow-y-auto">
                  {filteredGroups.length === 0 ? (
                    <p className="text-xs text-zinc-400 text-center py-4">{groupSearch ? 'Ничего не найдено' : 'Нет групп'}</p>
                  ) : (
                    filteredGroups.map((g) => (
                      <button key={g.id} onClick={() => toggleGroup(g.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${selectedGroups.includes(g.id) ? 'bg-zinc-50 border border-zinc-200' : 'bg-zinc-50 hover:bg-zinc-100 border border-transparent'}`}>
                        {selectedGroups.includes(g.id) ? <CheckSquare size={18} className="text-zinc-600 shrink-0" /> : <Square size={18} className="text-zinc-300 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm text-zinc-800 truncate">{g.name}</div>
                          <div className="text-[10px] text-zinc-400">{g.students?.length || 0} студентов</div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="p-6 border-t border-zinc-100 flex gap-3">
          <button onClick={onClose} className="flex-1 p-4 bg-zinc-100 text-zinc-600 rounded-xl font-medium text-sm hover:bg-zinc-200">Закрыть</button>
          {mode === "assign" && <button onClick={handleAssign} disabled={selectedStudents.length === 0} className="flex-1 p-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-xl font-medium text-sm hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 flex items-center justify-center gap-2"><Send size={16} /> Назначить ({selectedStudents.length})</button>}
          {mode === "groups" && <button onClick={handleAssignToGroups} disabled={selectedGroups.length === 0 || assigningGroups} className="flex-1 p-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-xl font-medium text-sm hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 flex items-center justify-center gap-2"><Send size={16} /> {assigningGroups ? 'Назначение...' : `Назначить (${selectedGroups.length})`}</button>}
        </div>
      </div>
    </div>
  );
}
