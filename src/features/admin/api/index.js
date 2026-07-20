import apiClient from '../../../shared/api';
import { ENDPOINTS } from '../../../shared/api/endpoints';

export const adminApi = {
  getTasks() {
    return apiClient.get(ENDPOINTS.ADMIN_TASKS);
  },

  getTask(id) {
    return apiClient.get(ENDPOINTS.ADMIN_TASK(id));
  },

  createTask(data) {
    return apiClient.post(ENDPOINTS.ADMIN_TASKS, data);
  },

  updateTask(id, data) {
    return apiClient.put(ENDPOINTS.ADMIN_TASK(id), data);
  },

  deleteTask(id) {
    return apiClient.delete(ENDPOINTS.ADMIN_TASK(id));
  },

  getUserProfile(userId) {
    return apiClient.get(ENDPOINTS.ADMIN_USERS_PROFILE(userId));
  },

  getUserHistory(userId) {
    return apiClient.get(ENDPOINTS.ADMIN_USERS_HISTORY(userId));
  },

  getResult(resultId) {
    return apiClient.get(ENDPOINTS.ADMIN_RESULT(resultId));
  },

  uploadImage(imageData) {
    return apiClient.post(ENDPOINTS.ADMIN_UPLOAD_IMAGE, { image_data: imageData });
  },

  getAllowedEmails() {
    return apiClient.get(ENDPOINTS.ADMIN_ALLOWED_EMAILS);
  },
};
