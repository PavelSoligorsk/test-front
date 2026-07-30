import apiClient from '../../../shared/api';
import { ENDPOINTS } from '../../../shared/api/endpoints';

export const teacherApi = {
  getTests() {
    return apiClient.get(ENDPOINTS.TEACHER_TESTS);
  },

  getTasksMeta() {
    return apiClient.get(ENDPOINTS.TEACHER_TASKS_META);
  },

  getTasksMetaByTopicSection() {
    return apiClient.get(ENDPOINTS.TEACHER_TASKS_META_BY_TOPIC_SECTION);
  },

  getTasksByTopicSection(topic, section) {
    return apiClient.get(ENDPOINTS.TEACHER_TASKS_BY_TOPIC_SECTION(topic, section));
  },

  getTasksByClassTopic() {
    return apiClient.get(ENDPOINTS.TEACHER_TASKS_BY_CLASS_TOPIC);
  },

  getStudents() {
    return apiClient.get(ENDPOINTS.TEACHER_STUDENTS);
  },

  getGroups() {
    return apiClient.get(ENDPOINTS.TEACHER_GROUPS);
  },

  getGroup(groupId) {
    return apiClient.get(ENDPOINTS.TEACHER_GROUP(groupId));
  },

  getGroupStudents(groupId) {
    return apiClient.get(ENDPOINTS.TEACHER_GROUP_STUDENTS(groupId));
  },

  getGroupStudent(groupId, studentId) {
    return apiClient.get(ENDPOINTS.TEACHER_GROUP_STUDENT(groupId, studentId));
  },

  getStudentAssignments(studentId) {
    return apiClient.get(ENDPOINTS.TEACHER_STUDENT_ASSIGNMENTS(studentId));
  },

  getTestAssignments(testId) {
    return apiClient.get(ENDPOINTS.TEACHER_TEST_ASSIGNMENTS(testId));
  },

  getAssignment(assignmentId) {
    return apiClient.get(ENDPOINTS.TEACHER_ASSIGNMENT(assignmentId));
  },

  assignTestToGroup(data) {
    return apiClient.post(ENDPOINTS.TEACHER_ASSIGN_TEST_TO_GROUP, data);
  },

  // Teacher results
  getResult(resultId) {
    return apiClient.get(ENDPOINTS.TEACHER_RESULT?.(resultId) || `/teacher/results/${resultId}`);
  },

  // --- Расписание ---
  getSchedules() {
    return apiClient.get(ENDPOINTS.TEACHER_SCHEDULES);
  },

  getSchedule(id) {
    return apiClient.get(ENDPOINTS.TEACHER_SCHEDULE(id));
  },

  createSchedule(data) {
    return apiClient.post(ENDPOINTS.TEACHER_SCHEDULES, data);
  },

  updateSchedule(id, data) {
    return apiClient.put(ENDPOINTS.TEACHER_SCHEDULE(id), data);
  },

  deleteSchedule(id) {
    return apiClient.delete(ENDPOINTS.TEACHER_SCHEDULE(id));
  },

  toggleSchedule(id, active) {
    return apiClient.post(`${ENDPOINTS.TEACHER_SCHEDULE_TOGGLE(id)}?active=${active}`);
  },

  // --- Календарь ---
  getCalendar(dateFrom, dateTo) {
    return apiClient.get(ENDPOINTS.TEACHER_CALENDAR, {
      params: { date_from: dateFrom, date_to: dateTo },
    });
  },

  // --- Занятия (Lessons) ---
  getLesson(id) {
    return apiClient.get(ENDPOINTS.TEACHER_LESSON(id));
  },

  createLesson(data) {
    return apiClient.post(ENDPOINTS.TEACHER_LESSONS, data);
  },

  completeLesson(id) {
    return apiClient.post(ENDPOINTS.TEACHER_LESSON_COMPLETE(id));
  },

  cancelLesson(id, note) {
    const url = note
      ? `${ENDPOINTS.TEACHER_LESSON_CANCEL(id)}?note=${encodeURIComponent(note)}`
      : ENDPOINTS.TEACHER_LESSON_CANCEL(id);
    return apiClient.post(url);
  },

  rescheduleLesson(id, data) {
    return apiClient.post(ENDPOINTS.TEACHER_LESSON_RESCHEDULE(id), data);
  },

  updateLesson(id, data) {
    return apiClient.put(ENDPOINTS.TEACHER_LESSON(id), data);
  },

  deleteLesson(id) {
    return apiClient.delete(ENDPOINTS.TEACHER_LESSON(id));
  },

  // --- Оплаты ---
  getPayments(studentId) {
    const url = studentId
      ? `${ENDPOINTS.TEACHER_PAYMENTS}?student_id=${studentId}`
      : ENDPOINTS.TEACHER_PAYMENTS;
    return apiClient.get(url);
  },

  createPayment(data) {
    return apiClient.post(ENDPOINTS.TEACHER_PAYMENTS, data);
  },

  markPaymentPaid(id) {
    return apiClient.post(ENDPOINTS.TEACHER_PAYMENT_PAID(id));
  },

  cancelPayment(id) {
    return apiClient.post(ENDPOINTS.TEACHER_PAYMENT_CANCEL(id));
  },

  updatePayment(id, data) {
    return apiClient.put(ENDPOINTS.TEACHER_PAYMENT(id), data);
  },

  deletePayment(id) {
    return apiClient.delete(ENDPOINTS.TEACHER_PAYMENT(id));
  },

  getPaymentsStats(fromDate, toDate, studentId) {
    const params = {};
    if (fromDate) params.from_date = fromDate;
    if (toDate) params.to_date = toDate;
    if (studentId) params.student_id = studentId;
    return apiClient.get(ENDPOINTS.TEACHER_PAYMENTS_STATS, { params });
  },

  // --- Родители ---
  getParents() {
    return apiClient.get(ENDPOINTS.TEACHER_PARENTS);
  },

  createParent(data) {
    return apiClient.post(ENDPOINTS.TEACHER_PARENTS, data);
  },

  updateParent(id, data) {
    return apiClient.put(ENDPOINTS.TEACHER_PARENT(id), data);
  },

  deleteParent(id) {
    return apiClient.delete(ENDPOINTS.TEACHER_PARENT(id));
  },

  linkStudentToParent(parentId, studentId) {
    return apiClient.post(ENDPOINTS.TEACHER_PARENT_LINK_STUDENT(parentId, studentId));
  },

  unlinkStudentFromParent(studentId) {
    return apiClient.delete(ENDPOINTS.TEACHER_PARENT_UNLINK_STUDENT(studentId));
  },

  getStudentParents(studentId) {
    return apiClient.get(ENDPOINTS.TEACHER_STUDENT_PARENTS(studentId));
  },

  // --- Профиль ---
  updateProfile(data) {
    return apiClient.put(ENDPOINTS.TEACHER_PROFILE, data);
  },
};
