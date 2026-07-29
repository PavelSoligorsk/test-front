import React, { useState, useEffect, useCallback } from 'react';
import {
  XCircle,
  PlusCircle,
  Loader2,
  Repeat,
  User,
  Users,
  Power,
  PowerOff,
  Pencil,
  Trash2,
  Clock,
  CreditCard,
} from 'lucide-react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { teacherApi } from '../../features/teacher/api';
import CreateScheduleModal from './CreateScheduleModal';

dayjs.extend(utc);

// Format price: kopecks → rubles for display
function formatPrice(kopecks) {
  if (kopecks == null) return '—';
  return `${(kopecks / 100).toFixed(2)} BYN`;
}

const DAY_CODES = [
  { code: 'mon', label: 'Пн' },
  { code: 'tue', label: 'Вт' },
  { code: 'wed', label: 'Ср' },
  { code: 'thu', label: 'Чт' },
  { code: 'fri', label: 'Пт' },
  { code: 'sat', label: 'Сб' },
  { code: 'sun', label: 'Вс' },
];

export default function SchedulesListModal({ students, groups, onClose, onUpdated }) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  // Editing state: schedule.id → form data
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editDays, setEditDays] = useState([]);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await teacherApi.getSchedules();
      setSchedules(res.data || []);
    } catch {
      setError('Не удалось загрузить расписания');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  const getStudentName = (studentId) => {
    if (!studentId) return null;
    const s = students.find((x) => x.id === studentId);
    return s ? `${s.first_name || ''} ${s.last_name || ''}`.trim() : `ID: ${studentId}`;
  };

  const getGroupName = (groupId) => {
    if (!groupId) return null;
    const g = groups.find((x) => x.id === groupId);
    return g?.name || `ID: ${groupId}`;
  };

  // Start editing a schedule
  const startEdit = (s) => {
    setEditingId(s.id);
    setEditForm({
      title: s.title || '',
      description: s.description || '',
      time_start: s.time_start || '',
      duration_minutes: s.duration_minutes || 60,
      price_per_lesson: s.price_per_lesson != null ? (s.price_per_lesson / 100) : '',
      recur_until: s.recur_until || '',
    });
    setEditDays(s.days_of_week || []);
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
    setEditDays([]);
  };

  const toggleEditDay = (code) => {
    setEditDays((prev) =>
      prev.includes(code) ? prev.filter((d) => d !== code) : [...prev, code]
    );
  };

  // Save edited schedule
  const handleSaveEdit = async (scheduleId) => {
    if (!editForm.title?.trim()) { setError('Название обязательно'); return; }
    if (editDays.length === 0) { setError('Выберите хотя бы один день'); return; }
    setActionLoading(`edit-${scheduleId}`);
    setError(null);
    try {
      const body = {
        ...editForm,
        days_of_week: editDays,
        duration_minutes: Number(editForm.duration_minutes) || 60,
        price_per_lesson: editForm.price_per_lesson != null && editForm.price_per_lesson !== '' ? Math.round(Number(editForm.price_per_lesson) * 100) : null,
        recur_until: editForm.recur_until
          ? dayjs.utc(editForm.recur_until).format('YYYY-MM-DDTHH:mm:ss')
          : null,
      };
      // Remove empty strings for optional fields
      if (!body.description) body.description = undefined;
      if (!body.recur_until) body.recur_until = null;

      const res = await teacherApi.updateSchedule(scheduleId, body);
      setSchedules((prev) => prev.map((s) => (s.id === scheduleId ? res.data : s)));
      setSuccess('Расписание обновлено');
      cancelEdit();
      onUpdated?.();
    } catch (e) {
      setError(e.response?.data?.detail || 'Ошибка при обновлении');
    } finally {
      setActionLoading(null);
    }
  };

  // Toggle active/inactive
  const handleToggle = async (scheduleId, currentActive) => {
    setActionLoading(`toggle-${scheduleId}`);
    setError(null);
    try {
      const res = await teacherApi.toggleSchedule(scheduleId, !currentActive);
      setSchedules((prev) => prev.map((s) => (s.id === scheduleId ? res.data : s)));
      setSuccess(currentActive ? 'Расписание остановлено' : 'Расписание включено');
      onUpdated?.();
    } catch (e) {
      setError(e.response?.data?.detail || 'Ошибка');
    } finally {
      setActionLoading(null);
    }
  };

  // Delete schedule
  const handleDelete = async (scheduleId) => {
    if (!confirm('Удалить расписание? Занятия останутся без привязки к расписанию.')) return;
    setActionLoading(`delete-${scheduleId}`);
    setError(null);
    try {
      await teacherApi.deleteSchedule(scheduleId);
      setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
      setSuccess('Расписание удалено');
      onUpdated?.();
    } catch (e) {
      setError(e.response?.data?.detail || 'Ошибка при удалении');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreated = () => {
    setShowCreate(false);
    fetchSchedules();
    onUpdated?.();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-[2rem] shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-t-[2rem]">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <Repeat size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase">Расписания</h3>
                  <p className="text-emerald-200 text-[10px] font-bold uppercase mt-1">
                    Управление повторяющимися занятиями
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl">
                <XCircle size={22} />
              </button>
            </div>
          </div>

          {/* Alerts */}
          {(error || success) && (
            <div className="mx-6 mt-3 space-y-2">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-xs font-bold text-red-600">{error}</p>
                </div>
              )}
              {success && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <p className="text-xs font-bold text-emerald-600">{success}</p>
                </div>
              )}
            </div>
          )}

          {/* Toolbar */}
          <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase">
              {schedules.length} расписаний
            </span>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase transition-all shadow-lg shadow-emerald-200"
            >
              <PlusCircle size={14} />
              Создать
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin text-emerald-500" />
                <span className="ml-2 text-sm font-bold text-slate-500">Загрузка...</span>
              </div>
            ) : schedules.length === 0 ? (
              <div className="text-center py-12">
                <Repeat size={48} className="mx-auto text-slate-200 mb-4" />
                <p className="text-sm font-bold text-slate-400">Нет расписаний</p>
                <p className="text-xs text-slate-400 mt-1">Создайте первое расписание, чтобы занятия генерировались автоматически</p>
                <button
                  onClick={() => setShowCreate(true)}
                  className="mt-4 px-4 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase hover:bg-emerald-600 inline-flex items-center gap-1.5"
                >
                  <PlusCircle size={14} /> Создать расписание
                </button>
              </div>
            ) : (
              schedules.map((s) => {
                const isEditing = editingId === s.id;
                const isBusy = actionLoading === `edit-${s.id}` || actionLoading === `toggle-${s.id}` || actionLoading === `delete-${s.id}`;

                return (
                  <div
                    key={s.id}
                    className={`bg-slate-50 rounded-2xl border transition-all ${
                      s.is_active ? 'border-emerald-200' : 'border-gray-200 opacity-70'
                    }`}
                  >
                    {isEditing ? (
                      /* ── Edit form ── */
                      <div className="p-4 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="text-[8px] font-black text-slate-400 uppercase">Название</label>
                            <input
                              type="text"
                              value={editForm.title || ''}
                              onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                              className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-200"
                            />
                          </div>
                          <div>
                            <label className="text-[8px] font-black text-slate-400 uppercase">Описание</label>
                            <input
                              type="text"
                              value={editForm.description || ''}
                              onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                              className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs outline-none"
                            />
                          </div>
                        </div>

                        {/* Days */}
                        <div>
                          <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Дни недели</label>
                          <div className="flex flex-wrap gap-1">
                            {DAY_CODES.map((day) => (
                              <button
                                key={day.code}
                                type="button"
                                onClick={() => toggleEditDay(day.code)}
                                className={`w-8 h-8 rounded-lg text-[9px] font-black uppercase transition-all ${
                                  editDays.includes(day.code)
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-white border border-slate-200 text-slate-500'
                                }`}
                              >
                                {day.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                          <div>
                            <label className="text-[8px] font-black text-slate-400 uppercase">Время</label>
                            <input
                              type="time"
                              value={editForm.time_start || ''}
                              onChange={(e) => setEditForm((f) => ({ ...f, time_start: e.target.value }))}
                              className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[8px] font-black text-slate-400 uppercase">Мин</label>
                            <input
                              type="number"
                              value={editForm.duration_minutes || 60}
                              onChange={(e) => setEditForm((f) => ({ ...f, duration_minutes: Number(e.target.value) }))}
                              className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[8px] font-black text-slate-400 uppercase">Цена ₽</label>
                            <input
                              type="number"
                              value={editForm.price_per_lesson != null ? editForm.price_per_lesson : ''}
                              onChange={(e) => setEditForm((f) => ({ ...f, price_per_lesson: e.target.value }))}
                              className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[8px] font-black text-slate-400 uppercase">Повтор до</label>
                            <input
                              type="datetime-local"
                              value={editForm.recur_until || ''}
                              onChange={(e) => setEditForm((f) => ({ ...f, recur_until: e.target.value }))}
                              className="w-full p-2 bg-white border border-slate-200 rounded-xl text-[10px] outline-none"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={cancelEdit}
                            disabled={isBusy}
                            className="flex-1 p-2 bg-slate-100 rounded-xl text-xs font-black text-slate-500 hover:bg-slate-200 disabled:opacity-50"
                          >
                            Отмена
                          </button>
                          <button
                            onClick={() => handleSaveEdit(s.id)}
                            disabled={isBusy}
                            className="flex-1 p-2 bg-emerald-500 text-white rounded-xl text-xs font-black hover:bg-emerald-600 disabled:opacity-50 flex items-center justify-center gap-1"
                          >
                            {isBusy ? <Loader2 size={12} className="animate-spin" /> : null}
                            Сохранить
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ── View card ── */
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            {/* Title + status badge */}
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h4 className="text-sm font-black text-slate-800 truncate">{s.title}</h4>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${
                                  s.is_active
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-gray-200 text-gray-500'
                                }`}
                              >
                                {s.is_active ? 'Активно' : 'Остановлено'}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase bg-slate-200 text-slate-600">
                                {s.schedule_type === 'group' ? 'Группа' : 'Индивид.'}
                              </span>
                            </div>

                            {/* Description */}
                            {s.description && (
                              <p className="text-[10px] text-slate-500 italic mb-1.5">{s.description}</p>
                            )}

                            {/* Student / Group */}
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1">
                              {s.schedule_type === 'individual' ? (
                                <User size={12} className="text-slate-400 shrink-0" />
                              ) : (
                                <Users size={12} className="text-slate-400 shrink-0" />
                              )}
                              <span className="font-bold text-slate-700">
                                {s.schedule_type === 'individual'
                                  ? getStudentName(s.student_id)
                                  : getGroupName(s.group_id)}
                              </span>
                            </div>

                            {/* Days pills */}
                            <div className="flex items-center gap-1 mb-1.5 flex-wrap">
                              <span className="text-[8px] text-slate-400 font-bold uppercase mr-1">Дни:</span>
                              {s.days_of_week?.map((d) => (
                                <span
                                  key={d}
                                  className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[8px] font-black uppercase text-slate-600"
                                >
                                  {DAY_CODES.find((x) => x.code === d)?.label || d}
                                </span>
                              ))}
                            </div>

                            {/* Time / duration / price */}
                            <div className="flex items-center gap-3 text-[10px] text-slate-500 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Clock size={10} /> {s.time_start}
                              </span>
                              <span>{s.duration_minutes} мин</span>
                              <span className="flex items-center gap-1">
                                <CreditCard size={10} /> {s.price_per_lesson != null ? formatPrice(s.price_per_lesson) : '—'}
                              </span>
                            </div>

                            {/* Recur until */}
                            {s.recur_until && (
                              <div className="text-[9px] text-slate-400 mt-1">
                                Повторять до: <span className="font-bold text-slate-600">
                                  {dayjs.utc(s.recur_until).format('DD.MM.YYYY')}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-1 shrink-0">
                            <button
                              onClick={() => startEdit(s)}
                              disabled={isBusy}
                              className="p-2 bg-slate-200 hover:bg-slate-300 rounded-xl text-slate-600 disabled:opacity-50"
                              title="Редактировать"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => handleToggle(s.id, s.is_active)}
                              disabled={actionLoading === `toggle-${s.id}`}
                              className={`p-2 rounded-xl disabled:opacity-50 ${
                                s.is_active
                                  ? 'bg-amber-100 hover:bg-amber-200 text-amber-700'
                                  : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700'
                              }`}
                              title={s.is_active ? 'Остановить' : 'Включить'}
                            >
                              {actionLoading === `toggle-${s.id}` ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : s.is_active ? (
                                <PowerOff size={14} />
                              ) : (
                                <Power size={14} />
                              )}
                            </button>
                            <button
                              onClick={() => handleDelete(s.id)}
                              disabled={actionLoading === `delete-${s.id}`}
                              className="p-2 bg-red-50 hover:bg-red-100 rounded-xl text-red-500 disabled:opacity-50"
                              title="Удалить"
                            >
                              {actionLoading === `delete-${s.id}` ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Trash2 size={14} />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-100">
            <button
              onClick={onClose}
              className="w-full p-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all"
            >
              ЗАКРЫТЬ
            </button>
          </div>
        </div>
      </div>

      {/* Create modal (nested) */}
      {showCreate && (
        <CreateScheduleModal
          students={students}
          groups={groups}
          defaultDate={null}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </>
  );
}
