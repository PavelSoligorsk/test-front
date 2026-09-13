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

export function theoryTopicPath(topic) {
  return `/student/theory/${encodeURIComponent(topic)}`;
}

export function theoryArticlePath(topic, section) {
  return `/student/theory/${encodeURIComponent(topic)}/${encodeURIComponent(section)}`;
}
