import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, XCircle, CheckCircle2, Clock, BookOpen, FileText } from 'lucide-react';
import { API_BASE } from '../../shared/api';
import { restoreSession } from '../../shared/lib/session';

export default function AssignTestToGroupModal({ group, tests, onClose, onAssign, navigate }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [groupAssignments, setGroupAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  const getAuthHeaders = () => {
    const user = restoreSession();
    const token = user?.token || user?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    fetchGroupAssignedTests();
  }, []);

  const fetchGroupAssignedTests = async () => {
    setLoading(true);
    try {
      const studentIds = group.students?.map(s => s.id) || [];
      const allAssignments = [];
      for (const studentId of studentIds) {
        try {
          const res = await axios.get(`${API_BASE}/teacher/student/${studentId}/assignments`, { 
            headers: getAuthHeaders() 
          });
          allAssignments.push(...res.data.map(a => ({ ...a, _studentId: studentId })));
        } catch (e) {}
      }
      setGroupAssignments(allAssignments);
    } catch (e) { 
      console.error(e); 
    } finally { 
      setLoading(false); 
    }
  };

  const assignedTestIds = [...new Set(groupAssignments.map(a => a.test_id))];
  const assignedTests = tests.filter(t => assignedTestIds.includes(t.id));
  const availableTests = tests.filter(t => !assignedTestIds.includes(t.id));
  const filteredAvailable = availableTests.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAssign = async (testId) => {
    if (confirm(`Назначить тест группе "${group.name}"?`)) {
      try {
        await onAssign(testId, group.id);
        setTimeout(fetchGroupAssignedTests, 500);
      } catch (e) { 
        console.error(e); 
      }
    }
  };

  const handleUnassignFromAll = async (testId) => {
    if (!confirm(`Отменить назначение теста для всех студентов группы?`)) return;
    const testAssignments = groupAssignments.filter(a => a.test_id === testId);
    try {
      for (const assignment of testAssignments) {
        await axios.delete(`${API_BASE}/teacher/assignments/${assignment.id}`, { 
          headers: getAuthHeaders() 
        });
      }
      fetchGroupAssignedTests();
    } catch (e) { 
      alert('Ошибка при отмене назначения'); 
    }
  };

  const getStudentName = (studentId) => {
    const s = group.students?.find(st => st.id === studentId);
    return s ? `${s.first_name} ${s.last_name}` : `ID: ${studentId}`;
  };

  const navigateToResult = (resultId) => { 
    if (resultId && navigate) navigate(`/teacher/results/${resultId}`); 
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-black text-slate-800">Управление тестами</h3>
              <p className="text-sm text-slate-500 mt-1">Группа: {group.name} ({group.students?.length || 0} студентов)</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl">
              <XCircle size={20} className="text-slate-400" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {assignedTests.length > 0 && (
            <div>
              <h4 className="text-xs font-black text-slate-400 uppercase mb-3 flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-500" /> 
                Назначенные ({assignedTests.length})
              </h4>
              <div className="space-y-2">
                {assignedTests.map(test => {
                  const a = groupAssignments.filter(x => x.test_id === test.id);
                  const c = a.filter(x => x.is_completed).length;
                  const t = a.length;
                  return (
                    <div key={test.id} className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1 min-w-0 mr-2">
                          <h5 className="font-bold text-sm text-slate-800 truncate">{test.title}</h5>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[10px] text-slate-400">{test.tasks?.length || 0} зад.</span>
                            <span className={'text-[10px] font-bold ' + (c === t ? 'text-emerald-600' : 'text-amber-600')}>
                              {c}/{t}
                            </span>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleUnassignFromAll(test.id)} 
                          className="px-3 py-1.5 bg-red-50 text-red-500 rounded-lg text-[10px] font-black hover:bg-red-100 shrink-0"
                        >
                          Отменить
                        </button>
                      </div>
                      <div className="w-full h-1.5 bg-emerald-100 rounded-full overflow-hidden mb-2">
                        <div 
                          className="h-full bg-emerald-500 rounded-full transition-all" 
                          style={{ width: ((c / t) * 100) + '%' }} 
                        />
                      </div>
                      <div className="space-y-0.5 max-h-[150px] overflow-y-auto">
                        {a.map(assignment => (
                          <div key={assignment.id} className="flex items-center justify-between py-1.5 px-2 bg-white/70 rounded-lg">
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                              {assignment.is_completed
                                ? <CheckCircle2 size={10} className="text-emerald-500 shrink-0" />
                                : <Clock size={10} className="text-amber-500 shrink-0" />
                              }
                              <span className="text-[10px] font-bold text-slate-600 truncate">
                                {getStudentName(assignment._studentId || assignment.user_id)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                              {assignment.is_completed
                                ? (
                                  <>
                                    <span className="text-[9px] font-bold text-emerald-600">
                                      {assignment.total_points || 0}/{assignment.max_points || 0}
                                    </span>
                                    {assignment.result_id && 
                                      <button 
                                        onClick={() => navigateToResult(assignment.result_id)} 
                                        className="p-0.5 bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-100"
                                      >
                                        <FileText size={9} />
                                      </button>
                                    }
                                  </>
                                )
                                : <span className="text-[9px] text-amber-600 font-bold">Ждёт</span>
                              }
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          <div>
            <h4 className="text-xs font-black text-slate-400 uppercase mb-3 flex items-center gap-2">
              <BookOpen size={14} className="text-slate-400" /> 
              Доступные ({availableTests.length})
            </h4>
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
              <input 
                type="text" 
                placeholder="Поиск теста..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-100" 
              />
            </div>
            {filteredAvailable.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4">
                {searchTerm ? 'Ничего не найдено' : 'Все тесты назначены'}
              </p>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {filteredAvailable.map(test => (
                  <button 
                    key={test.id} 
                    onClick={() => handleAssign(test.id)} 
                    className="w-full p-3 bg-slate-50 hover:bg-emerald-50 rounded-xl text-left transition-all border border-transparent hover:border-emerald-200"
                  >
                    <div className="font-bold text-sm text-slate-700">{test.title}</div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {test.tasks?.length || 0} заданий
                      {test.target_class && ` • ${test.target_class} класс`}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="p-6 border-t border-slate-100">
          <button 
            onClick={onClose} 
            className="w-full p-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-200"
          >
            ЗАКРЫТЬ
          </button>
        </div>
      </div>
    </div>
  );
} // <-- ЭТА СКОБКА БЫЛА ПРОПУЩЕНА