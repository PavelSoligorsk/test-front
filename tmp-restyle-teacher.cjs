const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'src/pages/TeacherDashboardPage');

const targets = [
  'TestBank.jsx', 'TheoryBank.jsx', 'TestConstructor.jsx', 'CalendarTab.jsx', 'TheoryGeneratorTab.jsx',
  'TestManageModal.jsx', 'GroupStudentsModal.jsx', 'AssignTestToGroupModal.jsx', 'GroupDetailModal.jsx',
  'CreateGroupModal.jsx', 'AiTestGeneratorModal.jsx', 'LessonModal.jsx', 'CreateScheduleModal.jsx', 'SchedulesListModal.jsx',
];

function restyleClasses(src, file) {
  let s = src;

  s = s.replace(/rounded-\[3rem\]/g, 'rounded-3xl');
  s = s.replace(/rounded-\[2\.5rem\]/g, 'rounded-3xl');
  s = s.replace(/rounded-\[2rem\]/g, 'rounded-3xl');

  const colorMap = [
    [/emerald-/g, 'zinc-'],
    [/teal-/g, 'zinc-'],
    [/slate-/g, 'zinc-'],
    [/indigo-/g, 'zinc-'],
    [/violet-/g, 'zinc-'],
    [/purple-/g, 'zinc-'],
    [/blue-/g, 'zinc-'],
    [/sky-/g, 'zinc-'],
    [/cyan-/g, 'zinc-'],
    [/amber-/g, 'zinc-'],
  ];
  for (const [re, rep] of colorMap) s = s.replace(re, rep);

  s = s.replace(/\bfont-black\b/g, 'font-semibold');
  s = s.replace(/\bfont-extrabold\b/g, 'font-semibold');
  s = s.replace(/\btracking-widest\b/g, 'tracking-tight');
  s = s.replace(/\btracking-\[0\.\d+em\]/g, 'tracking-tight');
  s = s.replace(/\btracking-tighter\b/g, 'tracking-tight');
  s = s.replace(/\buppercase italic\b/g, '');
  s = s.replace(/\bitalic uppercase\b/g, '');

  // TheoryGenerator: keep markdown internals; only strip italic from shell-ish class strings is hard,
  // so skip global italic strip for that file.
  if (file !== 'TheoryGeneratorTab.jsx') {
    s = s.replace(/\bitalic\b/g, '');
  }

  s = s.replace(/bg-gradient-to-[a-z]+ from-zinc-\d+([^\s"']*) to-zinc-\d+([^\s"']*)/g, 'bg-zinc-900 dark:bg-white');
  s = s.replace(/dark:from-zinc-\d+ dark:to-zinc-\d+/g, '');
  s = s.replace(/shadow-(?:xl|lg|2xl) shadow-zinc-\d+(?:\/\d+)?/g, 'shadow-sm');
  s = s.replace(/shadow-zinc-\d+\/\d+/g, 'shadow-sm');

  s = s.replace(/bg-zinc-600(\b)/g, 'bg-zinc-900 dark:bg-white$1');
  s = s.replace(/hover:bg-zinc-700(\b)/g, 'hover:bg-zinc-800 dark:hover:bg-zinc-200$1');
  s = s.replace(/bg-zinc-900 dark:bg-white text-white(?! dark:text)/g, 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950');

  // Soften leftover “accent-zinc” / ring-zinc-600 that used to be emerald focus
  s = s.replace(/focus:border-zinc-500/g, 'focus:border-zinc-300 dark:focus:border-zinc-700');
  s = s.replace(/focus:ring-zinc-200/g, 'focus:ring-zinc-900/10 dark:focus:ring-white/10');
  s = s.replace(/accent-zinc-500/g, 'accent-zinc-900');

  // Common sheet surfaces that became zinc-800/50 after slate remap — prefer Operate sheet
  s = s.replace(/bg-white dark:bg-zinc-800\/50 rounded-3xl/g, 'bg-white dark:bg-[#09090b] rounded-3xl');
  s = s.replace(/border-zinc-100 dark:border-zinc-700/g, 'border-zinc-200 dark:border-zinc-800/60');

  return s;
}

function fixAlerts(src) {
  let s = src;
  // catch blocks with only alert
  s = s.replace(/catch\s*\((\w+)\)\s*\{\s*alert\(([^;]+)\);\s*\}/g, 'catch ($1) { console.error($1); throw $1; }');
  // alert then return (validation)
  s = s.replace(/if\s*\(([^)]+)\)\s*\{\s*alert\(([^;]+)\);\s*return;\s*\}/g, 'if ($1) { throw new Error($2); }');
  // bare alert remaining
  s = s.replace(/alert\(([^)]+)\);/g, 'console.error($1); throw new Error(String($1));');
  return s;
}

const report = [];
for (const file of targets) {
  const p = path.join(dir, file);
  if (!fs.existsSync(p)) {
    report.push(file + ' MISSING');
    continue;
  }
  let src = fs.readFileSync(p, 'utf8');
  const before = src;
  src = restyleClasses(src, file);
  src = fixAlerts(src);
  if (src !== before) {
    fs.writeFileSync(p, src);
    report.push(file + ' UPDATED ' + before.length + '→' + src.length);
  } else {
    report.push(file + ' unchanged');
  }
}
console.log(report.join('\n'));
