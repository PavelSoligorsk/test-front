import React, { useState } from 'react';
import { Search, XCircle, UserPlus, UserX } from 'lucide-react';
import { assignStudentToTeacher, removeStudentFromTeacher, changeUserRole, deleteUser } from './api';
import { useAdminWorkspace } from './AdminWorkspace';
import { fieldClass } from '../../shared/ui';

export default function UserRow({ user, users, navigate, onUsersUpdate }) {
  const { showError, showSuccess } = useAdminWorkspace();
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
      showSuccess('Преподаватель назначен');
    } catch (e) {
      showError(e, 'Ошибка при назначении преподавателя');
    }
  };

  const handleRemoveTeacher = async () => {
    if (!confirm('Открепить преподавателя?')) return;
    try {
      await removeStudentFromTeacher(user.id);
      setTeacherInfo(null);
      showSuccess('Преподаватель откреплён');
    } catch (e) {
      showError(e, 'Ошибка при откреплении преподавателя');
    }
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
      showSuccess('Пользователь удалён');
    } catch (error) {
      showError(error, 'Ошибка при удалении');
    }
  };

  const roleClass =
    user.role === 'admin'
      ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 border-transparent'
      : user.role === 'teacher'
        ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800'
        : 'bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 border-zinc-200 dark:border-zinc-800';

  return (
    <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors group">
      <td className="px-6 md:px-8 py-4 cursor-pointer" onClick={() => navigate(`/admin/users/${user.id}`)}>
        <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-black dark:group-hover:text-white transition-colors">
          {user.first_name} {user.last_name}
        </div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">@{user.username}</div>
      </td>
      <td className="px-6 md:px-8 py-4">
        <button type="button" onClick={handleChangeRoleClick}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${roleClass}`}>
          {user.role}
        </button>
      </td>
      <td className="px-6 md:px-8 py-4">
        {user.role === 'student' ? (
          <div className="relative">
            {teacherInfo ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {teacherInfo.first_name} {teacherInfo.last_name}
                </span>
                <button type="button" onClick={handleRemoveTeacher}
                  className="text-zinc-400 hover:text-red-600 transition-colors" title="Открепить">
                  <XCircle size={14} />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setShowTeacherSelect(!showTeacherSelect)}
                className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1 transition-colors">
                <UserPlus size={12} /> Назначить
              </button>
            )}
            {showTeacherSelect && (
              <div className="absolute top-full left-0 mt-2 bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm z-50 w-64 p-3">
                <div className="relative mb-2">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input type="text" placeholder="Поиск преподавателя..." value={teacherSearch}
                    onChange={(e) => setTeacherSearch(e.target.value)}
                    className={`${fieldClass} pl-7 py-2 text-xs`} autoFocus
                    onClick={(e) => e.stopPropagation()} />
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {availableTeachers.length > 0 ? availableTeachers.map(teacher => (
                    <button key={teacher.id} type="button"
                      onClick={(e) => { e.stopPropagation(); handleAssignTeacher(teacher.id); }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900 text-sm font-medium text-zinc-700 dark:text-zinc-300 transition-colors">
                      {teacher.first_name} {teacher.last_name}
                    </button>
                  )) : (
                    <p className="text-xs text-zinc-400 text-center py-2">
                      {teacherSearch ? 'Не найдено' : 'Нет преподавателей'}
                    </p>
                  )}
                </div>
                <button type="button" onClick={(e) => { e.stopPropagation(); setShowTeacherSelect(false); }}
                  className="w-full mt-2 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 text-center">
                  Отмена
                </button>
              </div>
            )}
          </div>
        ) : (<span className="text-sm text-zinc-400">—</span>)}
      </td>
      <td className="px-6 md:px-8 py-4 text-right">
        <button type="button" onClick={handleDeleteUserClick}
          className="p-2 text-zinc-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors">
          <UserX size={18} />
        </button>
      </td>
    </tr>
  );
}
