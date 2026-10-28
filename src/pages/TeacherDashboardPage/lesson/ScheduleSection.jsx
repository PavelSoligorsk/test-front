import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Loader2, Pencil, PlusCircle, Power, PowerOff, Repeat, Trash2 } from 'lucide-react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { teacherApi } from '../../../features/teacher/api';
import CreateScheduleModal from '../CreateScheduleModal';
import Section from './Section';
import { DAY_CODES, apiError, formatPrice } from './lessonFormat';

dayjs.extend(utc);

function scheduleToForm(data) {
  return {
    title: data.title || '',
    description: data.description || '',
    time_start: data.time_start || '',
    duration_minutes: data.duration_minutes || 60,
    price_per_lesson: data.price_per_lesson ? (data.price_per_lesson / 100).toFixed(2) : '',
    recur_until: data.recur_until || '',
  };
}

/** Расписание занятия: просмотр, правка, пауза, удаление. Изменения касаются всех его занятий. */
export default function ScheduleSection({ scheduleId, students, groups, onError, onSuccess, onUpdated }) {
  const [schedule, setSchedule] = useState(null);
  const [scheduleLoading, setScheduleLoading] = useState(() => Boolean(scheduleId));
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({});
  const [scheduleDayToggle, setScheduleDayToggle] = useState([]);
  const [showScheduleDeleteConfirm, setShowScheduleDeleteConfirm] = useState(false);
  const [showCreateSchedule, setShowCreateSchedule] = useState(false);
  const [busy, setBusy] = useState(false);

  // Ответ разбирается в колбэке промиса — эту же функцию зовёт эффект при открытии.
  const fetchSchedule = useCallback(() => {
    if (!scheduleId) return Promise.resolve();
    return teacherApi.getSchedule(scheduleId)
      .then((res) => {
        setSchedule(res.data);
        setScheduleForm(scheduleToForm(res.data));
        setScheduleDayToggle(res.data.days_of_week || []);
      })
      .catch(() => { /* ignore */ })
      .finally(() => setScheduleLoading(false));
  }, [scheduleId]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const handleSaveSchedule = async () => {
    setBusy(true); onError(null);
    try {
      await teacherApi.updateSchedule(schedule.id, {
        ...scheduleForm,
        days_of_week: scheduleDayToggle,
        duration_minutes: Number(scheduleForm.duration_minutes) || 60,
        price_per_lesson: scheduleForm.price_per_lesson ? Math.round(Number(scheduleForm.price_per_lesson) * 100) : null,
        recur_until: scheduleForm.recur_until ? dayjs.utc(scheduleForm.recur_until).format('YYYY-MM-DDTHH:mm:ss') : null,
      });
      onSuccess('Расписание обновлено');
      setEditingSchedule(false);
      fetchSchedule();
      onUpdated?.();
    } catch (e) { onError(apiError(e, 'Ошибка при обновлении расписания')); }
    finally { setBusy(false); }
  };

  const handleToggleSchedule = async (active) => {
    setBusy(true); onError(null);
    try {
      const res = await teacherApi.toggleSchedule(schedule.id, active);
      setSchedule(res.data);
      onSuccess(active ? 'Расписание включено' : 'Расписание остановлено');
    } catch (e) { onError(apiError(e, 'Ошибка')); }
    finally { setBusy(false); }
  };

  const handleDeleteSchedule = async () => {
    setShowScheduleDeleteConfirm(false);
    setBusy(true); onError(null);
    try {
      await teacherApi.deleteSchedule(schedule.id);
      setSchedule(null);
      onSuccess('Расписание удалено');
      onUpdated?.();
    } catch (e) { onError(apiError(e, 'Ошибка при удалении расписания')); }
    finally { setBusy(false); }
  };

  const toggleScheduleDay = (code) => {
    setScheduleDayToggle((prev) =>
      prev.includes(code) ? prev.filter((d) => d !== code) : [...prev, code]
    );
  };

  return (
    <>
      <Section icon={Repeat} title="Расписание" defaultOpen={true} badge={
          scheduleLoading ? <Loader2 size={12} className="animate-spin text-zinc-400 ml-1" /> :
          schedule ? <span className={`ml-1 px-2 py-0.5 rounded-full text-[8px] font-semibold ${schedule.is_active ? 'bg-zinc-100 text-zinc-700' : 'bg-gray-200 text-gray-500'}`}>{schedule.is_active ? 'Активно' : 'Остановлено'}</span> : null
        }>
          {scheduleLoading ? (
            <div className="text-xs text-zinc-400 py-2 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Загрузка...</div>
          ) : schedule && !editingSchedule ? (
            <div className="space-y-3">
              {/* Предупреждение */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-2 flex items-start gap-2">
                <AlertTriangle size={14} className="text-zinc-500 shrink-0 mt-0.5" />
                <span className="text-[10px] font-bold text-zinc-700">
                  Изменения затронут <u>все</u> занятия этого расписания
                </span>
              </div>
              <div className="text-xs text-zinc-500 space-y-1">
                <div><span className="font-bold">{schedule.title}</span></div>
                {schedule.description && <div className="text-[10px]">{schedule.description}</div>}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-400">Дни:</span>
                  {schedule.days_of_week?.map((d) => (
                    <span key={d} className="px-1.5 py-0.5 bg-zinc-200 rounded text-xs font-medium text-zinc-600">
                      {DAY_CODES.find((x) => x.code === d)?.label || d}
                    </span>
                  ))}
                </div>
                <div>🕐 {schedule.time_start} · {schedule.duration_minutes} мин · {schedule.price_per_lesson != null ? formatPrice(schedule.price_per_lesson) : '—'}</div>
                <div>Тип: <span className="font-semibold text-[10px]">{schedule.schedule_type === 'group' ? 'Групповое' : 'Индивидуальное'}</span></div>
                {schedule.recur_until && (
                  <div className="text-[10px] text-zinc-400">Повторять до: <span className="font-bold text-zinc-600">{dayjs.utc(schedule.recur_until).format('DD.MM.YYYY')}</span></div>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => { setEditingSchedule(true); onError(null); }}
                  className="px-3 py-1.5 bg-zinc-200 hover:bg-zinc-300 rounded-xl text-[10px] font-semibold text-zinc-600 flex items-center gap-1">
                  <Pencil size={10} /> Ред.
                </button>
                <button onClick={() => handleToggleSchedule(!schedule.is_active)} disabled={busy}
                  className="px-3 py-1.5 bg-zinc-200 hover:bg-zinc-300 rounded-xl text-[10px] font-semibold text-zinc-600 flex items-center gap-1 disabled:opacity-50">
                  {busy ? <Loader2 size={10} className="animate-spin" /> : schedule.is_active ? <PowerOff size={10} /> : <Power size={10} />}
                  {schedule.is_active ? 'Остановить' : 'Включить'}
                </button>
                {!showScheduleDeleteConfirm ? (
                  <button onClick={() => setShowScheduleDeleteConfirm(true)} disabled={busy}
                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 rounded-xl text-[10px] font-semibold text-red-600 flex items-center gap-1 disabled:opacity-50">
                    <Trash2 size={10} /> Удалить
                  </button>
                ) : (
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-bold text-red-600">Точно?</span>
                    <button onClick={handleDeleteSchedule} disabled={busy}
                      className="px-2 py-1 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 disabled:opacity-50 flex items-center gap-0.5">
                      {busy ? <Loader2 size={9} className="animate-spin" /> : <Trash2 size={9} />} Да
                    </button>
                    <button onClick={() => setShowScheduleDeleteConfirm(false)}
                      className="px-2 py-1 bg-zinc-200 rounded-lg text-xs font-medium text-zinc-500 hover:bg-zinc-300">
                      Нет
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : schedule && editingSchedule ? (
            <div className="space-y-2">
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-2 flex items-start gap-2">
                <AlertTriangle size={14} className="text-zinc-500 shrink-0 mt-0.5" />
                <span className="text-[10px] font-bold text-zinc-700">
                  Изменения затронут <u>все</u> занятия этого расписания
                </span>
              </div>
              <input type="text" value={scheduleForm.title || ''} onChange={(e) => setScheduleForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Название" className="w-full p-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10" />
              <input type="text" value={scheduleForm.description || ''} onChange={(e) => setScheduleForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Описание" className="w-full p-2 bg-white border border-zinc-200 rounded-xl text-xs outline-none" />
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-3">
                  <label className="text-xs font-medium text-zinc-500">Повторять до</label>
                  <input type="datetime-local" value={scheduleForm.recur_until || ''} onChange={(e) => setScheduleForm((f) => ({ ...f, recur_until: e.target.value }))}
                    className="w-full p-2 bg-white border border-zinc-200 rounded-xl text-xs outline-none" placeholder="Пусто = бессрочно" />
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {DAY_CODES.map((day) => (
                  <button key={day.code} onClick={() => toggleScheduleDay(day.code)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${scheduleDayToggle.includes(day.code) ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950' : 'bg-white border border-zinc-200 text-zinc-500'}`}>
                    {day.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-medium text-zinc-500">Время</label>
                  <input type="time" value={scheduleForm.time_start || ''} onChange={(e) => setScheduleForm((f) => ({ ...f, time_start: e.target.value }))}
                    className="w-full p-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-500">Мин</label>
                  <input type="number" value={scheduleForm.duration_minutes || 60} onChange={(e) => setScheduleForm((f) => ({ ...f, duration_minutes: Number(e.target.value) }))}
                    className="w-full p-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-500">Цена ₽</label>
                  <input type="number" value={scheduleForm.price_per_lesson || ''} onChange={(e) => setScheduleForm((f) => ({ ...f, price_per_lesson: e.target.value }))}
                    className="w-full p-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold outline-none" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditingSchedule(false); onError(null); }}
                  className="flex-1 p-2 bg-zinc-100 rounded-xl text-xs font-semibold text-zinc-500">Отмена</button>
                <button onClick={handleSaveSchedule} disabled={busy}
                  className="flex-1 p-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-xl text-xs font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 flex items-center justify-center gap-1">
                  {busy ? <Loader2 size={12} className="animate-spin" /> : null} Сохранить
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 py-2">
              <div className="text-xs text-zinc-400">Расписание не найдено</div>
              <button
                onClick={() => setShowCreateSchedule(true)}
                className="w-full p-2 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 rounded-xl text-[10px] font-semibold flex items-center justify-center gap-1.5">
                <PlusCircle size={12} />
                Создать расписание
              </button>
            </div>
          )}
        </Section>

      {/* Create schedule modal (nested): поверх окна занятия */}
      {showCreateSchedule && createPortal(
        <CreateScheduleModal
          students={students}
          groups={groups || []}
          defaultDate={null}
          onClose={() => setShowCreateSchedule(false)}
          onCreated={() => { setShowCreateSchedule(false); fetchSchedule(); onUpdated?.(); }}
        />,
        document.body,
      )}
    </>
  );
}
