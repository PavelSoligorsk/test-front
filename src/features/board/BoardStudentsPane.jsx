import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronDown, Users } from 'lucide-react';
import { MarkdownRenderer } from '../../shared/ui';
import {
  NO_ANSWER,
  answerText,
  answerVerdict,
  fetchGroupAssignments,
  fetchGroupReview,
  fetchGroupStudents,
  fetchResult,
  fetchStudentAssignments,
  fetchStudentHistory,
  fetchStudents,
  formatDate,
  optionList,
  percentOf,
  studentName,
} from './studentsApi';

function errorText(err) {
  const detail = err?.response?.data?.detail;
  return typeof detail === 'string' && detail ? detail : 'Не удалось загрузить данные';
}

const LOADERS = {
  group: ([groupId]) => Promise.all([fetchGroupStudents(groupId), fetchGroupAssignments(groupId)])
    .then(([students, group]) => ({ students: Array.isArray(students) ? students : [], group })),
  students: (ids) => fetchStudents().then((list) => {
    const wanted = new Set(ids.map(String));
    return { students: (Array.isArray(list) ? list : []).filter((item) => wanted.has(String(item.id))), group: null };
  }),
  student: ([id]) => Promise.all([fetchStudentAssignments(id), fetchStudentHistory(id)])
    .then(([assignments, history]) => ({
      assignments: Array.isArray(assignments) ? assignments : [],
      history: Array.isArray(history) ? history : [],
    })),
  result: ([id]) => fetchResult(id),
  matrix: ([groupId, testId]) => fetchGroupReview(groupId, testId),
};

function useRemote(kind, args) {
  const key = kind ? `${kind}:${args.join(',')}` : null;
  const [state, setState] = useState({ key: null, data: null, error: null });
  useEffect(() => {
    if (!key) return undefined;
    let cancelled = false;
    LOADERS[kind](args)
      .then((data) => { if (!cancelled) setState({ key, data, error: null }); })
      .catch((err) => { if (!cancelled) setState({ key, data: null, error: errorText(err) }); });
    return () => { cancelled = true; };
    // args входят в key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const ready = state.key === key;
  return { loading: Boolean(key) && !ready, data: ready ? state.data : null, error: ready ? state.error : null };
}

function Status({ loading, error, empty }) {
  if (loading) return <p className="px-2 py-8 text-center text-sm text-zinc-400">Загрузка…</p>;
  if (error) return <p className="px-2 py-8 text-center text-sm text-zinc-500">{error}</p>;
  if (empty) return <p className="px-2 py-8 text-center text-sm text-zinc-500">{empty}</p>;
  return null;
}

function SectionTitle({ children }) {
  return <p className="mb-1 mt-4 px-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400 first:mt-0">{children}</p>;
}

function Score({ percent }) {
  if (percent == null) return null;
  const tone = percent >= 80 ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300'
    : percent >= 50 ? 'text-amber-700 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-300'
      : 'text-rose-700 bg-rose-50 dark:bg-rose-950/50 dark:text-rose-300';
  return <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${tone}`}>{percent}%</span>;
}

function Row({ title, note, right, onClick }) {
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">{title}</span>
        {note && <span className="block truncate text-xs text-zinc-400">{note}</span>}
      </span>
      {right}
    </>
  );
  if (!onClick) return <div className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5">{body}</div>;
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left hover:bg-white dark:hover:bg-zinc-900">
      {body}
    </button>
  );
}

function sortByDate(list) {
  return [...list].sort((a, b) => String(b.result?.completed_at || '').localeCompare(String(a.result?.completed_at || '')));
}

function Attempts({ items, onOpen }) {
  const [open, setOpen] = useState(false);
  if (!items.length) return null;
  return (
    <div className="pb-1 pl-3">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex items-center gap-1 px-3 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
        <ChevronDown size={12} className={open ? 'rotate-180' : ''} />
        Ещё попытки: {items.length}
      </button>
      {open && items.map((item) => (
        <Row
          key={item.result.id}
          title={item.result.completed_at ? formatDate(item.result.completed_at) : 'Не завершена'}
          right={<span className="shrink-0 text-xs tabular-nums text-zinc-500">{item.result.total_points ?? 0} б.</span>}
          onClick={() => onOpen(item.result.id, item.test_title)}
        />
      ))}
    </div>
  );
}

function StudentView({ student, onOpenResult }) {
  const { loading, data, error } = useRemote('student', [student.id]);
  const assignments = data?.assignments || [];
  const history = data?.history || [];
  const assignedTitles = new Set(assignments.map((item) => item.test_title));
  const selfGroups = useMemo(() => {
    const groups = new Map();
    history.filter((item) => item.result && !assignedTitles.has(item.test_title)).forEach((item) => {
      if (!groups.has(item.test_title)) groups.set(item.test_title, []);
      groups.get(item.test_title).push(item);
    });
    return [...groups.entries()].map(([title, items]) => ({ title, items: sortByDate(items) }));
    // assignedTitles выводится из data
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const status = <Status loading={loading} error={error} empty={!loading && !error && !assignments.length && !selfGroups.length ? 'Тестов пока нет' : ''} />;
  if (loading || error || (!assignments.length && !selfGroups.length)) return status;
  const pending = assignments.filter((item) => !item.is_completed || !item.result_id);
  const done = assignments.filter((item) => item.is_completed && item.result_id);

  return (
    <div>
      {pending.length > 0 && <SectionTitle>Не решены</SectionTitle>}
      {pending.map((item) => (
        <Row
          key={item.id}
          title={item.test_title}
          note={item.due_date ? `Срок: ${formatDate(item.due_date)}` : `Назначен ${formatDate(item.assigned_at)}`}
          right={<span className="shrink-0 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-semibold text-zinc-500 dark:bg-zinc-900">не решён</span>}
        />
      ))}
      {done.length > 0 && <SectionTitle>Решены</SectionTitle>}
      {done.map((item) => {
        const others = sortByDate(history.filter((entry) => entry.test_title === item.test_title && entry.result && entry.result.id !== item.result_id));
        return (
          <div key={item.id}>
            <Row
              title={item.test_title}
              note={`${item.total_points ?? 0} из ${item.max_points ?? '?'} · ${formatDate(item.completed_at)}`}
              right={<Score percent={Number.isFinite(item.percentage) ? Math.round(item.percentage) : percentOf(item.total_points, item.max_points)} />}
              onClick={() => onOpenResult(item.result_id, item.test_title)}
            />
            <Attempts items={others} onOpen={onOpenResult} />
          </div>
        );
      })}
      {selfGroups.length > 0 && <SectionTitle>Решал сам</SectionTitle>}
      {selfGroups.map(({ title, items }) => (
        <div key={title}>
          <Row
            title={title}
            note={items[0].result.completed_at ? formatDate(items[0].result.completed_at) : 'Не завершён'}
            right={<span className="shrink-0 text-xs tabular-nums text-zinc-500">{items[0].result.total_points ?? 0} б.</span>}
            onClick={() => onOpenResult(items[0].result.id, title)}
          />
          <Attempts items={items.slice(1)} onOpen={onOpenResult} />
        </div>
      ))}
    </div>
  );
}

function verdict(detail) {
  return answerVerdict(detail);
}

const VERDICT = {
  right: { label: 'Верно', tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' },
  wrong: { label: 'Ошибка', tone: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300' },
  empty: { label: 'Нет ответа', tone: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-900' },
};

function rawAnswer(value) {
  const text = String(value ?? '').trim();
  return text || NO_ANSWER;
}

function boardItem(detail, number, studentAnswers) {
  const options = optionList(detail.options);
  return {
    number,
    task: {
      id: detail.task_id ?? detail.id,
      content: detail.content || '',
      options,
      is_open_answer: detail.is_open_answer ?? !options.length,
      answer: String(detail.correct_answer ?? detail.answer ?? ''),
      solution: detail.solution || '',
      studentAnswers,
    },
  };
}

function ToBoardBar({ count, total, onCopy }) {
  return (
    <div className="mb-3 flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950">
      <span className="text-xs text-zinc-500">С ошибками: <span className="font-semibold tabular-nums text-zinc-800 dark:text-zinc-200">{count}</span> из {total}</span>
      <button
        type="button"
        disabled={!count}
        onClick={onCopy}
        className="ml-auto rounded-lg bg-zinc-900 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-zinc-950"
      >
        Ошибочные на доску
      </button>
    </div>
  );
}

function ResultView({ resultId, name, onCopy }) {
  const { loading, data, error } = useRemote('result', [resultId]);
  const details = Array.isArray(data?.details) ? data.details : [];
  const status = <Status loading={loading} error={error} empty={data && !details.length ? 'В результате нет заданий' : ''} />;
  if (loading || error || !details.length) return status;
  const who = name || studentName(data.user);
  const source = [who, data.test_title].filter(Boolean).join(' · ');
  const itemFor = (detail, index) => boardItem(detail, index + 1, [{
    name: who,
    answer: rawAnswer(detail.user_answer),
    correct: verdict(detail),
  }]);
  const wrong = details.map((detail, index) => ({ detail, index })).filter(({ detail }) => verdict(detail) !== 'right');
  const percent = percentOf(data.total_points, data.max_points);

  return (
    <div>
      <div className="mb-3 flex items-center gap-2 px-1">
        <span className="text-sm text-zinc-600 dark:text-zinc-300">{data.total_points ?? 0} из {data.max_points ?? '?'} баллов</span>
        <Score percent={percent} />
        {data.completed_at && <span className="ml-auto text-xs text-zinc-400">{formatDate(data.completed_at)}</span>}
      </div>
      <ToBoardBar count={wrong.length} total={details.length} onCopy={() => onCopy(wrong.map(({ detail, index }) => itemFor(detail, index)), { title: source })} />
      <div className="space-y-2">
        {details.map((detail, index) => {
          const options = optionList(detail.options);
          const state = verdict(detail);
          return (
            <div key={`${detail.task_id}-${index}`} className={`rounded-2xl border bg-white p-3 dark:bg-zinc-950 ${state === 'right' ? 'border-zinc-200 dark:border-zinc-800' : 'border-rose-200 dark:border-rose-900'}`}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">№{index + 1}</span>
                <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${VERDICT[state].tone}`}>{VERDICT[state].label}</span>
                <button
                  type="button"
                  onClick={() => onCopy([itemFor(detail, index)], { title: source })}
                  className="ml-auto rounded-lg px-2 py-1 text-[11px] font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  На доску
                </button>
              </div>
              <div className="mt-2 text-sm text-zinc-800 dark:text-zinc-200">
                <MarkdownRenderer className="prose-sm">{detail.content || ''}</MarkdownRenderer>
              </div>
              {options.length > 0 && (
                <ol className="mt-1 space-y-0.5 text-sm text-zinc-700 dark:text-zinc-300">
                  {options.map((option, optionIndex) => (
                    <li key={optionIndex} className="flex gap-2">
                      <span className="shrink-0 tabular-nums text-zinc-400">{optionIndex + 1}.</span>
                      <MarkdownRenderer className="prose-sm">{option}</MarkdownRenderer>
                    </li>
                  ))}
                </ol>
              )}
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-xs">
                <dt className="text-zinc-400">Ответ ученика</dt>
                <dd className={state === 'right' ? 'font-semibold text-emerald-700 dark:text-emerald-300' : 'font-semibold text-rose-700 dark:text-rose-300'}>
                  <MarkdownRenderer className="prose-sm [&_p]:my-0">{answerText(detail.user_answer, options) || NO_ANSWER}</MarkdownRenderer>
                </dd>
                {state !== 'right' && (
                  <>
                    <dt className="text-zinc-400">Правильный</dt>
                    <dd className="font-semibold text-zinc-800 dark:text-zinc-200">
                      <MarkdownRenderer className="prose-sm [&_p]:my-0">{answerText(detail.correct_answer, options) || String(detail.correct_answer ?? '—')}</MarkdownRenderer>
                    </dd>
                  </>
                )}
              </dl>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const CELL = {
  right: 'bg-emerald-500 text-white',
  wrong: 'bg-rose-500 text-white',
  empty: 'bg-zinc-200 text-zinc-500 dark:bg-zinc-800',
};

function MatrixView({ groupId, testId, title, onOpenResult, onCopy }) {
  const { loading, data, error } = useRemote('matrix', [groupId, testId]);
  const tasks = Array.isArray(data?.tasks) ? data.tasks : [];
  const rows = useMemo(() => {
    const byStudent = new Map();
    (data?.answers || []).forEach((answer) => {
      if (!byStudent.has(answer.student_id)) {
        byStudent.set(answer.student_id, { id: answer.student_id, name: studentName(answer), resultId: answer.result_id, cells: new Map() });
      }
      byStudent.get(answer.student_id).cells.set(answer.task_id, answer);
    });
    return [...byStudent.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  }, [data]);
  const status = <Status loading={loading} error={error} empty={data && !tasks.length ? 'В тесте нет заданий' : ''} />;
  if (loading || error || !tasks.length) return status;

  const cellState = (answer, task) => (answer ? answerVerdict({
    user_answer: answer.user_answer,
    correct_answer: answer.correct_answer ?? task?.answer ?? task?.correct_answer,
    options: task?.options ?? answer.options,
    is_correct: answer.is_correct,
  }) : 'empty');
  const wrongFor = (task) => rows
    .map((row) => ({ row, answer: row.cells.get(task.id) }))
    .filter(({ answer }) => cellState(answer, task) !== 'right');
  const itemFor = (task, index) => {
    const submitted = rows.map((row) => {
      const answer = row.cells.get(task.id);
      return { name: row.name, answer: rawAnswer(answer?.user_answer), correct: cellState(answer, task) };
    });
    const missing = (data?.not_submitted || []).map((student) => ({ name: studentName(student), answer: NO_ANSWER, correct: 'empty' }));
    return boardItem({ ...task, task_id: task.id }, index + 1, [...submitted, ...missing]);
  };
  const wrongTasks = tasks.map((task, index) => ({ task, index })).filter(({ task }) => rows.length && wrongFor(task).length);

  return (
    <div>
      <ToBoardBar count={wrongTasks.length} total={tasks.length} onCopy={() => onCopy(wrongTasks.map(({ task, index }) => itemFor(task, index)), { title })} />
      {rows.length ? (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 bg-white px-2 py-1.5 text-left font-semibold text-zinc-500 dark:bg-zinc-950">Ученик</th>
                {tasks.map((task, index) => <th key={task.id} className="px-0.5 py-1.5 text-center font-semibold tabular-nums text-zinc-500">{index + 1}</th>)}
                <th className="px-2 py-1.5 text-right font-semibold text-zinc-500">Итог</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const right = tasks.filter((task) => cellState(row.cells.get(task.id), task) === 'right').length;
                return (
                  <tr key={row.id} className="border-t border-zinc-100 dark:border-zinc-900">
                    <td className="sticky left-0 max-w-[140px] bg-white px-2 py-1 dark:bg-zinc-950">
                      <button type="button" disabled={!row.resultId} onClick={() => onOpenResult(row.resultId, title, row.name)} className="block truncate font-medium text-zinc-800 hover:underline dark:text-zinc-200">
                        {row.name}
                      </button>
                    </td>
                    {tasks.map((task) => {
                      const answer = row.cells.get(task.id);
                      const state = cellState(answer, task);
                      return (
                        <td key={task.id} className="px-0.5 py-1 text-center">
                          <span title={answerText(answer?.user_answer, optionList(task.options)) || NO_ANSWER} className={`inline-flex h-5 w-5 items-center justify-center rounded ${CELL[state]}`}>
                            {state === 'right' ? '✓' : state === 'wrong' ? '✗' : '—'}
                          </span>
                        </td>
                      );
                    })}
                    <td className="px-2 py-1 text-right tabular-nums text-zinc-600 dark:text-zinc-300">{right}/{tasks.length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : <p className="px-2 py-4 text-center text-sm text-zinc-500">Пока никто не сдал</p>}

      {(data?.not_submitted || []).length > 0 && (
        <>
          <SectionTitle>Не сдали</SectionTitle>
          <p className="px-1 text-sm text-zinc-600 dark:text-zinc-300">{data.not_submitted.map(studentName).join(', ')}</p>
        </>
      )}

      <SectionTitle>Задания</SectionTitle>
      <div className="space-y-0.5">
        {tasks.map((task, index) => {
          const misses = rows.length ? wrongFor(task).length : 0;
          return (
            <div key={task.id} className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-white dark:hover:bg-zinc-900">
              <span className="w-6 shrink-0 text-xs font-semibold tabular-nums text-zinc-500">№{index + 1}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-zinc-700 dark:text-zinc-300">{String(task.content || '').replace(/[#*_$`>![\]()]/g, ' ').slice(0, 90)}</span>
              {rows.length > 0 && (
                <span className={`shrink-0 text-xs tabular-nums ${misses ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {rows.length - misses}/{rows.length}
                </span>
              )}
              <button
                type="button"
                onClick={() => onCopy([itemFor(task, index)], { title })}
                className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                На доску
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RootView({ groupId, studentIds, onOpenStudent, onOpenMatrix, onOpenResult }) {
  const kind = groupId != null ? 'group' : studentIds.length ? 'students' : null;
  const args = groupId != null ? [groupId] : [...studentIds].map(String).sort();
  const { loading, data, error } = useRemote(kind, args);
  if (!kind) return <Status empty="У этой доски нет учеников" />;
  if (loading || error) return <Status loading={loading} error={error} />;
  const students = [...(data?.students || [])].sort((a, b) => studentName(a).localeCompare(studentName(b), 'ru'));
  const tests = Array.isArray(data?.group?.tests) ? data.group.tests : [];

  if (!data?.group && students.length === 1) {
    return <StudentView student={students[0]} onOpenResult={(id, title) => onOpenResult(id, title, studentName(students[0]))} />;
  }

  return (
    <div>
      {data?.group && (
        <>
          <SectionTitle>Тесты группы</SectionTitle>
          {tests.length ? tests.map((test) => {
            const list = Array.isArray(test.students) ? test.students : [];
            const done = list.filter((item) => item.is_completed);
            const scores = done.map((item) => item.percentage).filter(Number.isFinite);
            const average = scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : null;
            return (
              <Row
                key={test.test_id}
                title={test.test_title}
                note={`Сдали ${done.length} из ${list.length}${test.due_date ? ` · срок ${formatDate(test.due_date)}` : ''}`}
                right={<Score percent={average} />}
                onClick={() => onOpenMatrix(test.test_id, test.test_title)}
              />
            );
          }) : <p className="px-3 py-2 text-sm text-zinc-500">Группе пока ничего не назначено</p>}
        </>
      )}
      <SectionTitle>Ученики</SectionTitle>
      {students.length ? students.map((student) => (
        <Row key={student.id} title={studentName(student)} note={student.username ? `@${student.username}` : ''} onClick={() => onOpenStudent(student)} />
      )) : <p className="px-3 py-2 text-sm text-zinc-500">Учеников нет</p>}
    </div>
  );
}

export default function BoardStudentsPane({ groupId = null, studentIds = [], onCopy }) {
  const [stack, setStack] = useState([]);
  const view = stack[stack.length - 1] || null;
  const push = (next) => setStack((current) => [...current, next]);
  const openResult = (id, title, name) => push({ type: 'result', id, title, name });
  const resultName = (id, title) => {
    const owner = [...stack].reverse().find((item) => item.type === 'student');
    openResult(id, title, owner?.name);
  };

  const heading = !view
    ? { title: 'Ученики', note: groupId != null ? 'Группа этой доски' : 'Ученики этой доски' }
    : view.type === 'student'
      ? { title: view.name, note: 'Тесты ученика' }
      : view.type === 'matrix'
        ? { title: view.title, note: 'Ответы группы' }
        : { title: view.title || 'Результат', note: view.name || 'Разбор' };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#fafafa] dark:bg-[#09090b]">
      <div className="flex items-center gap-2 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
        {view ? (
          <button type="button" onClick={() => setStack((current) => current.slice(0, -1))} aria-label="Назад" className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900">
            <ArrowLeft size={16} />
          </button>
        ) : (
          <span className="flex h-9 w-9 items-center justify-center text-zinc-400"><Users size={16} /></span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{heading.title}</p>
          <p className="truncate text-xs text-zinc-500">{heading.note}</p>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {!view && (
          <RootView
            groupId={groupId}
            studentIds={studentIds}
            onOpenStudent={(student) => push({ type: 'student', student, name: studentName(student) })}
            onOpenMatrix={(testId, title) => push({ type: 'matrix', testId, title })}
            onOpenResult={openResult}
          />
        )}
        {view?.type === 'student' && <StudentView student={view.student} onOpenResult={resultName} />}
        {view?.type === 'matrix' && (
          <MatrixView groupId={groupId} testId={view.testId} title={view.title} onOpenResult={openResult} onCopy={onCopy} />
        )}
        {view?.type === 'result' && <ResultView resultId={view.id} name={view.name} onCopy={onCopy} />}
      </div>
    </div>
  );
}
