import React, { useState } from 'react';
import { Search, LayoutDashboard, Users, Send, Edit3, Trash2, PlusCircle } from 'lucide-react';

export default function GroupsTab({ groups, onOpenCreate, onEdit, onDelete, onManageStudents, onAssignTest, onDetail, navigate }) {
  const [groupSearch, setGroupSearch] = useState('');

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white dark:bg-slate-800/50 rounded-[2.5rem] p-5 md:p-8 shadow-sm border border-slate-100 dark:border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase">Мои группы</h3>
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenCreate}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 dark:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-all shadow-sm"
            >
              <PlusCircle size={14} />
              Создать
            </button>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-500" />
              <input type="text" placeholder="Поиск..." value={groupSearch} onChange={(e) => setGroupSearch(e.target.value)}
                className="pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500" />
            </div>
          </div>
        </div>

        {groups.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4"><LayoutDashboard size={32} className="text-slate-300 dark:text-slate-500" /></div>
            <p className="font-black text-slate-400 dark:text-slate-400 uppercase">Нет групп</p>
            <p className="text-xs font-bold text-slate-300 dark:text-slate-500 mt-1">Создайте группу выше</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.filter((g) => g.name.toLowerCase().includes(groupSearch.toLowerCase())).map((group) => (
              <div key={group.id} className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-600 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div onClick={() => onDetail(group)} className="cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                    <h4 className="font-black text-slate-800 dark:text-slate-200 text-sm uppercase">{group.name}</h4>
                    {group.description && <p className="text-[10px] text-slate-400 dark:text-slate-400 mt-1">{group.description}</p>}
                  </div>
                  <span className="text-[10px] font-black bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-lg">{group.students_count || group.students?.length || 0} уч.</span>
                </div>
                {group.students && group.students.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {group.students.slice(0, 5).map((s) => (
                      <span key={s.id} className="text-[9px] bg-white dark:bg-slate-700 px-2 py-1 rounded-lg text-slate-500 dark:text-slate-300 font-bold">{s.first_name} {s.last_name?.charAt(0)}.</span>
                    ))}
                    {group.students.length > 5 && <span className="text-[9px] text-slate-400 dark:text-slate-400 font-bold">+{group.students.length - 5}</span>}
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => onManageStudents(group)} className="flex-1 p-2 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-all flex items-center justify-center gap-1"><Users size={12} /> Студенты</button>
                  <button onClick={() => onAssignTest(group)} className="flex-1 p-2 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black hover:bg-emerald-50 dark:hover:bg-emerald-500 hover:text-emerald-600 dark:hover:text-white transition-all flex items-center justify-center gap-1"><Send size={12} /> Тест</button>
                  <button onClick={() => onEdit(group)} className="p-2 bg-white dark:bg-slate-700 text-slate-400 dark:text-slate-400 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:text-amber-600 dark:hover:text-amber-400 transition-all"><Edit3 size={12} /></button>
                  <button onClick={() => onDelete(group.id, group.name)} className="p-2 bg-white dark:bg-slate-700 text-slate-400 dark:text-slate-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 dark:hover:text-red-400 transition-all"><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}