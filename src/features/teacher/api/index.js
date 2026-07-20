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
};
