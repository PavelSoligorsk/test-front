import apiClient from '../../../shared/api';
import { ENDPOINTS } from '../../../shared/api/endpoints';

export const taskApi = {
  getHint(taskId) {
    return apiClient.get(ENDPOINTS.STUDENT_HINT(taskId));
  },

  getAiSolve(taskId) {
    return apiClient.get(ENDPOINTS.STUDENT_AI_SOLVE(taskId));
  },
};
