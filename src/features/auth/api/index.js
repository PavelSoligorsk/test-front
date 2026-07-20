import apiClient from '../../../shared/api';
import { ENDPOINTS } from '../../../shared/api/endpoints';
import { saveSession } from '../../../shared/lib/session';

export const authApi = {
  async login(username, password) {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const response = await apiClient.post(ENDPOINTS.LOGIN, formData.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const userData = {
      ...response.data,
      username,
      role: response.data.role || 'student',
    };

    saveSession(userData);
    return userData;
  },

  async register(data) {
    const response = await apiClient.post(ENDPOINTS.REGISTER, data);
    return response.data;
  },

  async forgotPassword(email) {
    const response = await apiClient.post(ENDPOINTS.FORGOT_PASSWORD, { email });
    return response.data;
  },

  async resetPassword(token, newPassword) {
    const response = await apiClient.post(ENDPOINTS.RESET_PASSWORD, { token, new_password: newPassword });
    return response.data;
  },
};
