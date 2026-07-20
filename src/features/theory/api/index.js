import apiClient from '../../../shared/api';
import { ENDPOINTS } from '../../../shared/api/endpoints';

export const theoryApi = {
  getTopics() {
    return apiClient.get(ENDPOINTS.STUDENT_THEORY_TOPICS);
  },

  getSections(topic) {
    return apiClient.get(ENDPOINTS.STUDENT_THEORY_SECTIONS(topic));
  },

  getContent(topic, section) {
    return apiClient.get(ENDPOINTS.STUDENT_THEORY_BY_TOPIC_SECTION(topic, section));
  },
};
