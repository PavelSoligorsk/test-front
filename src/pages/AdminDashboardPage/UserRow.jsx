import React, { useState } from 'react';
import axios from 'axios';
import { Search, XCircle, UserPlus, UserX } from 'lucide-react';
import { API_BASE } from './constants';
import { getAuthHeaders, assignStudentToTeacher, removeStudentFromTeacher, changeUserRole, deleteUser } from './api';

export default function UserRow({ user, users, navigate, onUsersUpdate }) {
  const [showTeacherSelect, setShowTeacherSelect] = useState(false);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [teacherInfo, setTeacherInfo] = useState(user.teacher || null);

  const availableTeachers = users.filter(u =>
    u.role === 'teacher' &&
    `${u.first_name} ${u.last_name}`.toLowerCase().includes(teacherSearch.toLowerCase())
  );

  const handleAssignTeacher = async (teacherId) => {
    try {
      await assignStudentToTeacher(teacherId, user.id);
      const teacher = users.find(t => t.id === teacherId);
      setTeacherInfo(teacher ? { id: teacher.id, first_name: teacher.first_name, last_name: teacher.last_name, username: teacher.username } : null);
      setShowTeacherSelect(false);
      setTeacherSearch('');
    } catch (e) { alert('Ошибка при назначении преподавателя'); }
  };

  const handleRemoveTeacher = async () => {
    if (!confirm('Открепить преподавателя?')) return;
    try {
      await removeStudentFromTeacher(user.id);
      setTeacherInfo(null);
    } catch (e) { alert('Ошибка при откреплении преподавателя'); }
  };

  const handleChangeRoleClick = async (e) => {
    e.stopPropagation();
    const roles = ['student', 'teacher', 'admin'];
    const nextRole = roles[(roles.indexOf(user.role) + 1) % roles.length];
    try {
      await changeUserRole(user.id, nextRole);
      if (onUsersUpdate) onUsersUpdate();
    } catch (error) { console.error(error); }
  };

  const handleDeleteUserClick = async (e) => {
    if (!confirm('Удалить пользователя навсегда?')) return;
    e.stopPropagation();
    try {
      await deleteUser(user.id);
      if (onUsersUpdate) onUsersUpdate();
    } catch (error) { alert('Ошибка при удалении'); }
  };

  return (
    <tr className="border-t border-slate-50 hover:bg-slate-50/50 transition-all group">
      <td className="p-4 sm:p-8 cursor-pointer" onClick={() => navigate(`/admin/users/${user.id}`)}>
        <div className="font-black text-slate-800 uppercase tracking-tighter text-sm sm:text-base group-hover:text-blue-600 transition-colors">
          {user.first_name} {user.last_name}
        </div>
        <div className="text-[10px] text-blue-500 font-bold">@{user.username}</div>
      </td>
      <td className="p-4 sm:p-8">
        <button onClick={handleChangeRoleClick}
          className={`px-3 sm:px-4 py-1.5 rounded-full font-black text-[9px] uppercase border transition-all ${
            user.role === 'admin' ? 'bg-purple-50 text-purple-600 border-purple-100' :
            user.role === 'teacher' ? 'bg-blue-50 text-blue-600 border-blue-100' :
            'bg-slate-50 text-slate-400'
          }`}>
          {user.role}
        </button>
      </td>
      <td className="p-4 sm:p-8">
        {user.role === 'student' ? (
          <div className="relative">
            {teacherInfo ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">{teacherInfo.first_name} {teacherInfo.last_name}</span>
                <button onClick={handleRemoveTeacher} className="text-slate-300 hover:text-red-500 transition-colors" title="Открепить">
                  <XCircle size={14} />
                </button>
              </div>
            ) : (
              <button onClick={() => setShowTeacherSelect(!showTeacherSelect)}
                className="text-[9px] font-black text-blue-500 hover:text-blue-700 uppercase flex items-center gap-1">
                <UserPlus size={12} /> Назначить
              </button>
            )}
            {showTeacherSelect && (
              <div className="absolute top-full left-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 w-64 p-3">
                <div className="relative mb-2">
                  <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input type="text" placeholder="Поиск преподавателя..." value={teacherSearch}
                    onChange={(e) => setTeacherSearch(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none" autoFocus
                    onClick={(e) => e.stopPropagation()} />
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {availableTeachers.length > 0 ? availableTeachers.map(teacher => (
                    <button key={teacher.id} onClick={(e) => { e.stopPropagation(); handleAssignTeacher(teacher.id); }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 text-xs font-bold text-slate-700 hover:text-blue-600 transition-all">
                      {teacher.first_name} {teacher.last_name}
                    </button>
                  )) : <p className="text-[10px] text-slate-400 text-center py-2">{teacherSearch ? 'Не найдено' : 'Нет преподавателей'}</p>}
                </div>
                <button onClick={(e) => { e.stopPropagation(); setShowTeacherSelect(false); }}
                  className="w-full mt-2 text-[9px] font-black text-slate-400 hover:text-slate-600 uppercase text-center">Отмена</button>
              </div>
            )}
          </div>
        ) : (<span className="text-xs text-slate-300">—</span>)}
      </td>
      <td className="p-4 sm:p-8 text-right">
        <button onClick={handleDeleteUserClick} className="p-2 sm:p-3 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
          <UserX size={18} className="sm:w-5 sm:h-5" />
        </button>
      </td>
    </tr>
  );
}
