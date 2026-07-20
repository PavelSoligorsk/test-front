// Все эндпоинты API в одном месте


export const ENDPOINTS = {
  // Аутентификация
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',

  // Студент
  STUDENT_TESTS_META: '/student/tests-meta',
  STUDENT_MY_ASSIGNMENTS_META: '/student/my-assignments-meta',
  STUDENT_AI_TESTS: '/student/ai-tests',
  STUDENT_ME: '/student/me',
  STUDENT_HISTORY: '/student/history',
  STUDENT_GET_TEST: (testId) => `/student/tests/${testId}`,
  STUDENT_SUBMIT_TEST: (testId) => `/student/tests/${testId}/submit`,
  STUDENT_HINT: (taskId) => `/student/tasks/${taskId}/hint`,
  STUDENT_AI_SOLVE: (taskId) => `/student/tasks/${taskId}/ai-solve`,
  STUDENT_GENERATE_TEST: '/student/generate-test',
  STUDENT_RESULT: (resultId) => `/student/results/${resultId}`,
  STUDENT_THEORY_TOPICS: '/student/theory/topics',
  STUDENT_THEORY_SECTIONS: (topic) => `/student/theory/sections/${topic}`,
  STUDENT_THEORY_BY_TOPIC_SECTION: (topic, section) => `/student/theory/by-topic/${topic}/section/${section}`,

  // Админ
  ADMIN_TASKS: '/admin/tasks',
  ADMIN_TASK: (id) => `/admin/tasks/${id}`,
  ADMIN_USERS_PROFILE: (userId) => `/admin/users/${userId}/profile`,
  ADMIN_USERS_HISTORY: (userId) => `/admin/users/${userId}/history`,
  ADMIN_RESULT: (resultId) => `/admin/results/${resultId}`,
  ADMIN_UPLOAD_IMAGE: '/admin/upload-image',
  ADMIN_ALLOWED_EMAILS: '/admin/allowed/emails',

  // Учитель
  TEACHER_TASKS_META: '/teacher/tasks-meta',
  TEACHER_TASKS_META_BY_TOPIC_SECTION: '/teacher/tasks-meta-by-topic-section',
  TEACHER_TASKS_BY_TOPIC_SECTION: (topic, section) =>
    `/teacher/tasks/by-topic/${encodeURIComponent(topic)}/section/${encodeURIComponent(section)}`,
  TEACHER_TASKS_BY_CLASS_TOPIC: '/teacher/tasks/by-class-topic',
  TEACHER_TESTS: '/teacher/tests',
  TEACHER_STUDENTS: '/teacher/students',
  TEACHER_GROUPS: '/teacher/groups/',
  TEACHER_GROUP: (groupId) => `/teacher/groups/${groupId}`,
  TEACHER_GROUP_STUDENTS: (groupId) => `/teacher/groups/${groupId}/students`,
  TEACHER_GROUP_STUDENT: (groupId, studentId) => `/teacher/groups/${groupId}/students/${studentId}`,
  TEACHER_STUDENT_ASSIGNMENTS: (studentId) => `/teacher/student/${studentId}/assignments`,
  TEACHER_TEST_ASSIGNMENTS: (testId) => `/teacher/test/${testId}/assignments`,
  TEACHER_ASSIGNMENT: (assignmentId) => `/teacher/assignments/${assignmentId}`,
  TEACHER_ASSIGN_TEST_TO_GROUP: '/teacher/assign-test-to-group',

  // Статистика
  STATS_ME: '/stats/me',
  STATS_ME_PERIOD: (period) => `/stats/me/period?period=${period}`,
  STATS_ME_TOPICS: (period) => `/stats/me/topics?period=${period}`,
  STATS_ME_DIFFICULTY: (period) => `/stats/me/difficulty?period=${period}`,
  STATS_USER: (userId) => `/stats/user/${userId}`,
  STATS_USER_PERIOD: (userId, period) => `/stats/user/${userId}/period?period=${period}`,
  STATS_USER_TOPICS: (userId, period) => `/stats/user/${userId}/topics?period=${period}`,
  STATS_USER_DIFFICULTY: (userId, period) => `/stats/user/${userId}/difficulty?period=${period}`,
};
