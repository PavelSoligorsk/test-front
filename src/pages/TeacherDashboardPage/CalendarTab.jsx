import React, { useState, useEffect, useCallback, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ruLocale from '@fullcalendar/core/locales/ru';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import {
  Calendar,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Repeat,
} from 'lucide-react';
import { teacherApi } from '../../features/teacher/api';
import LessonModal from './LessonModal';
import CreateScheduleModal from './CreateScheduleModal';
import SchedulesListModal from './SchedulesListModal';

dayjs.extend(utc);

// Status-based colors for FullCalendar events
const STATUS_COLORS = {
  scheduled: { bg: '#3b82f6', border: '#2563eb', text: '#ffffff' },
  completed: { bg: '#10b981', border: '#059669', text: '#ffffff' },
  cancelled: { bg: '#9ca3af', border: '#6b7280', text: '#ffffff' },
  rescheduled: { bg: '#8b5cf6', border: '#7c3aed', text: '#ffffff' },
};

// Format balance in kopecks → BYN with sign
function formatBalance(kopecks) {
  if (kopecks == null) return '';
  const byn = (kopecks / 100).toFixed(2);
  const sign = kopecks >= 0 ? '+' : '';
  return `${sign}${byn} BYN`;
}

function getEventColors(lesson) {
  return STATUS_COLORS[lesson.status] || STATUS_COLORS.scheduled;
}

// Custom event content — show title, time, student name, balance
function renderEventContent(eventInfo) {
  const { event } = eventInfo;
  const { studentName, balanceStr, lesson } = event.extendedProps || {};

  return (
    <div style={{ padding: '2px 4px', fontSize: '11px', lineHeight: '1.2' }}>
      <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {event.title}
      </div>
      {studentName && (
        <div style={{ fontSize: '9px', opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {studentName}
        </div>
      )}
      {balanceStr && (
        <div style={{ fontSize: '9px', fontWeight: 700, opacity: 0.9, marginTop: '1px' }}>
          💰 {balanceStr}
        </div>
      )}
    </div>
  );
}

export default function CalendarTab({ students, groups, onRefresh }) {
  const calendarRef = useRef(null);
  const [viewMode, setViewMode] = useState('dayGridMonth'); // 'dayGridMonth' | 'timeGridWeek'
  const [currentTitle, setCurrentTitle] = useState('');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modals
  const [selectedLesson, setSelectedLesson] = useState(null); // lesson data for LessonModal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createDate, setCreateDate] = useState(null); // pre-fill date from calendar click
  const [showSchedulesList, setShowSchedulesList] = useState(false);

  // Fetch calendar data
  const fetchCalendar = useCallback(async (dateFrom, dateTo) => {
    setLoading(true);
    setError(null);
    try {
      const res = await teacherApi.getCalendar(dateFrom, dateTo);
      const days = res.data?.days || [];

      // Flatten days into FullCalendar events
      const allEvents = [];
      for (const day of days) {
        for (const lesson of day.lessons || []) {
          const start = dayjs.utc(lesson.scheduled_date);
          const end = start.add(lesson.duration_minutes || 60, 'minute');
          const colors = getEventColors(lesson);
          const studentName = lesson.student_name || `ID: ${lesson.student_id}`;
          const groupLabel = lesson.group_name ? ` [${lesson.group_name}]` : '';
          const balanceStr = formatBalance(lesson.student_balance);

          allEvents.push({
            id: String(lesson.id),
            title: `${lesson.title || 'Занятие'}${groupLabel}`,
            start: start.format('YYYY-MM-DDTHH:mm:ss'),
            end: end.format('YYYY-MM-DDTHH:mm:ss'),
            backgroundColor: colors.bg,
            borderColor: colors.border,
            textColor: colors.text,
            extendedProps: {
              lesson,
              studentName,
              balanceStr,
            },
          });
        }
      }
      setEvents(allEvents);
    } catch (e) {
      console.error('Calendar fetch error:', e);
      setError('Не удалось загрузить календарь');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch: wide range (past month + current + 3 months ahead)
  useEffect(() => {
    const now = dayjs.utc();
    const from = now.subtract(30, 'day').startOf('day').format('YYYY-MM-DDTHH:mm:ss');
    const to = now.add(90, 'day').endOf('day').format('YYYY-MM-DDTHH:mm:ss');
    fetchCalendar(from, to);
  }, [fetchCalendar]);

  // Refetch on dates change (FullCalendar callback)
  const handleDatesSet = useCallback(
    (arg) => {
      setCurrentTitle(arg.view.title);
      const from = dayjs.utc(arg.start).format('YYYY-MM-DDTHH:mm:ss');
      const to = dayjs.utc(arg.end).format('YYYY-MM-DDTHH:mm:ss');
      fetchCalendar(from, to);
    },
    [fetchCalendar],
  );

  // Click on event → open LessonModal
  const handleEventClick = useCallback((info) => {
    setSelectedLesson(info.event.extendedProps.lesson);
  }, []);

  // Click on empty slot → open create modal with pre-filled date
  const handleDateClick = useCallback((info) => {
    setCreateDate(dayjs.utc(info.dateStr).format('YYYY-MM-DDTHH:mm:ss'));
    setShowCreateModal(true);
  }, []);

  // Navigation helpers
  const handlePrev = () => {
    const api = calendarRef.current?.getApi();
    if (api) api.prev();
  };

  const handleNext = () => {
    const api = calendarRef.current?.getApi();
    if (api) api.next();
  };

  const handleToday = () => {
    const api = calendarRef.current?.getApi();
    if (api) api.today();
  };

  // Callback after lesson action → refresh calendar
  const handleLessonUpdated = useCallback(() => {
    setSelectedLesson(null);
    // Trigger refetch by navigating calendar API
    const api = calendarRef.current?.getApi();
    if (api) {
      const from = dayjs.utc(api.view.activeStart).format('YYYY-MM-DDTHH:mm:ss');
      const to = dayjs.utc(api.view.activeEnd).format('YYYY-MM-DDTHH:mm:ss');
      fetchCalendar(from, to);
    }
    onRefresh?.();
  }, [fetchCalendar, onRefresh]);

  const handleScheduleCreated = useCallback(() => {
    setShowCreateModal(false);
    setCreateDate(null);
    handleLessonUpdated();
  }, [handleLessonUpdated]);

  // Legend
  const legendItems = [
    { label: 'Запланировано', color: STATUS_COLORS.scheduled.bg },
    { label: 'Проведено', color: STATUS_COLORS.completed.bg },
    { label: 'Отменено', color: STATUS_COLORS.cancelled.bg },
    { label: 'Перенесено', color: STATUS_COLORS.rescheduled.bg },
  ];

  return (
    <div className="bg-white dark:bg-slate-800/50 rounded-[3rem] shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 md:p-8 bg-slate-50/50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-500">
              <Calendar size={22} />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black italic uppercase text-slate-900 dark:text-white">
                Календарь занятий
              </h2>
              <p className="text-[10px] font-black text-emerald-600/70 uppercase tracking-widest">
                {currentTitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View toggle */}
            <div className="flex bg-slate-200 dark:bg-slate-700 rounded-xl p-1">
              <button
                onClick={() => setViewMode('timeGridWeek')}
                className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${
                  viewMode === 'timeGridWeek'
                    ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                }`}
              >
                Неделя
              </button>
              <button
                onClick={() => setViewMode('dayGridMonth')}
                className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${
                  viewMode === 'dayGridMonth'
                    ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                }`}
              >
                Месяц
              </button>
            </div>

            {/* Nav buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrev}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300 transition-all"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={handleToday}
                className="px-3 py-2 text-[10px] font-black uppercase bg-slate-200 dark:bg-slate-700 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-all"
              >
                Сегодня
              </button>
              <button
                onClick={handleNext}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300 transition-all"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Create button */}
            <button
              onClick={() => { setCreateDate(null); setShowCreateModal(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase transition-all shadow-lg shadow-emerald-200"
            >
              <PlusCircle size={14} />
              Создать
            </button>
            <button
              onClick={() => setShowSchedulesList(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase transition-all"
            >
              <Repeat size={14} />
              Расписания
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 mt-4">
          {legendItems.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-sm inline-block"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar */}
      <div className="p-2 md:p-4">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <p className="text-sm font-bold text-red-600">{error}</p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="animate-spin text-emerald-500" />
            <span className="ml-2 text-sm font-bold text-slate-500">Загрузка...</span>
          </div>
        )}

        <FullCalendar
          key={viewMode}
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={viewMode}
          headerToolbar={false}
          height="auto"
          locale={ruLocale}
          firstDay={1}
          events={events}
          datesSet={handleDatesSet}
          eventClick={handleEventClick}
          dateClick={handleDateClick}
          eventContent={renderEventContent}
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          slotMinTime="08:00:00"
          slotMaxTime="22:00:00"
          allDaySlot={false}
          dayMaxEventRows={3}
          eventDisplay="block"
          buttonText={{
            today: 'Сегодня',
            month: 'Месяц',
            week: 'Неделя',
            day: 'День',
          }}
          views={{
            dayGridMonth: {
              titleFormat: { year: 'numeric', month: 'long' },
            },
            timeGridWeek: {
              titleFormat: { year: 'numeric', month: 'long', day: 'numeric' },
            },
          }}
        />
      </div>

      {/* Modals */}
      {selectedLesson && (
        <LessonModal
          lesson={selectedLesson}
          students={students}
          groups={groups}
          onClose={() => setSelectedLesson(null)}
          onUpdated={handleLessonUpdated}
        />
      )}

      {showCreateModal && (
        <CreateScheduleModal
          students={students}
          groups={groups}
          defaultDate={createDate}
          onClose={() => { setShowCreateModal(false); setCreateDate(null); }}
          onCreated={handleScheduleCreated}
        />
      )}

      {showSchedulesList && (
        <SchedulesListModal
          students={students}
          groups={groups}
          onClose={() => setShowSchedulesList(false)}
          onUpdated={handleLessonUpdated}
        />
      )}
    </div>
  );
}
