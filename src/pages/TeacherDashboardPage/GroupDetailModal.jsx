import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { XCircle, CheckCircle2, Clock, BookOpen, Users, GraduationCap, Trophy, FileText, AlertCircle } from 'lucide-react';
import { API_BASE } from '../../shared/api';
import { restoreSession } from '../../shared/lib/session';

export default function GroupDetailModal({ group, tests, students, onClose, onRemoveStudent, navigate }) {
  const [activeSubTab, setActiveSubTab] = useState('students');
  const [assignments, setAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [error, setError] = useState(null);

  const getAuthHeaders = () => {
    const user = restoreSession();
    const token = user?.token || user?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    if (activeSubTab === 'assignments') { fetchGroupAssignments(); }
  }, [activeSubTab]);

  const fetchGroupAssignments = async () => {
    setLoadingAssignments(true); setError(null);
    try {
      const studentIds = group.students?.map(s => s.id) || [];
      const allAssignments = [];
      for (const studentId of studentIds) {
        try {
          const res = await axios.get(`${API_BASE}/teacher/student/${studentId}/assignments`, { headers: getAuthHeaders() });
          allAssignments.push(...res.data.map(a => ({ ...a, _studentId: studentId })));
        } catch (e) {}
      }
      setAssignments(allAssignments);
    } catch (e) { setError('Ошибка при загрузке назначений'); } finally { setLoadingAssignments(false); }
  };

  const handleUnassign = async (assignmentId) => {
    if (!confirm('Отменить назначение?')) return;
    try {
      await axios.delete(`${API_BASE}/teacher/assignments/${assignmentId}`, { headers: getAuthHeaders() });
      fetchGroupAssignments();
    } catch (e) { console.error(e); throw e; }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-sm max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-zinc-100">
          <div className="flex justify-between items-start">
            <div><h3 className="text-xl font-semibold text-zinc-800">{group.name}</h3><p className="text-sm text-zinc-500 mt-1">{group.students?.length || 0} студентов</p></div>
            <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-xl"><XCircle size={20} className="text-zinc-400" /></button>
          </div>
          <div className="flex gap-2 mt-4 bg-zinc-50 p-1.5 rounded-xl">
            <button onClick={() => setActiveSubTab('students')} className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all ${activeSubTab === 'students' ? 'bg-white text-zinc-800 shadow-sm' : 'text-zinc-400'}`}>👥 Студенты ({group.students?.length || 0})</button>
            <button onClick={() => setActiveSubTab('assignments')} className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all ${activeSubTab === 'assignments' ? 'bg-white text-zinc-800 shadow-sm' : 'text-zinc-400'}`}>📝 Назначения</button>
          </div>
        </div>
        {error && <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl"><p className="text-xs font-bold text-red-600 flex items-center gap-2"><AlertCircle size={14} /> {error}</p></div>}
        <div className="flex-1 overflow-y-auto p-6">
          {activeSubTab === 'students' && (
            <div className="space-y-2">
              {group.students?.length === 0 ? <p className="text-sm text-zinc-400 text-center py-8">Нет студентов в группе</p> :
                group.students?.map((student) => (
                  <div key={student.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl hover:bg-zinc-100 transition-all">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <button onClick={() => navigate(`/teacher/students/${student.id}`)} className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-600 font-semibold text-sm hover:bg-zinc-200 shrink-0">
                        {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
                      </button>
                      <div className="min-w-0">
                        <button onClick={() => navigate(`/teacher/students/${student.id}`)} className="font-bold text-sm text-zinc-700 hover:text-zinc-600 transition-colors truncate text-left max-w-full">{student.first_name} {student.last_name}</button>
                        <p className="text-[10px] text-zinc-400">@{student.username}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => navigate(`/stats/${student.id}`)} className="p-2 bg-zinc-50 text-zinc-600 rounded-lg hover:bg-zinc-100"><Trophy size={14} /></button>
                      <button onClick={() => onRemoveStudent(group.id, student.id)} className="p-2 hover:bg-red-50 rounded-lg text-zinc-400 hover:text-red-500"><XCircle size={14} /></button>
                    </div>
                  </div>
                ))}
            </div>
          )}
          {activeSubTab === 'assignments' && (
            loadingAssignments ? <div className="text-center py-8 text-zinc-400">Загрузка...</div> :
            assignments.length === 0 ? <div className="text-center py-8"><BookOpen size={48} className="mx-auto text-zinc-200 mb-3" /><p className="text-zinc-400 text-sm font-bold">Нет назначений</p></div> :
            <div className="space-y-4">
              {Object.entries(assignments.reduce((acc, a) => {
                const key = a.test_id;
                if (!acc[key]) acc[key] = { test_title: a.test_title, students: [], max_points: a.max_points || 0 };
                acc[key].students.push(a);
                return acc;
              }, {})).map(([testId, data]) => {
                const completedCount = data.students.filter(s => s.is_completed).length;
                const totalCount = data.students.length;
                return (
                  <div key={testId} className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-sm text-zinc-800">{data.test_title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-zinc-400">{totalCount} студентов</span>
                          <span className={`text-[10px] font-bold ${completedCount === totalCount ? 'text-zinc-600' : 'text-zinc-600'}`}>{completedCount}/{totalCount} выполнили</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5">{data.students.map(assignment => (
                      <div key={assignment.id} className="flex items-center justify-between p-3 bg-white rounded-xl">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {assignment.is_completed ? <CheckCircle2 size={14} className="text-zinc-500 shrink-0" /> : <Clock size={14} className="text-zinc-500 shrink-0" />}
                          <button onClick={() => navigate(`/teacher/students/${assignment._studentId || assignment.user_id}`)} className="text-xs font-bold text-zinc-600 hover:text-zinc-600 transition-colors truncate text-left">{students.find(s => s.id === (assignment._studentId || assignment.user_id))?.first_name || ''} {students.find(s => s.id === (assignment._studentId || assignment.user_id))?.last_name || ''}</button>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {assignment.is_completed ? (
                            <><span className="text-[10px] font-bold text-zinc-600">{assignment.total_points || 0}/{assignment.max_points || data.max_points || 0} балл.</span>
                            {assignment.result_id && <button onClick={() => navigate(`/result/${assignment.result_id}`)} className="px-2 py-1 bg-zinc-50 text-zinc-600 rounded-lg text-xs font-medium hover:bg-zinc-100"><FileText size={10} /> Рез-т</button>}</>
                          ) : <span className="text-[10px] text-zinc-600 font-bold">Ожидается</span>}
                          <button onClick={() => handleUnassign(assignment.id)} className="p-1 hover:bg-red-50 rounded-lg text-zinc-400 hover:text-red-500"><XCircle size={12} /></button>
                        </div>
                      </div>
                    ))}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="p-6 border-t border-zinc-100">
          <button onClick={onClose} className="w-full p-4 bg-zinc-100 text-zinc-600 rounded-2xl font-semibold text-sm hover:bg-zinc-200">ЗАКРЫТЬ</button>
        </div>
      </div>
    </div>
  );
}
