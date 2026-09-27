import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { boardErrorMessage, getTeacherLessonBoards } from '../../features/board/api';
import { teacherApi } from '../../features/teacher/api';
import { PageShell } from '../../shared/ui';

dayjs.extend(utc);

function lessonDate(lesson) {
  const raw = lesson?.scheduled_date;
  if (!raw) return null;
  return dayjs.utc(raw).toDate();
}

function formatWhen(date) {
  if (!date || Number.isNaN(date.getTime())) return 'Без даты';
  return new Intl.DateTimeFormat('ru', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function lessonLabel(lesson) {
  const group = lesson.group_name ? ` · ${lesson.group_name}` : '';
  const student = lesson.student_name || (lesson.student_id ? `ID ${lesson.student_id}` : '');
  return `${student}${group}`.replace(/^ · /, '') || 'Занятие';
}

function sortLessons(lessons) {
  const now = Date.now();
  const upcoming = [];
  const past = [];
  for (const lesson of lessons) {
    const time = lessonDate(lesson)?.getTime() ?? 0;
    (time >= now ? upcoming : past).push(lesson);
  }
  upcoming.sort((a, b) => (lessonDate(a)?.getTime() ?? 0) - (lessonDate(b)?.getTime() ?? 0));
  past.sort((a, b) => (lessonDate(b)?.getTime() ?? 0) - (lessonDate(a)?.getTime() ?? 0));
  return [...upcoming, ...past];
}

export default function TeacherBoardListPage() {
  const navigate = useNavigate();
  const [lessons, setLessons] = useState(null);
  const [openingId, setOpeningId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const now = dayjs.utc();
    const from = now.subtract(30, 'day').startOf('day').format('YYYY-MM-DDTHH:mm:ss');
    const to = now.add(90, 'day').endOf('day').format('YYYY-MM-DDTHH:mm:ss');
    teacherApi.getCalendar(from, to)
      .then((res) => {
        const rows = [];
        for (const day of res.data?.days || []) {
          for (const lesson of day.lessons || []) rows.push(lesson);
        }
        setLessons(sortLessons(rows));
      })
      .catch(() => {
        setLessons([]);
        setError('Не удалось загрузить занятия');
      });
  }, []);

  async function openClass(lesson) {
    if (openingId) return;
    setOpeningId(lesson.id);
    setError('');
    try {
      const pack = await getTeacherLessonBoards(lesson.id);
      if (!pack?.class?.id) throw new Error('no class board');
      navigate(`/teacher/board/${pack.class.id}`);
    } catch (err) {
      setError(boardErrorMessage(err, 'Не удалось открыть доску занятия'));
      setOpeningId(null);
    }
  }

  return (
    <PageShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Доски</h1>
        <p className="mt-1 max-w-xl text-sm text-zinc-500">
          У каждого занятия своя доска: на ней пишете вы, тетради учеников открываются только для просмотра.
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {lessons == null ? (
        <div className="grid gap-3">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-20 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
          ))}
        </div>
      ) : lessons.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-zinc-300 px-6 py-16 text-center dark:border-zinc-700">
          <p className="text-base font-medium text-zinc-900 dark:text-zinc-100">Нет занятий в этом периоде</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
            Доска создаётся при первом открытии занятия из календаря.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {lessons.map((lesson) => {
            const when = formatWhen(lessonDate(lesson));
            const opening = openingId === lesson.id;
            return (
              <button
                key={lesson.id}
                type="button"
                onClick={() => openClass(lesson)}
                disabled={Boolean(openingId)}
                className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left shadow-sm transition-colors hover:border-zinc-300 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {lesson.title || 'Занятие'}
                  </p>
                  <p className="mt-1 truncate text-xs text-zinc-500">
                    {when}
                    {' · '}
                    {lessonLabel(lesson)}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                  {opening ? 'Открываем…' : 'Доска'}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
