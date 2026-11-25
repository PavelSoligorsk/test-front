import { ArrowRight, Clock, FileText, Trash2 } from 'lucide-react';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function studentName(row) {
  if (row.student_name) return row.student_name;
  const name = [row.first_name, row.last_name].filter(Boolean).join(' ');
  return name || `ID ${row.user_id || row.id}`;
}

export default function GroupTestCard({ test, groupId, navigate, onUnassign, solversOnly = false }) {
  const students = test.students || [];
  const done = students.filter((row) => row.is_completed).length;
  const total = students.length;
  const rows = solversOnly ? students.filter((row) => row.is_completed) : students;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{test.test_title}</p>
            {done > 0 ? <span className="text-xs text-zinc-500">решён</span> : null}
          </div>
          <p className="mt-1 text-xs tabular-nums text-zinc-500">
            {done}/{total} · {formatDate(test.assigned_at)}
            {test.due_date ? ` · до ${formatDate(test.due_date)}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {done > 0 ? (
            <button
              type="button"
              onClick={() => navigate(`/teacher/groups/${groupId}/tests/${test.test_id}`)}
              className="inline-flex items-center gap-1 rounded-xl bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <FileText size={12} /> Разбор
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onUnassign(test.test_id)}
            className="rounded-xl p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
            title="Снять со всей группы"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div className="h-full rounded-full bg-zinc-900 dark:bg-white" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
      </div>
      <div className="space-y-1">
        {rows.map((row) => (
          <div key={row.user_id} className="flex items-center justify-between gap-2 text-xs">
            <button
              type="button"
              onClick={() => navigate(`/teacher/students/${row.user_id}`)}
              className="truncate font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
            >
              {studentName(row)}
            </button>
            {row.is_completed ? (
              <button
                type="button"
                onClick={() => row.result_id && navigate(`/teacher/results/${row.result_id}`)}
                className="flex items-center gap-1 tabular-nums text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                {row.total_points ?? 0}/{test.max_points ?? 0}
                <ArrowRight size={12} />
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 text-zinc-400">
                <Clock size={12} /> Ждёт
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
