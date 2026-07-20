import React, { useState } from 'react';
import { Search, LayoutDashboard, Users, Send, Edit3, Trash2 } from 'lucide-react';

export default function GroupsTab({ groups, groupForm, setGroupForm, onSubmit, onEdit, onDelete, onManageStudents, onAssignTest, onDetail, navigate }) {
  const [groupSearch, setGroupSearch] = useState('');

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-[2.5rem] p-5 md:p-8 shadow-sm border border-slate-100">
        <h3 className="text-lg font-black text-slate-800 uppercase mb-4">{groupForm.id ? 'Редактировать группу' : 'Создать группу'}</h3>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Название группы</label>
            <input required type="text" value={groupForm.name} onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
              placeholder="9А, Олимпиадники, Отстающие..." className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Описание (опционально)</label>
            <textarea value={groupForm.description} onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
              placeholder="Описание группы..." rows={3} className="w-full p-4 bg-slate-50 rounded-2xl font-medium text-sm outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
          </div>
          <div className="flex gap-3">
            <button type="submit" className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase hover:bg-emerald-700 transition-all">
              {groupForm.id ? 'Обновить' : 'Создать'}
            </button>
            {groupForm.id && (
              <button type="button" onClick={() => setGroupForm({ id: null, name: '', description: '' })}
                className="px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm uppercase hover:bg-slate-200 transition-all">Отмена</button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-[2.5rem] p-5 md:p-8 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black text-slate-800 uppercase">Мои группы</h3>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
            <input type="text" placeholder="Поиск..." value={groupSearch} onChange={(e) => setGroupSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-50 rounded-xl text-xs font-bold outline-none" />
          </div>
        </div>

        {groups.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><LayoutDashboard size={32} className="text-slate-300" /></div>
            <p className="font-black text-slate-400 uppercase">Нет групп</p>
            <p className="text-xs font-bold text-slate-300 mt-1">Создайте группу выше</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.filter((g) => g.name.toLowerCase().includes(groupSearch.toLowerCase())).map((group) => (
              <div key={group.id} className="bg-slate-50 rounded-2xl p-5 border border-slate-100 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div onClick={() => onDetail(group)} className="cursor-pointer hover:text-emerald-600 transition-colors">
                    <h4 className="font-black text-slate-800 text-sm uppercase">{group.name}</h4>
                    {group.description && <p className="text-[10px] text-slate-400 mt-1">{group.description}</p>}
                  </div>
                  <span className="text-[10px] font-black bg-emerald-100 text-emerald-600 px-2 py-1 rounded-lg">{group.students_count || group.students?.length || 0} уч.</span>
                </div>
                {group.students && group.students.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {group.students.slice(0, 5).map((s) => (
                      <span key={s.id} className="text-[9px] bg-white px-2 py-1 rounded-lg text-slate-500 font-bold">{s.first_name} {s.last_name?.charAt(0)}.</span>
                    ))}
                    {group.students.length > 5 && <span className="text-[9px] text-slate-400 font-bold">+{group.students.length - 5}</span>}
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => onManageStudents(group)} className="flex-1 p-2 bg-white text-slate-600 rounded-xl text-[10px] font-black hover:bg-blue-50 hover:text-blue-600 transition-all flex items-center justify-center gap-1"><Users size={12} /> Студенты</button>
                  <button onClick={() => onAssignTest(group)} className="flex-1 p-2 bg-white text-slate-600 rounded-xl text-[10px] font-black hover:bg-emerald-50 hover:text-emerald-600 transition-all flex items-center justify-center gap-1"><Send size={12} /> Тест</button>
                  <button onClick={() => onEdit(group)} className="p-2 bg-white text-slate-400 rounded-xl hover:bg-amber-50 hover:text-amber-600 transition-all"><Edit3 size={12} /></button>
                  <button onClick={() => onDelete(group.id)} className="p-2 bg-white text-slate-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all"><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
