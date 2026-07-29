import React, { useState } from 'react';
import {
  XCircle,
  CalendarDays,
  Clock,
  User,
  Users,
  Repeat,
  PlusCircle,
  Loader2,
  CheckSquare,
  Square,
  Search,
} from 'lucide-react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { teacherApi } from '../../features/teacher/api';

dayjs.extend(utc);

const DAY_CODES = [
  { code: 'mon', label: 'Пн' },
  { code: 'tue', label: 'Вт' },
  { code: 'wed', label: 'Ср' },
  { code: 'thu', label: 'Чт' },
  { code: 'fri', label: 'Пт' },
  { code: 'sat', label: 'Сб' },
  { code: 'sun', label: 'Вс' },
];

const MODE_OPTIONS = [
  { id: 'schedule', label: 'Регулярное расписание', icon: Repeat },
  { id: 'lesson', label: 'Разовое занятие', icon: CalendarDays },
];

export default function CreateScheduleModal({ students, groups, defaultDate, onClose, onCreated }) {
  const [mode, setMode] = useState('schedule');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form state — common
  const [title, setTitle] = useState('');
  const [lessonType, setLessonType] = useState('individual'); // 'individual' | 'group'
  const [studentId, setStudentId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [duration, setDuration] = useState(60);
  const [price, setPrice] = useState('');

  // Student/group search
  const [studentSearch, setStudentSearch] = useState('');
  const [groupSearch, setGroupSearch] = useState('');

  // Schedule-specific
  const [daysOfWeek, setDaysOfWeek] = useState([]);
  const [timeStart, setTimeStart] = useState('16:00');
  const [description, setDescription] = useState('');
  const [recurUntil, setRecurUntil] = useState(''); // NULL = бессрочно

  // Lesson-specific
  const [scheduledDate, setScheduledDate] = useState(defaultDate || '');
  const [teacherNote, setTeacherNote] = useState('');

  const toggleDay = (code) => {
    setDaysOfWeek((prev) =>
      prev.includes(code) ? prev.filter((d) => d !== code) : [...prev, code]
    );
  };

  const filteredStudents = students.filter((s) =>
    `${s.first_name} ${s.last_name} ${s.username}`.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(groupSearch.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) { setError('Укажите название'); return; }

    if (mode === 'schedule') {
      if (daysOfWeek.length === 0) { setError('Выберите хотя бы один день недели'); return; }
      if (!timeStart) { setError('Укажите время начала'); return; }

      const body = {
        title: title.trim(),
        description: description.trim() || undefined,
        schedule_type: lessonType,
        days_of_week: daysOfWeek,
        time_start: timeStart,
        duration_minutes: Number(duration) || 60,
        price_per_lesson: price ? Math.round(Number(price) * 100) : 0,
        recur_until: recurUntil ? dayjs.utc(recurUntil).format('YYYY-MM-DDTHH:mm:ss') : null,
      };

      if (lessonType === 'individual') {
        if (!studentId) { setError('Выберите ученика'); return; }
        body.student_id = Number(studentId);
        body.group_id = null;
      } else {
        if (!groupId) { setError('Выберите группу'); return; }
        body.group_id = Number(groupId);
        body.student_id = null;
      }

      setLoading(true);
      try {
        await teacherApi.createSchedule(body);
        onCreated?.();
      } catch (e) {
        setError(e.response?.data?.detail || 'Ошибка при создании расписания');
      } finally {
        setLoading(false);
      }
    } else {
      // One-time lesson
      if (!studentId) { setError('Выберите ученика'); return; }
      if (!scheduledDate) { setError('Укажите дату занятия'); return; }

      const body = {
        title: title.trim(),
        lesson_type: 'individual',
        student_id: Number(studentId),
        scheduled_date: dayjs.utc(scheduledDate).format('YYYY-MM-DDTHH:mm:ss'),
        duration_minutes: Number(duration) || 60,
        teacher_note: teacherNote.trim() || undefined,
      };

      setLoading(true);
      try {
        await teacherApi.createLesson(body);
        onCreated?.();
      } catch (e) {
        setError(e.response?.data?.detail || 'Ошибка при создании занятия');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-t-[2rem]">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <PlusCircle size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase">Новое занятие</h3>
                <p className="text-emerald-200 text-[10px] font-bold uppercase mt-1">
                  Создать расписание или разовое занятие
                </p>
              </div>
            </div>
            <button onClick={onClose} disabled={loading} className="p-2 hover:bg-white/10 rounded-xl">
              <XCircle size={22} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {/* Mode toggle */}
          <div className="p-4 bg-slate-50 border-b border-slate-100">
            <div className="flex gap-2">
              {MODE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setMode(opt.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                    mode === opt.id
                      ? 'bg-emerald-500 text-white shadow-lg'
                      : 'bg-white text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <opt.icon size={14} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Form body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-xs font-bold text-red-600">{error}</p>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Название *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например: Математика 11 класс"
                className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </div>

            {/* Type: individual / group */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase block mb-2">Тип занятия</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setLessonType('individual'); setGroupId(''); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                    lessonType === 'individual'
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  <User size={14} />
                  Индивидуальное
                </button>
                <button
                  type="button"
                  onClick={() => { setLessonType('group'); setStudentId(''); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                    lessonType === 'group'
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  <Users size={14} />
                  Групповое
                </button>
              </div>
            </div>

            {/* Student selection (individual) */}
            {lessonType === 'individual' && (
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Ученик *</label>
                <div className="relative mb-2">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    type="text"
                    placeholder="Поиск ученика..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1">
                  {filteredStudents.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStudentId(s.id === studentId ? '' : s.id)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all ${
                        studentId === s.id
                          ? 'bg-emerald-50 border border-emerald-200'
                          : 'bg-slate-50 hover:bg-slate-100 border border-transparent'
                      }`}
                    >
                      {studentId === s.id ? (
                        <CheckSquare size={16} className="text-emerald-600 shrink-0" />
                      ) : (
                        <Square size={16} className="text-slate-300 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-800">{s.first_name} {s.last_name}</div>
                        <div className="text-[10px] text-slate-400">@{s.username}</div>
                      </div>
                    </button>
                  ))}
                  {filteredStudents.length === 0 && (
                    <p className="text-xs text-slate-400 italic text-center py-3">Ничего не найдено</p>
                  )}
                </div>
              </div>
            )}

            {/* Group selection (group) */}
            {lessonType === 'group' && (
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Группа *</label>
                <div className="relative mb-2">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    type="text"
                    placeholder="Поиск группы..."
                    value={groupSearch}
                    onChange={(e) => setGroupSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1">
                  {filteredGroups.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setGroupId(g.id === groupId ? '' : g.id)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all ${
                        groupId === g.id
                          ? 'bg-emerald-50 border border-emerald-200'
                          : 'bg-slate-50 hover:bg-slate-100 border border-transparent'
                      }`}
                    >
                      {groupId === g.id ? (
                        <CheckSquare size={16} className="text-emerald-600 shrink-0" />
                      ) : (
                        <Square size={16} className="text-slate-300 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-800">{g.name}</div>
                      </div>
                    </button>
                  ))}
                  {filteredGroups.length === 0 && (
                    <p className="text-xs text-slate-400 italic text-center py-3">Ничего не найдено</p>
                  )}
                </div>
              </div>
            )}

            {/* Schedule-specific fields */}
            {mode === 'schedule' && (
              <>
                {/* Days of week */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-2">Дни недели *</label>
                  <div className="flex flex-wrap gap-1.5">
                    {DAY_CODES.map((day) => (
                      <button
                        key={day.code}
                        type="button"
                        onClick={() => toggleDay(day.code)}
                        className={`w-10 h-10 rounded-xl text-[10px] font-black uppercase transition-all ${
                          daysOfWeek.includes(day.code)
                            ? 'bg-emerald-500 text-white shadow-lg'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time start */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Время начала *</label>
                  <input
                    type="time"
                    value={timeStart}
                    onChange={(e) => setTimeStart(e.target.value)}
                    className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Описание</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Например: Подготовка к ЕГЭ"
                    className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                </div>

                {/* Recur-until */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">
                    Повторять до <span className="text-slate-300 font-medium">(пусто = бессрочно)</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={recurUntil}
                    onChange={(e) => setRecurUntil(e.target.value)}
                    className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                </div>
              </>
            )}

            {/* Lesson-specific fields */}
            {mode === 'lesson' && (
              <>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Дата и время *</label>
                  <input
                    type="datetime-local"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Заметка</label>
                  <textarea
                    value={teacherNote}
                    onChange={(e) => setTeacherNote(e.target.value)}
                    placeholder="О чём занятие..."
                    rows={2}
                    className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-200 resize-none"
                  />
                </div>
              </>
            )}

            {/* Common fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Длительность (мин)</label>
                <input
                  type="number"
                  min="15"
                  max="300"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value) || 60)}
                  className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Цена (₽)</label>
                <input
                  type="number"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="1500"
                  className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-100 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 p-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-200 disabled:opacity-50"
            >
              ОТМЕНА
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="flex-1 p-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl font-black text-sm hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  СОЗДАНИЕ...
                </>
              ) : (
                <>
                  <PlusCircle size={16} />
                  СОЗДАТЬ
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
