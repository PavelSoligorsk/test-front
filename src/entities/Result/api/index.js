import apiClient from '../../../shared/api';
import { ENDPOINTS } from '../../../shared/api/endpoints';

export const resultApi = {
  getById(resultId) {
    return apiClient.get(ENDPOINTS.STUDENT_RESULT(resultId));
  },

  getList() {
    return apiClient.get(ENDPOINTS.STUDENT_HISTORY);
  },

  getByAdmin(resultId) {
    return apiClient.get(ENDPOINTS.ADMIN_RESULT(resultId));
  },
};
