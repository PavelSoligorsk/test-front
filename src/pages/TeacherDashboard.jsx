import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Activity, Plus, Trash2, Eye, Database, CheckCircle, Search } from 'lucide-react';

export default function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState('tests');
const [tests, setTests] = useState([]);
  const [students, setStudents] = useState([]);
  const [bank, setBank] = useState([]);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [testTitle, setTestTitle] = useState("");

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      const [tRes, sRes, bRes] = await Promise.all([
        axios.get('/api/teacher/tests'),
        axios.get('/api/teacher/students'),
        axios.get('/api/teacher/tasks-bank')
      ]);
setTests(Array.isArray(tRes.data) ? tRes.data : []);
      setStudents(sRes.data);
      setBank(bRes.data);
    } catch (e) { console.error("Data fetch error", e); }
  };

  const createNewTest = async () => {
    if (!testTitle || selectedTasks.length === 0) return alert("Заполните название и выберите задачи");
    await axios.post('/api/tests/', { title: testTitle, task_ids: selectedTasks, user_id: 1 });
    setTestTitle(""); setSelectedTasks([]); setActiveTab('tests');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* HEADER */}
      <header className="bg-slate-950 p-8 m-6 rounded-[3rem] text-white flex justify-between items-center shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600 rounded-2xl"><Activity size={24} /></div>
          <h1 className="text-2xl font-black italic uppercase tracking-tighter">Teacher.Control</h1>
        </div>
        <nav className="flex gap-2">
          {['tests', 'create-test', 'students'].map(t => (
            <button 
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${activeTab === t ? 'bg-blue-600' : 'text-slate-400 hover:text-white'}`}
            >
              {t === 'tests' ? 'Активные тесты' : t === 'create-test' ? 'Конструктор' : 'Ученики'}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* TAB: LIST TESTS */}
          {activeTab === 'tests' && (
            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
              <h2 className="text-2xl font-black mb-8 italic uppercase">Управление тестами</h2>
              <div className="space-y-4">
                {tests.map(test => (
                  <div key={test.id} className="p-6 bg-slate-50 rounded-[2rem] flex justify-between items-center group hover:bg-white hover:shadow-xl transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center font-black text-blue-600 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">#{test.id}</div>
                      <div>
                        <h3 className="font-black text-slate-800 uppercase italic text-sm">{test.title || "Без названия"}</h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{test.tasks?.length || 0} заданий в тесте</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="p-3 bg-white text-slate-400 hover:text-blue-600 rounded-xl shadow-sm"><Eye size={18}/></button>
                      <button onClick={() => axios.delete(`/api/teacher/tests/${test.id}`).then(fetchData)} className="p-3 bg-white text-red-400 hover:bg-red-50 rounded-xl shadow-sm"><Trash2 size={18}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: CONSTRUCTOR */}
          {activeTab === 'create-test' && (
            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
              <h2 className="text-2xl font-black mb-8 italic uppercase text-blue-600">Сборка теста</h2>
              <input 
                className="w-full p-5 bg-slate-50 rounded-2xl mb-6 font-bold outline-none ring-blue-500/10 focus:ring-4"
                placeholder="НАЗВАНИЕ ТЕСТА..."
                value={testTitle}
                onChange={e => setTestTitle(e.target.value)}
              />
              <div className="grid gap-2 max-h-[400px] overflow-y-auto mb-6 pr-2">
                {bank.map(task => (
                  <div 
                    key={task.id}
                    onClick={() => setSelectedTasks(prev => prev.includes(task.id) ? prev.filter(i => i !== task.id) : [...prev, task.id])}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex justify-between items-center ${selectedTasks.includes(task.id) ? 'border-blue-600 bg-blue-50' : 'border-slate-100 hover:border-slate-200'}`}
                  >
                    <div className="text-[11px] font-bold text-slate-600">
                      <span className="bg-white px-2 py-1 rounded-md mr-2">Тема {task.topic_number}</span>
                      {task.content.substring(0, 60)}...
                    </div>
                    {selectedTasks.includes(task.id) && <CheckCircle size={16} className="text-blue-600" />}
                  </div>
                ))}
              </div>
              <button onClick={createNewTest} className="w-full py-5 bg-slate-950 text-white rounded-2xl font-black uppercase text-xs hover:bg-blue-600 transition-all">Создать и Опубликовать</button>
            </div>
          )}
        </div>
        
        {/* STATS SIDEBAR */}
        <aside className="bg-white p-8 rounded-[3rem] border border-slate-100 h-fit">
          <h3 className="font-black text-xs uppercase mb-6 flex items-center gap-2"><Users size={16} className="text-blue-600"/> Топ учеников</h3>
          <div className="space-y-4">
            {students.slice(0, 5).map(s => (
              <div key={s.id} className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-slate-700 uppercase">{s.name}</span>
                <span className="text-blue-600 font-black text-xs">{s.avgScore}%</span>
              </div>
            ))}
          </div>
        </aside>
      </main>
    </div>
  );
}