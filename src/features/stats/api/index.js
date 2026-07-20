import apiClient from '../../../shared/api';
import { ENDPOINTS } from '../../../shared/api/endpoints';

export const statsApi = {
  getMyStats() {
    return apiClient.get(ENDPOINTS.STATS_ME);
  },

  getMyStatsByPeriod(period) {
    return apiClient.get(ENDPOINTS.STATS_ME_PERIOD(period));
  },

  getMyTopicsStats(period) {
    return apiClient.get(ENDPOINTS.STATS_ME_TOPICS(period));
  },

  getMyDifficultyStats(period) {
    return apiClient.get(ENDPOINTS.STATS_ME_DIFFICULTY(period));
  },

  getUserStats(userId) {
    return apiClient.get(ENDPOINTS.STATS_USER(userId));
  },

  getUserStatsByPeriod(userId, period) {
    return apiClient.get(ENDPOINTS.STATS_USER_PERIOD(userId, period));
  },

  getUserTopicsStats(userId, period) {
    return apiClient.get(ENDPOINTS.STATS_USER_TOPICS(userId, period));
  },

  getUserDifficultyStats(userId, period) {
    return apiClient.get(ENDPOINTS.STATS_USER_DIFFICULTY(userId, period));
  },
};
