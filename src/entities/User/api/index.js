import apiClient from '../../../shared/api';
import { ENDPOINTS } from '../../../shared/api/endpoints';

export const userApi = {
  getMe() {
    return apiClient.get(ENDPOINTS.STUDENT_ME);
  },

  updateMe(data) {
    return apiClient.put(ENDPOINTS.STUDENT_ME, data);
  },

  getProfile(userId) {
    return apiClient.get(ENDPOINTS.ADMIN_USERS_PROFILE(userId));
  },

  getHistory(userId) {
    return apiClient.get(ENDPOINTS.ADMIN_USERS_HISTORY(userId));
  },

  getAllowedEmails() {
    return apiClient.get(ENDPOINTS.ADMIN_ALLOWED_EMAILS);
  },
};
