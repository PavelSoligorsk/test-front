export const STUDENT_PATHS = {
  tests: '/student/tests',
  theory: '/student/theory',
  board: '/student/board',
  history: '/student/history',
  stats: '/student/stats',
  profile: '/student/profile',
};

export function boardPath(id) {
  return `/student/board/${id}`;
}

const TAB_KEY = 'student_tab';

function tabOnPath(pathname) {
  if (pathname.startsWith('/student/theory')) return 'theory';
  if (pathname.startsWith('/student/board')) return 'board';
  if (pathname.startsWith('/student/history')) return 'history';
  if (pathname.startsWith('/student/stats')) return 'stats';
  if (pathname.startsWith('/student/profile')) return 'profile';
  if (pathname.startsWith('/student/tests')) return 'tests';
  return null;
}

export function studentTabFromPath(pathname) {
  return tabOnPath(pathname) || 'tests';
}

export function rememberStudentTab(pathname) {
  const tab = tabOnPath(pathname);
  if (!tab) return;
  try {
    window.localStorage.setItem(TAB_KEY, tab);
  } catch {
    /* storage may be unavailable */
  }
}

export function rememberedStudentPath() {
  try {
    const tab = window.localStorage.getItem(TAB_KEY);
    if (tab && STUDENT_PATHS[tab]) return STUDENT_PATHS[tab];
  } catch {
    /* storage may be unavailable */
  }
  return STUDENT_PATHS.tests;
}

export function theoryTopicPath(topic, opts = {}) {
  const q = new URLSearchParams();
  if (opts.theoryClass != null && opts.theoryClass !== '') q.set('class', String(opts.theoryClass));
  if (opts.group) q.set('group', opts.group);
  const qs = q.toString();
  return `/student/theory/${encodeURIComponent(topic)}${qs ? `?${qs}` : ''}`;
}

export function theoryArticlePath(topic, section, opts = {}) {
  const q = new URLSearchParams();
  if (opts.theoryClass != null && opts.theoryClass !== '') q.set('class', String(opts.theoryClass));
  if (opts.group) q.set('group', opts.group);
  const qs = q.toString();
  return `/student/theory/${encodeURIComponent(topic)}/${encodeURIComponent(section)}${qs ? `?${qs}` : ''}`;
}
