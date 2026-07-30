import React, { useState, useEffect, useCallback } from 'react';
import {
  XCircle,
  CheckCircle2,
  XCircle as CancelIcon,
  Clock,
  User,
  Phone,
  CreditCard,
  CalendarDays,
  MessageSquare,
  Link2,
  Unlink,
  PlusCircle,
  Loader2,
  Repeat,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  Wallet,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { teacherApi } from '../../features/teacher/api';
import CreateScheduleModal from './CreateScheduleModal';

dayjs.extend(utc);

const STATUS_MAP = {
  scheduled: { label: 'Запланировано', color: 'bg-blue-100 text-blue-700', icon: CalendarDays },
  completed: { label: 'Проведено', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  cancelled: { label: 'Отменено', color: 'bg-gray-100 text-gray-700', icon: CancelIcon },
  rescheduled: { label: 'Перенесено', color: 'bg-purple-100 text-purple-700', icon: Clock },
};

const PAYMENT_STATUS_MAP = {
  paid: { label: 'Оплачено', color: 'bg-emerald-100 text-emerald-700' },
  pending: { label: 'Ожидает', color: 'bg-amber-100 text-amber-700' },
  unpaid: { label: 'Не оплачено', color: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Отменено', color: 'bg-gray-100 text-gray-700' },
};

// Format balance in kopecks → BYN
function formatBalance(kopecks) {
  if (kopecks == null) return '—';
  const byn = (kopecks / 100).toFixed(2);
  const sign = kopecks >= 0 ? '+' : '';
  return `${sign}${byn} BYN`;
}

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

// --- Section wrapper (collapsible) ---
function Section({ icon: Icon, title, badge, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-slate-50 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-slate-400" />
          <span className="text-xs font-black text-slate-400 uppercase">{title}</span>
          {badge}
        </div>
        {open ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

export default function LessonModal({ lesson: initialLesson, students, groups, onClose, onUpdated }) {
  const [lesson, setLesson] = useState(initialLesson);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Keep lesson in sync with prop changes
  useEffect(() => { setLesson(initialLesson); }, [initialLesson]);

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

  // --- Schedule section ---
  const [schedule, setSchedule] = useState(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({});
  const [scheduleDayToggle, setScheduleDayToggle] = useState([]);
  const [showScheduleDeleteConfirm, setShowScheduleDeleteConfirm] = useState(false);
  const [showCreateSchedule, setShowCreateSchedule] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // --- Payment section ---
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [showPayForm, setShowPayForm] = useState(false);
  const [payForm, setPayForm] = useState({ payment_type: 'per_lesson', amount: '', comment: '', lesson_id: lesson.id, package_total: '', valid_from: '', valid_until: '' });
  const [payStats, setPayStats] = useState(null);
  const [editingPaymentId, setEditingPaymentId] = useState(null);
  const [editPayForm, setEditPayForm] = useState({ payment_type: 'per_lesson', amount: '', comment: '', package_total: '', valid_from: '', valid_until: '' });

  // --- Parent section ---
  const [parent, setParent] = useState(null);
  const [parentLoading, setParentLoading] = useState(false);
  const [showParentForm, setShowParentForm] = useState(false);
  const [editingParent, setEditingParent] = useState(false);
  const [parentForm, setParentForm] = useState({ name: '', phone: '', tg_username: '', comment: '' });
  const [allParents, setAllParents] = useState([]);
  const [parentsLoading, setParentsLoading] = useState(false);
  const [showParentPicker, setShowParentPicker] = useState(false);
  const [parentSearch, setParentSearch] = useState('');

  const student = students.find((s) => s.id === lesson.student_id);
  const studentName = lesson.student_name || (student ? `${student.first_name || ''} ${student.last_name || ''}`.trim() : `ID: ${lesson.student_id}`);

  const statusInfo = STATUS_MAP[lesson.status] || STATUS_MAP.scheduled;
  const paymentLabel = PAYMENT_STATUS_MAP[lesson.payment_status] || PAYMENT_STATUS_MAP.unpaid;

  const isScheduled = lesson.status === 'scheduled';

  // --- Student balance (server-side, in kopecks) ---
  const studentBalance = lesson.student_balance;

  // --- Data fetching ---
  const fetchSchedule = useCallback(async () => {
    if (!lesson.schedule_id) return;
    setScheduleLoading(true);
    try {
      const res = await teacherApi.getSchedule(lesson.schedule_id);
      setSchedule(res.data);
      setScheduleForm({
        title: res.data.title || '',
        description: res.data.description || '',
        time_start: res.data.time_start || '',
        duration_minutes: res.data.duration_minutes || 60,
        price_per_lesson: res.data.price_per_lesson ? (res.data.price_per_lesson / 100).toFixed(2) : '',
        recur_until: res.data.recur_until || '',
      });
      setScheduleDayToggle(res.data.days_of_week || []);
    } catch { /* ignore */ }
    finally { setScheduleLoading(false); }
  }, [lesson.schedule_id]);

  const fetchPayments = useCallback(async () => {
    setPaymentsLoading(true);
    try {
      const [payRes, statsRes] = await Promise.all([
        teacherApi.getPayments(lesson.student_id),
        teacherApi.getPaymentsStats(null, null, lesson.student_id),
      ]);
      setPayments(payRes.data || []);
      setPayStats(statsRes.data);
    } catch { /* ignore */ }
    finally { setPaymentsLoading(false); }
  }, [lesson.student_id]);

  const fetchParent = useCallback(async () => {
    if (!student?.id) { setParent(null); return; }
    setParentLoading(true);
    try {
      const res = await teacherApi.getStudentParents(student.id);
      const parents = res.data || [];
      setParent(parents.length > 0 ? parents[0] : null);
    } catch { /* ignore */ }
    finally { setParentLoading(false); }
  }, [student?.id]);

  const fetchAllParents = useCallback(async () => {
    setParentsLoading(true);
    try {
      const res = await teacherApi.getParents();
      setAllParents(res.data || []);
    } catch { /* ignore */ }
    finally { setParentsLoading(false); }
  }, []);

  const handleLinkExistingParent = async (p) => {
    setActionLoading('parent'); setError(null);
    try {
      await teacherApi.linkStudentToParent(p.id, student.id);
      setParent(p);
      setShowParentPicker(false);
      setSuccess('Родитель привязан');
      onUpdated?.();
    } catch (e) { setError(e.response?.data?.detail || 'Ошибка при привязке родителя'); }
    finally { setActionLoading(null); }
  };

  useEffect(() => {
    fetchSchedule();
    fetchPayments();
    fetchParent();
    fetchAllParents();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Lesson actions ---
  const handleComplete = async () => {
    setActionLoading('complete'); setError(null);
    try {
      const res = await teacherApi.completeLesson(lesson.id);
      setLesson(res.data);
      setSuccess('Занятие завершено');
      fetchPayments(); // refresh payments
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
    if (!confirm('Удалить это занятие? Действие необратимо.')) return;
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
      fetchPayments();
      onUpdated?.();
    } catch (e) { setError(e.response?.data?.detail || 'Ошибка при смене статуса'); }
    finally { setActionLoading(null); }
  };

  // --- Schedule actions ---
  const handleSaveSchedule = async () => {
    setActionLoading('schedule'); setError(null);
    try {
      await teacherApi.updateSchedule(schedule.id, {
        ...scheduleForm,
        days_of_week: scheduleDayToggle,
        duration_minutes: Number(scheduleForm.duration_minutes) || 60,
        price_per_lesson: scheduleForm.price_per_lesson ? Math.round(Number(scheduleForm.price_per_lesson) * 100) : null,
        recur_until: scheduleForm.recur_until ? dayjs.utc(scheduleForm.recur_until).format('YYYY-MM-DDTHH:mm:ss') : null,
      });
      setSuccess('Расписание обновлено');
      setEditingSchedule(false);
      fetchSchedule();
      onUpdated?.();
    } catch (e) { setError(e.response?.data?.detail || 'Ошибка при обновлении расписания'); }
    finally { setActionLoading(null); }
  };

  const handleToggleSchedule = async (active) => {
    setActionLoading('schedule'); setError(null);
    try {
      const res = await teacherApi.toggleSchedule(schedule.id, active);
      setSchedule(res.data);
      setSuccess(active ? 'Расписание включено' : 'Расписание остановлено');
    } catch (e) { setError(e.response?.data?.detail || 'Ошибка'); }
    finally { setActionLoading(null); }
  };

  const handleDeleteSchedule = async () => {
    setShowScheduleDeleteConfirm(false);
    setActionLoading('schedule'); setError(null);
    try {
      await teacherApi.deleteSchedule(schedule.id);
      setSchedule(null);
      setSuccess('Расписание удалено');
      onUpdated?.();
    } catch (e) { setError(e.response?.data?.detail || 'Ошибка при удалении расписания'); }
    finally { setActionLoading(null); }
  };

  const toggleScheduleDay = (code) => {
    setScheduleDayToggle((prev) =>
      prev.includes(code) ? prev.filter((d) => d !== code) : [...prev, code]
    );
  };

  // --- Payment actions ---
  const handleCreatePayment = async () => {
    if (!payForm.amount) { setError('Укажите сумму'); return; }
    setActionLoading('payment'); setError(null);
    try {
      const body = {
        student_id: lesson.student_id,
        payment_type: 'per_lesson',
        amount: Number(payForm.amount),
        comment: payForm.comment || undefined,
        lesson_id: payForm.lesson_id || lesson.id,
      };
      await teacherApi.createPayment(body);
      setSuccess('Платёж создан');
      setShowPayForm(false);
      resetPayForm();
      fetchPayments();
      onUpdated?.();
    } catch (e) { setError(e.response?.data?.detail || 'Ошибка при создании платежа'); }
    finally { setActionLoading(null); }
  };

  const handleMarkPaid = async (pid) => {
    setActionLoading(`pay-${pid}`); setError(null);
    try {
      await teacherApi.markPaymentPaid(pid);
      setSuccess('Оплата отмечена');
      fetchPayments();
      onUpdated?.();
    } catch (e) { setError(e.response?.data?.detail || 'Ошибка'); }
    finally { setActionLoading(null); }
  };

  const handleCancelPayment = async (pid) => {
    setActionLoading(`pay-${pid}`); setError(null);
    try {
      await teacherApi.cancelPayment(pid);
      setSuccess('Платёж отменён');
      fetchPayments();
      onUpdated?.();
    } catch (e) { setError(e.response?.data?.detail || 'Ошибка'); }
    finally { setActionLoading(null); }
  };

  const resetPayForm = () => {
    setPayForm({ payment_type: 'per_lesson', amount: '', comment: '', lesson_id: lesson.id, package_total: '', valid_from: '', valid_until: '' });
  };

  const paymentToForm = (p) => ({
    payment_type: p.payment_type || 'per_lesson',
    amount: String(p.amount || ''),
    comment: p.comment || '',
    package_total: p.package_total != null ? String(p.package_total) : '',
    valid_from: p.valid_from ? dayjs.utc(p.valid_from).format('YYYY-MM-DDTHH:mm') : '',
    valid_until: p.valid_until ? dayjs.utc(p.valid_until).format('YYYY-MM-DDTHH:mm') : '',
  });

  const handleEditPayment = async (pid) => {
    if (!editPayForm.amount) { setError('Укажите сумму'); return; }
    setActionLoading(`pay-${pid}`); setError(null);
    try {
      const body = {
        payment_type: 'per_lesson',
        amount: Number(editPayForm.amount),
        comment: editPayForm.comment || undefined,
      };
      await teacherApi.updatePayment(pid, body);
      setSuccess('Платёж обновлён');
      setEditingPaymentId(null);
      fetchPayments();
      onUpdated?.();
    } catch (e) { setError(e.response?.data?.detail || 'Ошибка при обновлении платежа'); }
    finally { setActionLoading(null); }
  };

  const handleDeletePayment = async (pid) => {
    if (!confirm('Удалить этот платёж? Действие необратимо.')) return;
    setActionLoading(`pay-${pid}`); setError(null);
    try {
      await teacherApi.deletePayment(pid);
      setSuccess('Платёж удалён');
      fetchPayments();
      onUpdated?.();
    } catch (e) { setError(e.response?.data?.detail || 'Ошибка при удалении платежа'); }
    finally { setActionLoading(null); }
  };

  // --- Parent actions ---
  const handleCreateParent = async () => {
    if (!parentForm.name.trim()) { setError('Укажите имя родителя'); return; }
    setActionLoading('parent'); setError(null);
    try {
      const res = await teacherApi.createParent({ ...parentForm, student_ids: [student.id] });
      setParent(res.data);
      setShowParentForm(false);
      setSuccess('Родитель создан и привязан');
      onUpdated?.();
    } catch (e) { setError(e.response?.data?.detail || 'Ошибка при создании родителя'); }
    finally { setActionLoading(null); }
  };

  const handleEditParent = async () => {
    setActionLoading('parent'); setError(null);
    try {
      const res = await teacherApi.updateParent(parent.id, parentForm);
      setParent(res.data);
      setEditingParent(false);
      setSuccess('Родитель обновлён');
    } catch (e) { setError(e.response?.data?.detail || 'Ошибка при редактировании родителя'); }
    finally { setActionLoading(null); }
  };

  const handleDeleteParent = async () => {
    if (!confirm('Удалить родителя? Студент останется без привязки.')) return;
    setActionLoading('parent'); setError(null);
    try {
      await teacherApi.deleteParent(parent.id);
      setParent(null);
      setSuccess('Родитель удалён');
      onUpdated?.();
    } catch (e) { setError(e.response?.data?.detail || 'Ошибка при удалении родителя'); }
    finally { setActionLoading(null); }
  };

  const handleUnlinkParent = async () => {
    setActionLoading('parent'); setError(null);
    try {
      await teacherApi.unlinkStudentFromParent(student.id);
      setParent(null);
      setSuccess('Родитель отвязан');
      onUpdated?.();
    } catch (e) { setError(e.response?.data?.detail || 'Ошибка при отвязке родителя'); }
    finally { setActionLoading(null); }
  };

  const getBorderColor = () => {
    if (lesson.status === 'cancelled') return 'border-gray-300';
    if (lesson.payment_status === 'paid' || lesson.status === 'completed') return 'border-emerald-300';
    if (lesson.status === 'completed' && lesson.payment_status !== 'paid') return 'border-red-300';
    return 'border-blue-300';
  };

  return (
    <>
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`bg-white rounded-[2rem] shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col border-2 ${getBorderColor()}`}>
        {/* Header */}
        <div className={`p-6 rounded-t-[2rem] ${statusInfo.color} bg-opacity-20`}>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-black text-slate-800 uppercase">
                {lesson.title || 'Занятие'}
              </h3>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <div className="relative">
                  <button onClick={() => setShowStatusDropdown(!showStatusDropdown)} disabled={actionLoading === 'change-status'}
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${statusInfo.color} cursor-pointer hover:opacity-80 disabled:opacity-50 transition-opacity flex items-center gap-1`}>
                    {actionLoading === 'change-status' ? <Loader2 size={10} className="animate-spin" /> : null}
                    {statusInfo.label} <ChevronDown size={10} />
                  </button>
                  {showStatusDropdown && (
                    <div className="absolute top-full mt-1 left-0 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-10 min-w-[140px]"
                      onMouseLeave={() => setShowStatusDropdown(false)}>
                      {Object.entries(STATUS_MAP).map(([key, info]) => (
                        key !== lesson.status && (
                          <button key={key}
                            onClick={() => { setShowStatusDropdown(false); handleChangeStatus(key); }}
                            className={`w-full px-3 py-1.5 text-left text-[10px] font-black uppercase hover:bg-slate-50 flex items-center gap-1.5 ${info.color}`}>
                            <info.icon size={10} /> {info.label}
                          </button>
                        )
                      ))}
                    </div>
                  )}
                </div>
                {paymentLabel && (
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${paymentLabel.color}`}>
                    {paymentLabel.label}
                  </span>
                )}
                {lesson.student_balance != null && (
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${(lesson.student_balance >= 0) ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {formatBalance(lesson.student_balance * 100)}
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-xl transition-all">
              <XCircle size={22} className="text-slate-400" />
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
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <p className="text-xs font-bold text-emerald-600">{success}</p>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* --- 1. Lesson info --- */}
          {editingLesson ? (
            <div className="space-y-2 bg-slate-50 rounded-2xl p-4 border border-emerald-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black text-emerald-600 uppercase">Редактирование занятия</span>
              </div>
              <div>
                <label className="text-[8px] font-black text-slate-400 uppercase">Название</label>
                <input type="text" value={editLessonForm.title || ''}
                  onChange={(e) => setEditLessonForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-200" />
              </div>
              <div>
                <label className="text-[8px] font-black text-slate-400 uppercase">Дата и время</label>
                <input type="datetime-local" value={editLessonForm.scheduled_date || ''}
                  onChange={(e) => setEditLessonForm((f) => ({ ...f, scheduled_date: e.target.value }))}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[8px] font-black text-slate-400 uppercase">Мин</label>
                  <input type="number" value={editLessonForm.duration_minutes || 60}
                    onChange={(e) => setEditLessonForm((f) => ({ ...f, duration_minutes: Number(e.target.value) }))}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none" />
                </div>
                <div>
                  <label className="text-[8px] font-black text-slate-400 uppercase">Цена ₽</label>
                  <input type="number" value={editLessonForm.price_per_lesson ?? ''}
                    onChange={(e) => setEditLessonForm((f) => ({ ...f, price_per_lesson: e.target.value }))}
                    placeholder="—"
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none" />
                </div>
              </div>
              <div>
                <label className="text-[8px] font-black text-slate-400 uppercase">Заметка</label>
                <textarea value={editLessonForm.teacher_note || ''}
                  onChange={(e) => setEditLessonForm((f) => ({ ...f, teacher_note: e.target.value }))}
                  rows={2} placeholder="О чём занятие..."
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs outline-none resize-none" />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => { setEditingLesson(false); setError(null); }}
                  className="flex-1 p-2 bg-slate-100 rounded-xl text-xs font-black text-slate-500 hover:bg-slate-200">
                  Отмена
                </button>
                <button onClick={handleSaveLesson} disabled={actionLoading === 'edit-lesson'}
                  className="flex-1 p-2 bg-emerald-500 text-white rounded-xl text-xs font-black hover:bg-emerald-600 disabled:opacity-50 flex items-center justify-center gap-1">
                  {actionLoading === 'edit-lesson' ? <Loader2 size={12} className="animate-spin" /> : null} Сохранить
                </button>
              </div>
            </div>
          ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-sm">
                <CalendarDays size={16} className="text-slate-400 shrink-0" />
                <span className="font-bold text-slate-700">
                  {dayjs.utc(lesson.scheduled_date).format('DD MMMM YYYY, HH:mm')}
                </span>
              </div>
              {(
                <button onClick={startEditLesson}
                  className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 rounded-lg text-[10px] font-black text-slate-600 flex items-center gap-1">
                  <Pencil size={10} /> Ред.
                </button>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Clock size={16} className="text-slate-400 shrink-0" />
              <span className="font-bold text-slate-700">{lesson.duration_minutes || 60} мин</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <User size={16} className="text-slate-400 shrink-0" />
              <span className="font-bold text-slate-700">{studentName}</span>
              {student?.tg_username && (
                <span className="text-blue-500 text-xs font-bold">{student.tg_username}</span>
              )}
            </div>
            {lesson.teacher_note && (
              <div className="flex items-start gap-3 text-sm">
                <MessageSquare size={16} className="text-slate-400 shrink-0 mt-0.5" />
                <span className="text-slate-600">{lesson.teacher_note}</span>
              </div>
            )}
            {lesson.rescheduled_from_id && (
              <div className="text-[10px] font-bold text-purple-600 bg-purple-50 p-2 rounded-xl">
                Перенесено с занятия #{lesson.rescheduled_from_id}
              </div>
            )}
            {lesson.rescheduled_to_id && (
              <div className="text-[10px] font-bold text-purple-600 bg-purple-50 p-2 rounded-xl">
                Перенесено на занятие #{lesson.rescheduled_to_id}
              </div>
            )}
            <div className="flex items-center justify-between bg-white rounded-xl p-2">
              <div className="flex items-center gap-2">
                <CreditCard size={14} className="text-slate-400" />
                <span className="text-[10px] font-black text-slate-400 uppercase">Стоимость</span>
              </div>
              <span className="font-black text-slate-800">{lesson.price_per_lesson != null ? formatPrice(lesson.price_per_lesson) : '—'}</span>
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
                className="w-full p-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-emerald-200"
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
                  className="w-full p-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Clock size={14} /> Перенести
                </button>
              ) : (
                <div className="bg-purple-50 rounded-2xl p-3 space-y-2">
                  <input type="datetime-local" value={newDate} onChange={(e) => setNewDate(e.target.value)}
                    className="w-full p-2.5 bg-white border border-purple-200 rounded-xl text-xs font-bold outline-none" />
                  <input type="text" placeholder="Причина переноса" value={rescheduleReason} onChange={(e) => setRescheduleReason(e.target.value)}
                    className="w-full p-2.5 bg-white border border-purple-200 rounded-xl text-xs outline-none" />
                  <div className="flex gap-2">
                    <button onClick={() => setShowReschedule(false)} className="flex-1 p-2 bg-white rounded-xl text-xs font-black text-slate-500">Назад</button>
                    <button onClick={handleReschedule} disabled={actionLoading === 'reschedule' || !newDate}
                      className="flex-1 p-2 bg-purple-500 text-white rounded-xl text-xs font-black hover:bg-purple-600 disabled:opacity-50 flex items-center justify-center gap-1">
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
                  className="w-full p-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CancelIcon size={14} /> Отменить занятие
                </button>
              ) : (
                <div className="bg-red-50 rounded-2xl p-3 space-y-2">
                  <input type="text" placeholder="Причина отмены" value={cancelNote} onChange={(e) => setCancelNote(e.target.value)}
                    className="w-full p-2.5 bg-white border border-red-200 rounded-xl text-xs outline-none" />
                  <div className="flex gap-2">
                    <button onClick={() => setShowCancelConfirm(false)} className="flex-1 p-2 bg-white rounded-xl text-xs font-black text-slate-500">Назад</button>
                    <button onClick={handleCancel} disabled={actionLoading === 'cancel'}
                      className="flex-1 p-2 bg-red-500 text-white rounded-xl text-xs font-black hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-1">
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
                className="w-full p-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {actionLoading === 'delete' ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Удалить занятие
              </button>
            )}
          </div>
          )}

          {/* --- 3. Schedule section --- */}
          <Section icon={Repeat} title="Расписание" defaultOpen={true} badge={
              scheduleLoading ? <Loader2 size={12} className="animate-spin text-slate-400 ml-1" /> :
              schedule ? <span className={`ml-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${schedule.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}>{schedule.is_active ? 'Активно' : 'Остановлено'}</span> : null
            }>
              {scheduleLoading ? (
                <div className="text-xs text-slate-400 italic py-2 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Загрузка...</div>
              ) : schedule && !editingSchedule ? (
                <div className="space-y-3">
                  {/* Предупреждение */}
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-2 flex items-start gap-2">
                    <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                    <span className="text-[10px] font-bold text-amber-700">
                      Изменения затронут <u>все</u> занятия этого расписания
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 space-y-1">
                    <div><span className="font-bold">{schedule.title}</span></div>
                    {schedule.description && <div className="text-[10px] italic">{schedule.description}</div>}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">Дни:</span>
                      {schedule.days_of_week?.map((d) => (
                        <span key={d} className="px-1.5 py-0.5 bg-slate-200 rounded text-[9px] font-black uppercase text-slate-600">
                          {DAY_CODES.find((x) => x.code === d)?.label || d}
                        </span>
                      ))}
                    </div>
                    <div>🕐 {schedule.time_start} · {schedule.duration_minutes} мин · {schedule.price_per_lesson != null ? formatPrice(schedule.price_per_lesson) : '—'}</div>
                    <div>Тип: <span className="font-black uppercase text-[10px]">{schedule.schedule_type === 'group' ? 'Групповое' : 'Индивидуальное'}</span></div>
                    {schedule.recur_until && (
                      <div className="text-[10px] text-slate-400">Повторять до: <span className="font-bold text-slate-600">{dayjs.utc(schedule.recur_until).format('DD.MM.YYYY')}</span></div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => { setEditingSchedule(true); setError(null); }}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 rounded-xl text-[10px] font-black text-slate-600 flex items-center gap-1">
                      <Pencil size={10} /> Ред.
                    </button>
                    <button onClick={() => handleToggleSchedule(!schedule.is_active)} disabled={actionLoading === 'schedule'}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 rounded-xl text-[10px] font-black text-slate-600 flex items-center gap-1 disabled:opacity-50">
                      {actionLoading === 'schedule' ? <Loader2 size={10} className="animate-spin" /> : schedule.is_active ? <PowerOff size={10} /> : <Power size={10} />}
                      {schedule.is_active ? 'Остановить' : 'Включить'}
                    </button>
                    {!showScheduleDeleteConfirm ? (
                      <button onClick={() => setShowScheduleDeleteConfirm(true)} disabled={actionLoading === 'schedule'}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 rounded-xl text-[10px] font-black text-red-600 flex items-center gap-1 disabled:opacity-50">
                        <Trash2 size={10} /> Удалить
                      </button>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] font-bold text-red-600">Точно?</span>
                        <button onClick={handleDeleteSchedule} disabled={actionLoading === 'schedule'}
                          className="px-2 py-1 bg-red-500 text-white rounded-lg text-[9px] font-black hover:bg-red-600 disabled:opacity-50 flex items-center gap-0.5">
                          {actionLoading === 'schedule' ? <Loader2 size={9} className="animate-spin" /> : <Trash2 size={9} />} Да
                        </button>
                        <button onClick={() => setShowScheduleDeleteConfirm(false)}
                          className="px-2 py-1 bg-slate-200 rounded-lg text-[9px] font-black text-slate-500 hover:bg-slate-300">
                          Нет
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : schedule && editingSchedule ? (
                <div className="space-y-2">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-2 flex items-start gap-2">
                    <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                    <span className="text-[10px] font-bold text-amber-700">
                      Изменения затронут <u>все</u> занятия этого расписания
                    </span>
                  </div>
                  <input type="text" value={scheduleForm.title || ''} onChange={(e) => setScheduleForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Название" className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-200" />
                  <input type="text" value={scheduleForm.description || ''} onChange={(e) => setScheduleForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Описание" className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs outline-none" />
                  <div className="grid grid-cols-4 gap-2">
                    <div className="col-span-3">
                      <label className="text-[8px] font-black text-slate-400 uppercase">Повторять до</label>
                      <input type="datetime-local" value={scheduleForm.recur_until || ''} onChange={(e) => setScheduleForm((f) => ({ ...f, recur_until: e.target.value }))}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs outline-none" placeholder="Пусто = бессрочно" />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {DAY_CODES.map((day) => (
                      <button key={day.code} onClick={() => toggleScheduleDay(day.code)}
                        className={`w-8 h-8 rounded-lg text-[9px] font-black uppercase transition-all ${scheduleDayToggle.includes(day.code) ? 'bg-emerald-500 text-white' : 'bg-white border border-slate-200 text-slate-500'}`}>
                        {day.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase">Время</label>
                      <input type="time" value={scheduleForm.time_start || ''} onChange={(e) => setScheduleForm((f) => ({ ...f, time_start: e.target.value }))}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none" />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase">Мин</label>
                      <input type="number" value={scheduleForm.duration_minutes || 60} onChange={(e) => setScheduleForm((f) => ({ ...f, duration_minutes: Number(e.target.value) }))}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none" />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase">Цена ₽</label>
                      <input type="number" value={scheduleForm.price_per_lesson || ''} onChange={(e) => setScheduleForm((f) => ({ ...f, price_per_lesson: e.target.value }))}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingSchedule(false); setError(null); }}
                      className="flex-1 p-2 bg-slate-100 rounded-xl text-xs font-black text-slate-500">Отмена</button>
                    <button onClick={handleSaveSchedule} disabled={actionLoading === 'schedule'}
                      className="flex-1 p-2 bg-emerald-500 text-white rounded-xl text-xs font-black hover:bg-emerald-600 disabled:opacity-50 flex items-center justify-center gap-1">
                      {actionLoading === 'schedule' ? <Loader2 size={12} className="animate-spin" /> : null} Сохранить
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 py-2">
                  <div className="text-xs text-slate-400 italic">Расписание не найдено</div>
                  <button
                    onClick={() => setShowCreateSchedule(true)}
                    className="w-full p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1.5">
                    <PlusCircle size={12} />
                    Создать расписание
                  </button>
                </div>
              )}
            </Section>

          {/* --- 4. Student Balance --- */}
          <Section icon={Wallet} title="Баланс ученика" badge={
            studentBalance != null && (
              <span className={`ml-1 text-[9px] font-black ${studentBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatBalance(studentBalance*100)}
              </span>
            )
          }>
            <div className="grid grid-cols-1 gap-2 text-center">
              <div className={`rounded-xl p-3 ${studentBalance != null ? (studentBalance >= 0 ? 'bg-emerald-50' : 'bg-red-50') : 'bg-slate-50'}`}>
                <div className="text-[9px] text-slate-400 font-bold uppercase mb-1">Текущий баланс</div>
                <div className={`text-lg font-black ${studentBalance != null ? (studentBalance >= 0 ? 'text-emerald-600' : 'text-red-600') : 'text-slate-400'}`}>
                  {studentBalance != null ? formatBalance(studentBalance) : '—'}
                </div>
              </div>
            </div>
            {studentBalance != null && studentBalance < 0 && (
              <div className="bg-red-50 rounded-xl p-2 flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-500 shrink-0" />
                <span className="text-[10px] font-bold text-red-600">Баланс отрицательный — пополните счёт ученика</span>
              </div>
            )}
          </Section>

          {/* --- 5. Payments section --- */}
          <Section icon={CreditCard} title="Оплаты" badge={
            payStats ? <span className="ml-1 text-[9px] font-black text-emerald-600">{payStats.total || 0} ₽</span> : null
          }>
            {paymentsLoading ? (
              <div className="text-xs text-slate-400 italic py-2 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Загрузка...</div>
            ) : (
              <>
                {/* Stats with per-type breakdown */}
                {payStats && (
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-3 gap-1.5 text-center">
                      <div className="bg-white rounded-xl p-1.5">
                        <div className="text-[8px] text-slate-400 font-bold uppercase">Всего</div>
                        <div className="text-xs font-black text-emerald-600">{payStats.total || 0} ₽</div>
                      </div>
                      <div className="bg-white rounded-xl p-1.5">
                        <div className="text-[8px] text-slate-400 font-bold uppercase">Платежей</div>
                        <div className="text-xs font-black text-slate-700">{payStats.count || 0}</div>
                      </div>
                      <div className="bg-white rounded-xl p-1.5">
                        <div className="text-[8px] text-slate-400 font-bold uppercase">Баланс</div>
                        <div className={`text-xs font-black ${(lesson.student_balance >= 0) ? 'text-emerald-600' : 'text-red-600'}`}>
                          {lesson.student_balance != null ? formatBalance(lesson.student_balance) : '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment list */}
                {payments.length === 0 ? (
                  <div className="text-xs text-slate-400 italic py-2">Нет платежей</div>
                ) : (
                  <div className="space-y-1.5 max-h-52 overflow-y-auto">
                    {payments.map((p) => {
                      const isCancelled = p.status === 'cancelled';
                      const isEditing = editingPaymentId === p.id;

                      if (isEditing) {
                        return (
                          <div key={p.id} className="bg-white rounded-xl p-2 border border-emerald-200 space-y-1.5">
                            <input type="number" placeholder="Сумма *" value={editPayForm.amount} onChange={(e) => setEditPayForm((f) => ({ ...f, amount: e.target.value }))}
                              className="w-full p-1.5 bg-slate-50 rounded-lg text-[10px] font-bold outline-none" />
                            <input type="text" placeholder="Комментарий" value={editPayForm.comment} onChange={(e) => setEditPayForm((f) => ({ ...f, comment: e.target.value }))}
                              className="w-full p-1.5 bg-slate-50 rounded-lg text-[10px] outline-none" />
                            <div className="flex gap-1">
                              <button onClick={() => { setEditingPaymentId(null); setError(null); }}
                                className="flex-1 p-1.5 bg-slate-100 rounded-lg text-[9px] font-black text-slate-500">Отмена</button>
                              <button onClick={() => handleEditPayment(p.id)} disabled={actionLoading === `pay-${p.id}` || !editPayForm.amount}
                                className="flex-1 p-1.5 bg-emerald-500 text-white rounded-lg text-[9px] font-black hover:bg-emerald-600 disabled:opacity-50 flex items-center justify-center gap-1">
                                {actionLoading === `pay-${p.id}` ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />} Сохранить
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={p.id} className={`bg-white rounded-xl p-2 border ${isCancelled ? 'border-gray-200 opacity-50' : 'border-slate-100'}`}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className={`px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase ${PAYMENT_STATUS_MAP[p.status]?.color || 'bg-gray-100 text-gray-700'}`}>
                                  {PAYMENT_STATUS_MAP[p.status]?.label || p.status}
                                </span>
                              </div>
                              {p.comment && (
                                <div className="text-[9px] text-slate-600 mt-0.5 truncate">{p.comment}</div>
                              )}
                              {p.paid_at && (
                                <div className="text-[7px] text-slate-400 mt-0.5">{dayjs.utc(p.paid_at).format('DD.MM.YYYY HH:mm')}</div>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-xs font-black text-slate-800">{p.amount} ₽</div>
                              <div className="flex gap-1 mt-0.5">
                                {/* Edit / Delete buttons */}
                                <button onClick={() => { setEditingPaymentId(p.id); setEditPayForm(paymentToForm(p)); setError(null); }}
                                  className="text-[7px] font-black text-slate-500 hover:text-slate-700 uppercase bg-slate-100 px-1 py-0.5 rounded-lg">
                                  <Pencil size={9} />
                                </button>
                                <button onClick={() => handleDeletePayment(p.id)} disabled={actionLoading === `pay-${p.id}`}
                                  className="text-[7px] font-black text-red-500 hover:text-red-600 uppercase bg-red-50 px-1 py-0.5 rounded-lg">
                                  <Trash2 size={9} />
                                </button>
                                {p.status === 'pending' && (
                                  <button onClick={() => handleMarkPaid(p.id)} disabled={actionLoading === `pay-${p.id}`}
                                    className="text-[7px] font-black text-emerald-600 hover:text-emerald-700 uppercase bg-emerald-50 px-1.5 py-0.5 rounded-lg">
                                    {actionLoading === `pay-${p.id}` ? <Loader2 size={10} className="animate-spin" /> : 'Оплатить'}
                                  </button>
                                )}
                                {p.status === 'paid' && (
                                  <button onClick={() => handleCancelPayment(p.id)} disabled={actionLoading === `pay-${p.id}`}
                                    className="text-[7px] font-black text-red-500 hover:text-red-600 uppercase bg-red-50 px-1.5 py-0.5 rounded-lg">
                                    {actionLoading === `pay-${p.id}` ? <Loader2 size={10} className="animate-spin" /> : 'Отменить'}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Create payment */}
                {!showPayForm ? (
                  <button onClick={() => { setShowPayForm(true); setError(null); }}
                    className="w-full p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1">
                    <PlusCircle size={12} /> Пополнить баланс
                  </button>
                ) : (
                  <div className="space-y-2 bg-white rounded-xl p-3 border border-emerald-200">
                    <input type="number" placeholder="Сумма (BYN) *" value={payForm.amount} onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))}
                      className="w-full p-2 bg-slate-50 rounded-xl text-xs font-bold outline-none" />
                    <input type="text" placeholder="Комментарий" value={payForm.comment} onChange={(e) => setPayForm((f) => ({ ...f, comment: e.target.value }))}
                      className="w-full p-2 bg-slate-50 rounded-xl text-xs outline-none" />
                    <div className="flex gap-2">
                      <button onClick={() => setShowPayForm(false)} className="flex-1 p-2 bg-slate-100 rounded-xl text-xs font-black text-slate-500">Отмена</button>
                      <button onClick={handleCreatePayment} disabled={actionLoading === 'payment' || !payForm.amount}
                        className="flex-1 p-2 bg-emerald-500 text-white rounded-xl text-xs font-black hover:bg-emerald-600 disabled:opacity-50 flex items-center justify-center gap-1 shadow-lg shadow-emerald-200">
                        {actionLoading === 'payment' ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Пополнить
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Section>

          {/* --- 6. Parent section --- */}
          <Section icon={Phone} title="Родитель" badge={
            parentLoading ? <Loader2 size={12} className="animate-spin text-slate-400 ml-1" /> :
            parent ? <span className="ml-1 px-2 py-0.5 rounded-full text-[8px] font-black bg-emerald-100 text-emerald-700">Привязан</span> : null
          }>
            {parentLoading ? (
              <div className="text-xs text-slate-400 italic py-2 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Загрузка...</div>
            ) : parent && !editingParent ? (
              <div className="space-y-2">
                <div className="text-xs text-slate-500 space-y-1">
                  <div className="font-bold text-slate-700">{parent.name}</div>
                  {parent.phone && <div>📞 {parent.phone}</div>}
                  {parent.tg_username && <div className="text-blue-500">{parent.tg_username}</div>}
                  {parent.comment && <div className="italic text-[10px]">{parent.comment}</div>}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => { setParentForm({ name: parent.name, phone: parent.phone || '', tg_username: parent.tg_username || '', comment: parent.comment || '' }); setEditingParent(true); setError(null); }}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 rounded-xl text-[10px] font-black text-slate-600 flex items-center gap-1">
                    <Pencil size={10} /> Ред.
                  </button>
                  <button onClick={handleUnlinkParent} disabled={actionLoading === 'parent'}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 rounded-xl text-[10px] font-black text-slate-600 flex items-center gap-1 disabled:opacity-50">
                    <Unlink size={10} /> Отвязать
                  </button>
                  <button onClick={handleDeleteParent} disabled={actionLoading === 'parent'}
                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 rounded-xl text-[10px] font-black text-red-600 flex items-center gap-1 disabled:opacity-50">
                    <Trash2 size={10} /> Удалить
                  </button>
                </div>
              </div>
            ) : parent && editingParent ? (
              <div className="space-y-2">
                <input type="text" placeholder="Имя *" value={parentForm.name} onChange={(e) => setParentForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none" />
                <input type="text" placeholder="Телефон" value={parentForm.phone} onChange={(e) => setParentForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs outline-none" />
                <input type="text" placeholder="TG username" value={parentForm.tg_username} onChange={(e) => setParentForm((f) => ({ ...f, tg_username: e.target.value }))}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs outline-none" />
                <input type="text" placeholder="Комментарий" value={parentForm.comment} onChange={(e) => setParentForm((f) => ({ ...f, comment: e.target.value }))}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs outline-none" />
                <div className="flex gap-2">
                  <button onClick={() => { setEditingParent(false); setError(null); }} className="flex-1 p-2 bg-slate-100 rounded-xl text-xs font-black text-slate-500">Отмена</button>
                  <button onClick={handleEditParent} disabled={actionLoading === 'parent' || !parentForm.name.trim()}
                    className="flex-1 p-2 bg-emerald-500 text-white rounded-xl text-xs font-black hover:bg-emerald-600 disabled:opacity-50 flex items-center justify-center gap-1">
                    {actionLoading === 'parent' ? <Loader2 size={12} className="animate-spin" /> : null} Сохранить
                  </button>
                </div>
              </div>
            ) : showParentForm ? (
              <div className="space-y-2">
                <input type="text" placeholder="Имя родителя *" value={parentForm.name} onChange={(e) => setParentForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none" />
                <input type="text" placeholder="Телефон" value={parentForm.phone} onChange={(e) => setParentForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs outline-none" />
                <input type="text" placeholder="TG username" value={parentForm.tg_username} onChange={(e) => setParentForm((f) => ({ ...f, tg_username: e.target.value }))}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs outline-none" />
                <input type="text" placeholder="Комментарий" value={parentForm.comment} onChange={(e) => setParentForm((f) => ({ ...f, comment: e.target.value }))}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs outline-none" />
                <div className="flex gap-2">
                  <button onClick={() => { setShowParentForm(false); setError(null); }} className="flex-1 p-2 bg-slate-100 rounded-xl text-xs font-black text-slate-500">Отмена</button>
                  <button onClick={handleCreateParent} disabled={actionLoading === 'parent' || !parentForm.name.trim()}
                    className="flex-1 p-2 bg-emerald-500 text-white rounded-xl text-xs font-black hover:bg-emerald-600 disabled:opacity-50 flex items-center justify-center gap-1">
                    {actionLoading === 'parent' ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />} Создать и привязать
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-xs text-slate-400 italic py-2">Не указан</div>
                <div className="flex gap-2">
                  <button onClick={() => { setShowParentForm(true); setParentForm({ name: '', phone: '', tg_username: '', comment: '' }); setError(null); }}
                    className="flex-1 p-2 bg-slate-200 hover:bg-slate-300 rounded-xl text-[10px] font-black text-slate-600 flex items-center justify-center gap-1">
                    <PlusCircle size={12} /> Создать
                  </button>
                  <button onClick={() => { setShowParentPicker(true); setParentSearch(''); setError(null); }}
                    className="flex-1 p-2 bg-slate-200 hover:bg-slate-300 rounded-xl text-[10px] font-black text-slate-600 flex items-center justify-center gap-1">
                    <Link2 size={12} /> Привязать
                  </button>
                </div>

                {/* Existing parent picker */}
                {showParentPicker && (
                  <div className="space-y-2 mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <input
                      type="text" placeholder="Поиск по имени или телефону…" value={parentSearch}
                      onChange={(e) => setParentSearch(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs outline-none" />
                    {parentsLoading ? (
                      <div className="text-xs text-slate-400 italic py-2 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Загрузка...</div>
                    ) : (() => {
                      const filtered = allParents.filter((p) =>
                        !parentSearch || (p.name || '').toLowerCase().includes(parentSearch.toLowerCase()) || (p.phone || '').includes(parentSearch));
                      return filtered.length === 0 ? (
                        <div className="text-xs text-slate-400 italic py-2">Ничего не найдено</div>
                      ) : (
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {filtered.map((p) => {
                            const linkedCount = (p.student_ids || []).length;
                            return (
                            <button key={p.id}
                              onClick={() => handleLinkExistingParent(p)}
                              disabled={actionLoading === 'parent'}
                              className="w-full p-2 bg-white hover:bg-emerald-50 rounded-lg text-xs text-left flex items-center justify-between transition-all border border-transparent hover:border-emerald-200 disabled:opacity-50">
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-slate-700 truncate">{p.name}</div>
                                <div className="text-slate-400 text-[10px] flex items-center gap-2">
                                  <span>{p.phone || '—'}</span>
                                  {linkedCount > 0 && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-500 text-[9px] font-bold">
                                      {linkedCount} уч.
                                    </span>
                                  )}
                                </div>
                              </div>
                              <Link2 size={12} className="text-emerald-500 shrink-0 ml-2" />
                            </button>
                          );})}
                        </div>
                      );
                    })()}
                    <button onClick={() => { setShowParentPicker(false); setError(null); }}
                      className="w-full p-1.5 text-[10px] font-black text-slate-400 hover:text-slate-600">Отмена</button>
                  </div>
                )}
              </div>
            )}
          </Section>
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

      {/* Create schedule modal (nested) */}
      {showCreateSchedule && (
        <CreateScheduleModal
          students={students}
          groups={groups || []}
          defaultDate={null}
          onClose={() => setShowCreateSchedule(false)}
          onCreated={() => { setShowCreateSchedule(false); fetchSchedule(); onUpdated?.(); }}
        />
      )}
    </>
  );
}
