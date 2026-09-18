const fs = require('fs');
const path = require('path');
const dir = path.join('d:/tests_front/tsst/src/pages/TeacherDashboardPage');

const targets = [
  'TestBank.jsx', 'TheoryBank.jsx', 'TestConstructor.jsx', 'CalendarTab.jsx', 'TheoryGeneratorTab.jsx',
  'TestManageModal.jsx', 'GroupStudentsModal.jsx', 'AssignTestToGroupModal.jsx', 'GroupDetailModal.jsx',
  'CreateGroupModal.jsx', 'AiTestGeneratorModal.jsx', 'LessonModal.jsx', 'CreateScheduleModal.jsx', 'SchedulesListModal.jsx',
];

function cleanup(src, file) {
  let s = src;

  // Remove uppercase kickers from className strings (Operate: no uppercase kickers)
  // Keep careful: don't touch non-class content
  s = s.replace(/(\s)uppercase(\s)/g, '$1$2');
  s = s.replace(/(\s)uppercase"/g, '$1"');
  s = s.replace(/"uppercase\s/g, '"');
  s = s.replace(/\s+uppercase\s+/g, ' ');
  s = s.replace(/\suppercase`/g, '`');
  s = s.replace(/uppercase\s+/g, '');
  s = s.replace(/\s+uppercase/g, '');

  // Broken hover/bg merges from bulk script
  s = s.replace(/hover:bg-zinc-900 dark:bg-white/g, 'hover:bg-zinc-800 dark:hover:bg-zinc-200');
  s = s.replace(/bg-zinc-500 hover:bg-zinc-900 dark:bg-white/g, 'bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200');
  s = s.replace(/bg-zinc-500 text-white/g, 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950');
  s = s.replace(/hover:bg-zinc-900 dark:bg-white rounded/g, 'hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded');
  s = s.replace(/dark:hover:bg-zinc-900 dark:bg-white/g, 'dark:hover:bg-zinc-200');

  // Gradient headers that remapped poorly — zinc sheet headers
  s = s.replace(/bg-gradient-to-r from-zinc-900 dark:bg-white to-zinc-\d+/g, 'bg-zinc-900 dark:bg-zinc-100');
  s = s.replace(/bg-gradient-to-r from-zinc-\d+ to-zinc-\d+/g, 'bg-zinc-900 dark:bg-[#09090b]');
  s = s.replace(/p-6 bg-gradient-to-[^\s"]+/g, 'p-6 bg-zinc-900 dark:bg-zinc-100');

  // text on dark header that was emerald-200 → zinc-200 is ok; ensure contrast
  s = s.replace(/text-zinc-200 text-\[10px\] font-bold/g, 'text-zinc-400 text-[10px] font-medium');

  // font-bold labels that were kickers → medium
  s = s.replace(/text-\[10px\] font-semibold text-zinc-400/g, 'text-sm font-medium text-zinc-500');
  s = s.replace(/text-\[8px\] font-semibold text-zinc-400/g, 'text-xs font-medium text-zinc-500');
  s = s.replace(/text-\[9px\] font-semibold/g, 'text-xs font-medium');

  // Shadow xl hero sheets → sm
  s = s.replace(/shadow-xl/g, 'shadow-sm');
  s = s.replace(/shadow-2xl/g, 'shadow-sm');

  // Double spaces in class strings
  s = s.replace(/className="([^"]*)"/g, (_, cls) => `className="${cls.replace(/\s{2,}/g, ' ').trim()}"`);
  s = s.replace(/className=\{`([^`]*)`\}/g, (_, cls) => `className={\`${cls.replace(/\s{2,}/g, ' ').trim()}\`}`);

  return s;
}

for (const file of targets) {
  const p = path.join(dir, file);
  if (!fs.existsSync(p)) { console.log('MISSING', file); continue; }
  const before = fs.readFileSync(p, 'utf8');
  const after = cleanup(before, file);
  fs.writeFileSync(p, after);
  console.log(file, before.length === after.length ? 'same' : 'cleaned');
}
