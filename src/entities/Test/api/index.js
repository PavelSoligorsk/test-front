import apiClient from '../../../shared/api';
import { ENDPOINTS } from '../../../shared/api/endpoints';

export const testApi = {
  getById(testId) {
    return apiClient.get(ENDPOINTS.STUDENT_GET_TEST(testId));
  },

  getList() {
    return apiClient.get(ENDPOINTS.STUDENT_TESTS_META);
  },

  submit(testId, answers) {
    return apiClient.post(ENDPOINTS.STUDENT_SUBMIT_TEST(testId), { answers });
  },
};
