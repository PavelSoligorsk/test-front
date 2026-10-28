import { useState } from 'react';
import {
  XCircle,
  CheckCircle2,
  XCircle as CancelIcon,
  Clock,
  User,
  CreditCard,
  CalendarDays,
  MessageSquare,
  Loader2,
  Pencil,
  Trash2,
  ChevronDown,
} from 'lucide-react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { teacherApi } from '../../features/teacher/api';
import { useConfirm } from '../../shared/ui';
import ScheduleSection from './lesson/ScheduleSection';
import PaymentsSection from './lesson/PaymentsSection';
import ParentsSection from './lesson/ParentsSection';
import { PAYMENT_STATUS_MAP, formatBalance, formatPrice } from './lesson/lessonFormat';

dayjs.extend(utc);

const STATUS_MAP = {
  scheduled: { label: 'Запланировано', color: 'bg-zinc-100 text-zinc-700', icon: CalendarDays },
  completed: { label: 'Проведено', color: 'bg-zinc-100 text-zinc-700', icon: CheckCircle2 },
  cancelled: { label: 'Отменено', color: 'bg-gray-100 text-gray-700', icon: CancelIcon },
  rescheduled: { label: 'Перенесено', color: 'bg-zinc-100 text-zinc-700', icon: Clock },
};

export default function LessonModal({ lesson: initialLesson, students, groups, onClose, onUpdated }) {
  const confirm = useConfirm();
  // Занятие правится тут же после действий; новое от родителя заменяет правки.
  const [lessonSource, setLessonSource] = useState(initialLesson);
  const [lesson, setLesson] = useState(initialLesson);
  if (lessonSource !== initialLesson) {
    setLessonSource(initialLesson);
    setLesson(initialLesson);
  }
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // --- Reschedule ---
  const [showReschedule, setShowReschedule] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');

  // --- Cancel ---
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelNote, setCancelNote] = useState('');

  // --- Edit lesson ---
  const [editingLesson, setEditingLesson] = useState(false);
  const [editLessonForm, setEditLessonForm] = useState({});

  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  // Разделы ниже грузят свои данные сами; оплатам после действий с занятием — новый ключ.
  const [paymentsVersion, setPaymentsVersion] = useState(0);
  const refreshPayments = () => setPaymentsVersion((v) => v + 1);

  const student = students.find((s) => s.id === lesson.student_id);
  const studentName = lesson.student_name || (student ? `${student.first_name || ''} ${student.last_name || ''}`.trim() : `ID: ${lesson.student_id}`);

  const statusInfo = STATUS_MAP[lesson.status] || STATUS_MAP.scheduled;
  const paymentLabel = PAYMENT_STATUS_MAP[lesson.payment_status] || PAYMENT_STATUS_MAP.unpaid;

  const isScheduled = lesson.status === 'scheduled';

  // --- Student balance (server-side, in kopecks) ---
  const studentBalance = lesson.student_balance;


  // --- Lesson actions ---
  const handleComplete = async () => {
    setActionLoading('complete'); setError(null);
    try {
      const res = await teacherApi.completeLesson(lesson.id);
      setLesson(res.data);
      setSuccess('Занятие завершено');
      refreshPayments();
      onUpdated?.();
    } catch (e) { setError(e.response?.data?.detail || 'Ошибка при завершении занятия'); }
    finally { setActionLoading(null); }
  };

  const handleCancel = async () => {
    setActionLoading('cancel'); setError(null);
    try {
      const res = await teacherApi.cancelLesson(lesson.id, cancelNote || undefined);
      setLesson(res.data);
      setShowCancelConfirm(false);
      setCancelNote('');
      setSuccess('Занятие отменено');
      onUpdated?.();
    } catch (e) { setError(e.response?.data?.detail || 'Ошибка при отмене занятия'); }
    finally { setActionLoading(null); }
  };

  const handleReschedule = async () => {
    if (!newDate) { setError('Укажите новую дату'); return; }
    setActionLoading('reschedule'); setError(null);
    try {
      const res = await teacherApi.rescheduleLesson(lesson.id, {
        new_date: dayjs.utc(newDate).format('YYYY-MM-DDTHH:mm:ss'),
        reason: rescheduleReason || undefined,
      });
      // API returns the NEW lesson
      setLesson(res.data);
      setShowReschedule(false);
      setNewDate('');
      setRescheduleReason('');
      setSuccess('Занятие перенесено');
      onUpdated?.();
    } catch (e) { setError(e.response?.data?.detail || 'Ошибка при переносе занятия'); }
    finally { setActionLoading(null); }
  };

  const handleDeleteLesson = async () => {
    if (!(await confirm('Удалить это занятие? Действие необратимо.', { danger: true, confirmLabel: 'Удалить' }))) return;
    setActionLoading('delete'); setError(null);
    try {
      await teacherApi.deleteLesson(lesson.id);
      setSuccess('Занятие удалено');
      onUpdated?.();
      onClose?.();
    } catch (e) { setError(e.response?.data?.detail || 'Ошибка при удалении занятия'); }
    finally { setActionLoading(null); }
  };

  // --- Edit lesson ---
  const startEditLesson = () => {
    setEditingLesson(true);
    setEditLessonForm({
      title: lesson.title || '',
      scheduled_date: lesson.scheduled_date ? dayjs.utc(lesson.scheduled_date).format('YYYY-MM-DDTHH:mm') : '',
      duration_minutes: lesson.duration_minutes || 60,
      teacher_note: lesson.teacher_note || '',
      price_per_lesson: lesson.price_per_lesson != null ? String(lesson.price_per_lesson / 100) : '',
    });
    setError(null);
  };

  const handleSaveLesson = async () => {
    if (!editLessonForm.title?.trim()) { setError('Название обязательно'); return; }
    if (!editLessonForm.scheduled_date) { setError('Укажите дату'); return; }
    setActionLoading('edit-lesson'); setError(null);
    try {
      const body = {
        title: editLessonForm.title.trim(),
        scheduled_date: dayjs.utc(editLessonForm.scheduled_date).format('YYYY-MM-DDTHH:mm:ss'),
        duration_minutes: Number(editLessonForm.duration_minutes) || 60,
        teacher_note: editLessonForm.teacher_note || undefined,
        price_per_lesson: editLessonForm.price_per_lesson != null && editLessonForm.price_per_lesson !== '' ? Math.round(Number(editLessonForm.price_per_lesson) * 100) : null,
      };
      const res = await teacherApi.updateLesson(lesson.id, body);
      setLesson(res.data);
      setEditingLesson(false);
      setSuccess('Занятие обновлено');
      onUpdated?.();
    } catch (e) { setError(e.response?.data?.detail || 'Ошибка при обновлении занятия'); }
    finally { setActionLoading(null); }
  };

  const handleChangeStatus = async (newStatus) => {
    setShowStatusDropdown(false);
    setActionLoading('change-status'); setError(null);
    try {
      if (newStatus === 'completed') {
        const res = await teacherApi.completeLesson(lesson.id);
        setLesson(res.data);
        setSuccess('Занятие завершено');
      } else if (newStatus === 'cancelled') {
        // Show cancel form inline
        setShowCancelConfirm(true);
        return;
      } else if (newStatus === 'scheduled') {
        // Revert to scheduled — use update with status
        const res = await teacherApi.updateLesson(lesson.id, { status: newStatus });
        setLesson(res.data);
        setSuccess('Статус изменён на «Запланировано»');
      } else if (newStatus === 'rescheduled') {
        // Show reschedule form
        setShowReschedule(true);
        return;
      }
      refreshPayments();
      onUpdated?.();
    } catch (e) { setError(e.response?.data?.detail || 'Ошибка при смене статуса'); }
    finally { setActionLoading(null); }
  };

  const getBorderColor = () => {
    if (lesson.status === 'cancelled') return 'border-gray-300';
    if (lesson.payment_status === 'paid' || lesson.status === 'completed') return 'border-zinc-300';
    if (lesson.status === 'completed' && lesson.payment_status !== 'paid') return 'border-red-300';
    return 'border-zinc-300';
  };

  return (
    <>
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`bg-white rounded-3xl shadow-sm max-w-xl w-full max-h-[90vh] flex flex-col border-2 ${getBorderColor()}`}>
        {/* Header */}
        <div className={`p-6 rounded-t-[2rem] ${statusInfo.color} bg-opacity-20`}>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-semibold text-zinc-800">
                {lesson.title || 'Занятие'}
              </h3>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <div className="relative">
                  <button onClick={() => setShowStatusDropdown(!showStatusDropdown)} disabled={actionLoading === 'change-status'}
                    className={`px-3 py-1 rounded-full text-[10px] font-semibold ${statusInfo.color} cursor-pointer hover:opacity-80 disabled:opacity-50 transition-opacity flex items-center gap-1`}>
                    {actionLoading === 'change-status' ? <Loader2 size={10} className="animate-spin" /> : null}
                    {statusInfo.label} <ChevronDown size={10} />
                  </button>
                  {showStatusDropdown && (
                    <div className="absolute top-full mt-1 left-0 bg-white rounded-xl shadow-sm border border-zinc-200 py-1 z-10 min-w-[140px]"
                      onMouseLeave={() => setShowStatusDropdown(false)}>
                      {Object.entries(STATUS_MAP).map(([key, info]) => (
                        key !== lesson.status && (
                          <button key={key}
                            onClick={() => { setShowStatusDropdown(false); handleChangeStatus(key); }}
                            className={`w-full px-3 py-1.5 text-left text-[10px] font-semibold hover:bg-zinc-50 flex items-center gap-1.5 ${info.color}`}>
                            <info.icon size={10} /> {info.label}
                          </button>
                        )
                      ))}
                    </div>
                  )}
                </div>
                {paymentLabel && (
                  <span className={`px-3 py-1 rounded-full text-[10px] font-semibold ${paymentLabel.color}`}>
                    {paymentLabel.label}
                  </span>
                )}
                {lesson.student_balance != null && (
                  <span className={`px-3 py-1 rounded-full text-[10px] font-semibold ${(lesson.student_balance >= 0) ? 'bg-zinc-100 text-zinc-700' : 'bg-red-100 text-red-700'}`}>
                  {formatBalance(lesson.student_balance * 100)}
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-xl transition-all">
              <XCircle size={22} className="text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Alerts */}
        <div className="mx-6 mt-3 space-y-2">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-xs font-bold text-red-600">{error}</p>
            </div>
          )}
          {success && (
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
              <p className="text-xs font-bold text-zinc-600">{success}</p>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* --- 1. Lesson info --- */}
          {editingLesson ? (
            <div className="space-y-2 bg-zinc-50 rounded-2xl p-4 border border-zinc-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-zinc-600">Редактирование занятия</span>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500">Название</label>
                <input type="text" value={editLessonForm.title || ''}
                  onChange={(e) => setEditLessonForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full p-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10" />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500">Дата и время</label>
                <input type="datetime-local" value={editLessonForm.scheduled_date || ''}
                  onChange={(e) => setEditLessonForm((f) => ({ ...f, scheduled_date: e.target.value }))}
                  className="w-full p-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-zinc-500">Мин</label>
                  <input type="number" value={editLessonForm.duration_minutes || 60}
                    onChange={(e) => setEditLessonForm((f) => ({ ...f, duration_minutes: Number(e.target.value) }))}
                    className="w-full p-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-500">Цена ₽</label>
                  <input type="number" value={editLessonForm.price_per_lesson ?? ''}
                    onChange={(e) => setEditLessonForm((f) => ({ ...f, price_per_lesson: e.target.value }))}
                    placeholder="—"
                    className="w-full p-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500">Заметка</label>
                <textarea value={editLessonForm.teacher_note || ''}
                  onChange={(e) => setEditLessonForm((f) => ({ ...f, teacher_note: e.target.value }))}
                  rows={2} placeholder="О чём занятие..."
                  className="w-full p-2 bg-white border border-zinc-200 rounded-xl text-xs outline-none resize-none" />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => { setEditingLesson(false); setError(null); }}
                  className="flex-1 p-2 bg-zinc-100 rounded-xl text-xs font-semibold text-zinc-500 hover:bg-zinc-200">
                  Отмена
                </button>
                <button onClick={handleSaveLesson} disabled={actionLoading === 'edit-lesson'}
                  className="flex-1 p-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-xl text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 flex items-center justify-center gap-1">
                  {actionLoading === 'edit-lesson' ? <Loader2 size={12} className="animate-spin" /> : null} Сохранить
                </button>
              </div>
            </div>
          ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-sm">
                <CalendarDays size={16} className="text-zinc-400 shrink-0" />
                <span className="font-bold text-zinc-700">
                  {dayjs.utc(lesson.scheduled_date).format('DD MMMM YYYY, HH:mm')}
                </span>
              </div>
              {(
                <button onClick={startEditLesson}
                  className="px-2.5 py-1 bg-zinc-200 hover:bg-zinc-300 rounded-lg text-[10px] font-semibold text-zinc-600 flex items-center gap-1">
                  <Pencil size={10} /> Ред.
                </button>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Clock size={16} className="text-zinc-400 shrink-0" />
              <span className="font-bold text-zinc-700">{lesson.duration_minutes || 60} мин</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <User size={16} className="text-zinc-400 shrink-0" />
              <span className="font-bold text-zinc-700">{studentName}</span>
              {student?.tg_username && (
                <span className="text-zinc-500 text-xs font-bold">{student.tg_username}</span>
              )}
            </div>
            {lesson.teacher_note && (
              <div className="flex items-start gap-3 text-sm">
                <MessageSquare size={16} className="text-zinc-400 shrink-0 mt-0.5" />
                <span className="text-zinc-600">{lesson.teacher_note}</span>
              </div>
            )}
            {lesson.rescheduled_from_id && (
              <div className="text-[10px] font-bold text-zinc-600 bg-zinc-50 p-2 rounded-xl">
                Перенесено с занятия #{lesson.rescheduled_from_id}
              </div>
            )}
            {lesson.rescheduled_to_id && (
              <div className="text-[10px] font-bold text-zinc-600 bg-zinc-50 p-2 rounded-xl">
                Перенесено на занятие #{lesson.rescheduled_to_id}
              </div>
            )}
            <div className="flex items-center justify-between bg-white rounded-xl p-2">
              <div className="flex items-center gap-2">
                <CreditCard size={14} className="text-zinc-400" />
                <span className="text-sm font-medium text-zinc-500">Стоимость</span>
              </div>
              <span className="font-semibold text-zinc-800">{lesson.price_per_lesson != null ? formatPrice(lesson.price_per_lesson) : '—'}</span>
            </div>
          </div>
          )}

          {/* --- 2. Lesson Actions (only for scheduled) --- */}
          {isScheduled && (
          <div className="space-y-2">
            {/* Complete — всегда показываем, если scheduled */}
            {lesson.status === 'scheduled' && (
              <button
                onClick={handleComplete}
                disabled={!!actionLoading}
                className="w-full p-3 bg-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 rounded-2xl font-semibold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-sm"
              >
                {actionLoading === 'complete' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Завершить занятие
              </button>
            )}

            {/* Reschedule — только scheduled */}
            {lesson.status === 'scheduled' && (
              !showReschedule ? (
                <button
                  onClick={() => { setShowReschedule(true); setError(null); }}
                  disabled={!!actionLoading}
                  className="w-full p-3 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 rounded-2xl font-semibold text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Clock size={14} /> Перенести
                </button>
              ) : (
                <div className="bg-zinc-50 rounded-2xl p-3 space-y-2">
                  <input type="datetime-local" value={newDate} onChange={(e) => setNewDate(e.target.value)}
                    className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl text-xs font-bold outline-none" />
                  <input type="text" placeholder="Причина переноса" value={rescheduleReason} onChange={(e) => setRescheduleReason(e.target.value)}
                    className="w-full p-2.5 bg-white border border-zinc-200 rounded-xl text-xs outline-none" />
                  <div className="flex gap-2">
                    <button onClick={() => setShowReschedule(false)} className="flex-1 p-2 bg-white rounded-xl text-xs font-semibold text-zinc-500">Назад</button>
                    <button onClick={handleReschedule} disabled={actionLoading === 'reschedule' || !newDate}
                      className="flex-1 p-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-xl text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 flex items-center justify-center gap-1">
                      {actionLoading === 'reschedule' ? <Loader2 size={12} className="animate-spin" /> : <Clock size={12} />} Перенести
                    </button>
                  </div>
                </div>
              )
            )}

            {/* Cancel — только scheduled */}
            {lesson.status === 'scheduled' && (
              !showCancelConfirm ? (
                <button
                  onClick={() => { setShowCancelConfirm(true); setError(null); }}
                  disabled={!!actionLoading}
                  className="w-full p-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-2xl font-semibold text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CancelIcon size={14} /> Отменить занятие
                </button>
              ) : (
                <div className="bg-red-50 rounded-2xl p-3 space-y-2">
                  <input type="text" placeholder="Причина отмены" value={cancelNote} onChange={(e) => setCancelNote(e.target.value)}
                    className="w-full p-2.5 bg-white border border-red-200 rounded-xl text-xs outline-none" />
                  <div className="flex gap-2">
                    <button onClick={() => setShowCancelConfirm(false)} className="flex-1 p-2 bg-white rounded-xl text-xs font-semibold text-zinc-500">Назад</button>
                    <button onClick={handleCancel} disabled={actionLoading === 'cancel'}
                      className="flex-1 p-2 bg-red-500 text-white rounded-xl text-xs font-semibold hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-1">
                      {actionLoading === 'cancel' ? <Loader2 size={12} className="animate-spin" /> : <CancelIcon size={12} />} Подтвердить
                    </button>
                  </div>
                </div>
              )
            )}

            {/* Delete — любое занятие можно удалить */}
            {lesson.status === 'scheduled' && (
              <button
                onClick={handleDeleteLesson}
                disabled={actionLoading === 'delete'}
                className="w-full p-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl font-semibold text-xs flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {actionLoading === 'delete' ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Удалить занятие
              </button>
            )}
          </div>
          )}

          {/* --- 3. Schedule section --- */}
          <ScheduleSection
            scheduleId={lesson.schedule_id}
            students={students}
            groups={groups}
            onError={setError}
            onSuccess={setSuccess}
            onUpdated={onUpdated}
          />

          {/* --- 4–5. Balance and payments --- */}
          <PaymentsSection
            lessonId={lesson.id}
            studentId={lesson.student_id}
            studentBalance={studentBalance}
            refreshKey={paymentsVersion}
            onError={setError}
            onSuccess={setSuccess}
            onUpdated={onUpdated}
          />

          {/* --- 6. Parent section --- */}
          <ParentsSection student={student} onError={setError} onSuccess={setSuccess} onUpdated={onUpdated} />
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-100">
          <button
            onClick={onClose}
            className="w-full p-4 bg-zinc-100 text-zinc-600 rounded-2xl font-semibold text-sm hover:bg-zinc-200 transition-all"
          >
            ЗАКРЫТЬ
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
