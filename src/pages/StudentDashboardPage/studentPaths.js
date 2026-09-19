export const STUDENT_PATHS = {
  tests: '/student/tests',
  theory: '/student/theory',
  history: '/student/history',
  stats: '/student/stats',
  profile: '/student/profile',
};

export function studentTabFromPath(pathname) {
  if (pathname.startsWith('/student/theory')) return 'theory';
  if (pathname.startsWith('/student/history')) return 'history';
  if (pathname.startsWith('/student/stats')) return 'stats';
  if (pathname.startsWith('/student/profile')) return 'profile';
  return 'tests';
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
