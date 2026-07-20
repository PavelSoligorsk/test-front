import React, { useState } from 'react';
import { Search, ArrowRight } from 'lucide-react';

export default function StudentsTab({ students, navigate }) {
  const [studentSearch, setStudentSearch] = useState('');
  const filteredStudents = students.filter((s) =>
    `${s.first_name} ${s.last_name} ${s.username}`.toLowerCase().includes(studentSearch.toLowerCase())
  );

  return (
    <div className="bg-white rounded-[3rem] shadow-xl border border-slate-200 overflow-hidden">
      <div className="p-6 md:p-10 bg-slate-50/50 border-b border-slate-100">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-black italic uppercase text-slate-950">Мои ученики</h2>
          <span className="text-[10px] font-black text-white bg-emerald-600 px-4 py-1.5 rounded-full uppercase">{filteredStudents.length} учеников</span>
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          <input type="text" placeholder="Поиск по имени..." className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-2xl font-bold text-sm outline-none"
            value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
              <th className="p-4 md:p-8">Ученик</th>
              <th className="p-4 md:p-8">Контакты</th>
              <th className="p-4 md:p-8 text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student) => (
              <tr key={student.id} className="border-t border-slate-50 hover:bg-slate-50/50 transition-all">
                <td className="p-4 md:p-8">
                  <div className="font-black text-slate-800 uppercase text-sm">{student.first_name} {student.last_name}</div>
                  <div className="text-[10px] text-emerald-600 font-bold">@{student.username}</div>
                </td>
                <td className="p-4 md:p-8">
                  {student.tg_username ? <span className="text-xs text-blue-500 font-bold">{student.tg_username}</span> : <span className="text-xs text-slate-300">—</span>}
                </td>
                <td className="p-4 md:p-8 text-right">
                  <button onClick={() => navigate(`/teacher/students/${student.id}`)}
                    className="p-2 hover:bg-emerald-50 rounded-xl text-slate-400 hover:text-emerald-600 transition-all">
                    <ArrowRight size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
