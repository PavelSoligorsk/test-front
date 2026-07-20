import apiClient from '../../../shared/api';
import { ENDPOINTS } from '../../../shared/api/endpoints';

export const testPassingApi = {
  getTests() {
    return apiClient.get(ENDPOINTS.STUDENT_TESTS_META);
  },

  getAssignments() {
    return apiClient.get(ENDPOINTS.STUDENT_MY_ASSIGNMENTS_META);
  },

  getAiTests() {
    return apiClient.get(ENDPOINTS.STUDENT_AI_TESTS);
  },

  getTest(testId) {
    return apiClient.get(ENDPOINTS.STUDENT_GET_TEST(testId));
  },

  submitTest(testId, answers) {
    return apiClient.post(ENDPOINTS.STUDENT_SUBMIT_TEST(testId), { answers });
  },

  getHint(taskId) {
    return apiClient.get(ENDPOINTS.STUDENT_HINT(taskId));
  },

  getAiSolve(taskId) {
    return apiClient.get(ENDPOINTS.STUDENT_AI_SOLVE(taskId));
  },

  generateTest(params) {
    return apiClient.post(ENDPOINTS.STUDENT_GENERATE_TEST, params);
  },

  getResult(resultId) {
    return apiClient.get(ENDPOINTS.STUDENT_RESULT(resultId));
  },

  getHistory() {
    return apiClient.get(ENDPOINTS.STUDENT_HISTORY);
  },
};
