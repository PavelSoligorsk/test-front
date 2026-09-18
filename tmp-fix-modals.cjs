const fs = require('fs');

// --- TestManageModal ---
{
  const p = 'd:/tests_front/tsst/src/pages/TeacherDashboardPage/TestManageModal.jsx';
  let s = fs.readFileSync(p, 'utf8');
  if (!s.includes('localError &&')) {
    s = s.replace(
      '<div className="flex-1 overflow-y-auto p-6">\n          {mode === "view" && (',
      '<div className="flex-1 overflow-y-auto p-6">\n          {localError && <p className="text-sm text-red-700 mb-4" role="alert">{localError}</p>}\n          {mode === "view" && ('
    );
  }
  s = s.replace(/>ЗАКРЫТЬ</g, '>Закрыть<');
  s = s.replace(/НАЗНАЧИТЬ \(/g, 'Назначить (');
  s = s.replace(/'НАЗНАЧЕНИЕ\.\.\.'/g, "'Назначение...'");
  fs.writeFileSync(p, s);
  console.log('TestManageModal', {
    localErrorUi: s.includes('localError &&'),
    hasCaps: s.includes('ЗАКРЫТЬ') || s.includes('НАЗНАЧИТЬ'),
  });
}

// --- AiTestGeneratorModal ---
{
  const p = 'd:/tests_front/tsst/src/pages/TeacherDashboardPage/AiTestGeneratorModal.jsx';
  let a = fs.readFileSync(p, 'utf8');
  if (!a.includes('setLocalError')) {
    a = a.replace(
      'const [generating, setGenerating] = useState(false);',
      "const [generating, setGenerating] = useState(false);\n  const [localError, setLocalError] = useState('');"
    );
  }
  a = a.replace(
    /if \(selectedGroupIds\.length === 0 && selectedStudentIds\.length === 0\) \{ throw new Error\([^)]+\); \}/,
    "if (selectedGroupIds.length === 0 && selectedStudentIds.length === 0) { setLocalError('Выберите хотя бы одну группу или одного ученика'); return; }\n    setLocalError('');"
  );
  a = a.replace(
    /catch \(err\) \{\s*console\.error\(err\);\s*\}/,
    "catch (err) {\n      console.error(err);\n      setLocalError(err?.response?.data?.detail || err?.message || 'Ошибка генерации');\n    }"
  );
  a = a.replace(/bg-zinc-900 dark:bg-white p-6 text-white rounded-t-\[[^\]]+\]/g, 'bg-zinc-900 p-6 text-white rounded-t-3xl');
  a = a.replace(/bg-zinc-900 dark:bg-white p-6 text-white rounded-t-3xl/g, 'bg-zinc-900 p-6 text-white rounded-t-3xl');
  if (!a.includes('localError &&')) {
    // insert after header close — look for form start
    a = a.replace(
      /(\s*)(<form onSubmit=\{handleSubmit\})/,
      '\n          {localError && <p className="text-sm text-red-700 px-6 pt-3" role="alert">{localError}</p>}\n$1$2'
    );
  }
  fs.writeFileSync(p, a);
  console.log('AiTestGeneratorModal', {
    throwLeft: a.includes('throw new Error'),
    localError: a.includes('setLocalError'),
  });
}

// --- Deduplicate broken class stacks + primary zinc-500 → zinc-900 ---
const files = [
  'TestBank.jsx', 'TheoryBank.jsx', 'TestConstructor.jsx', 'CalendarTab.jsx', 'TheoryGeneratorTab.jsx',
  'TestManageModal.jsx', 'GroupStudentsModal.jsx', 'AssignTestToGroupModal.jsx', 'GroupDetailModal.jsx',
  'CreateGroupModal.jsx', 'AiTestGeneratorModal.jsx', 'LessonModal.jsx', 'CreateScheduleModal.jsx', 'SchedulesListModal.jsx',
];
for (const f of files) {
  const p = `d:/tests_front/tsst/src/pages/TeacherDashboardPage/${f}`;
  if (!fs.existsSync(p)) { console.log('missing', f); continue; }
  let s = fs.readFileSync(p, 'utf8');
  const before = s;
  s = s.replace(/dark:bg-zinc-900 dark:bg-white/g, 'dark:bg-white');
  s = s.replace(/bg-zinc-900 dark:bg-white dark:bg-white/g, 'bg-zinc-900 dark:bg-white');
  s = s.replace(/bg-zinc-500(\b)/g, 'bg-zinc-900$1');
  s = s.replace(/hover:bg-zinc-800 dark:hover:bg-zinc-200 dark:hover:bg-zinc-200/g, 'hover:bg-zinc-800 dark:hover:bg-zinc-200');
  s = s.replace(/dark:hover:bg-zinc-800 dark:hover:bg-zinc-200/g, 'dark:hover:bg-zinc-800');
  // Icon wells that became white in dark without icon color
  s = s.replace(
    /bg-zinc-900 dark:bg-white rounded-xl flex items-center justify-center">\s*<GraduationCap size=\{20\} className="text-white"/g,
    'bg-zinc-900 dark:bg-white rounded-xl flex items-center justify-center">\n              <GraduationCap size={20} className="text-white dark:text-zinc-950"'
  );
  s = s.replace(
    /bg-zinc-900 dark:bg-white rounded-xl flex items-center justify-center">\s*<BookOpen size=\{20\} className="text-white"/g,
    'bg-zinc-900 dark:bg-white rounded-xl flex items-center justify-center">\n              <BookOpen size={20} className="text-white dark:text-zinc-950"'
  );
  if (s !== before) {
    fs.writeFileSync(p, s);
    console.log('dedupe', f);
  }
}

console.log('done');
